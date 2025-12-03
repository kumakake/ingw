const Stripe = require('stripe');
const User = require('../models/User');

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.priceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
    this.priceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;
  }

  async createCustomer(email, loginAccount) {
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        login_account: loginAccount
      }
    });

    return customer;
  }

  async getOrCreateCustomer(userId) {
    const user = await User.findById(userId);
    
    if (user.stripe_customer_id) {
      try {
        const customer = await this.stripe.customers.retrieve(user.stripe_customer_id);
        if (!customer.deleted) {
          return customer;
        }
      } catch (error) {
        console.error('Error retrieving Stripe customer:', error.message);
      }
    }

    // Create new customer
    const email = await User.getDecryptedEmail(userId);
    const customer = await this.createCustomer(email, user.login_account);
    await User.updateStripeCustomerId(userId, customer.id);

    return customer;
  }

  async createCheckoutSession(userId, plan) {
    const customer = await this.getOrCreateCustomer(userId);
    const priceId = plan === 'yearly' ? this.priceIdYearly : this.priceIdMonthly;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30, // 1ヶ月無料トライアル
        metadata: {
          user_id: userId.toString(),
          plan: plan
        }
      },
      success_url: `${baseUrl}/user/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${baseUrl}/user/dashboard?status=canceled`,
      metadata: {
        user_id: userId.toString(),
        plan: plan
      }
    });

    return session;
  }

  async createBillingPortalSession(userId) {
    const user = await User.findById(userId);
    
    if (!user.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/user/dashboard`
    });

    return session;
  }

  async handleWebhook(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Debug logging
    console.log('Webhook received:');
    console.log('- Signature present:', !!signature);
    console.log('- Webhook secret configured:', !!webhookSecret);
    console.log('- Payload type:', typeof payload);
    console.log('- Payload is Buffer:', Buffer.isBuffer(payload));
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new Error('Webhook secret not configured');
    }
    
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log('Webhook event verified:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      console.error('- Signature:', signature?.substring(0, 50) + '...');
      throw new Error('Webhook signature verification failed');
    }

    return this.processWebhookEvent(event);
  }

  async processWebhookEvent(event) {
    const { type, data } = event;

    switch (type) {
      case 'checkout.session.completed': {
        const session = data.object;
        await this.handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = data.object;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = data.object;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = data.object;
        await this.handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = data.object;
        await this.handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return { received: true };
  }

  async handleCheckoutCompleted(session) {
    const userId = parseInt(session.metadata?.user_id);
    if (!userId) {
      console.error('No user_id in checkout session metadata');
      return;
    }

    // Subscription details will be updated via subscription.created/updated events
    console.log(`Checkout completed for user ${userId}`);
  }

  async handleSubscriptionUpdate(subscription) {
    const customerId = subscription.customer;
    const user = await User.findByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Determine plan from price
    let plan = 'unknown';
    if (subscription.items?.data?.[0]?.price?.id === this.priceIdMonthly) {
      plan = 'monthly';
    } else if (subscription.items?.data?.[0]?.price?.id === this.priceIdYearly) {
      plan = 'yearly';
    }

    await User.updateSubscription(user.id, {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlan: plan,
      currentPeriodEnd: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null,
      trialEnd: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    });

    console.log(`Subscription updated for user ${user.id}: ${subscription.status}, cancelAtPeriodEnd: ${subscription.cancel_at_period_end}`);
  }

  async handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;
    const user = await User.findByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    await User.updateSubscription(user.id, {
      subscriptionId: null,
      subscriptionStatus: 'canceled',
      subscriptionPlan: null,
      currentPeriodEnd: null,
      trialEnd: null
    });

    console.log(`Subscription deleted for user ${user.id}`);
  }

  async handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    const user = await User.findByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Update subscription status to past_due or unpaid
    if (user.subscription_id) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(user.subscription_id);
        await User.updateSubscription(user.id, {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionPlan: user.subscription_plan,
          currentPeriodEnd: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000) 
            : null,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null
        });
      } catch (error) {
        console.error('Error updating subscription after payment failure:', error);
      }
    }

    console.log(`Payment failed for user ${user.id}`);
  }

  async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    const user = await User.findByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    console.log(`Payment succeeded for user ${user.id}`);
  }

  async getSubscriptionStatus(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      return null;
    }

    return {
      status: user.subscription_status,
      plan: user.subscription_plan,
      currentPeriodEnd: user.subscription_current_period_end,
      trialEnd: user.trial_end,
      cancelAtPeriodEnd: user.cancel_at_period_end || false,
      isActive: await User.hasActiveSubscription(userId)
    };
  }

  async cancelSubscription(userId) {
    const user = await User.findById(userId);

    if (!user || !user.subscription_id) {
      throw new Error('No active subscription found');
    }

    const subscription = await this.stripe.subscriptions.update(user.subscription_id, {
      cancel_at_period_end: true
    });

    return subscription;
  }

  async updateSubscriptionPlan(userId, newPlan) {
    const user = await User.findById(userId);

    if (!user || !user.subscription_id) {
      throw new Error('No active subscription found');
    }

    // 現在のサブスクリプションを取得してアイテムIDを取得
    const currentSubscription = await this.stripe.subscriptions.retrieve(user.subscription_id);

    const newPriceId = newPlan === 'yearly'
      ? this.priceIdYearly
      : this.priceIdMonthly;

    // プラン変更（日割り計算なし）
    const subscription = await this.stripe.subscriptions.update(
      user.subscription_id,
      {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'none'
      }
    );

    return subscription;
  }
}

module.exports = new StripeService();
