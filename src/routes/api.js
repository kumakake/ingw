const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const License = require('../models/License');
const User = require('../models/User');

// License and subscription validation middleware
const validateLicenseAndSubscription = async (req, res, next) => {
  const licenseKey = req.headers['x-license-key'];
  
  if (!licenseKey) {
    return res.status(401).json({
      success: false,
      error: 'ライセンスキーが必要です',
      licenseRequired: true
    });
  }

  try {
    // Find license
    const license = await License.findByKey(licenseKey);
    
    if (!license) {
      return res.status(401).json({
        success: false,
        error: '無効なライセンスキーです',
        invalidLicense: true
      });
    }

    if (!license.is_active) {
      return res.status(403).json({
        success: false,
        error: 'ライセンスが無効化されています',
        licenseInactive: true
      });
    }

    // Check subscription if license is linked to a user
    if (license.user_id) {
      const hasSubscription = await User.hasActiveSubscription(license.user_id);
      
      if (!hasSubscription) {
        return res.status(403).json({
          success: false,
          error: '有効なサブスクリプションが必要です',
          subscriptionRequired: true
        });
      }
    }

    // Attach license to request for later use
    req.license = license;
    next();
  } catch (error) {
    console.error('License validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'ライセンス検証に失敗しました'
    });
  }
};

// Protected endpoints (require license and subscription)
router.get('/user/:facebookUserId', validateLicenseAndSubscription, apiController.getInstagramUserId);
router.get('/page/:facebookPageId', validateLicenseAndSubscription, apiController.getInstagramUserByPageId);
router.get('/users', validateLicenseAndSubscription, apiController.getAllUsers);

// トークン管理エンドポイント
router.get('/tokens/status', apiController.getExpiringTokens);           // 期限切れ間近/期限切れトークン一覧
router.post('/tokens/refresh/:facebookPageId', apiController.refreshToken);  // 特定ページのトークン延長
router.post('/tokens/refresh-all', apiController.refreshAllTokens);      // 全トークン一括延長

module.exports = router;
