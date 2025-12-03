const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userLicenseController = require('../controllers/userLicenseController');
const { authenticateToken } = require('../middleware/jwtAuth');

// Public routes (no authentication required)

// Send verification email for new registration
router.post('/send-verification', userController.sendVerificationEmail);

// Verify email token
router.get('/verify-email/:token', userController.verifyEmailToken);

// Register new user
router.post('/register', userController.register);

// Login
router.post('/login', userController.login);

// Request password reset
router.post('/request-password-reset', userController.requestPasswordReset);

// Verify password reset token
router.get('/verify-reset-token/:token', userController.verifyPasswordResetToken);

// Reset password
router.post('/reset-password', userController.resetPassword);

// Protected routes (authentication required)

// Get current user profile
router.get('/profile', authenticateToken, userController.getProfile);

// Update password
router.put('/password', authenticateToken, userController.updatePassword);

// Update email
router.put('/email', authenticateToken, userController.updateEmail);

// License routes
router.post('/license/issue', authenticateToken, userLicenseController.issueLicense);
router.get('/license', authenticateToken, userLicenseController.getUserLicense);
router.post('/license/reset-domain', authenticateToken, userLicenseController.resetLicenseDomain);

module.exports = router;
