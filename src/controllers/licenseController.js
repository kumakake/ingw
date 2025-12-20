const License = require('../models/License');
const { createLogger } = require('../config/logger');
const logger = createLogger('license');

class LicenseController {
  /**
   * ライセンス検証エンドポイント
   * POST /api/license/validate
   */
  async validate(req, res) {
    const { license_key, domain } = req.body;

    logger.info({ domain, keyPrefix: license_key?.substring(0, 8) }, 'License validation request');

    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーは必須です',
      });
    }

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'ドメインは必須です',
      });
    }

    // ライセンスキーの形式チェック（32文字英数字）
    if (!/^[A-Z0-9]{32}$/.test(license_key)) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーの形式が無効です（32文字の英数字）',
      });
    }

    try {
      const result = await License.validate(license_key, domain);

      if (!result.valid) {
        logger.warn({ domain, error: result.error }, 'License validation failed');
        return res.status(403).json({
          success: false,
          error: result.error,
        });
      }

      logger.info({ domain }, 'License validated successfully');
      res.json({
        success: true,
        message: 'ライセンスが有効です',
        data: {
          licenseKey: result.license.license_key,
          domain: result.license.domain,
          activatedAt: result.license.activated_at,
        },
      });
    } catch (error) {
      logger.error({ err: error, domain }, 'License validation error');
      res.status(500).json({
        success: false,
        error: 'ライセンス検証中にエラーが発生しました',
      });
    }
  }

  /**
   * 新規ライセンス発行
   * POST /api/license/generate
   */
  async generate(req, res) {
    const { user_no, user_name } = req.body || {};

    try {
      const licenseKey = License.generateKey();
      const license = await License.create(licenseKey, user_no, user_name);

      res.json({
        success: true,
        message: 'ライセンスを発行しました',
        data: {
          licenseKey: license.license_key,
          userNo: license.user_no,
          userName: license.user_name,
          createdAt: license.created_at,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'License generation error');
      res.status(500).json({
        success: false,
        error: 'ライセンス発行中にエラーが発生しました',
      });
    }
  }

  /**
   * ライセンス一覧取得
   * GET /api/license/list
   */
  async list(req, res) {
    try {
      const users = await License.getAll();

      res.json({
        success: true,
        count: users.length,
        data: users.map(u => ({
          userId: u.user_id,
          userNo: u.user_no,
          userName: u.user_name,
          licenseKey: u.license_key || null,
          domain: u.domain || null,
          isActive: u.is_active ?? null,
          activatedAt: u.activated_at || null,
          licenseCreatedAt: u.license_created_at || null,
          userCreatedAt: u.user_created_at,
          subscriptionStatus: u.subscription_status,
          subscriptionPeriodEnd: u.subscription_current_period_end,
          loginAccount: u.login_account,
        })),
      });
    } catch (error) {
      logger.error({ err: error }, 'License list error');
      res.status(500).json({
        success: false,
        error: 'ライセンス一覧の取得に失敗しました',
      });
    }
  }

  /**
   * ライセンス無効化
   * POST /api/license/deactivate
   */
  async deactivate(req, res) {
    const { license_key } = req.body;

    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーは必須です',
      });
    }

    try {
      const license = await License.deactivate(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'ライセンスが見つかりません',
        });
      }

      res.json({
        success: true,
        message: 'ライセンスを無効化しました',
      });
    } catch (error) {
      logger.error({ err: error }, 'License deactivation error');
      res.status(500).json({
        success: false,
        error: 'ライセンス無効化に失敗しました',
      });
    }
  }

  /**
   * ライセンスのドメインリセット
   * POST /api/license/reset
   */
  async reset(req, res) {
    const { license_key } = req.body;

    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーは必須です',
      });
    }

    try {
      const license = await License.resetDomain(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'ライセンスが見つかりません',
        });
      }

      res.json({
        success: true,
        message: 'ライセンスのドメインをリセットしました',
      });
    } catch (error) {
      logger.error({ err: error }, 'License reset error');
      res.status(500).json({
        success: false,
        error: 'ライセンスリセットに失敗しました',
      });
    }
  }

  /**
   * 利用者情報更新
   * POST /api/license/update
   */
  async update(req, res) {
    const { license_key, user_no, user_name } = req.body;

    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーは必須です',
      });
    }

    try {
      const license = await License.updateUserInfo(license_key, user_no, user_name);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'ライセンスが見つかりません',
        });
      }

      res.json({
        success: true,
        message: '利用者情報を更新しました',
        data: {
          licenseKey: license.license_key,
          userNo: license.user_no,
          userName: license.user_name,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'License update error');
      res.status(500).json({
        success: false,
        error: '利用者情報の更新に失敗しました',
      });
    }
  }

  /**
   * ライセンス削除（未使用のみ）
   * DELETE /api/license/delete
   */
  async delete(req, res) {
    const { license_key } = req.body;

    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'ライセンスキーは必須です',
      });
    }

    try {
      const result = await License.deleteUnused(license_key);

      if (result.error) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      if (!result.deleted) {
        return res.status(404).json({
          success: false,
          error: 'ライセンスが見つかりません',
        });
      }

      res.json({
        success: true,
        message: 'ライセンスを削除しました',
      });
    } catch (error) {
      logger.error({ err: error }, 'License deletion error');
      res.status(500).json({
        success: false,
        error: 'ライセンス削除に失敗しました',
      });
    }
  }
}

module.exports = new LicenseController();
