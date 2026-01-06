const db = require('../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

class User {
  static async findById(id) {
    const result = await db.query(
      'SELECT id, login_account, user_no, stripe_customer_id, subscription_status, subscription_id, subscription_plan, subscription_current_period_end, trial_end, cancel_at_period_end, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByLoginAccount(loginAccount) {
    const result = await db.query(
      'SELECT * FROM users WHERE login_account = $1',
      [loginAccount]
    );
    return result.rows[0];
  }

  static async findByStripeCustomerId(stripeCustomerId) {
    const result = await db.query(
      'SELECT * FROM users WHERE stripe_customer_id = $1',
      [stripeCustomerId]
    );
    return result.rows[0];
  }

  /**
   * 利用者No（YYMM999999形式）を自動生成
   * 重複チェックしながら一意の番号を生成
   */
  static async generateUserNo() {
    const now = new Date();
    const yymm = String(now.getFullYear()).slice(-2) +
                 String(now.getMonth() + 1).padStart(2, '0');

    let userNo;
    let exists = true;
    while (exists) {
      const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      userNo = yymm + random;
      const check = await db.query(
        'SELECT 1 FROM users WHERE user_no = $1', [userNo]
      );
      exists = check.rows.length > 0;
    }
    return userNo;
  }

  static async create(userData) {
    const { loginAccount, password, email } = userData;
    const encryptionKey = process.env.PGP_ENCRYPTION_KEY;

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate user_no (YYMM999999 format)
    const userNo = await this.generateUserNo();

    const result = await db.query(
      `INSERT INTO users (login_account, password_hash, email_encrypted, user_no)
       VALUES ($1, $2, pgp_sym_encrypt($3, $4), $5)
       RETURNING id, login_account, user_no, created_at`,
      [loginAccount, passwordHash, email, encryptionKey, userNo]
    );

    return result.rows[0];
  }

  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    const result = await db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, login_account, updated_at`,
      [passwordHash, userId]
    );

    return result.rows[0];
  }

  static async updateEmail(userId, newEmail) {
    const encryptionKey = process.env.PGP_ENCRYPTION_KEY;

    const result = await db.query(
      `UPDATE users SET email_encrypted = pgp_sym_encrypt($1, $2), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, login_account, updated_at`,
      [newEmail, encryptionKey, userId]
    );

    return result.rows[0];
  }

  static async getDecryptedEmail(userId) {
    const encryptionKey = process.env.PGP_ENCRYPTION_KEY;

    const result = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM users WHERE id = $2`,
      [encryptionKey, userId]
    );

    return result.rows[0]?.email;
  }

  static async updateStripeCustomerId(userId, stripeCustomerId) {
    const result = await db.query(
      `UPDATE users SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, login_account, stripe_customer_id`,
      [stripeCustomerId, userId]
    );

    return result.rows[0];
  }

  static async updateSubscription(userId, subscriptionData) {
    const {
      subscriptionId,
      subscriptionStatus,
      subscriptionPlan,
      currentPeriodEnd,
      trialEnd,
      cancelAtPeriodEnd = false
    } = subscriptionData;

    const result = await db.query(
      `UPDATE users SET 
         subscription_id = $1,
         subscription_status = $2,
         subscription_plan = $3,
         subscription_current_period_end = $4,
         trial_end = $5,
         cancel_at_period_end = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, login_account, subscription_status, subscription_plan, cancel_at_period_end`,
      [subscriptionId, subscriptionStatus, subscriptionPlan, currentPeriodEnd, trialEnd, cancelAtPeriodEnd, userId]
    );

    return result.rows[0];
  }

  static async hasActiveSubscription(userId) {
    const result = await db.query(
      `SELECT subscription_status, subscription_current_period_end, trial_end,
              manual_subscription_enabled, manual_subscription_end
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return false;

    const now = new Date();
    const {
      subscription_status,
      subscription_current_period_end,
      trial_end,
      manual_subscription_enabled,
      manual_subscription_end
    } = user;

    // Check manual subscription first (priority)
    if (manual_subscription_enabled) {
      // If no end date, it's unlimited
      if (!manual_subscription_end) {
        return true;
      }
      // If end date exists and is in the future
      if (new Date(manual_subscription_end) > now) {
        return true;
      }
    }

    // Check if user is in trial period
    if (subscription_status === 'trialing' && trial_end && new Date(trial_end) > now) {
      return true;
    }

    // Check if user has active subscription
    if (subscription_status === 'active' && subscription_current_period_end && new Date(subscription_current_period_end) > now) {
      return true;
    }

    return false;
  }

  /**
   * 手動サブスクリプションを有効化
   * @param {number} userId - ユーザーID
   * @param {Date|null} endDate - 有効期限（nullの場合は無期限）
   * @param {string|null} note - 備考
   */
  static async setManualSubscription(userId, endDate = null, note = null) {
    const result = await db.query(
      `UPDATE users SET
         manual_subscription_enabled = true,
         manual_subscription_end = $1,
         manual_subscription_note = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, login_account, manual_subscription_enabled, manual_subscription_end, manual_subscription_note`,
      [endDate, note, userId]
    );
    return result.rows[0];
  }

  /**
   * 手動サブスクリプションを無効化
   * @param {number} userId - ユーザーID
   */
  static async disableManualSubscription(userId) {
    const result = await db.query(
      `UPDATE users SET
         manual_subscription_enabled = false,
         manual_subscription_end = NULL,
         manual_subscription_note = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, login_account, manual_subscription_enabled`,
      [userId]
    );
    return result.rows[0];
  }

  static async checkLoginAccountExists(loginAccount) {
    const result = await db.query(
      'SELECT id FROM users WHERE login_account = $1',
      [loginAccount]
    );
    return result.rows.length > 0;
  }
}

module.exports = User;
