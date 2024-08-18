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

module.exports = {
  getAllLessons,
};
