const express = require("express");
const { getAllUnits, getUnitById } = require("../controllers/unitsController");
const { createUnit } = require("../controllers/content_submission");
const { updateUnitById } = require("../controllers/update_submission");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());

router.get("/units", getAllUnits);
router.get("/unit/:id", getUnitById);
router.post("/unit", authenticateUser, createUnit); // Apply middleware here
router.post("/update/:id", updateUnitById);

module.exports = router;
