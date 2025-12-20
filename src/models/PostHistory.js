const db = require('../config/database');

/**
 * 投稿履歴モデル
 */
class PostHistory {
  /**
   * 投稿履歴を作成
   * @param {object} data
   * @param {number} data.license_id - ライセンスID
   * @param {string} data.facebook_page_id - Facebook Page ID
   * @param {string} data.instagram_media_id - Instagram Media ID
   * @param {string} [data.wordpress_post_id] - WordPress Post ID
   * @param {string} [data.caption] - 投稿キャプション
   * @param {string} [data.image_url] - 画像URL
   * @param {string} [data.permalink] - Instagramパーマリンク
   * @returns {Promise<object>} 作成された履歴レコード
   */
  static async create(data) {
    const result = await db.query(
      `INSERT INTO post_history
       (license_id, facebook_page_id, instagram_media_id, wordpress_post_id,
        caption, image_url, permalink)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.license_id,
        data.facebook_page_id,
        data.instagram_media_id,
        data.wordpress_post_id || null,
        data.caption || null,
        data.image_url || null,
        data.permalink || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * ライセンスIDで履歴を取得
   * @param {number} licenseId
   * @param {string} [facebookPageId] - オプションでページIDフィルタ
   * @param {number} [limit=20]
   * @param {number} [offset=0]
   * @returns {Promise<object[]>}
   */
  static async findByLicenseId(licenseId, facebookPageId = null, limit = 20, offset = 0) {
    let query = `
      SELECT * FROM post_history
      WHERE license_id = $1
    `;
    const params = [licenseId];

    if (facebookPageId) {
      query += ` AND facebook_page_id = $2`;
      params.push(facebookPageId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Facebook Page IDで履歴を取得
   * @param {string} facebookPageId
   * @param {number} [limit=20]
   * @param {number} [offset=0]
   * @returns {Promise<object[]>}
   */
  static async findByFacebookPageId(facebookPageId, limit = 20, offset = 0) {
    const result = await db.query(
      `SELECT * FROM post_history
       WHERE facebook_page_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [facebookPageId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Instagram Media IDで履歴を取得
   * @param {string} instagramMediaId
   * @returns {Promise<object|null>}
   */
  static async findByInstagramMediaId(instagramMediaId) {
    const result = await db.query(
      'SELECT * FROM post_history WHERE instagram_media_id = $1',
      [instagramMediaId]
    );
    return result.rows[0] || null;
  }

  /**
   * 履歴の総数を取得
   * @param {number} licenseId
   * @param {string} [facebookPageId]
   * @returns {Promise<number>}
   */
  static async count(licenseId, facebookPageId = null) {
    let query = 'SELECT COUNT(*) FROM post_history WHERE license_id = $1';
    const params = [licenseId];

    if (facebookPageId) {
      query += ' AND facebook_page_id = $2';
      params.push(facebookPageId);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * IDで履歴を取得
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM post_history WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = PostHistory;
