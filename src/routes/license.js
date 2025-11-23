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

module.exports = router;
