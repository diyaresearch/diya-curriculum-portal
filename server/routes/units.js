const express = require("express");
const { getAllUnits, getUnitById, deleteUnit } = require("../controllers/unitsController");
const { createUnit } = require("../controllers/content_submission");
const { updateUnitById } = require("../controllers/update_submission");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());
const multer = require("multer");
const upload = multer().none(); // To handle fields without files

router.get("/units", getAllUnits);
router.get("/unit/:id", getUnitById);
router.post("/unit", authenticateUser, upload, createUnit); // Apply middleware here
router.post("/update/:id", upload, updateUnitById);
router.delete("/unit/:id", authenticateUser, deleteUnit);

module.exports = router;
