const { databaseService } = require('../services/databaseService');
const { canMutate, resolveOwnerUid } = require('../utils/ownership');

// Define the collections
const TABLE_CONTENT = "content";
const TABLE_LESSON = "lesson";

// Get all units
const getAllUnits = async (req, res) => {
  // Add CORS headers
  // const allowOrigin = 'http://localhost:3000'  // origin we allow requests from
  // res.setHeader('Access-Control-Allow-Origin', allowOrigin); // or '*' for any origin
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Add other methods if needed
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Add any other headers as needed

  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
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
    await databaseService.initialize();
    const db = databaseService.getDb();
    const unitId = req.params.id;
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();
    if (!unitDoc.exists) {
      res.status(404).send('Unit not found');
      return;
    }

    // The list endpoint filters on isPublic; fetching by id did not, so private
    // units were readable by anyone holding the id (#424). Non-public units are
    // now visible only to their owner or an admin.
    const unitData = unitDoc.data();
    if (unitData.isPublic === false) {
      const requesterUid = req.user && req.user.uid;
      const isOwner = requesterUid && resolveOwnerUid(unitData) === requesterUid;
      if (!isOwner && !(await canMutate(req, unitData))) {
        return res.status(404).send('Unit not found');
      }
    }

    res.status(200).json({ id: unitDoc.id, ...unitData });
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).send(error.message);
  }
};

const getUserUnits = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const userId = req.user ? req.user.uid : null; // Extract user ID from authenticated request
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const unitsSnapshot = await db.collection(TABLE_CONTENT).get();
    if (unitsSnapshot.empty) {
      return res.status(200).json([]);
    }

    const userUnits = [];
    unitsSnapshot.forEach((doc) => {
      const unitData = doc.data();
      // Fetch public units and private units owned by the user
      if (unitData.isPublic || unitData.Author === userId) {
        userUnits.push({ id: doc.id, ...unitData });
      }
    });

    res.status(200).json(userUnits);
  } catch (error) {
    console.error("Error fetching user units:", error);
    res.status(500).send(error.message);
  }
};

const deleteUnit = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const unitId = req.params.id;

    // Check if unit exists
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();
    if (!unitDoc.exists) {
      return res.status(404).send('Unit not found');
    }

    // Authenticated but unauthorized: any signed-in user could delete anyone's
    // content before this check (#424).
    if (!(await canMutate(req, unitDoc.data()))) {
      return res.status(403).send('You do not have permission to delete this content');
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
  getUserUnits,
  deleteUnit,
};
