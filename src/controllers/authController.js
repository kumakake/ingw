const instagramService = require('../services/instagramService');
const InstagramUser = require('../models/InstagramUser');

class AuthController {
  async login(req, res) {
    try {
      const authUrl = instagramService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to initiate authentication' });
    }
  }

  async callback(req, res) {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.redirect('/?error=No authorization code received');
    }

    try {
      const results = await instagramService.completeOAuthFlow(code);

      for (const result of results) {
        await InstagramUser.upsert(result);
      }

      const resultData = results.map(r => ({
        accessToken: r.accessToken,
        tokenExpiresAt: r.tokenExpiresAt,
        facebookPageName: r.facebookPageName,
        instagramUsername: r.instagramUsername,
        instagramUserId: r.instagramUserId,
        facebookPageId: r.facebookPageId,
      }));

      const encodedData = encodeURIComponent(JSON.stringify(resultData));
      res.redirect(`/?success=true&data=${encodedData}`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
  }

  async getStatus(req, res) {
    try {
      const users = await InstagramUser.getAll();
      res.json({
        success: true,
        count: users.length,
        users: users.map(u => ({
          facebookPageName: u.facebook_page_name,
          instagramUsername: u.instagram_username,
          instagramUserId: u.instagram_user_id,
          facebookPageId: u.facebook_page_id,
          tokenExpiresAt: u.token_expires_at,
          createdAt: u.created_at,
        })),
      });
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({ error: 'Failed to retrieve status' });
    }
  }
}

module.exports = new AuthController();
