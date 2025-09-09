const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const admin = require("firebase-admin");

const router = express.Router();

const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
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

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();
        let collectionName = "teachers";

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
            collectionName = "students";
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
            collectionName = TABLE_USERS;
        }

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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

// Handle successful upgrade
router.post("/complete-upgrade", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { targetPlan, paymentIntentId, upgradeSessionId } = req.body;

        // Accept both premium variants and enterprise
        const validPlans = ['premium', 'premiumYearly', 'enterprise'];
        if (!targetPlan || !validPlans.includes(targetPlan)) {
            return res.status(400).json({ message: "Invalid target plan" });
        }

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();
        let collectionName = "teachers";

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
            collectionName = "students";
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
            collectionName = TABLE_USERS;
        }

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const currentPlan = userData.subscriptionType || 'basic';

        // Update user subscription
        const updateData = {
            subscriptionType: targetPlan,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            role: (targetPlan === 'premium' || targetPlan === 'premiumYearly') ? 'teacherPlus' : (targetPlan === 'enterprise' ? 'teacherEnterprise' : userData.role)
        };

        if (targetPlan === 'premium' || targetPlan === 'premiumYearly') {
            // Calculate end date based on plan type
            const endDate = new Date();
            if (targetPlan === 'premiumYearly') {
                // Yearly subscription - add 12 months
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                // Monthly subscription - add 1 month
                endDate.setMonth(endDate.getMonth() + 1);
            }
            updateData.subscriptionEndDate = admin.firestore.Timestamp.fromDate(endDate);
            updateData.stripePaymentIntentId = paymentIntentId;
        }

        await userRef.update(updateData);

        // Log the successful upgrade
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'upgrade_completed',
            fromPlan: currentPlan,
            toPlan: targetPlan,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed',
            paymentIntentId: paymentIntentId || null,
            upgradeSessionId: upgradeSessionId || null,
            userEmail: userData.email
        });

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

        // Store enterprise contact request
        await db.collection(TABLE_ENTERPRISE_CONTACTS).add({
            userId,
            userEmail: userData.email,
            fullName: userData.fullName,
            institution: userData.institution,
            message: message || '',
            contactPreference: contactPreference || 'email',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });

        // Log the contact request
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'enterprise_contact_requested',
            fromPlan: userData.subscriptionType || 'basic',
            toPlan: 'enterprise',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
router.get("/admin/logs", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
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

        if (!userSnap.exists || userSnap.data().role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

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

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();
        let collectionName = "teachers";

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
            collectionName = "students";
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
            collectionName = TABLE_USERS;
        }

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
            subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(), // End immediately
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancellationReason: reason || null,
            cancellationFeedback: feedback || null,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            role: 'teacherDefault' // Reset to default role
        };

        await userRef.update(updateData);

        // Log the cancellation
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'subscription_cancelled',
            fromPlan: currentPlan,
            toPlan: 'basic',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

        // Only allow reactivation if subscription was cancelled
        if (userData.subscriptionStatus !== 'cancelled') {
            return res.status(400).json({
                message: "Subscription is not cancelled"
            });
        }

        // Reactivate subscription (this would typically require a new payment)
        const updateData = {
            subscriptionStatus: 'active',
            reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        await userRef.update(updateData);

        // Log the reactivation
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'subscription_reactivated',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

// Process payment endpoint - combines initiate-upgrade and payment processing
router.post("/process-payment", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { planType, amount, cardInfo, billingCycle } = req.body;

        // Validate plan type
        const validPlans = ['premium', 'premiumYearly', 'enterprise'];
        if (!planType || !validPlans.includes(planType)) {
            return res.status(400).json({ message: "Invalid plan type" });
        }

        // Validate required fields
        if (!amount || !cardInfo) {
            return res.status(400).json({ message: "Missing required payment information" });
        }

        const db = admin.firestore();

        // Check in teachers collection first
        let userRef = db.collection("teachers").doc(userId);
        let userSnap = await userRef.get();
        let collectionName = "teachers";

        if (!userSnap.exists) {
            // Then check students collection
            userRef = db.collection("students").doc(userId);
            userSnap = await userRef.get();
            collectionName = "students";
        }

        if (!userSnap.exists) {
            // Finally check unified users collection
            userRef = db.collection(TABLE_USERS).doc(userId);
            userSnap = await userRef.get();
            collectionName = TABLE_USERS;
        }

        if (!userSnap.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userSnap.data();
        const currentPlan = userData.subscriptionType || 'basic';

        // For demo purposes, we'll simulate a successful payment
        // In a real implementation, you would integrate with Stripe or another payment processor

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update user subscription
        const updateData = {
            subscriptionType: planType,
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            role: (planType === 'premium' || planType === 'premiumYearly') ? 'teacherPlus' : (planType === 'enterprise' ? 'teacherEnterprise' : userData.role)
        };

        // Calculate subscription end date
        if (planType === 'premium' || planType === 'premiumYearly') {
            const endDate = new Date();
            if (planType === 'premiumYearly') {
                // Yearly subscription - add 12 months
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                // Monthly subscription - add 1 month
                endDate.setMonth(endDate.getMonth() + 1);
            }
            updateData.subscriptionEndDate = admin.firestore.Timestamp.fromDate(endDate);
            // In a real implementation, store the actual payment intent ID
            updateData.paymentReference = `demo_payment_${Date.now()}`;
        }

        await userRef.update(updateData);

        // Log the payment
        await db.collection(TABLE_PAYMENT_LOGS).add({
            userId,
            action: 'payment_processed',
            fromPlan: currentPlan,
            toPlan: planType,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed',
            amount: amount,
            billingCycle: billingCycle || 'month',
            paymentMethod: 'demo_card',
            userEmail: userData.email
        });

        return res.status(200).json({
            message: "Payment processed successfully",
            subscriptionType: planType,
            subscriptionStatus: 'active',
            amount: amount,
            billingCycle: billingCycle
        });

    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ message: "Error processing payment. Please try again." });
    }
});

module.exports = router;
