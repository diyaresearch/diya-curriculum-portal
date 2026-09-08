/**
 * Server-side HTML sanitization at write time (issue #381, second layer -
 * see the module doc comment in utils/sanitizeHtml.js for why this exists
 * alongside, not instead of, the render-side DOMPurify.sanitize() calls in
 * portal-app/src).
 */

const { sanitizeHtml, sanitizeFields, sanitizeArray } = require("../utils/sanitizeHtml");

const SCRIPT_PAYLOAD = '<p>hi</p><img src=x onerror="alert(1)"><script>alert(2)</script>';

describe("sanitizeHtml", () => {
  test("strips script tags and event handler attributes", () => {
    const result = sanitizeHtml(SCRIPT_PAYLOAD);
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toMatch(/onerror/i);
    expect(result).toContain("<p>hi</p>");
  });

  test("is idempotent - sanitizing already-clean HTML is a no-op", () => {
    const clean = sanitizeHtml("<p>hello <strong>world</strong></p>");
    expect(sanitizeHtml(clean)).toBe(clean);
  });

  test("passes non-string values through unchanged", () => {
    expect(sanitizeHtml(undefined)).toBeUndefined();
    expect(sanitizeHtml(null)).toBeNull();
    expect(sanitizeHtml(42)).toBe(42);
  });
});

describe("sanitizeFields", () => {
  test("sanitizes only the named string keys, leaving others untouched", () => {
    const result = sanitizeFields(
      { title: "ok", intro: SCRIPT_PAYLOAD, contentIds: ["a", "b"] },
      ["intro"]
    );
    expect(result.title).toBe("ok");
    expect(result.contentIds).toEqual(["a", "b"]);
    expect(result.intro).not.toMatch(/<script/i);
  });

  test("non-objects pass through unchanged", () => {
    expect(sanitizeFields(null, ["x"])).toBeNull();
    expect(sanitizeFields(undefined, ["x"])).toBeUndefined();
  });
});

describe("sanitizeArray", () => {
  test("sanitizes an array of plain strings (e.g. lesson objectives)", () => {
    const result = sanitizeArray(["<p>ok</p>", SCRIPT_PAYLOAD]);
    expect(result[0]).toBe("<p>ok</p>");
    expect(result[1]).not.toMatch(/<script/i);
  });

  test("sanitizes named fields of an array of objects (e.g. lesson sections)", () => {
    const result = sanitizeArray(
      [
        { title: "Section 1", intro: SCRIPT_PAYLOAD, contentIds: ["c1"] },
        { title: "Section 2", intro: "<p>fine</p>" },
      ],
      ["intro"]
    );
    expect(result[0].title).toBe("Section 1");
    expect(result[0].contentIds).toEqual(["c1"]);
    expect(result[0].intro).not.toMatch(/<script/i);
    expect(result[1].intro).toBe("<p>fine</p>");
  });

  test("non-arrays (including undefined - an omitted optional field) pass through unchanged", () => {
    expect(sanitizeArray(undefined)).toBeUndefined();
    expect(sanitizeArray("not an array")).toBe("not an array");
  });
});
