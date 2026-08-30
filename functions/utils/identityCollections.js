/**
 * Identity collection names for Cloud Functions (issue #427, criterion 4).
 *
 * `teachers` and `students` were hardcoded literals here too, so the deployed
 * function resolved the same user documents as a developer's laptop.
 *
 * Deliberately does NOT reuse server/utils/schemaQualifier: that module throws
 * when the qualifier is unset in production, which is correct for the Express
 * server but fatal here. Cloud Functions always run with NODE_ENV="production"
 * and do not set DATABASE_SCHEMA_QUALIFIER, so a strict resolver would kill the
 * function at module load. The deployed function serves the production app, so
 * "prod." is the right default.
 */

const VALID_QUALIFIER = /^[A-Za-z0-9_.-]*$/;

function resolveQualifier() {
  const raw = process.env.DATABASE_SCHEMA_QUALIFIER;
  if (raw === undefined || raw === null || String(raw).trim() === "undefined") {
    return "prod.";
  }
  const value = String(raw).trim();
  return VALID_QUALIFIER.test(value) ? value : "prod.";
}

const QUALIFIER = resolveQualifier();

const TEACHERS = QUALIFIER + "teachers";
const STUDENTS = QUALIFIER + "students";
const TESTIMONIALS = QUALIFIER + "testimonials";

const LEGACY_TEACHERS = QUALIFIER ? "teachers" : null;
const LEGACY_STUDENTS = QUALIFIER ? "students" : null;

/** Qualified collections first, unprefixed as a transitional fallback. */
async function findUserDocument(db, userId, usersTable) {
  const candidates = [TEACHERS, STUDENTS, LEGACY_TEACHERS, LEGACY_STUDENTS].filter(Boolean);

  for (const collection of candidates) {
    const ref = db.collection(collection).doc(userId);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, snap, collection };
    }
  }

  const ref = db.collection(usersTable).doc(userId);
  const snap = await ref.get();
  return { ref, snap, collection: usersTable };
}

module.exports = {
  QUALIFIER,
  TEACHERS,
  STUDENTS,
  TESTIMONIALS,
  LEGACY_TEACHERS,
  LEGACY_STUDENTS,
  findUserDocument,
};
