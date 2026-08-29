const express = require("express");
const { getAllModules, getModuleById, createModule, editModule, deleteModule } = require("../controllers/moduleController");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();
router.use(express.json());

router.get("/modules", getAllModules);
router.get("/module/:id", getModuleById);

// Mutating routes were callable anonymously (#424). Authorization (owner or
// admin) is enforced inside the controllers, which need the document to decide.
router.post("/module", authenticateUser, createModule);
router.post("/module/:id", authenticateUser, editModule);
router.delete("/module/:id", authenticateUser, deleteModule);

module.exports = router;