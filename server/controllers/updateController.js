const { db } = require("../config/firebaseConfig");

// Define the collections
const SCHEMA_QUALIFIER = process.env.DATABASE_SCHEMA_QUALIFIER || "";
const TABLE_CONTENT = SCHEMA_QUALIFIER + "content";

console.log('updateController tables are', TABLE_CONTENT)

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
      await db.collection(TABLE_CONTENT).doc(id).update({
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
      await db.collection(TABLE_CONTENT).doc().set({
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
