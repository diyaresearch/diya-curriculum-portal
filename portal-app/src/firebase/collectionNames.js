const DEFAULT_DEV_SCHEMA_QUALIFIER = "";
const DEFAULT_PROD_SCHEMA_QUALIFIER = "prod.";

function resolveSchemaQualifier() {
  const raw = String(process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER || "").trim();
  if (raw) return raw;

  // CRA sets NODE_ENV at build time. Production build should write to prod.* collections by default.
  if (process.env.NODE_ENV === "production") return DEFAULT_PROD_SCHEMA_QUALIFIER;
  return DEFAULT_DEV_SCHEMA_QUALIFIER;
}

const SCHEMA_QUALIFIER = resolveSchemaQualifier();

function withQualifier(collectionBaseName) {
  return `${SCHEMA_QUALIFIER}${collectionBaseName}`;
}

// Helpful to confirm what a deployed build is using (runs once on module import).
if (typeof window !== "undefined") {
  try {
    // Avoid noisy logs in local dev; production is where confusion happens.
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.info("[Firestore] Using schema qualifier:", SCHEMA_QUALIFIER || "(empty)");
    }
  } catch (_) {
    // ignore
  }
}

export const COLLECTIONS = Object.freeze({
  module: withQualifier("module"),
  lesson: withQualifier("lesson"),
  content: withQualifier("content"),
});

export function getSchemaQualifier() {
  return SCHEMA_QUALIFIER;
}

