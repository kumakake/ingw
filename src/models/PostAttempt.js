const { pool } = require('../config/database');

/**
 * 投稿試行ログモデル
 * 成功・失敗両方の投稿試行を記録し、分析に活用
 */
class PostAttempt {
  static pool = pool;

  /**
   * ステータス定数
   */
  static STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    RATE_LIMITED: 'rate_limited',
    TOKEN_EXPIRED: 'token_expired',
    CONTAINER_ERROR: 'container_error',
    PUBLISH_ERROR: 'publish_error',
  };

  /**
   * 投稿試行を記録
   */
  static async create(data) {
    const {
      license_id,
      facebook_page_id,
      image_url,
      wordpress_post_id,
      status,
      error_code,
      error_message,
      quota_usage,
      quota_total,
      container_id,
      media_id,
    } = data;

    const result = await pool.query(
      `INSERT INTO post_attempts
        (license_id, facebook_page_id, image_url, wordpress_post_id, status,
         error_code, error_message, quota_usage, quota_total, container_id, media_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        license_id || null,
        facebook_page_id,
        image_url || null,
        wordpress_post_id || null,
        status,
        error_code || null,
        error_message || null,
        quota_usage || null,
        quota_total || 25,
        container_id || null,
        media_id || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * ライセンスIDで試行履歴を取得
   */
  static async findByLicenseId(licenseId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM post_attempts
       WHERE license_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [licenseId, limit, offset]
    );
    return result.rows;
  }

  /**
   * 期間内の統計を取得
   */
  static async getStats(licenseId, hours = 24) {
    const result = await pool.query(
      `SELECT
        status,
        COUNT(*) as count,
        MAX(quota_usage) as max_quota_usage
       FROM post_attempts
       WHERE license_id = $1
         AND created_at > NOW() - INTERVAL '${hours} hours'
       GROUP BY status`,
      [licenseId]
    );
    return result.rows;
  }

  /**
   * 直近のエラー傾向を分析
   */
  static async getRecentErrors(hours = 24, limit = 20) {
    const result = await pool.query(
      `SELECT
        error_code,
        error_message,
        COUNT(*) as count,
        MAX(created_at) as last_occurred
       FROM post_attempts
       WHERE status != 'success'
         AND created_at > NOW() - INTERVAL '${hours} hours'
       GROUP BY error_code, error_message
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * 投稿制限に近い状態かチェック
   */
  static async getQuotaWarnings(thresholdPercent = 80) {
    const result = await pool.query(
      `SELECT DISTINCT ON (license_id)
        license_id,
        quota_usage,
        quota_total,
        ROUND((quota_usage::numeric / quota_total) * 100) as usage_percent,
        created_at
       FROM post_attempts
       WHERE quota_usage IS NOT NULL
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY license_id, created_at DESC`
    );
    return result.rows.filter(r => r.usage_percent >= thresholdPercent);
  }

  /**
   * 全体の試行数をカウント
   */
  static async count(licenseId = null, status = null) {
    let query = 'SELECT COUNT(*) FROM post_attempts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (licenseId) {
      query += ` AND license_id = $${paramIndex++}`;
      params.push(licenseId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = PostAttempt;
