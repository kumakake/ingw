const { pool } = require('../config/database');

class License {
  static pool = pool;

  /**
   * ライセンスキーで検索
   */
  static async findByKey(licenseKey) {
    const result = await pool.query(
      'SELECT * FROM licenses WHERE license_key = $1',
      [licenseKey]
    );
    return result.rows[0] || null;
  }

  /**
   * ユーザーIDでライセンス検索
   */
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM licenses WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * ライセンスを検証（有効かどうか）
   */
  static async validate(licenseKey, domain) {
    const license = await this.findByKey(licenseKey);

    if (!license) {
      return { valid: false, error: 'ライセンスキーが見つかりません' };
    }

    if (!license.is_active) {
      return { valid: false, error: 'ライセンスが無効化されています' };
    }

    // 既に別のドメインで有効化されている場合
    if (license.domain && license.domain !== domain) {
      return { valid: false, error: 'このライセンスは別のドメインで使用されています' };
    }

    // 未有効化の場合、ドメインを登録
    if (!license.domain) {
      await this.activate(licenseKey, domain);
    }

    return { valid: true, license };
  }

  /**
   * ライセンスを有効化（ドメイン登録）
   */
  static async activate(licenseKey, domain) {
    const result = await pool.query(
      `UPDATE licenses
       SET domain = $1, activated_at = CURRENT_TIMESTAMP
       WHERE license_key = $2
       RETURNING *`,
      [domain, licenseKey]
    );
    return result.rows[0];
  }

  /**
   * 新規ライセンス作成
   */
  static async create(licenseKey, userNo = null, userName = null) {
    const result = await pool.query(
      `INSERT INTO licenses (license_key, user_no, user_name) VALUES ($1, $2, $3) RETURNING *`,
      [licenseKey, userNo, userName]
    );
    return result.rows[0];
  }

  /**
   * ユーザーに紐づいたライセンス作成
   */
  static async createForUser(userId) {
    // Check if user already has a license
    const existingLicense = await this.findByUserId(userId);
    if (existingLicense) {
      return { success: false, error: 'このユーザーは既にライセンスを発行済みです', license: existingLicense };
    }

    const licenseKey = this.generateKey();
    const result = await pool.query(
      `INSERT INTO licenses (license_key, user_id) VALUES ($1, $2) RETURNING *`,
      [licenseKey, userId]
    );
    return { success: true, license: result.rows[0] };
  }

  /**
   * 利用者情報を更新
   */
  static async updateUserInfo(licenseKey, userNo, userName) {
    const result = await pool.query(
      `UPDATE licenses SET user_no = $1, user_name = $2 WHERE license_key = $3 RETURNING *`,
      [userNo, userName, licenseKey]
    );
    return result.rows[0];
  }

  /**
   * ライセンスを無効化
   */
  static async deactivate(licenseKey) {
    const result = await pool.query(
      `UPDATE licenses SET is_active = false WHERE license_key = $1 RETURNING *`,
      [licenseKey]
    );
    return result.rows[0];
  }

  /**
   * ライセンスのドメインをリセット（再利用可能に）
   */
  static async resetDomain(licenseKey) {
    const result = await pool.query(
      `UPDATE licenses SET domain = NULL, activated_at = NULL WHERE license_key = $1 RETURNING *`,
      [licenseKey]
    );
    return result.rows[0];
  }

  /**
   * 全ライセンス取得
   */
  static async getAll() {
    const result = await pool.query(
      `SELECT
        l.*,
        u.subscription_status,
        u.subscription_current_period_end,
        u.login_account
      FROM licenses l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC`
    );
    return result.rows;
  }

  /**
   * ランダムな32文字のライセンスキーを生成
   */
  static generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * 未使用ライセンスを削除（ドメイン未登録のもののみ）
   */
  static async deleteUnused(licenseKey) {
    // まずライセンスの状態を確認
    const license = await this.findByKey(licenseKey);

    if (!license) {
      return { deleted: false };
    }

    // ドメインが登録されている場合は削除不可
    if (license.domain) {
      return { deleted: false, error: '使用中のライセンスは削除できません' };
    }

    const result = await pool.query(
      'DELETE FROM licenses WHERE license_key = $1 AND domain IS NULL RETURNING *',
      [licenseKey]
    );

    return { deleted: result.rowCount > 0 };
  }
}

module.exports = License;