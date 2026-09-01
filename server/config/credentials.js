/**
 * Firebase Admin credential resolution.
 *
 * One place decides *which* credential the Admin SDK uses, so that
 * config/firebaseConfig.js and services/databaseService.js can never drift
 * apart (they did: one silently preferred a stale JSON key, the other fell
 * back to mock data when that key was missing).
 *
 * Precedence, highest first:
 *   0. FIRESTORE_EMULATOR_HOST         - Firestore emulator; no credential needed at all
 *   1. FIREBASE_SERVICE_ACCOUNT        - inline JSON or base64, for CI / secret managers
 *   2. Google-managed runtime          - App Engine / Cloud Run default service account
 *   3. GOOGLE_APPLICATION_CREDENTIALS  - explicit ADC path
 *   4. gcloud ADC                      - `gcloud auth application-default login`
 *   5. serviceAccountKey.json          - legacy, local only, opt-in via FIREBASE_ALLOW_KEY_FILE
 *
 * A downloaded JSON key is deliberately last and opt-in: long-lived keys are
 * what took production down (issue #418) and they must never ship in a deploy.
 *
 * The emulator branch is highest precedence, not lowest, so a developer who
 * has both a real ADC login *and* the emulator running (the common case,
 * since `gcloud auth application-default login` is also how they reach real
 * Firestore) still gets routed to the emulator rather than production data
 * (#428). FIRESTORE_EMULATOR_HOST is never set outside local dev/CI — it is
 * not a value anything in this repo sets automatically for production.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const admin = require("firebase-admin");

const DEFAULT_PROJECT_ID = "curriculum-portal-1ce8f";

/**
 * The checked-in .env.production ships placeholder values ("your-production-
 * project-id"). Trusting them would point the Admin SDK at a project that does
 * not exist, so obvious placeholders are ignored in favour of the real default.
 */
function resolveProjectId() {
  const configured = process.env.FIREBASE_PROJECT_ID;
  if (!configured || /^your-|-here$|example/i.test(configured)) {
    if (configured) {
      console.warn(
        `Ignoring placeholder FIREBASE_PROJECT_ID="${configured}"; using ${DEFAULT_PROJECT_ID}.`
      );
    }
    return DEFAULT_PROJECT_ID;
  }
  return configured;
}

const PROJECT_ID = resolveProjectId();
const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`;
const LEGACY_KEY_PATH = path.join(__dirname, "..", "serviceAccountKey.json");

/** True on App Engine, Cloud Run, or Cloud Functions, where a runtime service account is attached. */
function isGoogleManagedRuntime() {
  return Boolean(
    process.env.GAE_ENV ||
      process.env.GAE_SERVICE ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET
  );
}

/** Path gcloud writes application default credentials to. */
function adcFilePath() {
  const configRoot =
    process.env.CLOUDSDK_CONFIG ||
    (process.platform === "win32"
      ? path.join(process.env.APPDATA || "", "gcloud")
      : path.join(os.homedir(), ".config", "gcloud"));

  return path.join(configRoot, "application_default_credentials.json");
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

/** Parse FIREBASE_SERVICE_ACCOUNT, which may hold raw JSON or base64-encoded JSON. */
function parseInlineServiceAccount(raw) {
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  const parsed = JSON.parse(text);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("missing client_email or private_key");
  }
  return parsed;
}

/**
 * Decide which credential to use without contacting Google.
 * @returns {{credential: Object, source: string, detail: string}}
 * @throws {Error} when no credential source is configured at all
 */
function resolveCredential() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // No `credential` key at all — see credentialOptions() below. The
    // emulator accepts an unauthenticated connection by design; reaching
    // into applicationDefault() would defeat the point, since on a machine
    // with no cloud credentials configured that call itself can throw.
    return {
      credential: null,
      source: "firestore-emulator",
      detail: `Firestore emulator (FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST})`,
    };
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    let serviceAccount;
    try {
      serviceAccount = parseInlineServiceAccount(inline);
    } catch (error) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT is set but could not be parsed (${error.message}). ` +
          "Provide the service account JSON, or its base64 encoding."
      );
    }
    return {
      credential: admin.credential.cert(serviceAccount),
      source: "inline-service-account",
      detail: `FIREBASE_SERVICE_ACCOUNT (${serviceAccount.client_email})`,
    };
  }

  if (isGoogleManagedRuntime()) {
    return {
      credential: admin.credential.applicationDefault(),
      source: "runtime-service-account",
      detail: "attached runtime service account (metadata server)",
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      credential: admin.credential.applicationDefault(),
      source: "application-default",
      detail: `GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
    };
  }

  const adcPath = adcFilePath();
  if (fileExists(adcPath)) {
    return {
      credential: admin.credential.applicationDefault(),
      source: "application-default",
      detail: `gcloud ADC (${adcPath})`,
    };
  }

  if (fileExists(LEGACY_KEY_PATH)) {
    if (process.env.FIREBASE_ALLOW_KEY_FILE !== "true") {
      throw new Error(
        `Found ${LEGACY_KEY_PATH}, but downloaded service account keys are disabled by default.\n` +
          "  Preferred fix:  gcloud auth application-default login\n" +
          "  Escape hatch:   FIREBASE_ALLOW_KEY_FILE=true npm start\n" +
          "See DEPLOYMENT.md for why (issue #418: an expired key file took the API down)."
      );
    }
    if (isGoogleManagedRuntime()) {
      throw new Error(
        "Refusing to use serviceAccountKey.json on a Google-managed runtime. " +
          "App Engine and Cloud Run already provide a service account identity."
      );
    }

    const serviceAccount = require(LEGACY_KEY_PATH);
    return {
      credential: admin.credential.cert(serviceAccount),
      source: "legacy-key-file",
      detail: `serviceAccountKey.json (${serviceAccount.client_email})`,
    };
  }

  throw new Error(
    "No Firebase Admin credential found.\n" +
      "  Local development:  gcloud auth application-default login\n" +
      "  CI / containers:    set FIREBASE_SERVICE_ACCOUNT to the service account JSON (or its base64)\n" +
      "  App Engine:         deploy with a runtime service account that has the Firestore roles"
  );
}

/**
 * Turn a resolveCredential() result into the options `admin.initializeApp()`
 * expects. Not `{ credential: resolved.credential }` unconditionally: the
 * Admin SDK checks `'credential' in options`, so passing an explicit
 * `credential: null`/`undefined` still counts as "present" and throws
 * INVALID_APP_OPTIONS. The emulator source must omit the key entirely.
 *
 * @param {{credential: Object|null, source: string}} resolved
 * @returns {Object} spread into the options object passed to initializeApp()
 */
function credentialOptions(resolved) {
  return resolved.source === "firestore-emulator"
    ? {}
    : { credential: resolved.credential };
}

/** True when some credential source is configured. Never contacts Google. */
function hasCredentialSource() {
  try {
    resolveCredential();
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Prove the credential actually works, rather than waiting for the first
 * request to fail with an opaque 500. A read of an empty collection is the
 * cheapest call that still exercises authentication end to end.
 *
 * @param {Object} db Firestore instance
 * @returns {Promise<{ok: boolean, error?: Error}>}
 */
async function verifyCredential(db) {
  try {
    // Plain name on purpose: Firestore reserves collection ids matching __*__.
    await db.collection("credential_healthcheck").limit(1).get();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Human-readable remediation for a failed verifyCredential(), by credential source. */
function remediationFor(source) {
  switch (source) {
    case "legacy-key-file":
      return (
        "The downloaded key in serviceAccountKey.json is no longer valid (deleted, disabled, or its service account was removed).\n" +
        "Delete it and switch to ADC:  rm server/serviceAccountKey.json && gcloud auth application-default login"
      );
    case "application-default":
      return "Refresh your local credentials:  gcloud auth application-default login --project curriculum-portal-1ce8f";
    case "runtime-service-account":
      return (
        "The App Engine / Cloud Run service account cannot reach Firestore.\n" +
        "Grant it the datastore user role:\n" +
        `  gcloud projects add-iam-policy-binding ${PROJECT_ID} \\\n` +
        `    --member=serviceAccount:appengine-default@${PROJECT_ID}.iam.gserviceaccount.com \\\n` +
        "    --role=roles/datastore.user"
      );
    case "inline-service-account":
      return "The service account in FIREBASE_SERVICE_ACCOUNT was rejected. Rotate it and update the secret.";
    default:
      return "Check the Firebase Admin credential configuration (see DEPLOYMENT.md).";
  }
}

module.exports = {
  PROJECT_ID,
  STORAGE_BUCKET,
  LEGACY_KEY_PATH,
  isGoogleManagedRuntime,
  resolveCredential,
  credentialOptions,
  hasCredentialSource,
  verifyCredential,
  remediationFor,
};
