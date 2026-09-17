/**
 * The option lists behind the nugget/lesson form dropdowns.
 *
 * `as const` rather than a plain `string[]`: it makes each list a union of
 * its own members, so a component that stores "the selected category" is
 * typed by the list instead of by `string`, and a typo in a comparison is a
 * compile error rather than a filter that silently matches nothing. The
 * lists are readonly as a consequence - consumers take `readonly string[]`.
 */

export const CATEGORY_OPTIONS = [
  "AI Principles",
  "Data Science",
  "Machine Learning",
  "Statistics",
  "Other",
] as const;

export const LEVEL_OPTIONS = ["Basic", "Intermediate", "Advanced"] as const;

export const TYPE_OPTIONS = ["Lecture", "Assignment", "Dataset"] as const;

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];
export type LevelOption = (typeof LEVEL_OPTIONS)[number];
export type TypeOption = (typeof TYPE_OPTIONS)[number];
