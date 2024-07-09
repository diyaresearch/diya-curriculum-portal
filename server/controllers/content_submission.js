const express = require("express");
const { db, storage } = require("../config/firebaseConfig");

const router = express.Router();

// POST route for submitting content
router.post("/content", upload.single("file"), async (req, res) => {
  try {
    // Extract data from request body
    const { Title, Category, Type, Level, Duration, isPublic, Abstract } =
      req.body;

    // Save data to Firestore
    const contentRef = db.collection("content");
    const data = {
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      Abstract,
    };

    // Save data to Firestore
    await contentRef.add(data);

    // Send response to client
    res.status(201).send("Content submitted successfully");
  } catch (error) {
    console.error("Error submitting content:", error);
    res.status(500).send("Error submitting content");
  }
});

module.exports = router;
