const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const { databaseService } = require("../services/databaseService");

const router = express.Router();

// Stripe now lives in a shared module so routes/subscription.js can verify
// payments with the same client instead of trusting the request body (#422).
const { getStripe, requireStripe } = require("../utils/stripeClient");
const { syncRoleClaim } = require("../utils/customClaims");
const {
    roleForPlan,
    subscriptionEndDate,
    verifyPaymentIntent,
    claimPaymentIntent,
} = require("../utils/entitlements");

const stripe = getStripe();

const TABLE_USERS = "users";
const TABLE_PAYMENT_LOGS = "payment_logs";


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
      const domain = process.env.DOMAIN || "";
      if (!/^https?:\/\//i.test(domain)) {
        return res.status(500).json({ message: "Server misconfigured: DOMAIN must start with http:// or https://" });
      }
  
      await databaseService.initialize();
      const db = databaseService.getDb();
  
      const moduleSnap = await db.collection("module").doc(moduleId).get();

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
        metadata: {
          purchaseType: "module",
          moduleId,
          userId,
        },
        return_url: `${domain}/return?session_id={CHECKOUT_SESSION_ID}`,
      });
  
      return res.status(200).json({
        clientSecret: session.client_secret,
        sessionId: session.id,
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

        const verification = await verifyPaymentIntent(stripe, paymentIntentId, userId);
        if (!verification.ok) {
            console.warn(
                `[security] Rejected confirm-payment for uid ${userId}: ${verification.message}`
            );
            return res.status(verification.status).json({ message: verification.message });
        }
        const { paymentIntent } = verification;

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

        // Claim the payment before granting. A replayed confirmation used to
        // re-extend the subscription window every time it was sent (#422).
        const claimed = await claimPaymentIntent(db, TABLE_PAYMENT_LOGS, paymentIntentId, {
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

        if (!claimed) {
            return res.status(200).json({
                message: "Payment already confirmed",
                subscriptionType: userData.subscriptionType || targetPlan,
                subscriptionStatus: userData.subscriptionStatus || 'active',
                alreadyApplied: true
            });
        }

        const endDate = subscriptionEndDate(targetPlan);

        await userRef.update({
            subscriptionType: targetPlan,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            subscriptionEndDate: admin.firestore?.Timestamp?.fromDate?.(endDate) || endDate,
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: paymentIntent.customer || null,
            lastUpdated: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            role: roleForPlan(targetPlan) || userData.role
        });

        // Entitlement role into claims (#382), best-effort.
        await syncRoleClaim(admin, userId, roleForPlan(targetPlan) || userData.role);

        // The success log was written above as the idempotency claim.

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

// Stripe webhook handler
// IMPORTANT: this must use the raw request body for signature verification.
// In `server/index.js` we capture it as `req.rawBody`.
router.post("/webhook", async (req, res) => {
    if (!stripe) {
        return res.status(503).send("Stripe is not configured");
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
    }

    let event;

    try {
        const payload = req.rawBody || req.body;
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await databaseService.initialize();
    const db = databaseService.getDb();
    const admin = databaseService.getAdmin();

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent succeeded:', paymentIntent.id);

            // Log webhook event
            await db.collection(TABLE_PAYMENT_LOGS).add({
                action: 'webhook_payment_succeeded',
                timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
                status: 'webhook_received',
                paymentIntentId: paymentIntent.id,
                userId: paymentIntent.metadata.userId || null,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            });
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('PaymentIntent failed:', failedPayment.id);

            // Log failed payment
            await db.collection(TABLE_PAYMENT_LOGS).add({
                action: 'webhook_payment_failed',
                timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
                status: 'payment_failed',
                paymentIntentId: failedPayment.id,
                userId: failedPayment.metadata.userId || null,
                error: failedPayment.last_payment_error?.message || 'Payment failed'
            });
            break;

            case "checkout.session.completed": {
                const session = event.data.object;
              
                // Only handle module purchases
                if (session?.metadata?.purchaseType !== "module") break;
              
                const userId = session.metadata.userId || null;
                const moduleId = session.metadata.moduleId || null;
              
                console.log("Checkout session completed (module):", session.id, { userId, moduleId });
              
                await db.collection(TABLE_PAYMENT_LOGS).add({
                  action: "webhook_checkout_session_completed",
                  timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
                  status: "completed",
                  checkoutSessionId: session.id,
                  paymentIntentId: session.payment_intent || null,
                  userId,
                  moduleId,
                  amount_total: session.amount_total || null,
                  currency: session.currency || null,
                });
              
                break;
            }
              
            default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

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
