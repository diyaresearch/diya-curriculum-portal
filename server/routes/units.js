const express = require("express");
const { getAllUnits, getUnitById } = require("../controllers/unitsController");
const { post_content } = require("../controllers/content_submission");

const router = express.Router();
router.use(express.json());

router.get("/units", getAllUnits);
router.get("/unit/:id", getUnitById);
router.post("/content", post_content);

module.exports = router;
