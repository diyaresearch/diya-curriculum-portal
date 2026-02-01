/**
 * Standardized response helpers for consistent API responses
 * All API endpoints should use these helpers for consistent formatting
 */

/**
 * Creates a standardized success response
 * @param {*} data - The data to return
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Standardized success response
 */
function createSuccessResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Internal error code
 * @param {*} details - Additional error details (optional)
 * @returns {Object} Standardized error response
 */
function createErrorResponse(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    statusCode,
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString()
    }
  };

  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = details;
  }

  return response;
}

/**
 * Sends a success response to the client
 * @param {Object} res - Express response object
 * @param {*} data - The data to return
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json(createSuccessResponse(data, message, statusCode));
}

/**
 * Sends an error response to the client
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Internal error code
 * @param {*} details - Additional error details (optional)
 */
function sendError(res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
  return res.status(statusCode).json(createErrorResponse(message, statusCode, errorCode, details));
}

/**
 * Sends a validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Array|Object} validationErrors - Validation errors
 */
function sendValidationError(res, message = 'Validation failed', validationErrors = []) {
  return sendError(res, message, 400, 'VALIDATION_ERROR', { validationErrors });
}

/**
 * Sends an authentication error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendAuthError(res, message = 'Authentication required') {
  return sendError(res, message, 401, 'AUTH_ERROR');
}

/**
 * Sends an authorization error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendAuthorizationError(res, message = 'Insufficient permissions') {
  return sendError(res, message, 403, 'AUTHORIZATION_ERROR');
}

/**
 * Sends a not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - The resource that was not found
 */
function sendNotFoundError(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Sends a conflict error response (e.g., resource already exists)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendConflictError(res, message = 'Resource already exists') {
  return sendError(res, message, 409, 'CONFLICT');
}

/**
 * Handles database errors and sends appropriate responses
 * @param {Object} res - Express response object
 * @param {Error} error - The database error
 * @param {string} operation - The operation that failed
 */
function handleDatabaseError(res, error, operation = 'Database operation') {
  console.error(`${operation} failed:`, error);

  // Check for specific Firebase/Firestore errors
  if (error.code === 'permission-denied') {
    return sendAuthorizationError(res, 'Access denied to database resource');
  }

  if (error.code === 'unauthenticated') {
    return sendAuthError(res, 'Database authentication failed');
  }

  if (error.code === 'not-found') {
    return sendNotFoundError(res, 'Database resource');
  }

  if (error.code === 'already-exists') {
    return sendConflictError(res, 'Resource already exists in database');
  }

  // Generic database error
  return sendError(res,
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    process.env.NODE_ENV !== 'production' ? error.message : null
  );
}

/**
 * Handles authentication errors and sends appropriate responses
 * @param {Object} res - Express response object
 * @param {Error} error - The authentication error
 */
function handleAuthError(res, error) {
  console.error('Authentication error:', error);

  if (error.code === 'auth/id-token-expired') {
    return sendAuthError(res, 'Authentication token has expired');
  }

  if (error.code === 'auth/id-token-revoked') {
    return sendAuthError(res, 'Authentication token has been revoked');
  }

  if (error.code === 'auth/invalid-id-token') {
    return sendAuthError(res, 'Invalid authentication token');
  }

  // Generic auth error
  return sendAuthError(res, 'Authentication failed');
}

/**
 * Async wrapper for route handlers to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Unhandled error in route:', error);

      // Send standardized error response
      if (!res.headersSent) {
        return sendError(res,
          'An unexpected error occurred',
          500,
          'UNHANDLED_ERROR',
          process.env.NODE_ENV !== 'production' ? error.message : null
        );
      }
    });
  };
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
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
};