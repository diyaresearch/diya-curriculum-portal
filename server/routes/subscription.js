const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const { databaseService } = require("../services/databaseService");
const { requireAdmin } = require("../middleware/requireRole");
const { findUserDocument } = require("../utils/identityCollections");
const { syncRoleClaim } = require("../utils/customClaims");
const { getStripe, requireStripe } = require("../utils/stripeClient");
const {
    roleForPlan,
    subscriptionEndDate,
    verifyPaymentIntent,
    claimPaymentIntent,
} = require("../utils/entitlements");

const router = express.Router();

const { resolveSchemaQualifier } = require("../utils/schemaQualifier");
const SCHEMA_QUALIFIER = resolveSchemaQualifier();
const TABLE_USERS = SCHEMA_QUALIFIER + "users";
const TABLE_SUBSCRIPTIONS = SCHEMA_QUALIFIER + "subscriptions";
const TABLE_PAYMENT_LOGS = SCHEMA_QUALIFIER + "payment_logs";
const TABLE_ENTERPRISE_CONTACTS = SCHEMA_QUALIFIER + "enterprise_contacts";

// Test endpoint
router.get("/test", (req, res) => {
    res.json({ message: "Subscription routes are working!", timestamp: new Date().toISOString() });
});

// Get user's current subscription status
router.get("/status", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Qualified identity collections, with an unprefixed fallback (#427).
        const found = await findUserDocument(db, userId, TABLE_USERS);
        const userRef = found.ref;
        const userSnap = found.snap;

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const subscriptionType = userData.subscriptionType || 'basic';
        const subscriptionStatus = userData.subscriptionStatus || 'active';
        const subscriptionEndDate = userData.subscriptionEndDate || null;

        return res.status(200).json({
            subscriptionType,
            subscriptionStatus,
            subscriptionEndDate,
            canUpgrade: !['premium', 'premiumYearly', 'enterprise'].includes(subscriptionType)
        });
    } catch (error) {
        console.error("Error fetching subscription status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Initiate upgrade process
router.post("/initiate-upgrade", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { targetPlan } = req.body;

        // Accept both premium variants and enterprise
        const validPlans = ['premium', 'premiumYearly', 'enterprise'];
        if (!targetPlan || !validPlans.includes(targetPlan)) {
            return res.status(400).json({ message: "Invalid target plan" });
        }

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Qualified identity collections, with an unprefixed fallback (#427).
        const found = await findUserDocument(db, userId, TABLE_USERS);
        let userRef = found.ref;
        let userSnap = found.snap;
        let collectionName = found.collection;

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const currentPlan = userData.subscriptionType || 'basic';

        // Log the upgrade attempt
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'upgrade_initiated',
            fromPlan: currentPlan,
            toPlan: targetPlan,
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'initiated',
            userEmail: userData.email
        });

        // For enterprise, just log the request
        if (targetPlan === 'enterprise') {
            return res.status(200).json({
                message: "Enterprise upgrade request initiated",
                requiresContact: true
            });
        }

        // For premium, return upgrade session info
        return res.status(200).json({
            message: "Premium upgrade initiated",
            requiresPayment: true,
            currentPlan,
            targetPlan,
            upgradeSessionId: `upgrade_${userId}_${Date.now()}`
        });

    } catch (error) {
        console.error("Error initiating upgrade:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Handle successful upgrade.
//
// Previously this accepted a paymentIntentId from the request body, stored it,
// and granted teacherPlus without ever retrieving it from Stripe (#422). The
// intent is now verified against Stripe, must belong to the caller, must have
// actually succeeded, and must match the plan being claimed. The grant is
// claimed exactly once so a replay cannot extend the subscription twice.
router.post("/complete-upgrade", authenticateUser, requireStripe, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { targetPlan, paymentIntentId, upgradeSessionId } = req.body;

        const validPlans = ['premium', 'premiumYearly', 'enterprise'];
        if (!targetPlan || !validPlans.includes(targetPlan)) {
            return res.status(400).json({ message: "Invalid target plan" });
        }

        const verification = await verifyPaymentIntent(
            getStripe(),
            paymentIntentId,
            userId,
            targetPlan
        );
        if (!verification.ok) {
            console.warn(
                `[security] Rejected complete-upgrade for uid ${userId}: ${verification.message}`
            );
            return res.status(verification.status).json({ message: verification.message });
        }
        const { paymentIntent } = verification;

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        const { ref: userRef, snap: userSnap } = await databaseService.getUserDocument(
            userId,
            TABLE_USERS
        );

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const currentPlan = userData.subscriptionType || 'basic';

        // Claim the payment before granting anything. If another request
        // already applied it, report success without re-extending the term.
        const claimed = await claimPaymentIntent(db, TABLE_PAYMENT_LOGS, paymentIntentId, {
            userId,
            action: 'upgrade_completed',
            fromPlan: currentPlan,
            toPlan: targetPlan,
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'completed',
            paymentIntentId,
            upgradeSessionId: upgradeSessionId || null,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            userEmail: userData.email
        });

        if (!claimed) {
            return res.status(200).json({
                message: "Upgrade already applied",
                newPlan: userData.subscriptionType || targetPlan,
                subscriptionStatus: userData.subscriptionStatus || 'active',
                alreadyApplied: true
            });
        }

        const updateData = {
            subscriptionType: targetPlan,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            lastUpdated: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            role: roleForPlan(targetPlan) || userData.role
        };

        if (targetPlan === 'premium' || targetPlan === 'premiumYearly') {
            const endDate = subscriptionEndDate(targetPlan);
            updateData.subscriptionEndDate =
                admin.firestore?.Timestamp?.fromDate?.(endDate) || endDate;
            updateData.stripePaymentIntentId = paymentIntentId;
            updateData.stripeCustomerId = paymentIntent.customer || null;
        }

        await userRef.update(updateData);
        await syncRoleClaim(admin, userId, updateData.role);

        return res.status(200).json({
            message: "Upgrade completed successfully",
            newPlan: targetPlan,
            subscriptionStatus: 'active'
        });

    } catch (error) {
        console.error("Error completing upgrade:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Handle enterprise contact requests
router.post("/enterprise-contact", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { message, contactPreference } = req.body;

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Qualified identity collections, with an unprefixed fallback (#427).
        const found = await findUserDocument(db, userId, TABLE_USERS);
        const userRef = found.ref;
        const userSnap = found.snap;

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();

        // Store enterprise contact request
        await db.collection(TABLE_ENTERPRISE_CONTACTS).add({
            userId,
            userEmail: userData.email,
            fullName: userData.fullName,
            institution: userData.institution,
            message: message || '',
            contactPreference: contactPreference || 'email',
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'pending'
        });

        // Log the contact request
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'enterprise_contact_requested',
            fromPlan: userData.subscriptionType || 'basic',
            toPlan: 'enterprise',
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'contact_requested',
            userEmail: userData.email
        });

        return res.status(200).json({
            message: "Enterprise contact request submitted successfully"
        });

    } catch (error) {
        console.error("Error submitting enterprise contact:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Admin endpoint to view upgrade logs
// Admin check delegated to requireRole rather than reimplemented inline (#424).
// The hand-rolled version duplicated the teachers -> students -> users lookup
// that databaseService.getUserDocument already performs.
router.get("/admin/logs", authenticateUser, requireAdmin, async (req, res) => {
    try {
        await databaseService.initialize();
        const db = databaseService.getDb();

        const logsSnapshot = await db.collection(TABLE_PAYMENT_LOGS)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        const logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));

        return res.status(200).json(logs);

    } catch (error) {
        console.error("Error fetching admin logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Cancel subscription endpoint
router.post("/cancel", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { reason, feedback } = req.body; // Optional cancellation reason and feedback

        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Qualified identity collections, with an unprefixed fallback (#427).
        const found = await findUserDocument(db, userId, TABLE_USERS);
        let userRef = found.ref;
        let userSnap = found.snap;
        let collectionName = found.collection;

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const currentPlan = userData.subscriptionType || 'basic';

        // Don't allow canceling basic subscription
        if (currentPlan === 'basic') {
            return res.status(400).json({
                message: "Cannot cancel basic subscription"
            });
        }

        // If user has a Stripe subscription, cancel it
        if (userData.stripePaymentIntentId && ['premium', 'premiumYearly'].includes(userData.subscriptionType)) {
            // Note: In a real implementation, you would also cancel the recurring subscription in Stripe
        if (userData.stripeSubscriptionId && userData.subscriptionType === 'premium') {
            try {
                // Cancel the Stripe subscription
                await stripe.subscriptions.del(userData.stripeSubscriptionId);
            } catch (err) {
                console.error("Failed to cancel Stripe subscription:", err);
                return res.status(500).json({ message: "Failed to cancel Stripe subscription. Please try again later." });
            }
        }
        }

        // Update user subscription to cancelled
        const updateData = {
            subscriptionType: 'basic', // Downgrade to basic
            subscriptionStatus: 'cancelled',
            subscriptionEndDate: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(), // End immediately
            cancelledAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            cancellationReason: reason || null,
            cancellationFeedback: feedback || null,
            lastUpdated: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            role: 'teacherDefault' // Reset to default role
        };

        await userRef.update(updateData);

        // Log the cancellation
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'subscription_cancelled',
            fromPlan: currentPlan,
            toPlan: 'basic',
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'cancelled',
            reason: reason || null,
            feedback: feedback || null,
            userEmail: userData.email
        });

        return res.status(200).json({
            message: "Subscription cancelled successfully",
            newPlan: 'basic',
            subscriptionStatus: 'cancelled'
        });

    }
    catch(error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Reactivate cancelled subscription
router.post("/reactivate", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        await databaseService.initialize();
        const db = databaseService.getDb();
        const admin = databaseService.getAdmin();

        // Qualified identity collections, with an unprefixed fallback (#427).
        const found = await findUserDocument(db, userId, TABLE_USERS);
        const userRef = found.ref;
        const userSnap = found.snap;

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();

        // Only allow reactivation if subscription was cancelled
        if (userData.subscriptionStatus !== 'cancelled') {
            return res.status(400).json({
                message: "Subscription is not cancelled"
            });
        }

        // Reactivate subscription (this would typically require a new payment)
        const updateData = {
            subscriptionStatus: 'active',
            reactivatedAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            lastUpdated: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()
        };

        await userRef.update(updateData);

        // Log the reactivation
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'subscription_reactivated',
            timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
            status: 'reactivated',
            userEmail: userData.email
        });

        return res.status(200).json({
            message: "Subscription reactivated successfully",
            subscriptionStatus: 'active'
        });

    } catch (error) {
        console.error("Error reactivating subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Process payment endpoint.
//
// This used to take a card object and an amount from the request body,
// sleep for a second to "simulate" a charge, and then grant teacherPlus —
// no Stripe call anywhere (#422). Any authenticated user could call it and
// get premium for free. It also required raw PAN and CVC to reach our
// server, which is what #423 is about.
//
// The endpoint is retained, rather than deleted, so that a stale cached
// frontend gets a clear error instead of a 404 it might treat as a network
// blip. It grants nothing.
router.post("/process-payment", authenticateUser, async (req, res) => {
    console.warn(
        `[security] Deprecated /process-payment called by uid ${req.user.uid}; no entitlement granted`
    );

    return res.status(410).json({
        message:
            "This payment endpoint has been removed. Upgrades now go through Stripe: " +
            "create a PaymentIntent via /api/payment/create-payment-intent, confirm it " +
            "with Stripe Elements, then call /api/payment/confirm-payment.",
        code: "ENDPOINT_REMOVED",
    });
});

module.exports = router;
