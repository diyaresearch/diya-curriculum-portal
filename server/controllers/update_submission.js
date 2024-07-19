// Update a specific unit by ID with file upload functionality

const { db } = require("../config/firebaseConfig");
const multer = require("multer");
const { storage } = require("../config/firebaseConfig");

const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
  limits: {
    fileSize: 5 * 1024 * 1024, // Max file size 5MB (adjust as necessary)
  },
});

// Update a specific unit by ID
const updateUnitById = async (req, res) => {
  try {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file size limit exceeded)
        console.error("Multer error:", err);
        return res.status(400).send("File upload error");
      } else if (err) {
        // An unknown error occurred during file upload
        console.error("Unknown error during file upload:", err);
        return res.status(500).send("Unknown error");
      }
      next(); // Proceed to the next middleware
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file");
  }

  try {
    const { id } = req.params;
    const { Title, Category, Type, Level, Duration, isPublic, Abstract } =
      req.body;
    let fileUrl = "";

    // Check if file was uploaded
    if (req.file) {
      const bucket = storage.bucket();
      const filename = `${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(filename);
      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      blobStream.on("error", (error) => {
        console.error("Error uploading file:", error);
        res.status(500).send("Error uploading file");
      });

      blobStream.on("finish", async () => {
        // File upload is complete
        fileUrl = `https://storage.googleapis.com/curriculum-portal-1ce8f.appspot.com/projectFiles/${filename}`;

        // Update Firestore document with fileUrl
        await db.collection("content").doc(id).update({
          Title,
          Category,
          Type,
          Level,
          Duration,
          isPublic,
          Abstract,
          fileUrl,
        });

        res.status(200).send("Content updated successfully");
      });

      // Pipe file buffer into the write stream
      blobStream.end(req.file.buffer);
    } else {
      // No file uploaded, update Firestore document without fileUrl
      await db.collection("content").doc(id).update({
        Title,
        Category,
        Type,
        Level,
        Duration,
        isPublic,
        Abstract,
      });

      res.status(200).send("Content updated successfully");
    }
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).send("Error updating content");
  }
};

module.exports = {
  updateUnitById,
};
