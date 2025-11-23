const axios = require('axios');

const FACEBOOK_GRAPH_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;

class InstagramService {
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
  }

  getAuthUrl() {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'pages_manage_metadata',
      'business_management',
    ];

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
    });

    return `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code: code,
        },
      });

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      const expiresIn = response.data.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        expiresAt: expiresAt,
      };
    } catch (error) {
      throw new Error(`Failed to get long-lived token: ${error.message}`);
    }
  }

  async getUserPages(accessToken) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,instagram_business_account',
        },
      });

      console.log('API /me/accounts response:', JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error) {
      console.error('API /me/accounts error:', error.response?.data || error.message);
      throw new Error(`Failed to get user pages: ${error.message}`);
    }
  }

  async getInstagramAccountFromPage(pageId, pageAccessToken) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken,
        },
      });

      if (!response.data.instagram_business_account) {
        throw new Error('No Instagram Business Account connected to this page');
      }

      return response.data.instagram_business_account.id;
    } catch (error) {
      throw new Error(`Failed to get Instagram account: ${error.message}`);
    }
  }

  async getInstagramAccountInfo(instagramUserId, accessToken) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${instagramUserId}`, {
        params: {
          fields: 'id,username,name,profile_picture_url',
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Instagram account info: ${error.message}`);
    }
  }

  async refreshLongLivedToken(currentToken) {
    try {
      // Long-lived token を新しい long-lived token に交換
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: currentToken,
        },
      });

      const expiresIn = response.data.expires_in || 5184000; // デフォルト60日
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log(`Token refreshed. New expiration: ${expiresAt.toISOString()}`);

      return {
        accessToken: response.data.access_token,
        expiresAt: expiresAt,
      };
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getFacebookUserId(accessToken) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email',
        },
      });

      console.log('Authenticated Facebook user:', JSON.stringify(response.data, null, 2));
      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to get Facebook user ID: ${error.message}`);
    }
  }

  async completeOAuthFlow(code) {
    const shortLivedToken = await this.exchangeCodeForToken(code);
    const { accessToken, expiresAt } = await this.getLongLivedToken(shortLivedToken);
    const facebookUserId = await this.getFacebookUserId(accessToken);
    const pages = await this.getUserPages(accessToken);

    if (!pages || pages.length === 0) {
      throw new Error('No Facebook pages found. Please create a Facebook page and connect it to your Instagram Business Account.');
    }

    const results = [];

    for (const page of pages) {
      try {
        const instagramUserId = await this.getInstagramAccountFromPage(page.id, page.access_token);
        const instagramInfo = await this.getInstagramAccountInfo(instagramUserId, page.access_token);

        results.push({
          facebookUserId,
          accessToken: page.access_token,
          tokenExpiresAt: expiresAt,
          facebookPageId: page.id,
          facebookPageName: page.name,
          instagramUserId: instagramInfo.id,
          instagramUsername: instagramInfo.username,
        });
      } catch (error) {
        console.log(`Page ${page.name} has no Instagram account: ${error.message}`);
      }
    }

    if (results.length === 0) {
      throw new Error('No Instagram Business Accounts found on any of your pages');
    }

    return results;
  }
}

module.exports = new InstagramService();
