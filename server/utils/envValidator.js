/**
 * Environment variable validation utility
 * Ensures all required environment variables are present and valid
 */

const requiredEnvVars = {
  development: [
    'NODE_ENV',
    'PORT',
    'SERVER_ALLOW_ORIGIN',
    'DATABASE_SCHEMA_QUALIFIER',
    // STRIPE_SECRET_KEY is optional in development for user testing
  ],
  production: [
    'NODE_ENV',
    'PORT',
    'SERVER_ALLOW_ORIGIN',
    'DATABASE_SCHEMA_QUALIFIER',
    'STRIPE_SECRET_KEY',
    'FIREBASE_PROJECT_ID'
  ],
  test: [
    'NODE_ENV',
    'DATABASE_SCHEMA_QUALIFIER'
  ]
};

const optionalEnvVars = [
  'LOG_LEVEL',
  'LOG_FORMAT',
  'JWT_EXPIRATION',
  'MAX_REQUEST_SIZE',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS'
];

/**
 * Validates environment variables for the current environment
 * @returns {Object} Validation result with success status and missing variables
 */
function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;

  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Special handling for Stripe key in development (warning only)
  if (env === 'development' && !process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is not set. Payment features will not work.');
  }

  // Validate specific formats
  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    missing.push('PORT (must be a valid number)');
  }

  if (process.env.DATABASE_SCHEMA_QUALIFIER === 'undefined') {
    missing.push('DATABASE_SCHEMA_QUALIFIER (currently set to "undefined")');
  }

  return {
    success: missing.length === 0,
    environment: env,
    missing,
    warnings,
    suggestions: generateSuggestions(missing, env)
  };
}

/**
 * Generates helpful suggestions for missing environment variables
 * @param {Array} missing - Array of missing variable names
 * @param {string} env - Current environment
 * @returns {Array} Array of suggestion strings
 */
function generateSuggestions(missing, env) {
  const suggestions = [];

  if (missing.includes('STRIPE_SECRET_KEY')) {
    suggestions.push(
      `Set STRIPE_SECRET_KEY in .env.${env}. Get your key from: https://dashboard.stripe.com/${env === 'production' ? 'apikeys' : 'test/apikeys'}`
    );
  }

  if (missing.includes('DATABASE_SCHEMA_QUALIFIER')) {
    suggestions.push(
      `Set DATABASE_SCHEMA_QUALIFIER in .env.${env}. Example: ${env}_`
    );
  }

  if (missing.includes('SERVER_ALLOW_ORIGIN')) {
    const defaultOrigin = env === 'production' ? 'https://your-domain.com' : 'http://localhost:3000';
    suggestions.push(
      `Set SERVER_ALLOW_ORIGIN in .env.${env}. Example: ${defaultOrigin}`
    );
  }

  if (missing.length === 0) {
    suggestions.push('All required environment variables are properly configured!');
  }

  return suggestions;
}

/**
 * Prints validation results in a formatted way
 * @param {Object} result - Validation result from validateEnvironment()
 */
function printValidationResult(result) {
  console.log(`\n🔧 Environment Validation for: ${result.environment.toUpperCase()}`);
  console.log('='.repeat(50));

  if (result.success) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.log('❌ Missing required environment variables:');
    result.missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  if (result.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    result.suggestions.forEach(suggestion => {
      console.log(`   - ${suggestion}`);
    });
  }

  console.log('='.repeat(50));
}

/**
 * Validates environment and exits process if critical variables are missing
 * @param {boolean} exitOnFailure - Whether to exit process on validation failure
 */
function validateAndExit(exitOnFailure = true) {
  const result = validateEnvironment();
  printValidationResult(result);

  if (!result.success && exitOnFailure) {
    console.error('\n💥 Cannot start server with missing environment variables.');
    console.error('Please check your .env files and try again.\n');
    process.exit(1);
  }

  return result;
}

/**
 * Sets up default values for optional environment variables
 */
function setDefaults() {
  const defaults = {
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'simple',
    JWT_EXPIRATION: '1h',
    MAX_REQUEST_SIZE: '10mb',
    RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: '100'
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

module.exports = {
  validateEnvironment,
  validateAndExit,
  setDefaults,
  printValidationResult
};