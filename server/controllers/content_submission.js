const { db } = require("../config/firebaseConfig");

// Function to handle POST request for submitting content
const post_content = async (req, res) => {
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
    // Validate the presence of required fields if necessary
    if (!Title || !Category || !Type || !Level || !Duration || !Abstract) {
      return res.status(400).send("Missing required fields");
    }
    // Save data to Firestore
    await contentRef.add(data);

    // Send response to client
    res.status(201).send("Content submitted successfully");
    console.log("Content submitted successfully");
  } catch (error) {
    console.error("Error submitting content:", error);
    res.status(500).send("Error submitting content");
  }
};

module.exports = {
  post_content,
};
