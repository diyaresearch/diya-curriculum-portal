const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const { requireAdmin, requireValidUser } = require("../middleware/requireRole");
const { databaseService } = require("../services/databaseService");
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendAuthorizationError,
  sendNotFoundError,
  sendConflictError,
  handleDatabaseError,
  handleAuthError,
  asyncHandler
} = require("../utils/responseHelpers");

const router = express.Router();

const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS = SCHEMA_QUALIFIER + "users";

// Get current user details
router.get("/me", authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  try {
    // Initialize database service if needed
    await databaseService.initialize();

    // Use the database service's getUserDocument method
    const { snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);

    if (!userSnap.exists) {
      return sendNotFoundError(res, "User profile");
    }

    const userData = userSnap.data();
    return sendSuccess(res, userData, "User profile retrieved successfully");

  } catch (error) {
    return handleDatabaseError(res, error, "Fetching user profile");
  }
}));

// Get all users (admin only) - MUST come before /:userId route
router.get("/users", authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  // Initialize database service if needed
  await databaseService.initialize();

  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 users per request
    const role = req.query.role;

    const result = await databaseService.getAllUsers(TABLE_USERS, {
      page,
      limit,
      role,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });

    const users = result.users.map((doc) => {
      const userData = doc.data();
      // Remove sensitive fields from response
      const { subscriptionStartDate, createdAt, updatedAt, ...safeUserData } = userData;
      return {
        id: doc.id,
        ...safeUserData,
        createdAt: createdAt?.toDate?.()?.toISOString(),
        updatedAt: updatedAt?.toDate?.()?.toISOString()
      };
    });

    return sendSuccess(res, {
      users,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalUsers: result.totalUsers,
        usersPerPage: limit,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage
      }
    }, `Retrieved ${users.length} users (page ${page} of ${result.totalPages})`);

  } catch (error) {
    return handleDatabaseError(res, error, "Fetching users list");
  }
}));

// Get user details with userId
router.get("/:userId", asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Basic validation
  if (!userId || userId.trim() === '') {
    return sendValidationError(res, "User ID is required", [
      { field: 'userId', message: 'User ID cannot be empty' }
    ]);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(userId) || userId.length > 64) {
    return sendValidationError(res, "Invalid user ID format", [
      { field: 'userId', message: 'User ID contains invalid characters' }
    ]);
  }
/*
  // Try to fetch user
  const user = await userService.getUserById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: "USER_NOT_FOUND", message: "User not found" }
    });
  }
*/


  // Initialize database service if needed
  await databaseService.initialize();

  try {
    const db = databaseService.getDb();
    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return sendNotFoundError(res, "User");
    }

    const userData = { id: userId, ...userSnap.data() };
    return sendSuccess(res, userData, "User details retrieved successfully");

  } catch (error) {
    return handleDatabaseError(res, error, "Fetching user details");
  }
}));

// Register new user
router.post("/register", authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const {
    email,
    fullName,
    firstName,
    lastName,
    institution,
    userType,
    jobTitle,
    subjects,
    role = "teacherDefault"
  } = req.body;

  // Validate required fields
  const requiredFields = ['email', 'fullName', 'firstName', 'lastName'];
  const validationErrors = [];

  requiredFields.forEach(field => {
    if (!req.body[field] || req.body[field].trim() === '') {
      validationErrors.push({ field, message: `${field} is required` });
    }
  });

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    validationErrors.push({ field: 'email', message: 'Invalid email format' });
  }

  // Validate role
  const validRoles = ['admin', 'teacherDefault', 'teacherPlus', 'teacherEnterprise'];
  if (role && !validRoles.includes(role)) {
    validationErrors.push({ field: 'role', message: 'Invalid role specified' });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Registration validation failed", validationErrors);
  }

  // Initialize database service if needed
  await databaseService.initialize();

  try {
    const db = databaseService.getDb();
    const admin = databaseService.getAdmin();

    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const existingUser = userSnap.data();
      return sendSuccess(res, {
        id: userId,
        fullName: existingUser.fullName,
        role: existingUser.role
      }, "User already exists", 200);
    }

    // Create new user
    const newUser = {
      email: email.trim(),
      fullName: fullName.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      institution: institution?.trim() || '',
      userType: userType?.trim() || 'educator',
      jobTitle: jobTitle?.trim() || '',
      subjects: Array.isArray(subjects) ? subjects : [],
      role,
      subscriptionType: 'basic',
      subscriptionStatus: 'active',
      subscriptionStartDate: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
      createdAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()
    };

    await userRef.set(newUser);

    return sendSuccess(res, {
      id: userId,
      fullName: newUser.fullName,
      role: newUser.role
    }, "User registered successfully", 201);

  } catch (error) {
    return handleDatabaseError(res, error, "User registration");
  }
}));

// Update user profile
router.put("/update", authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const {
    firstName,
    lastName,
    institution,
    userType,
    jobTitle,
    subjects
  } = req.body;

  // Validate that at least one field is provided for update
  const updateFields = { firstName, lastName, institution, userType, jobTitle, subjects };
  const fieldsToUpdate = Object.entries(updateFields).filter(([key, value]) => value !== undefined);

  if (fieldsToUpdate.length === 0) {
    return sendValidationError(res, "No fields provided for update", [
      { field: 'update', message: 'At least one field must be provided for update' }
    ]);
  }

  // Validate individual fields
  const validationErrors = [];

  if (firstName !== undefined && (!firstName || firstName.trim() === '')) {
    validationErrors.push({ field: 'firstName', message: 'First name cannot be empty if provided' });
  }

  if (lastName !== undefined && (!lastName || lastName.trim() === '')) {
    validationErrors.push({ field: 'lastName', message: 'Last name cannot be empty if provided' });
  }

  if (subjects !== undefined && !Array.isArray(subjects)) {
    validationErrors.push({ field: 'subjects', message: 'Subjects must be an array' });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Update validation failed", validationErrors);
  }

  // Initialize database service if needed
  await databaseService.initialize();

  try {
    const db = databaseService.getDb();
    const admin = databaseService.getAdmin();

    const userRef = db.collection(TABLE_USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return sendNotFoundError(res, "User profile");
    }

    // Prepare update object with only defined fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (institution !== undefined) updateData.institution = institution?.trim() || '';
    if (userType !== undefined) updateData.userType = userType?.trim() || 'educator';
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle?.trim() || '';
    if (subjects !== undefined) updateData.subjects = subjects;

    // Add update timestamp
    updateData.updatedAt = admin.firestore?.FieldValue?.serverTimestamp?.() || new Date();

    await userRef.update(updateData);

    return sendSuccess(res, {
      id: userId,
      updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
    }, "User profile updated successfully");

  } catch (error) {
    return handleDatabaseError(res, error, "Updating user profile");
  }
}));


// Admin can manage user role
router.put("/updateRole", authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const { userId, newRole } = req.body;

  // Validate required fields
  const validationErrors = [];

  if (!userId || userId.trim() === '') {
    validationErrors.push({ field: 'userId', message: 'User ID is required' });
  }

  if (!newRole || newRole.trim() === '') {
    validationErrors.push({ field: 'newRole', message: 'New role is required' });
  }

  // Validate role value
  const validRoles = ['admin', 'teacherDefault', 'teacherPlus', 'teacherEnterprise'];
  if (newRole && !validRoles.includes(newRole)) {
    validationErrors.push({
      field: 'newRole',
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Role update validation failed", validationErrors);
  }

  // Initialize database service if needed
  await databaseService.initialize();

  try {
    const db = databaseService.getDb();
    const admin = databaseService.getAdmin();

    // Check if target user exists
    const targetUserRef = db.collection(TABLE_USERS).doc(userId);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      return sendNotFoundError(res, "Target user");
    }

    const currentUserData = targetUserSnap.data();
    const currentRole = currentUserData.role;

    // Prevent changing the role if it's already the same
    if (currentRole === newRole) {
      return sendSuccess(res, {
        userId,
        role: newRole,
        previousRole: currentRole
      }, `User role is already set to ${newRole}`, 200);
    }

    // Prevent self-demotion from admin (safety check)
    if (req.user.uid === userId && currentRole === 'admin' && newRole !== 'admin') {
      return sendValidationError(res, "Cannot demote yourself from admin role", [
        { field: 'userId', message: 'Admin users cannot change their own role' }
      ]);
    }

    // Update role with timestamp
    await targetUserRef.update({
      role: newRole,
      roleUpdatedAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
      roleUpdatedBy: req.user.uid
    });

    return sendSuccess(res, {
      userId,
      role: newRole,
      previousRole: currentRole,
      updatedBy: req.user.uid
    }, `User role successfully updated from ${currentRole} to ${newRole}`);

  } catch (error) {
    return handleDatabaseError(res, error, "Updating user role");
  }
}));

module.exports = router;