const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const licenseRoutes = require('./routes/license');
const userRoutes = require('./routes/user');
const paymentRoutes = require('./routes/payment');
const paymentController = require('./controllers/paymentController');
const tokenScheduler = require('./services/tokenScheduler');
const adminAuth = require('./middleware/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe Webhook (must be FIRST, before any body parser or CORS)
// Using inline handler to ensure raw body is preserved
app.post('/api/webhook/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    console.log('=== Stripe Webhook Request ===');
    console.log('Body type:', typeof req.body);
    console.log('Is Buffer:', Buffer.isBuffer(req.body));
    console.log('Body length:', req.body?.length);
    
    const signature = req.headers['stripe-signature'];
    console.log('Signature present:', !!signature);
    
    try {
      const result = await paymentController.handleWebhookDirect(req.body, signature);
      res.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use('/api/instagram', apiRoutes);
app.use('/api/license', adminAuth, licenseRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

// Serve user pages (SPA-like routing)
app.get('/user/*', (req, res) => {
  const requestedFile = path.join(__dirname, '../public', req.path + '.html');
  const fs = require('fs');
  if (fs.existsSync(requestedFile)) {
    res.sendFile(requestedFile);
  } else {
    res.sendFile(path.join(__dirname, '../public/user/login.html'));
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(` InstaBridge running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Redirect URI: ${process.env.REDIRECT_URI}`);

  // トークン自動延長スケジューラーを開始
  if (process.env.NODE_ENV !== 'test') {
    tokenScheduler.start();
  }
});

module.exports = app;
