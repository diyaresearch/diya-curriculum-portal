const { db } = require('../config/firebaseConfig');

// Define the collections
const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_MODULE = SCHEMA_QUALIFIER + "module";
const TABLE_LESSON = SCHEMA_QUALIFIER + "lesson";

console.log('moduleController tables are', TABLE_MODULE, TABLE_LESSON);

// Get all modules
const getAllModules = async (req, res) => {
  try {
    const modulesSnapshot = await db.collection(TABLE_MODULE).get();
    if (modulesSnapshot.empty) {
      return res.status(200).json([]);
    }

    const allModules = [];
    modulesSnapshot.forEach(doc => {
      const moduleData = doc.data();
      allModules.push({ id: doc.id, ...moduleData });
    });

    res.status(200).json(allModules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).send(error.message);
  }
};

// Get a specific module by ID
const getModuleById = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const moduleDoc = await db.collection(TABLE_MODULE).doc(moduleId).get();

    if (!moduleDoc.exists) {
      return res.status(404).send('Module not found');
    }

    res.status(200).json({ id: moduleDoc.id, ...moduleDoc.data() });
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).send(error.message);
  }
};

// Create a new module
const createModule = async (req, res) => {
  try {
    const { title, description, tags, lessonPlans, image } = req.body;

    const newModule = {
      title,
      description,
      tags: tags || [],
      lessonPlans: lessonPlans || [],
      image: image,
    };

    const moduleRef = await db.collection(TABLE_MODULE).add(newModule);
    res.status(201).json({ id: moduleRef.id, ...newModule });
  } catch (error) {
    console.error("Error creating module:", error);
    res.status(500).send(error.message);
  }
};

// Edit an existing module
const editModule = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const { title, description, tags, lessonPlans, image } = req.body;

    const moduleRef = db.collection(TABLE_MODULE).doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return res.status(404).send("Module not found");
    }

    const moduleData = moduleDoc.data();

    const updatedModule = {
      title: title || moduleData.title,
      description: description || moduleData.description,
      tags: tags || moduleData.tags,
      lessonPlans: lessonPlans || moduleData.lessonPlans,
      image: image || moduleData.image,
    };

    await moduleRef.update(updatedModule);
    res.status(200).json({ id: moduleId, ...updatedModule });
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).send(error.message);
  }
};

// Delete a module
const deleteModule = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const moduleRef = db.collection(TABLE_MODULE).doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return res.status(404).send("Module not found");
    }

    await moduleRef.delete();
    res.status(200).send("Module deleted successfully");
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).send(error.message);
  }
};

module.exports = {
  getAllModules,
  getModuleById,
  createModule,
  editModule,
  deleteModule,
};
