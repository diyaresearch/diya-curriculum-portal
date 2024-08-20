const express = require("express");

const { getAllLessons } = require("../controllers/lessonsController");
const { getAllSections } = require("../controllers/lessonsController");
const router = express.Router();
router.use(express.json());

router.get("/lessons", getAllLessons);
router.get("/sections", getAllSections);

module.exports = router;
