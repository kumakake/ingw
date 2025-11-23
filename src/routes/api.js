const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// 既存のエンドポイント
router.get('/user/:facebookUserId', apiController.getInstagramUserId);
router.get('/page/:facebookPageId', apiController.getInstagramUserByPageId);
router.get('/users', apiController.getAllUsers);

// トークン管理エンドポイント
router.get('/tokens/status', apiController.getExpiringTokens);           // 期限切れ間近/期限切れトークン一覧
router.post('/tokens/refresh/:facebookPageId', apiController.refreshToken);  // 特定ページのトークン延長
router.post('/tokens/refresh-all', apiController.refreshAllTokens);      // 全トークン一括延長

module.exports = router;
