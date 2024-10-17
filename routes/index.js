const express = require('express');
const router = express.Router();
const crypto = require('crypto');
require('dotenv').config();

// 引入绿界提供的 SDK
const ecpay_payment = require('ecpay_aio_nodejs');

// 从环境变量中获取 ECPay 的商户信息和主机地址
const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env;

// SDK 初始化配置
const options = {
  OperationMode: 'Test', // 测试环境 'Test'，正式环境请改为 'Production'
  MercProfile: {
    MerchantID: MERCHANTID,
    HashKey: HASHKEY,
    HashIV: HASHIV,
  },
  IgnorePayment: [],
  IsProjectContractor: false,
};

router.post('/createOrder', (req, res) => {
  const { totalAmount, tradeDesc, itemName, returnURL, clientBackURL } = req.body;

  // 检查必填参数
  if (!totalAmount || !tradeDesc || !itemName) {
    return res.status(400).json({ error: '缺少必要的参数' });
  }

  // 生成唯一的 MerchantTradeNo，长度需小于等于 20 字符
  const MerchantTradeNo = 'ORD' + Date.now();

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

  let base_param = {
    MerchantTradeNo,
    MerchantTradeDate,
    TotalAmount: String(totalAmount),
    TradeDesc: tradeDesc,
    ItemName: itemName,
    ReturnURL: returnURL || `${HOST}/return`,
    ClientBackURL: clientBackURL || `${HOST}/clientReturn`,
    // 可根据需要添加其他参数
  };

  const create = new ecpay_payment(options);

  // 生成付款用的 HTML 表单
  const html = create.payment_client.aio_check_out_all(base_param);

  // 返回 HTML 表单给前端
  res.json({ html });
});

// 接收 ECPay 回传的交易结果
router.post('/return', async (req, res) => {
  console.log('收到 ECPay 回传的数据:', req.body);

  const { CheckMacValue } = req.body;
  const data = { ...req.body };
  delete data.CheckMacValue; // 验证时需移除 CheckMacValue

  const create = new ecpay_payment(options);
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data);

  console.log(
    '验证交易正确性：',
    CheckMacValue === checkValue,
    'ECPay 回传的 CheckMacValue：',
    CheckMacValue,
    '计算得到的 CheckMacValue：',
    checkValue,
  );

  // 根据交易结果进行业务处理，例如更新订单状态等

  // 交易成功后，需要回传 1|OK 给 ECPay
  res.send('1|OK');
});

// 用户交易完成后的跳转页面
router.get('/clientReturn', (req, res) => {
  console.log('用户完成交易返回:', req.query);
  res.send('交易已完成，谢谢您的购买！');
});

module.exports = router;
