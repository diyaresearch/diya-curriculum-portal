/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role(s)
 */

const { databaseService } = require("../services/databaseService");
const { sendAuthorizationError, sendNotFoundError, handleDatabaseError } = require("../utils/responseHelpers");

const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS = SCHEMA_QUALIFIER + "users";

/**
 * Creates middleware to require specific role(s)
 * @param {string|Array} requiredRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
function requireRole(requiredRoles) {
  // Normalize to array
  const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.uid) {
        return sendAuthorizationError(res, "Authentication required for role check");
      }

      const userId = req.user.uid;

      // Initialize database service if needed
      await databaseService.initialize();

      // Get user document with fallback collections
      const { snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);

      if (!userSnap.exists) {
        return sendNotFoundError(res, "User profile");
      }

      const userData = userSnap.data();
      const userRole = userData.role || 'teacherDefault'; // Default role

      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        return sendAuthorizationError(res,
          `Access denied. Required role: ${allowedRoles.join(' or ')}, Current role: ${userRole}`
        );
      }

      // Attach user role and data to request for further use
      req.userRole = userRole;
      req.userData = userData;

      next();
    } catch (error) {
      return handleDatabaseError(res, error, "Role authorization check");
    }
  };
}

/**
 * Middleware to require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to require teacher roles (any level)
 */
const requireTeacher = requireRole(['teacherDefault', 'teacherPlus', 'teacherEnterprise']);

/**
 * Middleware to require premium teacher roles
 */
const requirePremiumTeacher = requireRole(['teacherPlus', 'teacherEnterprise']);

/**
 * Middleware to require any authenticated user (no specific role required)
 * Just validates that user exists in database
 */
const requireValidUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return sendAuthorizationError(res, "Authentication required");
    }

    const userId = req.user.uid;

    // Initialize database service if needed
    await databaseService.initialize();

    // Use the database service's getUserDocument method
    const { snap: userSnap } = await databaseService.getUserDocument(userId, TABLE_USERS);

    if (!userSnap.exists) {
      return sendNotFoundError(res, "User profile");
    }

    const userData = userSnap.data();

    // Attach user data to request
    req.userData = userData;
    req.userRole = userData.role || 'teacherDefault';

    next();
  } catch (error) {
    return handleDatabaseError(res, error, "User validation check");
  }
};

module.exports = {
  requireRole,
  requireAdmin,
  requireTeacher,
  requirePremiumTeacher,
  requireValidUser
};