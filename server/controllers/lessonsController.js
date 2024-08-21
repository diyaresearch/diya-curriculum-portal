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

const getSections = async (req, res) => {
  try {
    const lessonRef = db.collection("lesson").doc("oeVhJ5KBtbrfk5z3XUdT");
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    const { sections } = doc.data();

    if (!sections || sections.length === 0) {
      return res
        .status(404)
        .json({ message: "No sections found for this lesson." });
    }

    res.status(200).json(sections);
  } catch (error) {
    console.error("Error getting sections:", error);
    res.status(500).json({ error: "Failed to retrieve sections" });
  }
};

const postLesson = async (req, res) => {
  try {
    const formData = req.body;

    const lessonRef = db.collection("lesson").doc();

    await lessonRef.set({
      title: formData.title,
      subject: formData.subject,
      level: formData.level,
      objectives: formData.objectives,
      duration: formData.duration,
      sections: formData.sections,
      description: formData.description,
    });

    res
      .status(201)
      .json({ message: "Lesson created successfully", id: lessonRef.id });
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ error: "Failed to create lesson" });
  }
};

module.exports = {
  getAllLessons,
  getAllSections,
  getSections,
  postLesson,
};
