/**
 * Lessons — the `lesson` collection.
 *
 * Two conventions arrived here with #366. Firestore comes from
 * databaseService rather than a module-load `require("../config/firebaseConfig")`,
 * which is what forced CI to hand this file a credential (an unstarted
 * emulator address) just to require it; and the owner-or-admin check is
 * canMutate() from utils/ownership, which updateLesson and deleteLessonById
 * each used to re-implement as a local `isAdmin` closure reading the users
 * collection directly. See controllers/README.md.
 */

const PDFDocument = require("pdfkit");
const { databaseService } = require("../services/databaseService");
const { canMutate } = require("../utils/ownership");
const { sanitizeHtml, sanitizeArray } = require("../utils/sanitizeHtml");
const {
  sendError,
  sendAuthError,
  sendAuthorizationError,
  sendNotFoundError,
} = require("../utils/responseHelpers");

// Define the collections
const TABLE_CONTENT = "content";
const TABLE_LESSON = "lesson";

// Get all public lessons
const getAllLessons = async (req, res) => {
  try {
    const db = databaseService.getDb();
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
    sendError(res, 'Failed to fetch lessons', 500, 'LESSON_FETCH_ERROR', error.message);
  }
};

// Get all lessons for admin
const getAllLessonsAdmin = async (req, res) => {
  try {
    const db = databaseService.getDb();
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
    sendError(res, 'Failed to fetch lessons', 500, 'LESSON_FETCH_ERROR', error.message);
  }
};

const getLessonById = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const db = databaseService.getDb();
    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return sendNotFoundError(res, "Lesson");
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    sendError(res, 'Failed to fetch lesson', 500, 'LESSON_FETCH_ERROR', error.message);
  }
};

//Get current user lesson plan
const getUserLessons = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const userId = req.user ? req.user.uid : null;
    if (!userId) {
      return sendAuthError(res, "Authentication required");
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
    sendError(res, 'Failed to fetch your lessons', 500, 'LESSON_FETCH_ERROR', error.message);
  }
};

const postLesson = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const formData = req.body;

    const authorId = req.user ? req.user.uid : null;

    if (!authorId) {
      return sendAuthError(res, "Authentication required");
    }
    const lessonRef = db.collection(TABLE_LESSON).doc();

    await lessonRef.set({
      authorId: authorId,
      title: formData.title,
      category: formData.category,
      type: formData.type,
      level: formData.level,
      objectives: sanitizeArray(formData.objectives),
      duration: formData.duration,
      sections: sanitizeArray(formData.sections, ["intro"]),
      description: sanitizeHtml(formData.description),
      isPublic: formData.isPublic,
      createdAt: new Date().toISOString(),
    });

    res
      .status(201)
      .json({ message: "Lesson created successfully", id: lessonRef.id });
  } catch (error) {
    console.error("Error creating lesson:", error);
    sendError(res, 'Failed to create lesson', 500, 'LESSON_CREATE_ERROR', error.message);
  }
};

const updateLesson = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const lessonId = req.params.lessonId;
    const formData = req.body;
    const requesterId = req.user ? req.user.uid : null;

    if (!requesterId) {
      return sendAuthError(res, "Authentication required");
    }

    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const lessonSnapshot = await lessonRef.get();

    if (!lessonSnapshot.exists) {
      return sendNotFoundError(res, "Lesson");
    }

    const lessonData = lessonSnapshot.data();

    // canMutate resolves the owner from `authorId` and falls back to the
    // admin check, which is what the local isAdmin closure here did (#366).
    if (!(await canMutate(req, lessonData))) {
      return sendAuthorizationError(res, "You do not have permission to edit this lesson");
    }

    const updateData = {
      title: formData.title || lessonData.title,
      category: formData.category || lessonData.category,
      type: formData.type || lessonData.type,
      level: formData.level || lessonData.level,
      // sanitizeArray/sanitizeHtml are idempotent, so re-processing an
      // already-clean fallback value from lessonData is harmless.
      objectives: sanitizeArray(formData.objectives || lessonData.objectives),
      duration: formData.duration || lessonData.duration,
      sections: sanitizeArray(formData.sections || lessonData.sections, ["intro"]),
      description: sanitizeHtml(formData.description || lessonData.description),
      isPublic: typeof formData.isPublic === "boolean" ? formData.isPublic : lessonData.isPublic,
      updatedAt: new Date().toISOString(),
    };
    
    await lessonRef.update(updateData);

    res
      .status(200)
      .json({ message: "Lesson updated successfully", id: lessonRef.id });
  } catch (error) {
    console.error("Error updating lesson:", error);
    sendError(res, 'Failed to update lesson', 500, 'LESSON_UPDATE_ERROR', error.message);
  }
};

const deleteLessonById = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const db = databaseService.getDb();
    const requesterId = req.user ? req.user.uid : null;
    if (!requesterId) {
      return sendAuthError(res, "Authentication required");
    }

    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return sendNotFoundError(res, "Lesson");
    }

    const lessonData = doc.data() || {};

    if (!(await canMutate(req, lessonData))) {
      return sendAuthorizationError(res, "You do not have permission to delete this lesson");
    }

    await lessonRef.delete();

    res.status(200).json({ message: "Lesson deleted successfully." });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    sendError(res, 'Failed to delete lesson', 500, 'LESSON_DELETE_ERROR', error.message);
  }
};

const downloadPDF = async (req, res) => {
  const lessonId = req.params.lessonId;

  try {
    const db = databaseService.getDb();
    const lessonRef = db.collection(TABLE_LESSON).doc(lessonId);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return sendNotFoundError(res, "Lesson");
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
    // docPdf.pipe(res) above may already have sent headers (or bytes) by
    // the time an error occurs further down - sendError()'s res.json()
    // would throw on top of that instead of reporting the real error.
    if (res.headersSent) {
      return res.end();
    }
    sendError(res, 'Failed to generate PDF', 500, 'PDF_GENERATION_ERROR', error.message);
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
