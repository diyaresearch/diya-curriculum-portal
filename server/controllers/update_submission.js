// Update a specific unit by ID with file upload functionality

const { db } = require("../config/firebaseConfig");

// Define the collections
const SCHEMA_QUALIFIER = process.env.DATABASE_SCHEMA_QUALIFIER || "";
const TABLE_CONTENT = SCHEMA_QUALIFIER + "content";

console.log('update_submission tables are', TABLE_CONTENT)

// Update a specific unit by ID
const updateUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body, req.params)
    const unitRef = db.collection(TABLE_CONTENT).doc(id);
    const unitSnapshot = await unitRef.get();
    
    if (!unitSnapshot.exists) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const existingData = unitSnapshot.data();

    let updateData = {
      Title: req.body.Title ?? existingData.Title,
      Category: req.body.Category ?? existingData.Category,
      Type: req.body.Type ?? existingData.Type,
      Level: req.body.Level ?? existingData.Level,
      Duration: req.body.Duration ?? existingData.Duration,
      isPublic: req.body.isPublic,
      Abstract: req.body.Abstract ?? existingData.Abstract,
      fileUrl: req.body.fileUrl ?? existingData.fileUrl,
      LastModified: new Date().toISOString(),
    };
    console.log("update Data is", updateData)

    await db.collection(TABLE_CONTENT).doc(id).update(updateData);
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
