const express = require("express");

const { getAllLessons } = require("../controllers/lessonsController");
const { getAllLessonsAdmin } = require("../controllers/lessonsController");
const { getLessonById } = require("../controllers/lessonsController");
const { getUserLessons } = require("../controllers/lessonsController");
const { postLesson } = require("../controllers/lessonsController");
const { updateLesson } = require("../controllers/lessonsController");
const { downloadPDF } = require("../controllers/lessonsController");
const { deleteLessonById } = require("../controllers/lessonsController");
const authenticateUser = require("../middleware/authenticateUser");
const optionalAuth = require("../middleware/optionalAuth");
const { requireAdmin } = require("../middleware/requireRole");

const router = express.Router();
router.use(express.json());

router.get("/lessons", getAllLessons);
// Returns non-public lessons, so it must be admin-only (#424).
router.get("/lessons/admin", authenticateUser, requireAdmin, getAllLessonsAdmin);
router.get("/lesson/myLessons", authenticateUser, getUserLessons);
// Optional auth: a lesson inside a paid module needs an entitlement, and the
// controller can only check one if it knows who is asking (#430). Anonymous
// callers still read free lessons.
router.get("/lesson/:lessonId", optionalAuth, getLessonById);
// Same gate as the JSON read above - the PDF is the same content.
router.get("/lessons/:lessonId/download", optionalAuth, downloadPDF);
router.post("/lesson", authenticateUser, postLesson);
router.put("/lesson/:lessonId", authenticateUser, updateLesson);
router.delete("/lesson/:lessonId", authenticateUser, deleteLessonById);

module.exports = router;
