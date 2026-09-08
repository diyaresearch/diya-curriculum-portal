/**
 * Plain-Node entry point: the same app.js, on a real port.
 *
 * This is what `npm start`, start.sh and CI use. Running the deployed artifact
 * through the Functions emulator instead would be slower, would need the
 * Firebase CLI for every local run, and would break the Vite dev proxy
 * (portal-app/vite.config.js forwards /api to localhost:3001) as well as the
 * pytest integration suite, which boots this and curls it.
 *
 * Everything here is local-only concerns — dotenv, env validation, port
 * binding, and the boot-time credential check. Nothing in app.js depends on
 * this file having run, so the deployed function behaves the same without it.
 */

const dotenv = require("dotenv");

// Load environment configuration. In a deployed function these come from
// Secret Manager instead and there is no .env file to find.
const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });
console.log(`Loaded environment: ${env}`);

const { validateAndExit } = require("./utils/envValidator");
validateAndExit(false); // Warn about missing vars, don't exit on them.

const { buildApp } = require("./app");

const app = buildApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API is running on port ${PORT}`);
  checkFirestoreOnBoot();
});

/**
 * Confirm at boot that the Admin credential actually works. The app still
 * starts (so /api/health stays answerable), but the log says plainly what is
 * broken and how to fix it rather than leaving every route to fail with a 500.
 */
async function checkFirestoreOnBoot() {
  let db;
  let source = "unknown";
  try {
    const { resolveCredential, verifyCredential } = require("./config/credentials");
    source = resolveCredential().source;
    db = require("./config/firebaseConfig").db;

    const result = await verifyCredential(db);
    if (result.ok) {
      console.log("Firestore reachable - Admin credential is valid");
      return;
    }

    const { remediationFor } = require("./config/credentials");
    console.error(
      "\nFirestore is UNREACHABLE - API routes backed by Firestore will fail.\n" +
        `  Reason: ${result.error.message}\n` +
        `  ${remediationFor(source)}\n`
    );
  } catch (error) {
    console.error("\nFirebase Admin is not configured:\n" + error.message + "\n");
  }
}
