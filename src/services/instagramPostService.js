const axios = require('axios');

const FACEBOOK_GRAPH_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;

/**
 * Instagram Graph API を使用した投稿サービス
 *
 * 投稿フロー:
 * 1. createMediaContainer() - メディアコンテナ作成
 * 2. waitForContainerReady() - 処理完了待ち
 * 3. publishContainer() - 公開
 * 4. getMediaPermalink() - パーマリンク取得
 */
class InstagramPostService {
  /**
   * 単一画像をInstagramに投稿
   * @param {string} instagramUserId - Instagram Business Account ID
   * @param {string} accessToken - ページアクセストークン
   * @param {string} imageUrl - 公開アクセス可能な画像URL
   * @param {string} caption - 投稿キャプション（最大2200文字）
   * @returns {Promise<{mediaId: string, permalink: string}>}
   */
  async publishPhoto(instagramUserId, accessToken, imageUrl, caption) {
    try {
      // Step 1: メディアコンテナ作成
      const containerId = await this.createMediaContainer(
        instagramUserId,
        accessToken,
        imageUrl,
        caption
      );

      // Step 2: コンテナ処理完了待ち
      await this.waitForContainerReady(containerId, accessToken);

      // Step 3: メディア公開
      const mediaId = await this.publishContainer(
        instagramUserId,
        accessToken,
        containerId
      );

      // Step 4: パーマリンク取得
      const permalink = await this.getMediaPermalink(mediaId, accessToken);

      return { mediaId, permalink };
    } catch (error) {
      throw new Error(`Instagram投稿に失敗しました: ${error.message}`);
    }
  }

  /**
   * メディアコンテナを作成
   * @param {string} instagramUserId
   * @param {string} accessToken
   * @param {string} imageUrl
   * @param {string} caption
   * @returns {Promise<string>} コンテナID
   */
  async createMediaContainer(instagramUserId, accessToken, imageUrl, caption) {
    try {
      const response = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${instagramUserId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          },
        }
      );

      console.log('[IG Container Create] Response:', JSON.stringify(response.data));
      if (!response.data.id) {
        throw new Error('コンテナIDが返されませんでした');
      }

      return response.data.id;
    } catch (error) {
      console.error('[IG Container Create] Error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`メディアコンテナ作成に失敗: ${errorMessage}`);
    }
  }

  /**
   * コンテナの処理完了を待機
   * @param {string} containerId
   * @param {string} accessToken
   * @param {number} maxAttempts - 最大試行回数（デフォルト30回 = 約60秒）
   * @param {number} intervalMs - 試行間隔ミリ秒（デフォルト2000ms）
   * @returns {Promise<boolean>}
   */
  async waitForContainerReady(containerId, accessToken, maxAttempts = 30, intervalMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(
          `${FACEBOOK_GRAPH_URL}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken,
            },
          }
        );

        const status = response.data.status_code;
        console.log(`[IG Container] ID: ${containerId}, Status: ${status}, Attempt: ${attempt + 1}/${maxAttempts}`);

        if (status === 'FINISHED') {
          return true;
        }

        if (status === 'ERROR') {
          throw new Error('メディアコンテナの処理中にエラーが発生しました');
        }

        if (!status || status === 'EXPIRED') {
          throw new Error(`メディアコンテナのステータスが無効です: ${status || 'undefined'}`);
        }

        // IN_PROGRESS の場合は待機して再試行
        await this.sleep(intervalMs);
      } catch (error) {
        if (error.message.includes('メディアコンテナの処理中')) {
          throw error;
        }
        // ネットワークエラー等の場合は再試行
        await this.sleep(intervalMs);
      }
    }

    throw new Error('メディアコンテナの処理がタイムアウトしました');
  }

  /**
   * メディアコンテナを公開
   * @param {string} instagramUserId
   * @param {string} accessToken
   * @param {string} containerId
   * @returns {Promise<string>} メディアID
   */
  async publishContainer(instagramUserId, accessToken, containerId) {
    try {
      const response = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${instagramUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        }
      );

      console.log('[IG Publish] Response:', JSON.stringify(response.data));
      if (!response.data.id) {
        throw new Error(`メディアIDが返されませんでした: ${JSON.stringify(response.data)}`);
      }

      return response.data.id;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`メディア公開に失敗: ${errorMessage}`);
    }
  }

  /**
   * メディアのパーマリンクを取得
   * @param {string} mediaId
   * @param {string} accessToken
   * @returns {Promise<string>} パーマリンクURL
   */
  async getMediaPermalink(mediaId, accessToken) {
    try {
      const response = await axios.get(
        `${FACEBOOK_GRAPH_URL}/${mediaId}`,
        {
          params: {
            fields: 'permalink',
            access_token: accessToken,
          },
        }
      );

      return response.data.permalink || null;
    } catch (error) {
      // パーマリンク取得失敗は致命的ではないのでnullを返す
      console.error('パーマリンク取得に失敗:', error.message);
      return null;
    }
  }

  /**
   * 投稿制限（24時間で25件）を確認
   * @param {string} instagramUserId
   * @param {string} accessToken
   * @returns {Promise<{quotaUsage: number, config: object}>}
   */
  async checkPublishingLimit(instagramUserId, accessToken) {
    try {
      const response = await axios.get(
        `${FACEBOOK_GRAPH_URL}/${instagramUserId}/content_publishing_limit`,
        {
          params: {
            fields: 'quota_usage,config',
            access_token: accessToken,
          },
        }
      );

      return {
        quotaUsage: response.data.quota_usage || 0,
        config: response.data.config || { quota_total: 25 },
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`投稿制限の確認に失敗: ${errorMessage}`);
    }
  }

  /**
   * 指定ミリ秒待機
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new InstagramPostService();
