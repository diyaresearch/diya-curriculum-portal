const { db, storage } = require("../config/firebaseConfig");
const PDFDocument = require("pdfkit");

// Define the collections
const SCHEMA_QUALIFIER = process.env.DATABASE_SCHEMA_QUALIFIER || "";
const TABLE_CONTENT = SCHEMA_QUALIFIER + "content";
const TABLE_LESSON =  SCHEMA_QUALIFIER + "lesson"; 
const TABLE_SECTIONS = SCHEMA_QUALIFIER + "sections";

console.log('lessonsController tables are', TABLE_CONTENT, TABLE_LESSON, TABLE_SECTIONS)

// Get all public lessons
const getAllLessons = async (req, res) => {
  try {
    const lessonsSnapshot = await db.collection(TABLE_LESSON).get();
    if (lessonsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }
    const publicLessons = [];
    lessonsSnapshot.forEach((doc) => {
      const lessonData = doc.data();
      // only public and previous lessons
      if (lessonData.isPublic) {
        publicLessons.push({ id: doc.id, ...lessonData });
      }
    });
    res.status(200).json(publicLessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).send(error.message);
  }
};

// Get all lessons for admin
const getAllLessonsAdmin = async (req, res) => {
  try {
    const lessonsSnapshot = await db.collection(TABLE_LESSON).get();
    if (lessonsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }
    const lessons = [];
    lessonsSnapshot.forEach((doc) => {
      const lessonData = doc.data();
      lessons.push({ id: doc.id, ...lessonData });
    });
    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).send(error.message);
  }
};


const getLessonById = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).send(error.message);
  }
};

//Get current user lesson plan
const getUserLessons = async (req, res) => {
  try {
    const userId = req.user ? req.user.uid : null;
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const lessonRef = await db.collection(TABLE_LESSON).get();
    if (lessonRef.empty) {
      return res.status(200).json([]);
    }

    const userLessons = [];
    lessonRef.forEach((doc) => {
      const lessonData = doc.data();
      // Fetch only private lessons owned by the user
      if (lessonData.authorId === userId) {
        userLessons.push({ id: doc.id, ...lessonData });
      }
    });

    res.status(200).json(userLessons);
  } catch (error) {
    console.error("Error fetching user units:", error);
    res.status(500).send(error.message);
  }
};

const postLesson = async (req, res) => {
  try {
    const formData = req.body;

    const authorId = req.user ? req.user.uid : null;

    if (!authorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const lessonRef = db.collection(TABLE_LESSON).doc();

    await lessonRef.set({
      authorId: authorId,
      title: formData.title,
      category: formData.category,
      type: formData.type,
      level: formData.level,
      objectives: formData.objectives,
      duration: formData.duration,
      sections: formData.sections,
      description: formData.description,
      isPublic: formData.isPublic,
      createdAt: new Date().toISOString(),
    });

    res
      .status(201)
      .json({ message: "Lesson created successfully", id: lessonRef.id });
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ error: "Failed to create lesson" });
  }
};

const updateLesson = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const formData = req.body;
    const requesterId = req.user ? req.user.uid : null;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const lessonSnapshot = await lessonRef.get();

    if (!lessonSnapshot.exists) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const lessonData = lessonSnapshot.data();

    const isAdmin = async (uid) => {
      try {
        const teacherDoc = await db.collection("teachers").doc(uid).get();
        if (!teacherDoc.exists) return false;
        const data = teacherDoc.data() || {};
        return data.role === "admin";
      } catch (e) {
        console.error("Error checking admin role:", e);
        return false;
      }
    };

    const canEdit = lessonData.authorId === requesterId || (await isAdmin(requesterId));
    if (!canEdit) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData = {
      title: formData.title || lessonData.title,
      category: formData.category || lessonData.category,
      type: formData.type || lessonData.type,
      level: formData.level || lessonData.level,
      objectives: formData.objectives || lessonData.objectives,
      duration: formData.duration || lessonData.duration,
      sections: formData.sections || lessonData.sections,
      description: formData.description || lessonData.description,
      isPublic: typeof formData.isPublic === "boolean" ? formData.isPublic : lessonData.isPublic,
      updatedAt: new Date().toISOString(),
    };
    
    await lessonRef.update(updateData);

    res
      .status(200)
      .json({ message: "Lesson updated successfully", id: lessonRef.id });
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
};

const deleteLessonById = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const requesterId = req.user ? req.user.uid : null;
    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    const lessonData = doc.data() || {};

    const isAdmin = async (uid) => {
      try {
        const teacherDoc = await db.collection("teachers").doc(uid).get();
        if (!teacherDoc.exists) return false;
        const data = teacherDoc.data() || {};
        return data.role === "admin";
      } catch (e) {
        console.error("Error checking admin role:", e);
        return false;
      }
    };

    const canDelete = lessonData.authorId === requesterId || (await isAdmin(requesterId));
    if (!canDelete) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await lessonRef.delete();

    res.status(200).json({ message: "Lesson deleted successfully." });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).send(error.message);
  }
};

const downloadPDF = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    const lessonData = doc.data();

    const docPdf = new PDFDocument();

    res.setHeader("Content-disposition", "attachment; filename=lesson.pdf");
    res.setHeader("Content-type", "application/pdf");

    docPdf.pipe(res);

    docPdf
      .fontSize(20)
      .text(`Lesson: ${lessonData.title}`, { align: "center" });
    docPdf.moveDown();
    docPdf.fontSize(14).text(`Category: ${lessonData.categpry}`);
    docPdf.text(`Level: ${lessonData.level}`);
    docPdf.text(`Duration: ${lessonData.duration} minutes`);
    docPdf.moveDown();

    docPdf.text("Objectives:");
    lessonData.objectives.forEach((objective, index) => {
      docPdf.text(`${index + 1}. ${objective}`);
    });
    docPdf.moveDown();

    docPdf.text("Description:");
    docPdf.text(lessonData.description);
    docPdf.moveDown();

    if (lessonData.sections && lessonData.sections.length > 0) {
      for (
        let sectionIndex = 0;
        sectionIndex < lessonData.sections.length;
        sectionIndex++
      ) {
        const section = lessonData.sections[sectionIndex];
        docPdf
          .fontSize(12)
          .fillColor("black")
          .text(`Section ${sectionIndex + 1}`, { underline: true });
        docPdf.moveDown();

        if (section.intro) {
          docPdf.fontSize(12).text(`Intro: ${section.intro}`);
          docPdf.moveDown();
        }

        if (section.contentIds && section.contentIds.length > 0) {
          let documentCount = 1;
          for (let contentId of section.contentIds) {
            const contentRef = db.collection(TABLE_CONTENT).doc(contentId);
            const contentDoc = await contentRef.get();

            if (contentDoc.exists) {
              const contentData = contentDoc.data();
              const fileUrl = contentData.fileUrl;
              docPdf
                .fontSize(12)
                .fillColor("black")
                .text(`Document ${documentCount}: `, { continued: true });
              docPdf.fontSize(12).fillColor("blue").text("Document link", {
                link: fileUrl,
                underline: true,
              });

              documentCount++;
            } else {
              docPdf
                .fontSize(12)
                .fillColor("black")
                .text(`Content ID: ${contentId} not found.`);
            }
            docPdf.moveDown();
          }
        } else {
          docPdf
            .fontSize(12)
            .fillColor("black")
            .text("No content available for this section.");
          docPdf.moveDown();
        }
      }
    }

    docPdf.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

module.exports = {
  getAllLessons,
  getAllLessonsAdmin,
  getLessonById,
  getUserLessons,
  postLesson,
  updateLesson,
  deleteLessonById,
  downloadPDF,
};
