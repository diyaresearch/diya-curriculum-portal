/**
 * Entitlement grants backed by a verified Stripe payment (issue #422).
 *
 * Previously the subscription routes granted `teacherPlus` on the strength of
 * a request body — no Stripe call at all. These helpers make the two things
 * that matter explicit: the payment is real, and applying it twice does not
 * pay out twice.
 */

const PREMIUM_PLANS = ['premium', 'premiumYearly'];
const VALID_PLANS = [...PREMIUM_PLANS, 'enterprise'];

/** Role a plan entitles the holder to; null means "leave the role alone". */
function roleForPlan(planType) {
  if (PREMIUM_PLANS.includes(planType)) return 'teacherPlus';
  if (planType === 'enterprise') return 'teacherEnterprise';
  return null;
}

/** Subscription end date for a plan, measured from `from`. */
function subscriptionEndDate(planType, from = new Date()) {
  const end = new Date(from);
  if (planType === 'premiumYearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Retrieve a PaymentIntent and confirm it actually paid for this user.
 *
 * @returns {Promise<{ok: true, paymentIntent: Object} | {ok: false, status: number, message: string}>}
 */
async function verifyPaymentIntent(stripe, paymentIntentId, userId, expectedPlan) {
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return { ok: false, status: 400, message: 'Payment intent ID required' };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    // An id that Stripe does not recognise is a forgery attempt, not a server fault.
    return { ok: false, status: 400, message: 'Payment could not be verified' };
  }

  if (!paymentIntent || paymentIntent.status !== 'succeeded') {
    return {
      ok: false,
      status: 400,
      message: `Payment not completed${paymentIntent ? ` (status: ${paymentIntent.status})` : ''}`,
    };
  }

  // The payment must belong to the caller, or anyone could quote someone
  // else's successful intent.
  if (paymentIntent.metadata?.userId !== userId) {
    return { ok: false, status: 403, message: 'Payment verification failed' };
  }

  // ...and it must have been for the plan being claimed, or a monthly payment
  // could be redeemed for a yearly subscription.
  if (expectedPlan && paymentIntent.metadata?.planType !== expectedPlan) {
    return { ok: false, status: 400, message: 'Payment does not match the requested plan' };
  }

  return { ok: true, paymentIntent };
}

/**
 * Claim a PaymentIntent exactly once, using its id as the log document id.
 *
 * create() fails if the document exists, which makes the claim atomic: a
 * replayed confirmation loses the race and is told the payment was already
 * applied, instead of extending the subscription a second time.
 *
 * @returns {Promise<boolean>} true if this call won the claim
 */
async function claimPaymentIntent(db, logsTable, paymentIntentId, logEntry) {
  try {
    await db.collection(logsTable).doc(`confirm_${paymentIntentId}`).create(logEntry);
    return true;
  } catch (error) {
    // ALREADY_EXISTS (gRPC 6) means another request already applied this payment.
    if (error && (error.code === 6 || /already exists/i.test(error.message || ''))) {
      return false;
    }
    throw error;
  }
}

module.exports = {
  PREMIUM_PLANS,
  VALID_PLANS,
  roleForPlan,
  subscriptionEndDate,
  verifyPaymentIntent,
  claimPaymentIntent,
};
