// Update a specific unit by ID with file upload functionality

const { db } = require("../config/firebaseConfig");

// Update a specific unit by ID
const updateUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body, req.params)
    const { Title, Category, Type, Level, Duration, isPublic, Abstract, fileUrl } =
      req.body;
    let updateData = {
      Title,
      Category,
      Type,
      Level,
      Duration,
      isPublic,
      Abstract,
      fileUrl,
      LastModified: new Date().toISOString(),
    };
    console.log(111111111, updateData)

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
