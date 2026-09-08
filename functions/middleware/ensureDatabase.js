/**
 * One database initialization per process, not one per request (issue #396).
 *
 * Every controller, route and middleware used to open with
 *
 *   await databaseService.initialize();
 *   const db = databaseService.getDb();
 *
 * which is ~60 call sites all re-deciding, on every request, something that
 * can only be decided once: whether this process talks to real Firestore or
 * to the mock. initialize() short-circuits on a boolean after the first call,
 * so the cost was small — but the failure mode was not. Nothing awaited that
 * promise anywhere it could be handled: a credential that failed to resolve
 * surfaced as an unhandled rejection inside whichever route happened to run
 * first, and getDb() then threw "DatabaseService not initialized" for every
 * request after it, which reads like a bug in the route rather than a dead
 * credential.
 *
 * app.js starts initialization at build time and mounts this ahead of the
 * routers. By the time a handler runs, getDb()/getAdmin() are guaranteed
 * usable — or the request has already been answered with a 503 that names the
 * real problem.
 */

const { databaseService } = require("../services/databaseService");
const { sendError } = require("../utils/responseHelpers");

/**
 * Await the shared initialization promise, or fail the request loudly.
 *
 * 503 rather than the 500 the issue sketched: a dead Admin credential is an
 * unavailable dependency, not a bug in the request. That is the code
 * /api/health already reports for the same condition (it deliberately sits
 * ahead of this middleware so it can keep answering while this is failing),
 * and the code middleware/errorHandler.js maps DATABASE_UNAVAILABLE to.
 */
async function ensureDatabase(req, res, next) {
  try {
    await databaseService.initialize();
    return next();
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    return sendError(
      res,
      "Database initialization failed",
      503,
      "DATABASE_INIT_FAILED",
      error.message
    );
  }
}

module.exports = { ensureDatabase };
