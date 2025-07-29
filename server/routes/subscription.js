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
            canUpgrade: subscriptionType !== 'premium' && subscriptionType !== 'enterprise'
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

        if (!targetPlan || !['premium', 'enterprise'].includes(targetPlan)) {
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

        if (!targetPlan || !['premium', 'enterprise'].includes(targetPlan)) {
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
            role: targetPlan === 'premium' ? 'teacherPlus' : (targetPlan === 'enterprise' ? 'teacherEnterprise' : userData.role)
        };

        if (targetPlan === 'premium') {
            // Calculate end date (monthly subscription)
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
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

module.exports = router;
