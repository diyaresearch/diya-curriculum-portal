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
    await new Promise((resolve, reject) => {
      upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          console.error("Multer error:", err);
          return reject({ status: 400, message: "File upload error" });
        } else if (err) {
          console.error("Unknown error during file upload:", err);
          return reject({ status: 500, message: "Unknown error" });
        }
        resolve();
      });
    });

    const { id } = req.params;
    const { Title, Category, Type, Level, Duration, isPublic, Abstract } =
      req.body;
    let updateData = {
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      Abstract,
    };

    if (req.file) {
      const bucket = storage.bucket();
      const filename = `${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(filename);
      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await new Promise((resolve, reject) => {
        blobStream.on("error", (error) => {
          console.error("Error uploading file:", error);
          reject({ status: 500, message: "Error uploading file" });
        });

        blobStream.on("finish", () => {
          updateData.fileUrl = `https://storage.googleapis.com/curriculum-portal-1ce8f.appspot.com/projectFiles/${filename}`;
          resolve();
        });

        blobStream.end(req.file.buffer);
      });
    }

    await db.collection("content").doc(id).update(updateData);
    res.status(200).send("Content updated successfully");
  } catch (error) {
    console.error("Error:", error);
    res
      .status(error.status || 500)
      .send(error.message || "Error updating content");
  }
};

module.exports = {
  updateUnitById,
};
