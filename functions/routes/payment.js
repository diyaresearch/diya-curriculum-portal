const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const { databaseService } = require("../services/databaseService");

const router = express.Router();
const functions = require("firebase-functions");

function getDb() {
  const admin = require("firebase-admin");
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function getFunctionsConfig(path, fallback = "") {
  try {
    const cfg = functions.config?.() || {};
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), cfg) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function resolveSchemaQualifier() {
  const explicit = String(process.env.DATABASE_SCHEMA_QUALIFIER || "").trim();
  if (explicit) return explicit;
  // When using Stripe test keys (typical for localhost dev), use non-prod collections.
  const key = String(getStripeSecretKey() || "");
  if (key.startsWith("sk_live_")) return "prod.";
  return "";
}

function normalizeBasename(value, fallback) {
  const raw = String(value || "").trim() || fallback;
  const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeading.replace(/\/+$/, "");
}

function joinDomainAndBasename(domain, basename) {
  const d = String(domain || "").replace(/\/+$/, "");
  if (!d) return "";
  if (d.endsWith(basename)) return d;
  return `${d}${basename}`;
}


// Validate and initialize Stripe with secret key from environment
function isTruthy(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function getStripeSecretKey() {
  // Default to TEST unless explicitly forced to LIVE.
  // You can set this via:
  // - functions config: firebase functions:config:set stripe.livemode=true
  // - environment: STRIPE_LIVEMODE=true
  const forceLive = isTruthy(getFunctionsConfig("stripe.livemode", process.env.STRIPE_LIVEMODE || ""));

  const key =
    (forceLive
      ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY) ||
    // fallback
    process.env.STRIPE_SECRET_KEY_LIVE ||
    process.env.STRIPE_SECRET_KEY_TEST ||
    "";

  return String(key || "").trim();
}

const stripeClientCache = new Map();
function getStripeClient() {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (stripeClientCache.has(key)) return stripeClientCache.get(key);
  try {
    const client = require("stripe")(key);
    stripeClientCache.set(key, client);
    return client;
  } catch (error) {
    console.error("❌ Failed to initialize Stripe:", error.message);
    return null;
  }
}

const SCHEMA_QUALIFIER = resolveSchemaQualifier();
const TABLE_USERS = SCHEMA_QUALIFIER + "users";
const TABLE_PAYMENT_LOGS = SCHEMA_QUALIFIER + "payment_logs";

// Middleware to check if Stripe is available
const requireStripe = (req, res, next) => {
    const stripe = getStripeClient();
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
    req.stripe = stripe;
    next();
};

// Test endpoint for payment system
router.get("/test", (req, res) => {
    res.json({
        message: "Payment routes are working!",
        timestamp: new Date().toISOString(),
        endpoints: [
            "POST /create-payment-intent (requires auth)",
            "POST /confirm-payment (requires auth)",
            "POST /webhook",
            "GET /history (requires auth)",
            "GET /test"
        ]
    });
});

// Create payment intent for premium subscription
router.post("/create-payment-intent", authenticateUser, requireStripe, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { planType } = req.body;

        // Accept both premium variants
        if (!planType || !['premium', 'premiumYearly'].includes(planType)) {
            return res.status(400).json({ message: "Invalid plan type" });
        }

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Use the hierarchical user lookup from databaseService
        const { ref: userRef, snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();

        // Set amount based on plan type
        const amount = planType === 'premiumYearly' ? 10000 : 999; // $100.00 or $9.99 in cents

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: userId,
                planType: planType,
                userEmail: userData.email,
                upgradeFrom: userData.subscriptionType || 'basic'
            }
        });

        // Log payment intent creation
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'payment_intent_created',
            fromPlan: userData.subscriptionType || 'basic',
            toPlan: planType,
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'payment_intent_created',
            paymentIntentId: paymentIntent.id,
            amount: amount,
            currency: 'usd',
            userEmail: userData.email
        });

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error("Error creating payment intent:", error);

        // Log the error
        if (req.user?.uid) {
            await databaseService.initialize();
            const db = databaseService.getDb();
            const admin = databaseService.getAdmin();
            await db.collection(TABLE_PAYMENT_LOGS).add({
                userId: req.user.uid,
                action: 'payment_intent_error',
                timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
                status: 'error',
                error: error.message
            });
        }

        res.status(500).json({ message: "Error creating payment intent" });
    }
});

// Create Embedded Checkout Session for MODULE purchase (uses moduleId -> Firestore price)
router.post("/create-module-checkout-session", authenticateUser, requireStripe, async (req, res) => {
    try {
      const userId = req.user.uid;
      const { moduleId } = req.body;
  
      if (!moduleId) {
        return res.status(400).json({ message: "moduleId is required" });
      }
  
      // DOMAIN must include scheme (http/https)
      // Prefer Firebase Functions runtime config: firebase functions:config:set app.domain="..."
      const domain = String(
        getFunctionsConfig("app.domain", process.env.DOMAIN || req.headers.origin || "") || ""
      ).trim();
      if (!/^https?:\/\//i.test(domain)) {
        return res.status(500).json({ message: "Server misconfigured: DOMAIN must start with http:// or https://" });
      }

      // React Router in this app uses basename="/diya-ed"
      // Prefer Firebase Functions runtime config: firebase functions:config:set app.basename="/diya-ed"
      const configuredBasename = String(getFunctionsConfig("app.basename", process.env.APP_BASENAME || "") || "").trim();
      const APP_BASENAME = normalizeBasename(configuredBasename, "/diya-ed");
      const appBaseUrl = joinDomainAndBasename(domain, APP_BASENAME);
  
      const db = getDb();

      const TABLE_MODULE = SCHEMA_QUALIFIER + "module";

      const moduleSnap = await db.collection(TABLE_MODULE).doc(moduleId).get();

      if (!moduleSnap.exists) {
        return res.status(404).json({ message: "Module not found" });
      }
  
      const moduleData = moduleSnap.data() || {};
      const priceRaw = moduleData.price ?? moduleData.Price ?? 0;
      const priceNum = Number(priceRaw);
  
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return res.status(400).json({ message: "This module does not have a valid paid price" });
      }
  
      const unitAmount = Math.round(priceNum * 100); // dollars -> cents
      const title = moduleData.title || moduleData.Title || "Module Purchase";
      const userLabel = req.user?.name || req.user?.email || null;
      const userEmail = req.user?.email || null;
  
      const stripe = req.stripe;
      const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: title },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            purchaseType: "module",
            moduleId,
            userId,
          },
        },
        metadata: {
          purchaseType: "module",
          moduleId,
          userId,
        },
        // IMPORTANT: return to a real SPA route to avoid blank page.
        // Stripe will also append `redirect_status` and `session_id`.
        return_url: `${appBaseUrl}/module/${moduleId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      });

      // Helpful for a one-row-per-purchase model: ensure the payment_intent.succeeded event
      // can link back to this checkout session.
      try {
        if (session?.payment_intent) {
          await stripe.paymentIntents.update(session.payment_intent, {
            metadata: {
              purchaseType: "module",
              moduleId,
              userId,
              checkoutSessionId: session.id,
            },
          });
        }
      } catch (e) {
        console.warn("Failed to attach checkoutSessionId to payment intent metadata:", e?.message || e);
      }

      const livemode = Boolean(session?.livemode);
      // Preferred source: Firebase Secret Manager secrets (firebase functions:secrets:set ...)
      // These are exposed to runtime as process.env.<SECRET_NAME> when bound in `functions/index.js` `secrets: [...]`.
      const publishableKeyExplicit = String(
        process.env.STRIPE_PUBLISHABLE_KEY ||
          getFunctionsConfig("stripe.publishable_key", "") ||
          ""
      ).trim();
      // Prefer per-mode secrets if set; fall back to functions config.
      const publishableKeyByMode = livemode
        ? String(
            process.env.STRIPE_PUBLISHABLE_KEY_LIVE ||
              getFunctionsConfig("stripe.publishable_key_live", "") ||
              ""
          ).trim()
        : String(
            process.env.STRIPE_PUBLISHABLE_KEY_TEST ||
              getFunctionsConfig("stripe.publishable_key_test", "") ||
              ""
          ).trim();

      const stripePublishableKey = publishableKeyExplicit || publishableKeyByMode;

      if (!stripePublishableKey) {
        return res.status(500).json({
          message:
            "Server misconfigured: missing Stripe publishable key. Set Secret STRIPE_PUBLISHABLE_KEY_TEST/STRIPE_PUBLISHABLE_KEY_LIVE (recommended) or functions config stripe.publishable_key_test/stripe.publishable_key_live.",
        });
      }

      // Avoid hard-to-debug key mismatches (pk_live with test sessions, etc.)
      if (livemode && !stripePublishableKey.startsWith("pk_live_")) {
        return res.status(500).json({
          message:
            "Server misconfigured: expected a live publishable key (pk_live_) for a live checkout session.",
        });
      }
      if (!livemode && !stripePublishableKey.startsWith("pk_test_")) {
        return res.status(500).json({
          message:
            "Server misconfigured: expected a test publishable key (pk_test_) for a test checkout session.",
        });
      }

      // Log session creation immediately (helps debugging even if webhook fails)
      const admin = require("firebase-admin");
      // One row per purchase: use checkoutSessionId as doc id.
      const logRef = db.collection(TABLE_PAYMENT_LOGS).doc(session.id);
      await logRef.set({
        action: "module_checkout_session_created",
        status: "created",
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent || null,
        userId,
        userLabel,
        userEmail,
        moduleId,
        moduleTitle: title,
        // Store both human-friendly dollars and Stripe cents for clarity.
        amount: priceNum, // dollars
        amountCents: unitAmount, // cents
        currency: "usd",
        project: process.env.GCLOUD_PROJECT || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEventType: "module_checkout_session_created",
      }, { merge: true });
  
      return res.status(200).json({
        clientSecret: session.client_secret,
        sessionId: session.id,
        livemode,
        stripePublishableKey,
        paymentLogId: logRef.id,
        paymentLogsCollection: TABLE_PAYMENT_LOGS,
        project: process.env.GCLOUD_PROJECT || null,
      });
    } catch (error) {
      console.error("Error creating module checkout session:", error);
      return res.status(500).json({ message: "Error creating module checkout session" });
    }
  });

  
// Create an Embedded Checkout Session (for a modal "popup" checkout)
router.post("/create-embedded-checkout-session", authenticateUser, requireStripe, async (req, res) => {
    try {
      const userId = req.user.uid;
      const { planType } = req.body;
  
      if (!planType || !["premium", "premiumYearly"].includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
  
      await databaseService.initialize();
      const db = databaseService.getDb();
  
      const { snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);
      if (!userSnap.exists) return res.status(404).json({ message: "User not found" });
  
      const userData = userSnap.data();
  
      // Amounts in cents (your existing logic)
      const amount = planType === "premiumYearly" ? 10000 : 999;
  
      // IMPORTANT for embedded Checkout:
      // - ui_mode: "embedded"
      // - use return_url (NOT success_url/cancel_url)
      const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: planType === "premiumYearly" ? "Premium (Yearly)" : "Premium (Monthly)" },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        customer_email: userData.email, // optional prefill
        metadata: {
          userId,
          planType,
          userEmail: userData.email,
        },
        return_url: `${process.env.DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`,
      });
  
      return res.status(200).json({
        clientSecret: session.client_secret,
        sessionId: session.id,
      });
    } catch (error) {
      console.error("Error creating embedded checkout session:", error);
      return res.status(500).json({ message: "Error creating checkout session" });
    }
  });
  
// Confirm payment and complete subscription
router.post("/confirm-payment", authenticateUser, requireStripe, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ message: "Payment intent ID required" });
        }

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                message: "Payment not completed",
                status: paymentIntent.status
            });
        }

        // Verify the payment belongs to this user
        if (paymentIntent.metadata.userId !== userId) {
            return res.status(403).json({ message: "Payment verification failed" });
        }

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Use the hierarchical user lookup from databaseService
        const { ref: userRef, snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const targetPlan = paymentIntent.metadata.planType;

        // Update user subscription
        const endDate = new Date();
        if (targetPlan === 'premiumYearly') {
            // Yearly subscription - add 12 months
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            // Monthly subscription - add 1 month
            endDate.setMonth(endDate.getMonth() + 1);
        }

        await userRef.update({
            subscriptionType: targetPlan,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            subscriptionEndDate: admin.firestore?.Timestamp?.fromDate?.(endDate) || endDate,
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: paymentIntent.customer || null,
            lastUpdated: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            role: (targetPlan === 'premium' || targetPlan === 'premiumYearly') ? 'teacherPlus' : (targetPlan === 'enterprise' ? 'teacherEnterprise' : userData.role)
        });

        // Log successful payment
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'payment_confirmed',
            fromPlan: paymentIntent.metadata.upgradeFrom,
            toPlan: targetPlan,
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'completed',
            paymentIntentId: paymentIntentId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            userEmail: userData.email
        });

        return res.status(200).json({
            message: "Payment confirmed and subscription activated",
            subscriptionType: targetPlan,
            subscriptionStatus: 'active'
        });

    } catch (error) {
        console.error("Error confirming payment:", error);

        // Log the error
        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId: req.user.uid,
            action: 'payment_confirmation_error',
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'error',
            paymentIntentId: req.body.paymentIntentId,
            error: error.message
        });

        res.status(500).json({ message: "Error confirming payment" });
    }
});
// Stripe webhooks are handled in `functions/index.js` using `express.raw()` (required for signature verification).
// We intentionally keep NO webhook handler in this router to prevent Stripe hitting a parsed-body endpoint.
// Get payment history for user
router.get("/history", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        await databaseService.initialize();
        const db = databaseService.getDb();

        const paymentHistory = await db.collection(TABLE_PAYMENT_LOGS)
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const history = paymentHistory.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));

        return res.status(200).json(history);

    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
