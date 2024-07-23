const { db } = require("../config/firebaseConfig");
const multer = require("multer");
const { storage } = require("../config/firebaseConfig");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const post_content = async (req, res) => {
  console.log("Received content upload request");
  try {
    upload.single("file")(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).send("File upload error");
      } else if (err) {
        console.error("Unknown error during file upload:", err);
        return res.status(500).send("Unknown error");
      }

      const { Title, Category, Type, Level, Duration, isPublic, Abstract } =
        req.body;
      const file = req.file;
      if (!Title || !Category || !Type || !Level || !Duration || !Abstract) {
        console.error("Missing required fields");
        return res.status(400).send("Missing required fields");
      }

      const Author = req.user ? req.user.uid : null; // Extract the Author ID from the authenticated user
      if (!Author) {
        console.error("Author ID is missing");
        return res.status(401).send("Unauthorized");
      }
      console.log("Author ID:", Author);

      let fileUrl = "";
      if (file) {
        const bucket = storage.bucket();
        const filename = `${Date.now()}_${file.originalname}`;
        const fileUpload = bucket.file(filename);
        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.error("Error uploading file:", error);
          res.status(500).send("Error uploading file");
        });

        blobStream.on("finish", async () => {
          fileUrl = `https://storage.googleapis.com/curriculum-portal-1ce8f.appspot.com/projectFiles/${filename}`;
          await saveContentToFirestore(
            Title,
            Category,
            Type,
            Level,
            Duration,
            isPublic,
            Abstract,
            fileUrl,
            Author
          );
          res.status(201).send("Content submitted successfully");
        });

        blobStream.end(file.buffer);
      } else {
        await saveContentToFirestore(
          Title,
          Category,
          Type,
          Level,
          Duration,
          isPublic,
          Abstract,
          fileUrl,
          Author
        );
        res.status(201).send("Content submitted successfully");
      }
    });
  } catch (error) {
    console.error("Error submitting content:", error);
    res.status(500).send("Error submitting content");
  }
};

async function getNextUnitID() {
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
  post_content,
};
