const express = require('express');
const router = express.Router();
const crypto = require('crypto');
require('dotenv').config();

// 綠界提供的 SDK
const ecpay_payment = require('ecpay_aio_nodejs');

// 環境變數
const { MERCHANTID, HASHKEY, HASHIV, HOST, CLIENTBACKURL } = process.env;

// 初始化 ECPay SDK
const options = {
  OperationMode: 'Test',  // 'Test' 用於測試環境, 正式環境改為 'Production'
  MercProfile: {
    MerchantID: MERCHANTID,
    HashKey: HASHKEY,
    HashIV: HASHIV,
  },
  IgnorePayment: [],  // 可排除不使用的付款方式，如信用卡
  IsProjectContractor: false,
};
let TradeNo;  // 紀錄唯一的訂單編號

// 生成付款頁面 (GET 請求)
router.get('/', (req, res) => {
  // 從查詢參數中接收商品資料 (JSON 格式)
  const cartItems = JSON.parse(req.query.cartItems || '[]');

  // 計算商品總金額
  const totalAmount = cartItems.reduce(
    (acc, item) => acc + item.totalPrice * item.quantity,
    0
  );

  // 建立 `ItemName`，以 # 分隔每個商品名稱及數量
  const itemName = cartItems
    .map((item) => `${item.productName} x${item.quantity}`)
    .join('#');

  const tradeDesc = req.query.tradeDesc || '購物車結帳';  // 交易描述

  // 生成當前時間作為 MerchantTradeDate，格式為 yyyy/MM/dd HH:mm:ss
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 生成唯一的訂單編號 (長度不可超過 20 個字元)
  TradeNo = 'test' + Date.now().toString().slice(-10);

  // 建立 ECPay 所需的訂單參數
  const base_param = {
    MerchantTradeNo: TradeNo,
    MerchantTradeDate,
    TotalAmount: totalAmount.toString(),
    TradeDesc: tradeDesc,
    ItemName: itemName,
    ReturnURL: `${HOST}/return`,  // 綠界付款後回傳的 API
    ClientBackURL: CLIENTBACKURL,  // 用戶完成付款後返回的網址
  };

  // 創建 ECPay 付款表單
  const create = new ecpay_payment(options);
  const html = create.payment_client.aio_check_out_all(base_param);

  // 回傳產生的 HTML 給前端 (即付款表單)
  res.send(html);
});

// 綠界回傳的通知 (POST 請求)
router.post('/return', async (req, res) => {
  console.log('收到綠界的回傳資料:', req.body);

  const { CheckMacValue } = req.body;  // 從綠界回傳的資料中取得 CheckMacValue
  const data = { ...req.body };
  delete data.CheckMacValue;  // 移除 CheckMacValue 進行重新驗證

  const create = new ecpay_payment(options);
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data);  // 重新計算 CheckMacValue

  console.log(
    '交易驗證結果：',
    CheckMacValue === checkValue,
    CheckMacValue,
    checkValue
  );

  // 驗證成功，回傳 1|OK 給綠界
  res.send('1|OK');
});

// 用戶交易完成後的轉址 (GET 請求)
router.get('/clientReturn', (req, res) => {
  console.log('交易完成後的轉址資料:', req.query);
  res.send(`<h1>交易完成！感謝您的購買。</h1><p>訂單資訊：${JSON.stringify(req.query)}</p>`);
});

module.exports = router;
