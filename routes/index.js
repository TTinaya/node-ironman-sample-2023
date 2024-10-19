const express = require('express');
const router = express.Router();
const crypto = require('crypto');
require('dotenv').config();

// 綠界提供的 SDK
const ecpay_payment = require('ecpay_aio_nodejs');

const { MERCHANTID, HASHKEY, HASHIV, HOST, CLIENTBACKURL } = process.env;

// SDK 提供的範例，初始化
const options = {
  OperationMode: 'Test',  // 测试环境 'Test'，正式环境请改为 'Production'
  MercProfile: {
    MerchantID: MERCHANTID,
    HashKey: HASHKEY,
    HashIV: HASHIV,
  },
  IgnorePayment: [],
  IsProjectContractor: false,
};
let TradeNo;

// 生成付款頁面 (GET 請求)
router.get('/', (req, res) => {
  // 從查詢參數中接收商品資料 (JSON 格式)
  const cartItems = JSON.parse(req.query.cartItems || '[]');

  // 計算商品總金額，並取整數
  const totalAmount = Math.round(
    cartItems.reduce(
      (acc, item) => acc + item.totalPrice * item.quantity,
      0
    )
  );

  // 建立 `ItemName`，以 # 分隔每個商品名稱及數量，並限制單個名稱長度
  const itemName = cartItems
    .map((item) => {
      const name = `${item.productName} x${item.quantity}`;
      return name.length > 50 ? name.substring(0, 50) : name;
    })
    .join('#');

  // 限制整個 `ItemName` 的長度不超過 400 個字符
  const maxItemNameLength = 400;
  const truncatedItemName = itemName.length > maxItemNameLength
    ? itemName.substring(0, maxItemNameLength)
    : itemName;

  const tradeDesc = req.query.tradeDesc || '購物車結帳'; // 交易描述

  // 對 `TradeDesc` 和 `ItemName` 進行 URL 編碼
  const encodedTradeDesc = encodeURIComponent(tradeDesc);
  const encodedItemName = encodeURIComponent(truncatedItemName);

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
    TradeDesc: encodedTradeDesc,
    ItemName: encodedItemName,
    ReturnURL: `${HOST}/return`,
    ClientBackURL: CLIENTBACKURL,
  };

  // 創建 ECPay 付款表單
  const create = new ecpay_payment(options);
  const html = create.payment_client.aio_check_out_all(base_param);

  // 回傳產生的 HTML 給前端 (即付款表單)
  res.send(html);
});
