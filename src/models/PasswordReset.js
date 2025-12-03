const db = require('../config/database');
const crypto = require('crypto');

class PasswordReset {
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(userId) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Invalidate any existing reset tokens for this user
    await db.query(
      `UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false`,
      [userId]
    );

    const result = await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, token, expires_at`,
      [userId, token, expiresAt]
    );

    return result.rows[0];
  }

  static async findByToken(token) {
    const result = await db.query(
      `SELECT pr.id, pr.user_id, pr.token, pr.expires_at, pr.used, u.login_account
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1`,
      [token]
    );

    return result.rows[0];
  }

  static async markAsUsed(token) {
    const result = await db.query(
      `UPDATE password_resets SET used = true WHERE token = $1 RETURNING id`,
      [token]
    );

    return result.rows[0];
  }

  static async isValid(token) {
    const reset = await this.findByToken(token);
    
    if (!reset) return { valid: false, reason: 'Token not found' };
    if (reset.used) return { valid: false, reason: 'Token already used' };
    if (new Date(reset.expires_at) < new Date()) return { valid: false, reason: 'Token expired' };

    return { valid: true, userId: reset.user_id, loginAccount: reset.login_account };
  }

  static async cleanup() {
    // Delete expired and used tokens older than 7 days
    const result = await db.query(
      `DELETE FROM password_resets 
       WHERE (expires_at < NOW() - INTERVAL '7 days') OR (used = true AND created_at < NOW() - INTERVAL '7 days')
       RETURNING id`
    );

    return result.rowCount;
  }
}

module.exports = PasswordReset;
