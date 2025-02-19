const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const admin = require("firebase-admin");

const router = express.Router();

const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS =  SCHEMA_QUALIFIER + "users"; 

// Get current user details
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(userSnap.data());
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user details with userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from request parameters
    const db = admin.firestore();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ id: userId, ...userSnap.data() });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Register new user
router.post("/register", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { 
      email, 
      fullName, 
      firstName,
      lastName,
      institution,
      userType,
      jobTitle,
      subjects,
      role = "teacherDefault" } = req.body;
    console.log(req.body)


    const db = admin.firestore();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      await userRef.set({
        email,
        fullName,
        firstName,
        lastName,
        institution,
        userType,
        jobTitle,
        subjects,
        role,
      });
      return res.status(201).json({ message: "User registered successfully", fullName, role });
    } else {
      return res.status(200).json({ message: "User already exists" });
    }
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
router.put("/update", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      firstName,
      lastName,
      institution,
      userType,
      jobTitle,
      subjects
    } = req.body;

    const db = admin.firestore();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user profile fields
    await userRef.update({
      firstName,
      lastName,
      institution,
      userType,
      jobTitle,
      subjects,
    });

    return res.status(200).json({ message: "User profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all users
router.get("/users", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    if (userData.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const usersCollection = await db.collection(TABLE_USERS).get();
    const users = usersCollection.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users for admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin can manage user role
router.put("/updateRole", authenticateUser, async (req, res) => {
  const { userId, newRole } = req.body;
  console.log(req.body)
  if (!userId || !newRole) {
    return res.status(400).json({ message: "Missing userId or newRole" });
  }

  const db = admin.firestore();
  const adminUserRef = db.collection(TABLE_USERS).doc(req.user.uid);
  const adminUserSnap = await adminUserRef.get();

  if (!adminUserSnap.exists || adminUserSnap.data().role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }

  try {
    const targetUserRef = db.collection(TABLE_USERS).doc(userId);
    const targetUserSnap = await targetUserRef.get();
    if (!targetUserSnap.exists) {
      return res.status(404).json({ message: "Target user not found" });
    }

    await targetUserRef.update({ role: newRole });
    res.status(200).json({ message: `User role updated to ${newRole}` });
  } catch (error) {
    console.error("Failed to update user role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
