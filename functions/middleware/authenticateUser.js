const { sendAuthError } = require("../utils/responseHelpers");

const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return sendAuthError(res, "Authorization token required");
  }

  try {
    // In Cloud Functions, use firebase-admin default credentials (do NOT rely on local serviceAccount files).
    const admin = require("firebase-admin");
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return sendAuthError(res, "Invalid or expired token");
  }
};

module.exports = authenticateUser;
