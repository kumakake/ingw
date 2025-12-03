const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/jwtAuth');

// Webhook endpoint (must be before JSON body parser for raw body)
// This is handled separately in app.js

// Protected routes (authentication required)

// Create checkout session
router.post('/create-checkout-session', authenticateToken, paymentController.createCheckoutSession);

// Create billing portal session
router.post('/billing-portal', authenticateToken, paymentController.createBillingPortalSession);

// Get subscription status
router.get('/subscription-status', authenticateToken, paymentController.getSubscriptionStatus);

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, paymentController.cancelSubscription);

// Change subscription plan
router.post('/change-plan', authenticateToken, paymentController.changePlan);

module.exports = router;
