const InstagramUser = require('../models/InstagramUser');
const instagramService = require('./instagramService');
const { createLogger } = require('../config/logger');
const logger = createLogger('scheduler');

class TokenScheduler {
  constructor() {
    this.intervalId = null;
    this.checkIntervalHours = 24; // 24時間ごとにチェック
    this.refreshBeforeDays = 30;  // 期限30日前から更新対象
  }

  async refreshExpiringTokens() {
    logger.info({ refreshBeforeDays: this.refreshBeforeDays }, 'Checking for expiring tokens');

    try {
      const expiringUsers = await InstagramUser.getExpiringTokens(this.refreshBeforeDays);

      if (expiringUsers.length === 0) {
        logger.info('No expiring tokens found');
        return { refreshed: 0, failed: 0 };
      }

      logger.info({ count: expiringUsers.length }, 'Found expiring tokens');

      let refreshed = 0;
      let failed = 0;

      for (const user of expiringUsers) {
        try {
          const { accessToken, expiresAt } = await instagramService.refreshLongLivedToken(user.access_token);
          await InstagramUser.updateToken(user.facebook_page_id, accessToken, expiresAt);

          logger.info({ pageName: user.facebook_page_name, instagramUsername: user.instagram_username, newExpiry: expiresAt.toISOString() }, 'Token refreshed successfully');
          refreshed++;
        } catch (error) {
          logger.error({ err: error, pageName: user.facebook_page_name }, 'Failed to refresh token');
          failed++;
        }

        // API レート制限対策: 各リクエスト間に1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info({ refreshed, failed }, 'Token refresh completed');
      return { refreshed, failed };
    } catch (error) {
      logger.error({ err: error }, 'Error during token refresh');
      throw error;
    }
  }

  start() {
    if (this.intervalId) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info({ intervalHours: this.checkIntervalHours }, 'Token scheduler started');

    // 起動時に一度チェック
    this.refreshExpiringTokens().catch(err => {
      logger.error({ err }, 'Initial token check failed');
    });

    // 定期実行
    this.intervalId = setInterval(() => {
      this.refreshExpiringTokens().catch(err => {
        logger.error({ err }, 'Scheduled token check failed');
      });
    }, this.checkIntervalHours * 60 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Token scheduler stopped');
    }
  }
}

module.exports = new TokenScheduler();
