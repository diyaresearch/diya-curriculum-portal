/**
 * Server-side HTML sanitization (#381), applied at write time.
 *
 * The primary defense against the stored-XSS this issue found is at the
 * render sinks in portal-app/src (DOMPurify.sanitize() before every
 * dangerouslySetInnerHTML - see portal-app/src/pages/__tests__/
 * xssSanitization.test.jsx) - that's what actually stops a script from
 * running in a viewer's browser, and it protects every write path
 * regardless of how content got into Firestore (through this server, or
 * directly from the client - #419 lets any signed-in user write any
 * content/lesson/module document, so a server-side-only defense would
 * leave that second path uncovered).
 *
 * This is the second layer: reject stored garbage at the door instead of
 * relying solely on every future render site remembering to sanitize.
 *
 * Tried isomorphic-dompurify first, to use the exact same library/defaults
 * as the client. Reverted: it pulls in jsdom, and the installed jsdom's
 * html-encoding-sniffer dependency is ESM-only, which Jest's default
 * CommonJS transform can't require() - `npm test` failed outright the
 * moment a test imported this file. `sanitize-html` has no such chain (no
 * DOM emulation needed for this) at the cost of a hand-built allowlist
 * below, instead of one guaranteed to track the client's. Kept deliberately
 * generous - a superset of default ReactQuill output (headings, lists,
 * links, images, basic formatting, tables for #231's benefit even though
 * it hasn't landed) - since being too strict here would silently mangle
 * legitimate content, while the render-side DOMPurify.sanitize() is what
 * actually has to be trusted not to let anything dangerous through.
 *
 * sanitize-html itself isn't safe to auto-bump past 2.17.1 for the same
 * reason: 2.17.2+ moves its own htmlparser2 dependency to an ESM-only
 * release. Pinned via a Dependabot ignore rule (.github/dependabot.yml),
 * not just a package.json range - a range alone doesn't stop `npm install
 * sanitize-html` (no version arg) from grabbing latest during unrelated
 * work, which is exactly how this was first discovered.
 */

const sanitizeHtmlLib = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'div', 'span', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'code', 'pre',
  'blockquote',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  '*': ['class', 'style'],
};

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  // http(s)/mailto only - no javascript:/data: URLs.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
};

/** Sanitize a single rich-text HTML string. Non-strings pass through unchanged. */
function sanitizeHtml(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtmlLib(value, SANITIZE_OPTIONS);
}

/**
 * Sanitize the given keys of an object in place-equivalent fashion,
 * returning a shallow copy. Missing/non-string keys are left untouched
 * (covers optional fields and the `formData.x || existing.x` fallback
 * pattern these controllers use, where `existing.x` may already be a
 * non-string default).
 */
function sanitizeFields(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key of keys) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeHtml(result[key]);
    }
  }
  return result;
}

/**
 * Sanitize every string-valued field of every element in an array (e.g.
 * `objectives: string[]`), or every named field of every element when the
 * array holds objects (e.g. `sections: [{ intro, ... }]`, pass `fields`).
 */
function sanitizeArray(arr, fields) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => {
    if (typeof item === 'string') return sanitizeHtml(item);
    if (fields && item && typeof item === 'object') return sanitizeFields(item, fields);
    return item;
  });
}

module.exports = { sanitizeHtml, sanitizeFields, sanitizeArray };
