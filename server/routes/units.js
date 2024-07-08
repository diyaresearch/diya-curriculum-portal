const express = require('express');
const { getAllUnits, getUnitById } = require('../controllers/unitsController');

const router = express.Router();

router.get('/units', getAllUnits);
router.get('/unit/:id', getUnitById);

module.exports = router;
