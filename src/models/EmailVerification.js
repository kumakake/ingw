const db = require('../config/database');
const crypto = require('crypto');

class EmailVerification {
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(email) {
    const token = this.generateToken();
    const encryptionKey = process.env.PGP_ENCRYPTION_KEY;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await db.query(
      `INSERT INTO email_verifications (email_encrypted, token, expires_at)
       VALUES (pgp_sym_encrypt($1, $2), $3, $4)
       RETURNING id, token, expires_at`,
      [email, encryptionKey, token, expiresAt]
    );

    return result.rows[0];
  }

  static async findByToken(token) {
    const encryptionKey = process.env.PGP_ENCRYPTION_KEY;

    const result = await db.query(
      `SELECT id, pgp_sym_decrypt(email_encrypted, $1) as email, token, expires_at, used
       FROM email_verifications
       WHERE token = $2`,
      [encryptionKey, token]
    );

    return result.rows[0];
  }

  static async markAsUsed(token) {
    const result = await db.query(
      `UPDATE email_verifications SET used = true WHERE token = $1 RETURNING id`,
      [token]
    );

    return result.rows[0];
  }

  static async isValid(token) {
    const verification = await this.findByToken(token);
    
    if (!verification) return { valid: false, reason: 'Token not found' };
    if (verification.used) return { valid: false, reason: 'Token already used' };
    if (new Date(verification.expires_at) < new Date()) return { valid: false, reason: 'Token expired' };

    return { valid: true, email: verification.email };
  }

  static async cleanup() {
    // Delete expired and used tokens older than 7 days
    const result = await db.query(
      `DELETE FROM email_verifications 
       WHERE (expires_at < NOW() - INTERVAL '7 days') OR (used = true AND created_at < NOW() - INTERVAL '7 days')
       RETURNING id`
    );

    return result.rowCount;
  }
}

module.exports = EmailVerification;
