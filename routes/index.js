const express = require('express');
const bodyParser = require('body-parser');
const ecpay_payment = require('ecpay_aio_nodejs'); // 引入綠界 SDK
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 使用 body-parser 解析 JSON
app.use(bodyParser.json());

const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env;

const options = {
  OperationMode: 'Test', // Test 或 Production
  MercProfile: { MerchantID: MERCHANTID, HashKey: HASHKEY, HashIV: HASHIV },
  IgnorePayment: [],
  IsProjectContractor: false,
};

// /createOrder 路由：接收 Framer 發來的訂單資料並生成 HTML 表單
app.post('/createOrder', (req, res) => {
  const { TotalAmount, TradeDesc, ItemName } = req.body;

  if (!TotalAmount || !TradeDesc || !ItemName) {
    return res.status(400).json({ error: '缺少必要的訂單資訊' });
  }

  const baseParams = {
    MerchantTradeNo: `EC${Date.now()}`, // 唯一交易編號
    MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    TotalAmount,
    TradeDesc,
    ItemName,
    ReturnURL: `${HOST}/return`,
    ClientBackURL: `${HOST}/clientReturn`,
  };

  try {
    const payment = new ecpay_payment(options);
    const html = payment.aio_check_out_all(baseParams);

    // 回傳 HTML 表單給前端，前端會自動提交此表單
    res.send(`
      <html>
        <body onload="document.forms[0].submit()">
          ${html}
        </body>
      </html>
    `);
  } catch (error) {
    console.error('生成訂單錯誤:', error);
    res.status(500).json({ error: '生成訂單失敗' });
  }
});

// 綠界回傳結果處理
app.post('/return', (req, res) => {
  console.log('綠界回傳資料:', req.body);
  res.send('1|OK');
});

// 用戶完成交易後的跳轉頁面
app.get('/clientReturn', (req, res) => {
  res.send('交易完成，感謝您的購買！');
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
