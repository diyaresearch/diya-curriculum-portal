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

export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={`${id}-error`}
      role="alert"
      style={{
        color: "#b91c1c",
        fontSize: "0.9rem",
        margin: "4px 0 0",
        lineHeight: 1.35,
      }}
    >
      {message}
    </p>
  );
}

/**
 * The matching props for the input itself, so the two cannot drift apart.
 * Spread onto the field: <input {...fieldErrorProps("Title", errors.Title)} />
 */
export function fieldErrorProps(id, message) {
  return message
    ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
    : { "aria-invalid": undefined, "aria-describedby": undefined };
}
