/**
 * Identity collection names (issue #427, criterion 4).
 *
 * `teachers`, `students` and `testimonials` were hardcoded literals, so they
 * were never qualified by environment. Because getUserDocument resolves
 * teachers -> students -> {qualifier}users, the unprefixed path won for the
 * entire existing user population: a developer's laptop read and wrote the
 * same user documents as production.
 *
 * Reads fall back to the unprefixed collections during the transition, so a
 * user whose document has not been copied yet still resolves. Writes always go
 * to the qualified collection.
 */

const { resolveSchemaQualifier } = require("./schemaQualifier");

const QUALIFIER = resolveSchemaQualifier();

const TEACHERS = QUALIFIER + "teachers";
const STUDENTS = QUALIFIER + "students";
const TESTIMONIALS = QUALIFIER + "testimonials";

// Pre-qualifier collections, read-only. Empty when the qualifier is already
// empty, so development does not read the same collection twice.
const LEGACY_TEACHERS = QUALIFIER ? "teachers" : null;
const LEGACY_STUDENTS = QUALIFIER ? "students" : null;

/**
 * Resolve a user's profile document, newest layout first.
 *
 * Order: qualified teachers -> qualified students -> legacy teachers ->
 * legacy students -> qualified users.
 *
 * @returns {Promise<{ref: Object, snap: Object, collection: string}>}
 *          The final `users` reference when nothing matched, so callers can
 *          still create a document there.
 */
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
