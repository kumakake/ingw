const InstagramUser = require('../models/InstagramUser');
const PostHistory = require('../models/PostHistory');
const instagramPostService = require('../services/instagramPostService');

/**
 * Instagram投稿APIコントローラー
 */
class PostController {
  /**
   * Instagramに画像を投稿
   * POST /api/post/instagram
   */
  async postToInstagram(req, res) {
    const { facebookPageId, imageUrl, caption, wordpressPostId } = req.body;

    // バリデーション
    if (!facebookPageId) {
      return res.status(400).json({
        success: false,
        error: 'facebookPageIdは必須です',
        code: 'MISSING_PARAMS',
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrlは必須です',
        code: 'MISSING_PARAMS',
      });
    }

    if (!caption) {
      return res.status(400).json({
        success: false,
        error: 'captionは必須です',
        code: 'MISSING_PARAMS',
      });
    }

    // キャプション長チェック（Instagram制限: 2200文字）
    if (caption.length > 2200) {
      return res.status(400).json({
        success: false,
        error: 'キャプションは2200文字以内にしてください',
        code: 'CAPTION_TOO_LONG',
      });
    }

    try {
      // Instagramアカウント情報取得
      const igUser = await InstagramUser.findByPageId(facebookPageId);

      if (!igUser) {
        return res.status(404).json({
          success: false,
          error: '指定されたFacebook Page IDは登録されていません。先にOAuth認証を行ってください。',
          code: 'IG_USER_NOT_FOUND',
        });
      }

      // トークン有効期限確認
      const now = new Date();
      if (new Date(igUser.token_expires_at) < now) {
        return res.status(401).json({
          success: false,
          error: 'アクセストークンの有効期限が切れています。再認証してください。',
          code: 'TOKEN_EXPIRED',
          tokenExpired: true,
        });
      }

      // 投稿制限確認（24時間で25件）
      const limit = await instagramPostService.checkPublishingLimit(
        igUser.instagram_user_id,
        igUser.access_token
      );

      if (limit.quotaUsage >= 25) {
        return res.status(429).json({
          success: false,
          error: '24時間の投稿上限（25件）に達しています。しばらく待ってから再試行してください。',
          code: 'RATE_LIMIT_EXCEEDED',
          quotaUsage: limit.quotaUsage,
        });
      }

      // Instagram投稿実行
      const { mediaId, permalink } = await instagramPostService.publishPhoto(
        igUser.instagram_user_id,
        igUser.access_token,
        imageUrl,
        caption
      );

      // 履歴保存
      await PostHistory.create({
        license_id: req.license?.id || null,
        facebook_page_id: facebookPageId,
        instagram_media_id: mediaId,
        wordpress_post_id: wordpressPostId || null,
        caption: caption,
        image_url: imageUrl,
        permalink: permalink,
      });

      res.json({
        success: true,
        data: {
          instagramMediaId: mediaId,
          permalink: permalink,
          postedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Instagram post error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Instagram投稿に失敗しました',
        code: 'PUBLISH_ERROR',
      });
    }
  }

  /**
   * 投稿履歴を取得
   * GET /api/post/history
   */
  async getHistory(req, res) {
    const { facebookPageId, limit = 20, offset = 0 } = req.query;

    try {
      const licenseId = req.license?.id;

      if (!licenseId) {
        return res.status(401).json({
          success: false,
          error: 'ライセンス情報が取得できません',
          code: 'LICENSE_REQUIRED',
        });
      }

      const history = await PostHistory.findByLicenseId(
        licenseId,
        facebookPageId || null,
        parseInt(limit, 10),
        parseInt(offset, 10)
      );

      const total = await PostHistory.count(licenseId, facebookPageId || null);

      res.json({
        success: true,
        data: {
          items: history,
          total: total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
        },
      });
    } catch (error) {
      console.error('Get post history error:', error);
      res.status(500).json({
        success: false,
        error: 'サーバー内部エラーが発生しました',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * 投稿制限を確認
   * GET /api/post/limit/:facebookPageId
   */
  async checkLimit(req, res) {
    const { facebookPageId } = req.params;

    if (!facebookPageId) {
      return res.status(400).json({
        success: false,
        error: 'facebookPageIdは必須です',
        code: 'MISSING_PARAMS',
      });
    }

    try {
      const igUser = await InstagramUser.findByPageId(facebookPageId);

      if (!igUser) {
        return res.status(404).json({
          success: false,
          error: '指定されたFacebook Page IDは登録されていません。',
          code: 'IG_USER_NOT_FOUND',
        });
      }

      // トークン有効期限確認
      const now = new Date();
      if (new Date(igUser.token_expires_at) < now) {
        return res.status(401).json({
          success: false,
          error: 'アクセストークンの有効期限が切れています。',
          code: 'TOKEN_EXPIRED',
          tokenExpired: true,
        });
      }

      const limit = await instagramPostService.checkPublishingLimit(
        igUser.instagram_user_id,
        igUser.access_token
      );

      res.json({
        success: true,
        data: {
          quotaUsage: limit.quotaUsage,
          quotaTotal: limit.config.quota_total || 25,
          remaining: Math.max(0, (limit.config.quota_total || 25) - limit.quotaUsage),
        },
      });
    } catch (error) {
      console.error('Check publishing limit error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '投稿制限の確認に失敗しました',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

module.exports = new PostController();
