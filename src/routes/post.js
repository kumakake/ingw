const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

/**
 * Instagram投稿ルート
 *
 * 認証: validateLicenseAndSubscription ミドルウェア（app.jsで適用）
 */

// POST /api/post/instagram - Instagram投稿
router.post('/instagram', postController.postToInstagram);

// GET /api/post/history - 投稿履歴取得
router.get('/history', postController.getHistory);

// GET /api/post/limit/:facebookPageId - 投稿制限確認
router.get('/limit/:facebookPageId', postController.checkLimit);

module.exports = router;
