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

router.get('/', (req, res) => {
  // 从查询参数中获取订单数据，如果未提供则使用默认值
  let totalAmount = parseInt(req.query.totalAmount, 10) || 100;
  let tradeDesc = req.query.tradeDesc || '測試交易描述';
  let itemName = req.query.itemName || '測試商品等';

  // 确保 totalAmount 为大于 0 的整数
  if (isNaN(totalAmount) || totalAmount <= 0) {
    totalAmount = 100; // 使用默认值
  }
  totalAmount = totalAmount.toString();

  // 确保 itemName 长度不超过 400 个字符
  if (itemName.length > 400) {
    itemName = itemName.substring(0, 400);
  }
  // 对 itemName 进行编码
  itemName = encodeURIComponent(itemName);

  // 生成 MerchantTradeDate，格式为 yyyy/MM/dd HH:mm:ss
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\//g, '/');

  // 生成唯一的 MerchantTradeNo，长度不超过 20 个字符
  TradeNo = 'test' + Date.now().toString().slice(-10);

  let base_param = {
    MerchantTradeNo: TradeNo, // 請帶 20 碼 uid
    MerchantTradeDate,
    TotalAmount: totalAmount,
    TradeDesc: tradeDesc,
    ItemName: itemName,
    ReturnURL: `${HOST}/return`,
    ClientBackURL: CLIENTBACKURL,
  };

  const create = new ecpay_payment(options);

  // 生成付款用的 HTML 表单
  const html = create.payment_client.aio_check_out_all(base_param);
  console.log(html);

  res.render('index', {
    title: 'Express',
    html,
  });
});

// 後端接收綠界回傳的資料
router.post('/return', async (req, res) => {
  console.log('req.body:', req.body);

  const { CheckMacValue } = req.body;
  const data = { ...req.body };
  delete data.CheckMacValue; // 此段不驗證

  const create = new ecpay_payment(options);
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data);

  console.log(
    '確認交易正確性：',
    CheckMacValue === checkValue,
    CheckMacValue,
    checkValue,
  );

  // 交易成功後，需要回傳 1|OK 給綠界
  res.send('1|OK');
});

// 用戶交易完成後的轉址
router.get('/clientReturn', (req, res) => {
  console.log('clientReturn:', req.body, req.query);
  res.render('return', { query: req.query });
});

module.exports = router;
