const express = require("express");
const { getAllUnits, getUnitById } = require("../controllers/unitsController");
const { post_content } = require("../controllers/content_submission");
const { updateUnitById } = require("../controllers/update_submission");
const authenticateUser = require("../middleware/authenticateUser");


const router = express.Router();
router.use(express.json());

router.get("/units", getAllUnits);
router.get("/unit/:id", getUnitById);
router.post("/content", post_content);
router.put("/update/:id", updateUnitById);
router.post("/content", authenticateUser, post_content); // Apply middleware here


module.exports = router;
