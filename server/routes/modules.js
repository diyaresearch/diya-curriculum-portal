const express = require("express");
const { getAllModules, getModuleById, createModule, editModule, deleteModule, listMyEntitlements } = require("../controllers/moduleController");
const authenticateUser = require("../middleware/authenticateUser");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();
router.use(express.json());

router.get("/modules", getAllModules);
// Optional auth: anonymous callers get the storefront view of a paid module,
// entitled callers get its contents (#430).
router.get("/module/:id", optionalAuth, getModuleById);

// Mutating routes were callable anonymously (#424). Authorization (owner or
// admin) is enforced inside the controllers, which need the document to decide.
router.post("/module", authenticateUser, createModule);
router.post("/module/:id", authenticateUser, editModule);
router.delete("/module/:id", authenticateUser, deleteModule);

// What has this user actually paid for? The UI uses this to show real access
// rather than a decorative lock icon (#430).
router.get("/my-entitlements", authenticateUser, listMyEntitlements);

module.exports = router;