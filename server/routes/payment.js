const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const admin = require("firebase-admin");

const router = express.Router();

// Validate and initialize Stripe with secret key from environment
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined in the environment variables. Please set it before starting the application.");
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS = SCHEMA_QUALIFIER + "users";
const TABLE_PAYMENT_LOGS = SCHEMA_QUALIFIER + "payment_logs";

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
router.post("/create-payment-intent", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { planType } = req.body;

        if (planType !== 'premium') {
            return res.status(400).json({ message: "Invalid plan type" });
        }

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
        }

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 999, // $9.99 in cents
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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'payment_intent_created',
            paymentIntentId: paymentIntent.id,
            amount: 999,
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
            const db = admin.firestore();
            await db.collection(TABLE_PAYMENT_LOGS).add({
                userId: req.user.uid,
                action: 'payment_intent_error',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'error',
                error: error.message
            });
        }

        res.status(500).json({ message: "Error creating payment intent" });
    }
});

// Confirm payment and complete subscription
router.post("/confirm-payment", authenticateUser, async (req, res) => {
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

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
        }

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const targetPlan = paymentIntent.metadata.planType;

        // Update user subscription
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        await userRef.update({
            subscriptionType: targetPlan,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(endDate),
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: paymentIntent.customer || null,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            role: targetPlan === 'premium' ? 'teacherPlus' : (targetPlan === 'enterprise' ? 'teacherEnterprise' : userData.role)
        });

        // Log successful payment
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'payment_confirmed',
            fromPlan: paymentIntent.metadata.upgradeFrom,
            toPlan: targetPlan,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
        const db = admin.firestore();
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId: req.user.uid,
            action: 'payment_confirmation_error',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'error',
            paymentIntentId: req.body.paymentIntentId,
            error: error.message
        });

        res.status(500).json({ message: "Error confirming payment" });
    }
});

// Stripe webhook handler
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = admin.firestore();

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent succeeded:', paymentIntent.id);

            // Log webhook event
            await db.collection(TABLE_PAYMENT_LOGS).add({
                action: 'webhook_payment_succeeded',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'payment_failed',
                paymentIntentId: failedPayment.id,
                userId: failedPayment.metadata.userId || null,
                error: failedPayment.last_payment_error?.message || 'Payment failed'
            });
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Get payment history for user
router.get("/history", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const db = admin.firestore();

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
