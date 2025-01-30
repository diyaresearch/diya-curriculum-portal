const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const admin = require("firebase-admin");

const router = express.Router();

// Get current user details
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
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

// Register new user
router.post("/register", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { email, fullName, role = "consumer" } = req.body;

    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      await userRef.set({
        email,
        fullName,
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

module.exports = router;
