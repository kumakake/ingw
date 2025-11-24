/**
 * 管理者認証ミドルウェア（Basic認証）
 */

const adminAuth = (req, res, next) => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // 環境変数が設定されていない場合はエラー
  if (!adminUsername || !adminPassword) {
    console.error('ADMIN_USERNAME or ADMIN_PASSWORD not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="License Management"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Base64デコード
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  // 認証チェック
  if (username === adminUsername && password === adminPassword) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="License Management"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};

module.exports = adminAuth;
