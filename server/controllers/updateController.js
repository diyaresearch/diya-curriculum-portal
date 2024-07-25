const { db } = require("../config/firebaseConfig");

// Update a specific unit by ID without file
const updateUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Title, Category, Type, Level, Duration, isPublic, Abstract } =
      req.body;

    if (!Title || !Category || !Type || !Level || !Duration || !Abstract) {
      return res.status(400).send("Missing required fields");
    }
    if (req.method === "PUT") {
      await db.collection("content").doc(id).update({
        Title,
        Category,
        Type,
        Level,
        Duration,
        isPublic,
        Abstract,
        LastModified: new Date().toISOString(),
      });
    } else if (req.method === "POST") {
      await db.collection("content").doc().set({
        Title,
        Category,
        Type,
        Level,
        Duration,
        isPublic,
        Abstract,
        LastModified: new Date().toISOString(),
      });
    }

    res.status(200).send("Content updated successfully");
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).send("Error updating content");
  }
};

module.exports = {
  updateUnitById,
};
