const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { createLogger, httpLogger } = require('./config/logger');
const appLogger = createLogger('app');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { validateLicenseAndSubscription } = require('./routes/api');
const licenseRoutes = require('./routes/license');
const userRoutes = require('./routes/user');
const paymentRoutes = require('./routes/payment');
const postRoutes = require('./routes/post');
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
    const webhookLogger = createLogger('webhook');
    webhookLogger.info({ 
      bodyType: typeof req.body, 
      isBuffer: Buffer.isBuffer(req.body),
      bodyLength: req.body?.length,
      signaturePresent: !!req.headers['stripe-signature']
    }, 'Stripe webhook request received');
    
    const signature = req.headers['stripe-signature'];
    
    try {
      const result = await paymentController.handleWebhookDirect(req.body, signature);
      webhookLogger.info('Stripe webhook processed successfully');
      res.json(result);
    } catch (error) {
      webhookLogger.error({ err: error }, 'Stripe webhook error');
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

// HTTPアクセスログ
app.use(httpLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use('/api/instagram', apiRoutes);
// License validate endpoint - public (called from WordPress plugins)
app.post('/api/license/validate', require('./controllers/licenseController').validate);
// License management endpoints - protected (admin only)
app.use('/api/license', adminAuth, licenseRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/post', validateLicenseAndSubscription, postRoutes);

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
  appLogger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

app.listen(PORT, () => {
  appLogger.info({ 
    port: PORT, 
    env: process.env.NODE_ENV || 'development',
    redirectUri: process.env.REDIRECT_URI 
  }, 'InstaBridge started');

  // トークン自動延長スケジューラーを開始
  if (process.env.NODE_ENV !== 'test') {
    tokenScheduler.start();
  }
});

module.exports = app;
