const express = require("express");

const { getAllLessons } = require("../controllers/lessonsController");
const { getLessonById } = require("../controllers/lessonsController");
const { getAllSections } = require("../controllers/lessonsController");
const { getSections } = require("../controllers/lessonsController");
const { postLesson } = require("../controllers/lessonsController");
const { updateLesson } = require("../controllers/lessonsController");
const { downloadPDF } = require("../controllers/lessonsController");
const { deleteLessonById } = require("../controllers/lessonsController");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());

router.get("/lessons", getAllLessons);
router.get("/lesson/:lessonId", getLessonById);
router.get("/sections", getAllSections);
router.get("/lessons/sections", getSections);
router.get("/lessons/:lessonId/download", downloadPDF);
router.post("/lesson", authenticateUser, postLesson);
router.put("/lesson/:lessonId", updateLesson);
router.delete("/lesson/:lessonId", deleteLessonById);

module.exports = router;
