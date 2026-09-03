const { databaseService } = require('../services/databaseService');
const { canMutate } = require('../utils/ownership');
const { canAccessModule, isPaidModule } = require('../utils/entitlements.check');
const { sanitizeHtml } = require('../utils/sanitizeHtml');
const { sendError } = require('../utils/responseHelpers');

// Define the collections
const TABLE_MODULE = "module";
const TABLE_LESSON = "lesson";
const TABLE_ENTITLEMENTS = "entitlements";

// Get all modules
const getAllModules = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
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
    sendError(res, 'Failed to fetch modules', 500, 'MODULE_FETCH_ERROR', error.message);
  }
};

// Get a specific module by ID
const getModuleById = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const moduleId = req.params.id;
    const moduleDoc = await db.collection(TABLE_MODULE).doc(moduleId).get();

    if (!moduleDoc.exists) {
      return res.status(404).send('Module not found');
    }

    const moduleData = moduleDoc.data();

    // A paid module's contents require an entitlement written by the Stripe
    // webhook (#430). The storefront still needs the metadata, so an
    // unentitled caller gets the description and price without the lessons.
    const access = await canAccessModule(
      db,
      TABLE_ENTITLEMENTS,
      req.user && req.user.uid,
      moduleId,
      moduleData
    );

    if (!access.allowed) {
      const { lessons, lessonPlans, ...preview } = moduleData;
      return res.status(200).json({
        id: moduleDoc.id,
        ...preview,
        locked: true,
        entitlementRequired: true,
        accessReason: access.reason,
      });
    }

    res.status(200).json({ id: moduleDoc.id, ...moduleData, locked: false });
  } catch (error) {
    console.error('Error fetching module:', error);
    sendError(res, 'Failed to fetch module', 500, 'MODULE_FETCH_ERROR', error.message);
  }
};

// Create a new module
const createModule = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const { title, description, tags, lessonPlans, image } = req.body;

    const newModule = {
      title,
      description: sanitizeHtml(description),
      tags: tags || [],
      lessonPlans: lessonPlans || [],
      image: image,
      // Stamp ownership from the token, never from the body, so the document
      // can be authorized on later edits (#424).
      author: req.user.uid,
      createdAt: new Date(),
    };

    const moduleRef = await db.collection(TABLE_MODULE).add(newModule);
    res.status(201).json({ id: moduleRef.id, ...newModule });
  } catch (error) {
    console.error("Error creating module:", error);
    sendError(res, 'Failed to create module', 500, 'MODULE_CREATE_ERROR', error.message);
  }
};

// Edit an existing module
const editModule = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const moduleId = req.params.id;
    const { title, description, tags, lessonPlans, image } = req.body;

    const moduleRef = db.collection(TABLE_MODULE).doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return res.status(404).send("Module not found");
    }

    const moduleData = moduleDoc.data();

    if (!(await canMutate(req, moduleData))) {
      return res.status(403).send("You do not have permission to edit this module");
    }

    const updatedModule = {
      title: title || moduleData.title,
      description: sanitizeHtml(description || moduleData.description),
      tags: tags || moduleData.tags,
      lessonPlans: lessonPlans || moduleData.lessonPlans,
      image: image || moduleData.image,
    };

    await moduleRef.update(updatedModule);
    res.status(200).json({ id: moduleId, ...updatedModule });
  } catch (error) {
    console.error("Error updating module:", error);
    sendError(res, 'Failed to update module', 500, 'MODULE_UPDATE_ERROR', error.message);
  }
};

// Delete a module
const deleteModule = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();
    const moduleId = req.params.id;
    const moduleRef = db.collection(TABLE_MODULE).doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return res.status(404).send("Module not found");
    }

    if (!(await canMutate(req, moduleDoc.data()))) {
      return res.status(403).send("You do not have permission to delete this module");
    }

    await moduleRef.delete();
    res.status(200).send("Module deleted successfully");
  } catch (error) {
    console.error("Error deleting module:", error);
    sendError(res, 'Failed to delete module', 500, 'MODULE_DELETE_ERROR', error.message);
  }
};

// List the modules this user is entitled to.
const listMyEntitlements = async (req, res) => {
  try {
    await databaseService.initialize();
    const db = databaseService.getDb();

    const snap = await db
      .collection(TABLE_ENTITLEMENTS)
      .where('userId', '==', req.user.uid)
      .get();

    const moduleIds = snap.docs.map((d) => d.data().moduleId).filter(Boolean);
    res.status(200).json({ moduleIds });
  } catch (error) {
    console.error('Error listing entitlements:', error);
    sendError(res, 'Failed to list entitlements', 500, 'ENTITLEMENT_FETCH_ERROR', error.message);
  }
};

module.exports = {
  listMyEntitlements,
  getAllModules,
  getModuleById,
  createModule,
  editModule,
  deleteModule,
};
