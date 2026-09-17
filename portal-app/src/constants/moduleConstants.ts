/**
 * The filter options on the module browsing screens.
 *
 * `as const` for the same reason as formOptions.ts: each list becomes a union
 * of its own members, so "the currently selected level" is typed by the list.
 * Note that the category and level lists lead with "All", which is a filter
 * sentinel rather than a real category - `ModuleCategory` therefore includes
 * it, and anything keyed by a real category has to allow for its absence.
 */

export const MODULE_CONTENT_TYPES = ["Module", "Lesson Plan", "Nuggets"] as const;

export const MODULE_CATEGORIES = [
  "All",
  "AI Principles",
  "Data Science",
  "Machine Learning",
  "Statistics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Other",
] as const;

export const MODULE_LEVELS = ["All", "Basic", "Intermediate", "Advanced"] as const;

export type ModuleContentType = (typeof MODULE_CONTENT_TYPES)[number];
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];
export type ModuleLevel = (typeof MODULE_LEVELS)[number];

/**
 * Blurb shown when a category is hovered. `Partial` because "All" has no
 * entry, so a lookup keyed by a `ModuleCategory` is `string | undefined` and
 * the caller has to handle the miss.
 */
export const MODULE_POPUP_INFO: Partial<Record<ModuleCategory, string>> = {
  "AI Principles":
    "Learn the foundational concepts of AI, including machine learning, neural networks, and natural language processing.",
  "Data Science":
    "Explore the world of data science, including data analysis, visualization, and machine learning techniques.",
  "Machine Learning":
    "Dive deep into machine learning algorithms, including supervised and unsupervised learning.",
  Statistics:
    "Understand the principles of statistics, including descriptive and inferential statistics.",
  Physics:
    "Explore the fundamental concepts of physics, including mechanics, electromagnetism, and thermodynamics.",
  Chemistry: "Learn about the principles of chemistry, including organic and inorganic chemistry.",
  Biology: "Explore the concepts of biology, including cell biology, genetics, and evolution.",
  Economics:
    "Understand the principles of economics, including microeconomics and macroeconomics.",
  Other: "Explore additional topics not covered in the main categories.",
};
