const { db } = require('../config/firebaseConfig');

// Define the collections
const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_CONTENT = SCHEMA_QUALIFIER + "content";
const TABLE_LESSON =  SCHEMA_QUALIFIER + "lesson"; 

console.log('unitsController tables are', TABLE_CONTENT, TABLE_LESSON)

// Get all units
const getAllUnits = async (req, res) => {
  // Add CORS headers
  // const allowOrigin = 'http://localhost:3000'  // origin we allow requests from
  // res.setHeader('Access-Control-Allow-Origin', allowOrigin); // or '*' for any origin
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Add other methods if needed
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Add any other headers as needed
  
  try {
    const unitsSnapshot = await db.collection(TABLE_CONTENT).get();
    if (unitsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }
    
    const publicUnits = [];
    unitsSnapshot.forEach(doc => {
      const unitData = doc.data();
        // only push public units
        if (unitData.isPublic) {
            publicUnits.push({ id: doc.id, ...unitData });
        }
    });
    res.status(200).json(publicUnits);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).send(error.message);
  }
};

// Get a specific unit by ID
const getUnitById = async (req, res) => {
  try {
    const unitId = req.params.id;
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();
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

const deleteUnit = async (req, res) => {
  try {
    const unitId = req.params.id;
    
    // Check if unit exists
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();
    if (!unitDoc.exists) {
      return res.status(404).send('Unit not found');
    }

    // Check if unit is used in any lesson plans
    const lessonsSnapshot = await db.collection(TABLE_LESSON).get();
    const lessons = [];
    lessonsSnapshot.forEach(doc => {
      const lesson = doc.data();
      if (lesson.sections) {
        lesson.sections.forEach(section => {
          if (section.contentIds && section.contentIds.includes(unitId)) {
            lessons.push(lesson.title);
          }
        });
      }
    });

    if (lessons.length > 0) {
      return res.status(400).send(
        `Cannot delete unit as it is used in the following lesson plans: ${lessons.join(', ')}`
      );
    }

    // Delete the unit
    await db.collection(TABLE_CONTENT).doc(unitId).delete();
    res.status(200).send('Unit deleted successfully');
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).send(error.message);
  }
};

module.exports = {
  getAllUnits,
  getUnitById,
  deleteUnit,
};
