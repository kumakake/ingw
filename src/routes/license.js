const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');

// ライセンス管理エンドポイント
router.post('/validate', licenseController.validate);       // ライセンス検証
router.post('/generate', licenseController.generate);       // ライセンス発行
router.get('/list', licenseController.list);                // ライセンス一覧
router.post('/update', licenseController.update);           // 利用者情報更新
router.post('/deactivate', licenseController.deactivate);   // ライセンス無効化
router.post('/reset', licenseController.reset);             // ドメインリセット
router.delete('/delete', licenseController.delete);         // ライセンス削除（未使用のみ）

// 手動サブスクリプション管理
router.post('/manual-subscription', licenseController.setManualSubscription);           // 手動有効化
router.post('/manual-subscription/disable', licenseController.disableManualSubscription); // 手動解除

// 投稿試行ログエンドポイント
router.get('/attempts/:licenseId', licenseController.getAttempts);       // 試行ログ取得
router.get('/attempts-stats/:licenseId', licenseController.getAttemptsStats); // 試行統計
router.get('/error-trends', licenseController.getErrorTrends);           // エラー傾向

module.exports = router;
