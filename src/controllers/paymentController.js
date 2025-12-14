const stripeService = require('../services/stripeService');
const User = require('../models/User');
const { createLogger } = require('../config/logger');
const logger = createLogger('payment');

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'プランは monthly または yearly を指定してください'
      });
    }

    // Check if user already has active subscription
    const hasSubscription = await User.hasActiveSubscription(req.user.id);
    if (hasSubscription) {
      return res.status(400).json({
        success: false,
        error: '既に有効なサブスクリプションがあります'
      });
    }

    const session = await stripeService.createCheckoutSession(req.user.id, plan);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Create checkout session error');
    res.status(500).json({
      success: false,
      error: '決済セッションの作成に失敗しました'
    });
  }
};

// Create billing portal session
const createBillingPortalSession = async (req, res) => {
  try {
    const session = await stripeService.createBillingPortalSession(req.user.id);

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Create billing portal session error');
    
    if (error.message === 'No Stripe customer found') {
      return res.status(400).json({
        success: false,
        error: 'Stripe顧客情報が見つかりません。まずサブスクリプションを開始してください。'
      });
    }

    res.status(500).json({
      success: false,
      error: 'ポータルセッションの作成に失敗しました'
    });
  }
};

// Get subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const status = await stripeService.getSubscriptionStatus(req.user.id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    res.json({
      success: true,
      subscription: status
    });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Get subscription status error');
    res.status(500).json({
      success: false,
      error: 'サブスクリプション状態の取得に失敗しました'
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    await stripeService.cancelSubscription(req.user.id);

    res.json({
      success: true,
      message: 'サブスクリプションは現在の期間終了後にキャンセルされます'
    });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Cancel subscription error');

    if (error.message === 'No active subscription found') {
      return res.status(400).json({
        success: false,
        error: '有効なサブスクリプションがありません'
      });
    }

    res.status(500).json({
      success: false,
      error: 'サブスクリプションのキャンセルに失敗しました'
    });
  }
};

// Change subscription plan
const changePlan = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'プランは monthly または yearly を指定してください'
      });
    }

    // 現在のプランと同じ場合はエラー
    const status = await stripeService.getSubscriptionStatus(req.user.id);
    if (status.plan === plan) {
      return res.status(400).json({
        success: false,
        error: '既に同じプランです'
      });
    }

    const subscription = await stripeService.updateSubscriptionPlan(req.user.id, plan);

    res.json({
      success: true,
      message: 'プランを変更しました',
      subscription: {
        plan: plan,
        status: subscription.status
      }
    });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Change plan error');

    if (error.message === 'No active subscription found') {
      return res.status(400).json({
        success: false,
        error: '有効なサブスクリプションがありません'
      });
    }

    res.status(500).json({
      success: false,
      error: 'プラン変更に失敗しました'
    });
  }
};

// Handle Stripe webhook
const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const result = await stripeService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Webhook error');
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Handle Stripe webhook - direct call from app.js
const handleWebhookDirect = async (payload, signature) => {
  return stripeService.handleWebhook(payload, signature);
};

module.exports = {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
  changePlan,
  handleWebhook,
  handleWebhookDirect
};
