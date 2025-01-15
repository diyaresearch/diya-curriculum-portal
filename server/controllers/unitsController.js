const { db } = require('../config/firebaseConfig');

// Get all units
const getAllUnits = async (req, res) => {
  // Add CORS headers
  // const allowOrigin = 'http://localhost:3000'  // origin we allow requests from
  // res.setHeader('Access-Control-Allow-Origin', allowOrigin); // or '*' for any origin
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Add other methods if needed
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Add any other headers as needed
  
  try {
    const unitsSnapshot = await db.collection('content').get();
    if (unitsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }

    const units = [];
    unitsSnapshot.forEach(doc => {
      units.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).send(error.message);
  }
};

// Get a specific unit by ID
const getUnitById = async (req, res) => {
  try {
    const unitId = req.params.id;
    const unitDoc = await db.collection('content').doc(unitId).get();
    if (!unitDoc.exists) {
      res.status(404).send('Unit not found');
      return;
    }
    res.status(200).json({ id: unitDoc.id, ...unitDoc.data() });
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).send(error.message);
  }
};

module.exports = {
  getAllUnits,
  getUnitById
};
