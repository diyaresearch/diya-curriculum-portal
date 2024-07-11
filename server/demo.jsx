const { db } = require("../config/firebaseConfig");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid"); // for generating unique filenames
const { storage } = require("../config/firebaseConfig"); // Ensure to import storage from your firebaseConfig

const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory (for small files)
  limits: {
    fileSize: 5 * 1024 * 1024, // Max file size 5MB (adjust as necessary)
  },
});

// Function to handle POST request for submitting content
const post_content = async (req, res) => {
  try {
    // Multer middleware handles file upload
    upload.single("file")(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file size limit exceeded)
        console.error("Multer error:", err);
        return res.status(400).send("File upload error");
      } else if (err) {
        // An unknown error occurred during file upload
        console.error("Unknown error during file upload:", err);
        return res.status(500).send("Unknown error");
      }

      // Extract data from request body
      const {
        Title,
        Category,
        Type,
        Level,
        Duration,
        isPublic,
        Abstract,
      } = req.body;

      // Validate the presence of required fields if necessary
      if (
        !Title ||
        !Category ||
        !Type ||
        !Level ||
        !Duration ||
        !Abstract
      ) {
        return res.status(400).send("Missing required fields");
      }

      let fileUrl = "";
      if (req.file) {
        const file = req.file;
        const bucket = storage.bucket();

        // Upload file to Firebase Storage
        const filename = `${uuidv4()}_${file.originalname}`;
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
          // The file upload is complete.
          // Get the public URL of the uploaded file
          fileUrl = `https://storage.googleapis.com/curriculum-portal-1ce8f.appspot.com/projectFiles/${filename}`;

          // Now save other data to Firestore
          await saveContentToFirestore(
            Title,
            Category,
            Type,
            Level,
            Duration,
            isPublic,
            Abstract,
            fileUrl
          );

          // Send response to client
          res.status(201).send("Content submitted successfully");
        });

        // Pipe the file data into the write stream
        blobStream.end(file.buffer);
      } else {
        // No file uploaded, save other data to Firestore without fileUrl
        await saveContentToFirestore(
          Title,
          Category,
          Type,
          Level,
          Duration,
          isPublic,
          Abstract,
          fileUrl
        );

        // Send response to client
        res.status(201).send("Content submitted successfully");
      }
    });
  } catch (error) {
    console.error("Error submitting content:", error);
    res.status(500).send("Error submitting content");
  }
};

// Function to save content data to Firestore
async function saveContentToFirestore(
  Title,
  Category,
  Type,
  Level,
  Duration,
  isPublic,
  Abstract,
  fileUrl
) {
  const contentRef = db.collection("content");
  const data = {
    Title,
    Category,
    Type,
    Level,
    Duration,
    isPublic,
    Abstract,
    fileUrl, // Optional: Add if you want to store file URL in Firestore
  };

  // Save data to Firestore
  await contentRef.add(data);
}

module.exports = {
  post_content,
};
