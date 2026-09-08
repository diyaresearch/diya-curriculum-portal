const { databaseService } = require("../services/databaseService");
const { sendAuthError } = require("../utils/responseHelpers");

const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return sendAuthError(res, "Authorization token required");
  }

  try {
    // Initialize database service if needed
    await databaseService.initialize();
    const admin = databaseService.getAdmin();

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return sendAuthError(res, "Invalid or expired token");
  }
};

module.exports = authenticateUser;
