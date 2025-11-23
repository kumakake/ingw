const InstagramUser = require('../models/InstagramUser');
const instagramService = require('./instagramService');

class TokenScheduler {
  constructor() {
    this.intervalId = null;
    this.checkIntervalHours = 24; // 24時間ごとにチェック
    this.refreshBeforeDays = 30;  // 期限30日前から更新対象
  }

  async refreshExpiringTokens() {
    console.log(`[TokenScheduler] Checking for expiring tokens (within ${this.refreshBeforeDays} days)...`);

    try {
      const expiringUsers = await InstagramUser.getExpiringTokens(this.refreshBeforeDays);

      if (expiringUsers.length === 0) {
        console.log('[TokenScheduler] No expiring tokens found.');
        return { refreshed: 0, failed: 0 };
      }

      console.log(`[TokenScheduler] Found ${expiringUsers.length} expiring tokens.`);

      let refreshed = 0;
      let failed = 0;

      for (const user of expiringUsers) {
        try {
          const { accessToken, expiresAt } = await instagramService.refreshLongLivedToken(user.access_token);
          await InstagramUser.updateToken(user.facebook_page_id, accessToken, expiresAt);

          console.log(`[TokenScheduler] ✅ Refreshed token for ${user.facebook_page_name} (${user.instagram_username}). New expiry: ${expiresAt.toISOString()}`);
          refreshed++;
        } catch (error) {
          console.error(`[TokenScheduler] ❌ Failed to refresh token for ${user.facebook_page_name}: ${error.message}`);
          failed++;
        }

        // API レート制限対策: 各リクエスト間に1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[TokenScheduler] Completed. Refreshed: ${refreshed}, Failed: ${failed}`);
      return { refreshed, failed };
    } catch (error) {
      console.error('[TokenScheduler] Error during token refresh:', error);
      throw error;
    }
  }

  start() {
    if (this.intervalId) {
      console.log('[TokenScheduler] Already running.');
      return;
    }

    console.log(`[TokenScheduler] Started. Checking every ${this.checkIntervalHours} hours.`);

    // 起動時に一度チェック
    this.refreshExpiringTokens().catch(err => {
      console.error('[TokenScheduler] Initial check failed:', err);
    });

    // 定期実行
    this.intervalId = setInterval(() => {
      this.refreshExpiringTokens().catch(err => {
        console.error('[TokenScheduler] Scheduled check failed:', err);
      });
    }, this.checkIntervalHours * 60 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TokenScheduler] Stopped.');
    }
  }
}

module.exports = new TokenScheduler();
