/**
 * Units — the `content` collection.
 *
 * One controller per resource (#366). The read and delete handlers lived
 * here; `createUnit` lived in `content_submission.js` and `updateUnitById` in
 * `update_submission.js`, two snake_case files named after the request that
 * reached them rather than the thing they operate on. Splitting one resource
 * across three files named three different ways meant the ownership check in
 * one and the validation in another drifted apart with nothing to line them
 * up against. Both files are gone; their handlers are below, unchanged apart
 * from the two conventions in controllers/README.md they did not follow:
 * Firestore comes from databaseService, and errors go through
 * responseHelpers.
 */

const { databaseService } = require("../services/databaseService");
const { canMutate, resolveOwnerUid } = require("../utils/ownership");
const { sanitizeHtml } = require("../utils/sanitizeHtml");
const {
  sendError,
  sendAuthError,
  sendAuthorizationError,
  sendNotFoundError,
  sendValidationError,
} = require("../utils/responseHelpers");

// Define the collections
const TABLE_CONTENT = "content";
const TABLE_COUNTERS = "counters";
const TABLE_LESSON = "lesson";

const REQUIRED_FIELDS = ["Title", "Category", "Type", "Level", "Duration", "Abstract", "fileUrl"];

// Get all units
const getAllUnits = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const unitsSnapshot = await db.collection(TABLE_CONTENT).get();
    if (unitsSnapshot.empty) {
      return res.status(200).json([]);
    }

    const publicUnits = [];
    unitsSnapshot.forEach((doc) => {
      const unitData = doc.data();
      // only push public units
      if (unitData.isPublic) {
        publicUnits.push({ id: doc.id, ...unitData });
      }
    });

    res.status(200).json(publicUnits);
  } catch (error) {
    console.error("Error fetching units:", error);
    sendError(res, "Failed to fetch units", 500, "UNIT_FETCH_ERROR", error.message);
  }
};

// Get a specific unit by ID
const getUnitById = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const unitId = req.params.id;
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();

    if (!unitDoc.exists) {
      return sendNotFoundError(res, "Unit");
    }

    // The list endpoint filters on isPublic; fetching by id did not, so private
    // units were readable by anyone holding the id (#424). Non-public units are
    // now visible only to their owner or an admin.
    const unitData = unitDoc.data();
    if (unitData.isPublic === false) {
      const requesterUid = req.user && req.user.uid;
      const isOwner = requesterUid && resolveOwnerUid(unitData) === requesterUid;
      if (!isOwner && !(await canMutate(req, unitData))) {
        // 404, not 403: a private unit's existence is not public either.
        return sendNotFoundError(res, "Unit");
      }
    }

    res.status(200).json({ id: unitDoc.id, ...unitData });
  } catch (error) {
    console.error("Error fetching unit:", error);
    sendError(res, "Failed to fetch unit", 500, "UNIT_FETCH_ERROR", error.message);
  }
};

// Get the units visible to the signed-in user: everything public, plus their own
const getUserUnits = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const userId = req.user ? req.user.uid : null; // Extract user ID from authenticated request
    if (!userId) {
      return sendAuthError(res, "Authentication required");
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
    sendError(res, "Failed to fetch your units", 500, "UNIT_FETCH_ERROR", error.message);
  }
};

// Create a unit
const createUnit = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const { Title, Category, Type, Level, Duration, isPublic, Abstract, fileUrl } = req.body;

    const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return sendValidationError(
        res,
        "Missing required fields",
        missing.map((field) => ({ field, message: `${field} is required` }))
      );
    }

    const Author = req.user ? req.user.uid : null; // Extract the Author ID from the authenticated user
    if (!Author) {
      return sendAuthError(res, "Authentication required");
    }

    const newUnit = await saveContentToFirestore(db, {
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      Abstract: sanitizeHtml(Abstract),
      fileUrl,
      Author,
    });

    res.status(201).json(newUnit);
  } catch (error) {
    console.error("Error submitting content:", error);
    sendError(res, "Failed to create unit", 500, "UNIT_CREATE_ERROR", error.message);
  }
};

// Update a specific unit by ID
const updateUnitById = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const { id } = req.params;
    const unitRef = db.collection(TABLE_CONTENT).doc(id);
    const unitSnapshot = await unitRef.get();

    if (!unitSnapshot.exists) {
      return sendNotFoundError(res, "Unit");
    }

    const existingData = unitSnapshot.data();

    if (!(await canMutate(req, existingData))) {
      return sendAuthorizationError(res, "You do not have permission to edit this content");
    }

    const updateData = {
      Title: req.body.Title ?? existingData.Title,
      Category: req.body.Category ?? existingData.Category,
      Type: req.body.Type ?? existingData.Type,
      Level: req.body.Level ?? existingData.Level,
      Duration: req.body.Duration ?? existingData.Duration,
      isPublic: req.body.isPublic,
      // sanitizeHtml is idempotent, so this is safe whether the value came
      // fresh from the request or fell back to what's already stored.
      Abstract: sanitizeHtml(req.body.Abstract ?? existingData.Abstract),
      fileUrl: req.body.fileUrl ?? existingData.fileUrl,
      LastModified: new Date().toISOString(),
    };

    await unitRef.update(updateData);
    res.status(200).send("Content updated successfully");
  } catch (error) {
    console.error("Error updating content:", error);
    sendError(res, "Failed to update unit", error.status || 500, "UNIT_UPDATE_ERROR", error.message);
  }
};

// Delete a unit, unless a lesson plan still uses it
const deleteUnit = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const unitId = req.params.id;

    // Check if unit exists
    const unitDoc = await db.collection(TABLE_CONTENT).doc(unitId).get();
    if (!unitDoc.exists) {
      return sendNotFoundError(res, "Unit");
    }

    // Authenticated but unauthorized: any signed-in user could delete anyone's
    // content before this check (#424).
    if (!(await canMutate(req, unitDoc.data()))) {
      return sendAuthorizationError(res, "You do not have permission to delete this content");
    }

    // Check if unit is used in any lesson plans
    const lessonsSnapshot = await db.collection(TABLE_LESSON).get();
    const lessons = [];
    lessonsSnapshot.forEach((doc) => {
      const lesson = doc.data();
      if (lesson.sections) {
        lesson.sections.forEach((section) => {
          if (section.contentIds && section.contentIds.includes(unitId)) {
            lessons.push(lesson.title);
          }
        });
      }
    });

    if (lessons.length > 0) {
      return sendError(
        res,
        `Cannot delete unit as it is used in the following lesson plans: ${lessons.join(", ")}`,
        400,
        "UNIT_IN_USE"
      );
    }

    // Delete the unit
    await db.collection(TABLE_CONTENT).doc(unitId).delete();
    res.status(200).send("Unit deleted successfully");
  } catch (error) {
    console.error("Error deleting unit:", error);
    sendError(res, "Failed to delete unit", 500, "UNIT_DELETE_ERROR", error.message);
  }
};

/**
 * Next human-readable unit id ("diya42"), allocated under a transaction so two
 * concurrent uploads cannot claim the same number.
 */
async function getNextUnitId(db) {
  const counterRef = db.collection(TABLE_COUNTERS).doc("unitIdCounter");

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists) {
      throw new Error("Counter document does not exist");
    }

    const lastNumber = counterDoc.data().lastNumber;
    const newNumber = lastNumber + 1;
    transaction.update(counterRef, { lastNumber: newNumber });
    return `diya${newNumber}`;
  });
}

async function saveContentToFirestore(db, fields) {
  const data = {
    UnitID: await getNextUnitId(db),
    ...fields,
    LastModified: new Date().toISOString(),
  };

  const docRef = await db.collection(TABLE_CONTENT).add(data);

  return { id: docRef.id, ...data };
}

module.exports = {
  getAllUnits,
  getUnitById,
  getUserUnits,
  createUnit,
  updateUnitById,
  deleteUnit,
};
