const { db } = require("../config/firebaseConfig");

// Get all lessons
const getAllLessons = async (req, res) => {
  try {
    const lessonsSnapshot = await db.collection("lesson").get();
    if (lessonsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }

    const lessons = [];
    lessonsSnapshot.forEach((doc) => {
      lessons.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).send(error.message);
  }
};

const getAllSections = async (req, res) => {
  try {
    const sectionsRef = db
      .collection("lesson")
      .doc("XnZzLBMIeKE5dsRXZ5nJ")
      .collection("sections");
    const snapshot = await sectionsRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No matching documents." });
    }

    const sections = [];
    snapshot.forEach((doc) => {
      sections.push({ id: doc.id, data: doc.data() });
    });

    res.status(200).json(sections);
  } catch (error) {
    console.error("Error getting documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getAllLessons,
  getAllSections,
};
