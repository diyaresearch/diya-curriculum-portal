const { databaseService } = require("../services/databaseService");

/**
 * Attach req.user when a valid token is present, and carry on when it is not.
 *
 * Used on routes that are public but behave differently for a signed-in user —
 * a paid module returns its storefront metadata to anonymous callers and its
 * full contents to an entitled one (#430). Rejecting anonymous callers outright
 * would break the storefront; ignoring the token would gate everyone out.
 *
 * A malformed or expired token is treated as anonymous rather than an error:
 * the route has no authentication requirement to fail.
 */
const optionalAuth = async (req, _res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    await databaseService.initialize();
    const admin = databaseService.getAdmin();
    req.user = await admin.auth().verifyIdToken(token);
  } catch (error) {
    // Anonymous, not broken.
  }

  next();
};

module.exports = optionalAuth;
