// Firestore collection names.
//
// Used to be qualified by a `DATABASE_SCHEMA_QUALIFIER` prefix so dev and
// prod could share one Firebase project (#427), and `teachers`/`students`
// were separate collections looked up ahead of `users` (#431). Both were
// retired in #428: dev/staging and production are now separate Firebase
// projects, so every collection name is a plain literal, and all four
// roles (admin, teacherPlus, teacherDefault, studentDefault) live in one
// `users` collection.

export const COLLECTIONS = Object.freeze({
  module: "module",
  lesson: "lesson",
  content: "content",
  testimonials: "testimonials",
  users: "users",
});
