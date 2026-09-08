/**
 * The message under a field that failed validation (#371).
 *
 * The accessibility wiring is the point, and none of the existing forms had
 * it: the message is linked to its input via aria-describedby, the input is
 * marked aria-invalid, and role="alert" announces the message when it
 * appears. A sighted user could see red text; a screen-reader user was told
 * nothing at all about why the form would not submit.
 *
 *   <input {...fieldProps("Title")} />
 *   <FieldError id="Title" message={form.errors.Title} />
 */

export interface FieldErrorProps {
  /** The field's own id. The message element becomes `${id}-error`. */
  id: string;
  /** Nothing is rendered when this is absent, so callers can pass through. */
  message?: string | null;
}

export default function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={`${id}-error`}
      role="alert"
      className="mt-1 mb-0 text-[0.9rem] leading-[1.35] text-danger"
    >
      {message}
    </p>
  );
}

/**
 * The matching props for the input itself, so the two cannot drift apart.
 * Spread onto the field: <input {...fieldErrorProps("Title", errors.Title)} />
 */
export function fieldErrorProps(id: string, message?: string | null) {
  return message
    ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
    : { "aria-invalid": undefined, "aria-describedby": undefined };
}
