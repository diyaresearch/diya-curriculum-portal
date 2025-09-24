/**
 * Global error handler middleware for Express
 * Catches all unhandled errors and returns standardized responses
 */

const { createErrorResponse } = require('../utils/responseHelpers');

/**
 * Global error handling middleware
 * This should be the LAST middleware in the Express app
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(err, req, res, next) {
  // Log the error for debugging
  console.error('Global Error Handler - Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine error type and create appropriate response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details = null;

  // Handle specific error types
  if (err.code === 16 || err.message?.includes('UNAUTHENTICATED')) {
    // Firebase authentication errors
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
    message = 'Database service is temporarily unavailable';
  } else if (err.code === 'permission-denied') {
    // Firebase permission errors
    statusCode = 403;
    errorCode = 'DATABASE_PERMISSION_DENIED';
    message = 'Access denied to database resource';
  } else if (err.name === 'ValidationError') {
    // Validation errors
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'CastError') {
    // Database cast errors
    statusCode = 400;
    errorCode = 'INVALID_INPUT';
    message = 'Invalid input format';
  } else if (err.status || err.statusCode) {
    // Errors with explicit status codes
    statusCode = err.status || err.statusCode;
    message = err.message || message;
  }

  // Add details in development mode
  if (process.env.NODE_ENV !== 'production') {
    details = {
      originalError: err.message,
      errorType: err.name || 'Unknown',
      code: err.code || 'NO_CODE'
    };
  }

  // Create and send standardized error response
  const errorResponse = createErrorResponse(message, statusCode, errorCode, details);
  return res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for unmatched routes
 * This should be added before the global error handler
 */
function notFoundHandler(req, res, next) {
  const errorResponse = createErrorResponse(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  return res.status(404).json(errorResponse);
}

/**
 * Async error wrapper to ensure async errors are caught
 * This is an alternative to the asyncHandler in responseHelpers
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the async error
      console.error('Async Error Handler - Caught error:', {
        message: error.message,
        url: req.url,
        method: req.method,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });

      // Pass to global error handler
      next(error);
    });
  };
}

/**
 * Firebase-specific error handler
 * Wraps Firebase operations to provide better error handling
 */
function handleFirebaseError(error, operation = 'Firebase operation') {
  console.error(`${operation} failed:`, error);

  // Create a standardized error object
  const standardError = new Error();

  if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
    standardError.message = 'Database authentication failed';
    standardError.statusCode = 503;
    standardError.errorCode = 'DATABASE_UNAVAILABLE';
  } else if (error.code === 'permission-denied') {
    standardError.message = 'Access denied to database resource';
    standardError.statusCode = 403;
    standardError.errorCode = 'DATABASE_PERMISSION_DENIED';
  } else if (error.code === 'not-found') {
    standardError.message = 'Resource not found in database';
    standardError.statusCode = 404;
    standardError.errorCode = 'NOT_FOUND';
  } else if (error.code === 'already-exists') {
    standardError.message = 'Resource already exists';
    standardError.statusCode = 409;
    standardError.errorCode = 'CONFLICT';
  } else {
    standardError.message = 'Database operation failed';
    standardError.statusCode = 500;
    standardError.errorCode = 'DATABASE_ERROR';
  }

  // Preserve original error for debugging
  standardError.originalError = error;
  return standardError;
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  handleFirebaseError
};