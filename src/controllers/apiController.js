const InstagramUser = require('../models/InstagramUser');
const instagramService = require('../services/instagramService');

class ApiController {
  async getInstagramUserId(req, res) {
    const { facebookUserId } = req.params;

    if (!facebookUserId) {
      return res.status(400).json({
        success: false,
        error: 'Facebook User IDは必須です',
      });
    }

    try {
      const user = await InstagramUser.findByFacebookUserId(facebookUserId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '指定されたFacebook User IDは登録されていません。先にOAuth認証を行ってください。',
        });
      }

      const now = new Date();
      if (new Date(user.token_expires_at) < now) {
        return res.status(401).json({
          success: false,
          error: 'アクセストークンの有効期限が切れています。再認証してください。',
          tokenExpired: true,
        });
      }

      res.json({
        success: true,
        data: {
          instagramUserId: user.instagram_user_id,
          facebookPageId: user.facebook_page_id,
          instagramUsername: user.instagram_username,
          facebookPageName: user.facebook_page_name,
          accessToken: user.access_token,
          tokenExpiresAt: user.token_expires_at,
        },
      });
    } catch (error) {
      console.error('Get Instagram User ID error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
      });
    }
  }

  async getInstagramUserByPageId(req, res) {
    const { facebookPageId } = req.params;

    if (!facebookPageId) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Page IDは必須です',
      });
    }

    try {
      const result = await InstagramUser.pool.query(
        'SELECT * FROM instagram_users WHERE facebook_page_id = $1',
        [facebookPageId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '指定されたFacebook Page IDは登録されていません。先にOAuth認証を行ってください。',
        });
      }

      const now = new Date();
      if (new Date(user.token_expires_at) < now) {
        return res.status(401).json({
          success: false,
          error: 'アクセストークンの有効期限が切れています。再認証してください。',
          tokenExpired: true,
        });
      }

      res.json({
        success: true,
        data: {
          instagramUserId: user.instagram_user_id,
          facebookPageId: user.facebook_page_id,
          instagramUsername: user.instagram_username,
          facebookPageName: user.facebook_page_name,
          accessToken: user.access_token,
          tokenExpiresAt: user.token_expires_at,
        },
      });
    } catch (error) {
      console.error('Get Instagram User by Page ID error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await InstagramUser.getAll();

      res.json({
        success: true,
        count: users.length,
        data: users.map(u => ({
          instagramUserId: u.instagram_user_id,
          facebookPageId: u.facebook_page_id,
          instagramUsername: u.instagram_username,
          facebookPageName: u.facebook_page_name,
          accessToken: u.access_token,
          tokenExpiresAt: u.token_expires_at,
          createdAt: u.created_at,
        })),
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
      });
    }
  }

  // 特定ページのトークンを手動で延長
  async refreshToken(req, res) {
    const { facebookPageId } = req.params;

    if (!facebookPageId) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Page IDは必須です',
      });
    }

    try {
      const user = await InstagramUser.findByPageId(facebookPageId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '指定されたページが見つかりません',
        });
      }

      // トークンを延長
      const { accessToken, expiresAt } = await instagramService.refreshLongLivedToken(user.access_token);

      // DBを更新
      const updated = await InstagramUser.updateToken(facebookPageId, accessToken, expiresAt);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          facebookPageId: updated.facebook_page_id,
          facebookPageName: updated.facebook_page_name,
          instagramUsername: updated.instagram_username,
          accessToken: updated.access_token,
          tokenExpiresAt: updated.token_expires_at,
          previousExpiry: user.token_expires_at,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // 全トークンを一括延長
  async refreshAllTokens(req, res) {
    try {
      const users = await InstagramUser.getAll();
      const results = {
        success: [],
        failed: [],
      };

      for (const user of users) {
        try {
          const { accessToken, expiresAt } = await instagramService.refreshLongLivedToken(user.access_token);
          await InstagramUser.updateToken(user.facebook_page_id, accessToken, expiresAt);
          results.success.push({
            facebookPageId: user.facebook_page_id,
            facebookPageName: user.facebook_page_name,
            newExpiresAt: expiresAt,
          });
        } catch (error) {
          results.failed.push({
            facebookPageId: user.facebook_page_id,
            facebookPageName: user.facebook_page_name,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        message: `Refreshed ${results.success.length} tokens, ${results.failed.length} failed`,
        data: results,
      });
    } catch (error) {
      console.error('Refresh all tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
      });
    }
  }

  // 期限切れ間近のトークンを取得
  async getExpiringTokens(req, res) {
    const days = parseInt(req.query.days) || 30;

    try {
      const expiring = await InstagramUser.getExpiringTokens(days);
      const expired = await InstagramUser.getExpiredTokens();

      res.json({
        success: true,
        data: {
          expiring: expiring.map(u => ({
            facebookPageId: u.facebook_page_id,
            facebookPageName: u.facebook_page_name,
            instagramUsername: u.instagram_username,
            tokenExpiresAt: u.token_expires_at,
            daysUntilExpiry: Math.ceil((new Date(u.token_expires_at) - new Date()) / (1000 * 60 * 60 * 24)),
          })),
          expired: expired.map(u => ({
            facebookPageId: u.facebook_page_id,
            facebookPageName: u.facebook_page_name,
            instagramUsername: u.instagram_username,
            tokenExpiresAt: u.token_expires_at,
          })),
        },
      });
    } catch (error) {
      console.error('Get expiring tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
      });
    }
  }
}

module.exports = new ApiController();
