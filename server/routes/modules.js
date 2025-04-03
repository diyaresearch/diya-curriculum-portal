const express = require("express");
const { getAllModules, getModuleById, createModule, editModule, deleteModule } = require("../controllers/moduleController");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());

router.get("/modules", getAllModules);
router.get("/module/:id", getModuleById);
router.post("/module", createModule);
router.post("/module/:id", editModule);
router.delete("/module/:id", deleteModule);

module.exports = router;