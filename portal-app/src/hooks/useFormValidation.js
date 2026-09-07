/**
 * One way to validate a form (#371).
 *
 * The app had at least four: HTML `required` attributes alone, a whole-form
 * toast listing the first failure ("Category, Type, and Level are required."),
 * a single setError string, and one page - module_builder - doing it properly
 * with a per-field errors object. This generalizes that last one.
 *
 *   const form = useFormValidation({
 *     Title: [required("Title")],
 *     Description: [requiredRichText("Description")],
 *   });
 *
 *   if (!form.validateAll(formData)) return;   // submit blocked, errors shown
 *
 * Timing is deliberate and uniform: validate on submit, then re-validate a
 * field as the user edits it. Validating on first keystroke shouts at someone
 * who has not finished typing; never re-validating leaves an error showing
 * after it has been fixed.
 */

import { useCallback, useMemo, useState } from "react";

export default function useFormValidation(schema) {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const runField = useCallback(
    (field, value) => {
      const rules = schema[field] || [];
      for (const rule of rules) {
        const message = rule(value);
        if (message) return message;
      }
      return null;
    },
    [schema]
  );

  /** Check every field. Returns true when the form may be submitted. */
  const validateAll = useCallback(
    (values) => {
      const next = {};
      for (const field of Object.keys(schema)) {
        const message = runField(field, values[field]);
        if (message) next[field] = message;
      }
      setErrors(next);
      setSubmitted(true);
      return Object.keys(next).length === 0;
    },
    [schema, runField]
  );

  /**
   * Re-check one field. No-op before the first submit, so a half-typed title
   * is not flagged while the user is still in it.
   */
  const revalidate = useCallback(
    (field, value) => {
      if (!submitted) return;
      setErrors((current) => {
        const message = runField(field, value);
        if (message === (current[field] ?? null)) return current;
        const next = { ...current };
        if (message) next[field] = message;
        else delete next[field];
        return next;
      });
    },
    [submitted, runField]
  );

  const clear = useCallback(() => {
    setErrors({});
    setSubmitted(false);
  }, []);

  return useMemo(
    () => ({
      errors,
      hasErrors: Object.keys(errors).length > 0,
      validateAll,
      revalidate,
      clear,
    }),
    [errors, validateAll, revalidate, clear]
  );
}
