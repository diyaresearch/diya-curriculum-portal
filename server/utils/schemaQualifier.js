/**
 * Firestore collection-name qualifier (issue #427).
 *
 * Dev and prod are separated only by a collection-name prefix, and the tiers
 * did not agree on it: the frontend used "prod." while this server used
 * "prod_". Since `prod_*` collections were never created, every API request in
 * production read and wrote an empty namespace — /api/units returned `200 []`
 * against 37 real documents.
 *
 * Canonical values, matching where the data actually lives:
 *
 *   production   "prod."   (portal-app/.env.production, functions/)
 *   development  ""        (portal-app/.env.development)
 *
 * An empty qualifier is a legitimate value, so "unset" and "empty" must be
 * distinguished rather than collapsed with `|| ""`.
 */

const PRODUCTION_QUALIFIER = "prod.";
const DEVELOPMENT_QUALIFIER = "";

// A qualifier becomes part of a collection name, so keep it to characters that
// cannot smuggle a path segment. "undefined" is rejected explicitly: raw
// `${process.env.DATABASE_SCHEMA_QUALIFIER}` interpolation used to produce it,
// which created collections literally named `undefinedusers`.
const VALID_QUALIFIER = /^[A-Za-z0-9_.-]*$/;

function isUnset(raw) {
  return raw === undefined || raw === null || String(raw).trim() === "undefined";
}

/**
 * @returns {string} the qualifier to prefix collection names with
 * @throws {Error} in production when the value is missing or unusable
 */
function resolveSchemaQualifier() {
  const env = process.env.NODE_ENV || "development";
  const raw = process.env.DATABASE_SCHEMA_QUALIFIER;

  if (isUnset(raw)) {
    if (env === "production") {
      throw new Error(
        "DATABASE_SCHEMA_QUALIFIER is not set. Refusing to start in production: " +
          `without it the server would read and write the wrong collections. Set it to "${PRODUCTION_QUALIFIER}".`
      );
    }
    return env === "test" ? DEVELOPMENT_QUALIFIER : DEVELOPMENT_QUALIFIER;
  }

  const value = String(raw).trim();

  if (!VALID_QUALIFIER.test(value)) {
    throw new Error(
      `DATABASE_SCHEMA_QUALIFIER contains unsupported characters: "${value}". ` +
        "Allowed: letters, digits, underscore, dot and hyphen."
    );
  }

  if (env === "production" && value !== PRODUCTION_QUALIFIER) {
    // Loud, not fatal: a deliberate override should be possible, but the
    // mismatch that caused this issue must never pass silently again.
    console.warn(
      `[schema] DATABASE_SCHEMA_QUALIFIER is "${value}" in production; the data lives under "${PRODUCTION_QUALIFIER}". ` +
        "If this is not deliberate, the server is pointed at an empty namespace."
    );
  }

  return value;
}

module.exports = {
  resolveSchemaQualifier,
  PRODUCTION_QUALIFIER,
  DEVELOPMENT_QUALIFIER,
};
