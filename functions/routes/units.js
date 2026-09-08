const express = require("express");
const {
  getAllUnits,
  getUnitById,
  getUserUnits,
  createUnit,
  updateUnitById,
  deleteUnit,
} = require("../controllers/unitsController");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());
const multer = require("multer");
const upload = multer().none(); // To handle fields without files

router.get("/units", getAllUnits);
router.get("/unit/:id", getUnitById);
router.get("/units/user", authenticateUser, getUserUnits);
router.post("/unit", authenticateUser, upload, createUnit); // Apply middleware here
router.post("/update/:id", authenticateUser, upload, updateUnitById);
router.delete("/unit/:id", authenticateUser, deleteUnit);

module.exports = router;
