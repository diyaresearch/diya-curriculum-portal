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
  // Identity collections were hardcoded literals, so dev and prod shared the
  // same user documents (#427). Qualified now, like everything else.
  teachers: withQualifier("teachers"),
  students: withQualifier("students"),
  testimonials: withQualifier("testimonials"),
  // Unified user table (#431) — falls back to here when a uid isn't in teachers/students.
  users: withQualifier("users"),
});

// Pre-qualifier names, read-only. A profile that has not been copied into the
// qualified collection yet still resolves through these during the transition.
export const LEGACY_COLLECTIONS = Object.freeze({
  teachers: SCHEMA_QUALIFIER ? "teachers" : null,
  students: SCHEMA_QUALIFIER ? "students" : null,
});

export function getSchemaQualifier() {
  return SCHEMA_QUALIFIER;
}

