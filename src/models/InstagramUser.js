const db = require('../config/database');

class InstagramUser {
  static async findByFacebookUserId(facebookUserId) {
    const result = await db.query(
      'SELECT * FROM instagram_users WHERE facebook_user_id = $1 ORDER BY created_at DESC',
      [facebookUserId]
    );
    return result.rows;
  }

  static async findByInstagramUserId(instagramUserId) {
    const result = await db.query(
      'SELECT * FROM instagram_users WHERE instagram_user_id = $1',
      [instagramUserId]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const {
      facebookUserId,
      accessToken,
      tokenExpiresAt,
      facebookPageId,
      facebookPageName,
      instagramUserId,
      instagramUsername,
    } = userData;

    const result = await db.query(
      `INSERT INTO instagram_users
       (facebook_user_id, access_token, token_expires_at, facebook_page_id,
        facebook_page_name, instagram_user_id, instagram_username)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        facebookUserId,
        accessToken,
        tokenExpiresAt,
        facebookPageId,
        facebookPageName,
        instagramUserId,
        instagramUsername,
      ]
    );
    return result.rows[0];
  }

  static async update(facebookUserId, userData) {
    const {
      accessToken,
      tokenExpiresAt,
      facebookPageId,
      facebookPageName,
      instagramUserId,
      instagramUsername,
    } = userData;

    const result = await db.query(
      `UPDATE instagram_users
       SET access_token = $1, token_expires_at = $2, facebook_page_id = $3,
           facebook_page_name = $4, instagram_user_id = $5, instagram_username = $6
       WHERE facebook_user_id = $7
       RETURNING *`,
      [
        accessToken,
        tokenExpiresAt,
        facebookPageId,
        facebookPageName,
        instagramUserId,
        instagramUsername,
        facebookUserId,
      ]
    );
    return result.rows[0];
  }

  static async updateByPageId(facebookPageId, userData) {
    const {
      facebookUserId,
      accessToken,
      tokenExpiresAt,
      facebookPageName,
      instagramUserId,
      instagramUsername,
    } = userData;

    const result = await db.query(
      `UPDATE instagram_users
       SET facebook_user_id = $1, access_token = $2, token_expires_at = $3,
           facebook_page_name = $4, instagram_user_id = $5, instagram_username = $6
       WHERE facebook_page_id = $7
       RETURNING *`,
      [
        facebookUserId,
        accessToken,
        tokenExpiresAt,
        facebookPageName,
        instagramUserId,
        instagramUsername,
        facebookPageId,
      ]
    );
    return result.rows[0];
  }

  static async upsert(userData) {
    const existing = await this.findByPageId(userData.facebookPageId);
    if (existing) {
      return await this.updateByPageId(userData.facebookPageId, userData);
    }
    return await this.create(userData);
  }

  static async getAll() {
    const result = await db.query(
      'SELECT * FROM instagram_users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findByPageId(facebookPageId) {
    const result = await db.query(
      'SELECT * FROM instagram_users WHERE facebook_page_id = $1',
      [facebookPageId]
    );
    return result.rows[0];
  }

  static async updateToken(facebookPageId, accessToken, tokenExpiresAt) {
    const result = await db.query(
      `UPDATE instagram_users
       SET access_token = $1, token_expires_at = $2, updated_at = NOW()
       WHERE facebook_page_id = $3
       RETURNING *`,
      [accessToken, tokenExpiresAt, facebookPageId]
    );
    return result.rows[0];
  }

  static async getExpiringTokens(daysBeforeExpiry = 30) {
    const result = await db.query(
      `SELECT * FROM instagram_users
       WHERE token_expires_at < NOW() + INTERVAL '${daysBeforeExpiry} days'
       AND token_expires_at > NOW()
       ORDER BY token_expires_at ASC`
    );
    return result.rows;
  }

  static async getExpiredTokens() {
    const result = await db.query(
      `SELECT * FROM instagram_users
       WHERE token_expires_at < NOW()
       ORDER BY token_expires_at ASC`
    );
    return result.rows;
  }

  static get pool() {
    return db;
  }
}

module.exports = InstagramUser;
