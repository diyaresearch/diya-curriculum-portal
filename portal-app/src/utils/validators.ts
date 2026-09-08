/**
 * Reusable field rules (#371).
 *
 * A rule takes the field's value and returns an error string, or null when
 * the value is acceptable. Composed by useFormValidation.
 *
 * Messages are written for the person filling the form - "Title is required."
 * rather than "invalid" - because they are rendered next to the field.
 */

/**
 * A field rule: given the field's value, return the error to show, or null
 * when the value is acceptable. `unknown` rather than a narrower type because
 * a rule is handed whatever is in the form's state object - a string, an
 * array from a multi-select, a number, or nothing at all.
 */
export type Rule = (value: unknown) => string | null;

/** Text that must not be blank. Also covers arrays (a multi-select). */
export const required =
  (label: string): Rule =>
  (value) => {
  if (Array.isArray(value)) return value.length ? null : `${label} is required.`;
  if (typeof value === "string") return value.trim() ? null : `${label} is required.`;
  return value === null || value === undefined || value === "" ? `${label} is required.` : null;
};

/**
 * Rich-text from ReactQuill, which is never empty: an untouched editor still
 * yields "<p><br></p>". Checking the string as-is would accept a blank field.
 */
export const requiredRichText =
  (label: string): Rule =>
  (value) => {
  const text = String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text ? null : `${label} is required.`;
};

export const minLength =
  (label: string, n: number): Rule =>
  (value) =>
    String(value || "").trim().length >= n ? null : `${label} must be at least ${n} characters.`;

export const maxLength =
  (label: string, n: number): Rule =>
  (value) =>
    String(value || "").length <= n ? null : `${label} must be ${n} characters or fewer.`;

export const email =
  (label = "Email"): Rule =>
  (value) => {
  const v = String(value || "").trim();
  if (!v) return null; // pair with required() when the field is mandatory
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : `Enter a valid ${label.toLowerCase()}.`;
};

/** Every entry of a list must itself pass - e.g. each lesson section. */
export const everyItem =
  (label: string, rule: Rule): Rule =>
  (values) => {
    if (!Array.isArray(values)) return null;
    const bad = values.findIndex((v) => rule(v) !== null);
    return bad === -1 ? null : `${label}: item ${bad + 1} is incomplete.`;
  };
