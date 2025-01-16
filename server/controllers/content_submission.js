const { db } = require("../config/firebaseConfig");
const multer = require("multer");
const { storage } = require("../config/firebaseConfig");

const createUnit = async (req, res) => {
  console.log("Received content upload request");
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
    console.log("Author ID:", Author);

    await saveContentToFirestore(
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      Abstract,
      fileUrl,
      Author,
    );
      res.status(201).send("Content submitted successfully");
  } catch (error) {
    console.error("Error submitting content:", error);
    res.status(500).send("Error submitting content");
  }
};

async function getNextUnitID() {
  console.log("in getNextUnitID")
  const counterRef = db.collection("counters").doc("unitIdCounter");
  

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
  const contentRef = db.collection("content");
  const newUnitID = await getNextUnitID();
  console.log("after getNextUnitID")
  console.log("Generated UnitID:", newUnitID);

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
  console.log("Document data to save:", data);

  await contentRef.add(data);
  console.log("Document successfully saved to Firestore");
}

module.exports = {
  createUnit,
};
