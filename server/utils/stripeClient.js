/**
 * Shared Stripe client (issues #422, #423).
 *
 * Stripe was initialized inside routes/payment.js, so routes/subscription.js
 * had no way to verify a payment and simply granted entitlements on trust.
 * Both routers now share this one instance.
 */

let stripe = null;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not defined. Payment features will be disabled.');
  console.warn('   Set STRIPE_SECRET_KEY in your environment file to enable payment functionality.');
} else {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error.message);
    console.warn('⚠️  Payment features will be disabled.');
  }
}

/** Reject requests when Stripe is unconfigured, rather than proceeding without it. */
const requireStripe = (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: 'Payment service is currently unavailable. Please contact support.',
        details: 'Stripe is not configured on this server.'
      }
    });
  }
  next();
};

function getStripe() {
  return stripe;
}

module.exports = { getStripe, requireStripe };
