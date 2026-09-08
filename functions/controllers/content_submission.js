const { db } = require("../config/firebaseConfig");
const multer = require("multer");
const { storage } = require("../config/firebaseConfig");
const { sanitizeHtml } = require("../utils/sanitizeHtml");
const { sendError } = require("../utils/responseHelpers");

// Define the collections
const TABLE_COUNTERS = "counters";
const TABLE_CONTENT = "content";

const createUnit = async (req, res) => {
  try {
    const { Title, Category, Type, Level, Duration, isPublic, Abstract, fileUrl } =
      req.body;
    if (!Title || !Category || !Type || !Level || !Duration || !Abstract || !fileUrl) {
      console.error("Missing required fields");
      return res.status(400).send("Missing required fields");
    }

    const Author = req.user ? req.user.uid : null; // Extract the Author ID from the authenticated user
    if (!Author) {
      console.error("Author ID is missing");
      return res.status(401).send("Unauthorized");
    }

    const newNugget = await saveContentToFirestore(
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      sanitizeHtml(Abstract),
      fileUrl,
      Author,
    );
      res.status(201).send(newNugget);
  } catch (error) {
    console.error("Error submitting content:", error);
    sendError(res, 'Error submitting content', 500, 'CONTENT_SUBMIT_ERROR', error.message);
  }
};

async function getNextUnitID() {
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

async function saveContentToFirestore(
  Title,
  Category,
  Type,
  Level,
  Duration,
  isPublic,
  Abstract,
  fileUrl,
  Author
) {
  const contentRef = db.collection(TABLE_CONTENT);
  const newUnitID = await getNextUnitID();

  const data = {
    UnitID: newUnitID,
    Title,
    Category,
    Type,
    Level,
    Duration,
    isPublic,
    Abstract,
    fileUrl,
    Author, // Use the custom user ID
    LastModified: new Date().toISOString(),
  };

  const docRef = await contentRef.add(data);

  return { id: docRef.id, ...data };
}

module.exports = {
  createUnit,
};
