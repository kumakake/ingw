const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JWT_EXPIRY = '24h';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      loginAccount: user.login_account
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    req.user = {
      id: user.id,
      loginAccount: user.login_account,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'セッションが期限切れです。再度ログインしてください',
        tokenExpired: true
      });
    }

    return res.status(403).json({
      success: false,
      error: '無効なトークンです'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = {
        id: user.id,
        loginAccount: user.login_account,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

// Check if user has active subscription
const requireActiveSubscription = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です'
    });
  }

  const hasSubscription = await User.hasActiveSubscription(req.user.id);

  if (!hasSubscription) {
    return res.status(403).json({
      success: false,
      error: '有効なサブスクリプションが必要です',
      subscriptionRequired: true
    });
  }

  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  requireActiveSubscription,
  JWT_SECRET
};
