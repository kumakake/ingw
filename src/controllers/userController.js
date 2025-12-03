const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const PasswordReset = require('../models/PasswordReset');
const emailService = require('../services/emailService');
const { generateToken } = require('../middleware/jwtAuth');

// Password validation
const validatePassword = (password) => {
  if (password.length < 12) {
    return { valid: false, message: 'パスワードは12文字以上で入力してください' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'パスワードには小文字を含めてください' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'パスワードには大文字を含めてください' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含めてください' };
  }
  return { valid: true };
};

// Login account validation
const validateLoginAccount = (loginAccount) => {
  if (!loginAccount || loginAccount.length < 3) {
    return { valid: false, message: 'ログインアカウントは3文字以上で入力してください' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(loginAccount)) {
    return { valid: false, message: 'ログインアカウントは英数字、ハイフン、アンダースコアのみ使用できます' };
  }
  return { valid: true };
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, message: '有効なメールアドレスを入力してください' };
  }
  return { valid: true };
};

// Send verification email for registration
const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.message
      });
    }

    // Create verification token
    const verification = await EmailVerification.create(email);

    // Send email
    await emailService.sendVerificationEmail(email, verification.token);

    res.json({
      success: true,
      message: '確認メールを送信しました。メールに記載されたURLからユーザー登録を完了してください。'
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({
      success: false,
      error: 'メール送信に失敗しました'
    });
  }
};

// Verify email token
const verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.params;

    const validation = await EmailVerification.isValid(token);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason === 'Token expired' 
          ? 'リンクの有効期限が切れています。再度メールアドレスを登録してください。'
          : validation.reason === 'Token already used'
          ? 'このリンクは既に使用されています。'
          : '無効なリンクです。'
      });
    }

    res.json({
      success: true,
      email: validation.email
    });
  } catch (error) {
    console.error('Verify email token error:', error);
    res.status(500).json({
      success: false,
      error: 'トークン検証に失敗しました'
    });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { token, loginAccount, password } = req.body;

    // Validate token
    const validation = await EmailVerification.isValid(token);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'トークンが無効または期限切れです。再度メールアドレスを登録してください。'
      });
    }

    // Validate login account
    const accountValidation = validateLoginAccount(loginAccount);
    if (!accountValidation.valid) {
      return res.status(400).json({
        success: false,
        error: accountValidation.message
      });
    }

    // Check if login account already exists
    const accountExists = await User.checkLoginAccountExists(loginAccount);
    if (accountExists) {
      return res.status(400).json({
        success: false,
        error: 'このログインアカウントは既に使用されています'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Create user
    const user = await User.create({
      loginAccount,
      password,
      email: validation.email
    });

    // Mark token as used
    await EmailVerification.markAsUsed(token);

    res.json({
      success: true,
      message: 'ユーザー登録が完了しました',
      user: {
        id: user.id,
        loginAccount: user.login_account
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー登録に失敗しました'
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { loginAccount, password } = req.body;

    if (!loginAccount || !password) {
      return res.status(400).json({
        success: false,
        error: 'ログインアカウントとパスワードを入力してください'
      });
    }

    // Find user
    const user = await User.findByLoginAccount(loginAccount);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'ログインアカウントまたはパスワードが正しくありません'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'ログインアカウントまたはパスワードが正しくありません'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        loginAccount: user.login_account,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'ログインに失敗しました'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const email = await User.getDecryptedEmail(req.user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        loginAccount: user.login_account,
        email,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan,
        subscriptionCurrentPeriodEnd: user.subscription_current_period_end,
        trialEnd: user.trial_end,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'プロファイル取得に失敗しました'
    });
  }
};

// Update password
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByLoginAccount(req.user.loginAccount);

    // Verify current password
    const isValidPassword = await User.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '現在のパスワードが正しくありません'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'パスワードを更新しました'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'パスワード更新に失敗しました'
    });
  }
};

// Update email
const updateEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    // Verify password
    const user = await User.findByLoginAccount(req.user.loginAccount);
    const isValidPassword = await User.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'パスワードが正しくありません'
      });
    }

    // Validate email
    const emailValidation = validateEmail(newEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.message
      });
    }

    // Update email
    await User.updateEmail(req.user.id, newEmail);

    res.json({
      success: true,
      message: 'メールアドレスを更新しました'
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({
      success: false,
      error: 'メールアドレス更新に失敗しました'
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { loginAccount } = req.body;

    if (!loginAccount) {
      return res.status(400).json({
        success: false,
        error: 'ログインアカウントを入力してください'
      });
    }

    // Find user
    const user = await User.findByLoginAccount(loginAccount);
    
    // Always return success to prevent account enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'パスワードリセットのメールを送信しました（アカウントが存在する場合）'
      });
    }

    // Create reset token
    const resetToken = await PasswordReset.create(user.id);

    // Get email and send reset email
    const email = await User.getDecryptedEmail(user.id);
    await emailService.sendPasswordResetEmail(email, resetToken.token, user.login_account);

    res.json({
      success: true,
      message: 'パスワードリセットのメールを送信しました'
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'パスワードリセットリクエストに失敗しました'
    });
  }
};

// Verify password reset token
const verifyPasswordResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const validation = await PasswordReset.isValid(token);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason === 'Token expired'
          ? 'リンクの有効期限が切れています。再度パスワードリセットをリクエストしてください。'
          : validation.reason === 'Token already used'
          ? 'このリンクは既に使用されています。'
          : '無効なリンクです。'
      });
    }

    res.json({
      success: true,
      loginAccount: validation.loginAccount
    });
  } catch (error) {
    console.error('Verify password reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'トークン検証に失敗しました'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate token
    const validation = await PasswordReset.isValid(token);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'トークンが無効または期限切れです。再度パスワードリセットをリクエストしてください。'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Update password
    await User.updatePassword(validation.userId, newPassword);

    // Mark token as used
    await PasswordReset.markAsUsed(token);

    res.json({
      success: true,
      message: 'パスワードをリセットしました。新しいパスワードでログインしてください。'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'パスワードリセットに失敗しました'
    });
  }
};

module.exports = {
  sendVerificationEmail,
  verifyEmailToken,
  register,
  login,
  getProfile,
  updatePassword,
  updateEmail,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPassword
};
