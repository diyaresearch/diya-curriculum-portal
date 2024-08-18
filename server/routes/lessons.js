const express = require("express");

const { getAllLessons } = require("../controllers/lessonsController");

const router = express.Router();
router.use(express.json());

router.get("/lessons", getAllLessons);

module.exports = router;
