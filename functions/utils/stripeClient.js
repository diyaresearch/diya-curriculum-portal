/**
 * The one Stripe client (issues #422, #423, #439).
 *
 * There were three separate initializers before #439 collapsed the two
 * backends into this one, and they did not agree on which key to use:
 *
 *   - server/utils/stripeClient.js  read STRIPE_SECRET_KEY and nothing else,
 *     at require time. routes/subscription.js verified payments with it.
 *   - functions/routes/payment.js   had mode-aware selection (TEST/LIVE, plus
 *     the functions:config fallback) resolved per call.
 *   - functions/index.js            had a third copy of that selection for the
 *     webhook, subtly different again.
 *
 * With one backend serving both the payment routes and the webhook that
 * settles them, a disagreement about live-vs-test between those three is a
 * payment that is created against one Stripe account and confirmed against
 * another. This is the mode-aware version (the one the live webhook used),
 * kept as the single source.
 *
 * Resolution is per-call, not at require time, deliberately: Cloud Functions
 * binds secrets to the process after module load, so a client captured at
 * require time can be built from a key that is not populated yet.
 */

const functions = require("firebase-functions");

function isTruthy(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Read a dotted path out of the legacy `functions.config()` tree, which is
 * absent outside a deployed function and throws rather than returning
 * undefined when it is.
 */
function getFunctionsConfig(path, fallback = "") {
  try {
    const cfg = functions.config?.() || {};
    return (
      path
        .split(".")
        .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), cfg) ?? fallback
    );
  } catch (_) {
    return fallback;
  }
}

/**
 * Default to TEST unless explicitly forced to LIVE, via either
 * `firebase functions:config:set stripe.livemode=true` or STRIPE_LIVEMODE.
 * Defaulting the other way would mean a misconfigured deploy takes real money.
 */
function getStripeSecretKey() {
  const forceLive = isTruthy(
    getFunctionsConfig("stripe.livemode", process.env.STRIPE_LIVEMODE || "")
  );

  const key =
    (forceLive
      ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY) ||
    // Last resort: whichever mode-specific key is present at all.
    process.env.STRIPE_SECRET_KEY_LIVE ||
    process.env.STRIPE_SECRET_KEY_TEST ||
    "";

  return String(key || "").trim();
}

// Keyed by secret so a mode flip mid-process builds a new client rather than
// handing back one pointed at the other account.
const stripeClientCache = new Map();

/** @returns {Object|null} the Stripe client, or null when no key is configured. */
function getStripe() {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (stripeClientCache.has(key)) return stripeClientCache.get(key);

  try {
    const client = require("stripe")(key);
    stripeClientCache.set(key, client);
    return client;
  } catch (error) {
    console.error("Failed to initialize Stripe:", error.message);
    return null;
  }
}

/**
 * Reject the request when Stripe is unconfigured, rather than proceeding
 * without it. Also attaches the client as `req.stripe` — routes/payment.js
 * reads it that way, routes/subscription.js calls getStripe() directly, and
 * both styles stay valid.
 */
function requireStripe(req, res, next) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({
      success: false,
      error: {
        code: "PAYMENT_SERVICE_UNAVAILABLE",
        message: "Payment service is currently unavailable. Please contact support.",
        details: "Stripe is not configured on this server.",
      },
    });
  }
  req.stripe = stripe;
  next();
}

module.exports = { getStripe, requireStripe, getStripeSecretKey, getFunctionsConfig };
