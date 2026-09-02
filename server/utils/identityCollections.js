/**
 * User document lookup.
 *
 * `teachers` and `students` used to be separate collections, looked up ahead
 * of a qualified `users` collection (issue #427). Both the schema qualifier
 * and the teachers/students split were retired in #428: there is one
 * `users` collection now, holding all four roles (admin, teacherPlus,
 * teacherDefault, studentDefault).
 *
 * Kept as a small helper — several callers already share this
 * {ref, snap, collection} shape — rather than inlined at every call site.
 */

async function findUserDocument(db, userId, usersTable) {
  const ref = db.collection(usersTable).doc(userId);
  const snap = await ref.get();
  return { ref, snap, collection: usersTable };
}

module.exports = {
  findUserDocument,
};
