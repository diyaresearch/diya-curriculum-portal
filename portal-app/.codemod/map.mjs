/**
 * CSS declaration -> Tailwind class mapping.
 *
 * Two tiers, deliberately:
 *   1. a named utility where the mapping is exact and unambiguous
 *   2. an arbitrary value ([prop:value]) for everything else
 *
 * Tier 2 is what makes this migration provably style-preserving: Tailwind
 * emits `[margin-top:13px]` as literally `margin-top:13px`, identical to the
 * inline declaration it replaces. Tier 1 exists so the result reads like
 * Tailwind rather than like inline styles in bracket notation.
 */

// React appends "px" to a numeric style value EXCEPT for these properties.
// Replicating that list exactly is what keeps numeric values honest.
export const UNITLESS = new Set([
  "animationIterationCount","aspectRatio","borderImageOutset","borderImageSlice","borderImageWidth",
  "boxFlex","boxFlexGroup","boxOrdinalGroup","columnCount","columns","flex","flexGrow","flexPositive",
  "flexShrink","flexNegative","flexOrder","gridArea","gridRow","gridRowEnd","gridRowSpan","gridRowStart",
  "gridColumn","gridColumnEnd","gridColumnSpan","gridColumnStart","fontWeight","lineClamp","lineHeight",
  "opacity","order","orphans","tabSize","widows","zIndex","zoom","fillOpacity","floodOpacity",
  "stopOpacity","strokeDasharray","strokeDashoffset","strokeMiterlimit","strokeOpacity","strokeWidth",
  "WebkitLineClamp","MozBoxOrdinalGroup","WebkitBoxOrdinalGroup",
]);

const kebab = (s) => s.charAt(0).toLowerCase() + s.slice(1).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

export function cssName(prop) {
  if (prop.startsWith("Webkit")) return "-webkit-" + kebab(prop.slice(6));
  if (prop.startsWith("Moz")) return "-moz-" + kebab(prop.slice(3));
  if (prop.startsWith("ms")) return "-ms-" + kebab(prop.slice(2));
  return kebab(prop);
}

/** The declaration React would produce for this property/value pair. */
export function cssValue(prop, value) {
  if (typeof value === "number") return UNITLESS.has(prop) ? String(value) : `${value}px`;
  return String(value).trim();
}

/** Design tokens from index.css's @theme, keyed by the hex they replace. */
const COLOR_TOKENS = new Map(Object.entries({
  "#162040": "navy", "#111c44": "navy-deep", "#242b42": "navy-soft",
  "#f9c74f": "accent", "#ffc940": "accent-strong",
  "#28a745": "success", "#b91c1c": "danger", "#1a73e8": "link",
  "#111": "ink-strong", "#111111": "ink-strong",
  "#222": "ink", "#222222": "ink",
  "#666": "ink-muted", "#666666": "ink-muted",
  "#888": "ink-faint", "#888888": "ink-faint",
  "#f6f8fa": "surface-subtle", "#e2e8f0": "surface-sunken",
  "#e5e7eb": "rule", "#cbd5e1": "rule-strong",
}));

/**
 * A colour as a Tailwind colour name. Pure white/black use Tailwind's own
 * names; brand colours use the design tokens. `role` distinguishes a white
 * *surface* (bg-surface) from white *text* (text-white).
 */
export function colorName(raw, role) {
  const v = String(raw).trim().toLowerCase();
  if (v === "#fff" || v === "#ffffff" || v === "white") return role === "bg" ? "surface" : "white";
  if (v === "#000" || v === "#000000" || v === "black") return "black";
  if (v === "transparent") return "transparent";
  if (v === "inherit" || v === "currentcolor") return null; // no utility; use arbitrary
  const token = COLOR_TOKENS.get(v);
  if (token) return token;
  if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^#[0-9a-f]{8}$/.test(v)) return `[${v}]`;
  return null;
}

/** Wrap a raw CSS value for use inside Tailwind's [ ] notation. */
export function arb(value) {
  return String(value).trim().replace(/\s+/g, "_");
}

/** A spacing value in px -> Tailwind's 0.25rem scale, or null. */
export function spaceStep(px) {
  if (px === 0) return "0";
  if (px === "auto") return "auto";
  if (typeof px !== "number") return null;
  if (px < 0) return null;
  const step = px / 4;
  if (Number.isInteger(step)) return String(step);
  if (Number.isInteger(px / 2)) return String(step); // .5 steps: 2px->0.5, 10px->2.5
  return null;
}

export const KEYWORD = {
  display: { flex: "flex", block: "block", "inline-block": "inline-block", inline: "inline",
    grid: "grid", "inline-flex": "inline-flex", "inline-grid": "inline-grid", none: "hidden",
    contents: "contents", table: "table", "list-item": "list-item", "flow-root": "flow-root" },
  flexDirection: { row: "flex-row", column: "flex-col", "row-reverse": "flex-row-reverse", "column-reverse": "flex-col-reverse" },
  flexWrap: { wrap: "flex-wrap", nowrap: "flex-nowrap", "wrap-reverse": "flex-wrap-reverse" },
  alignItems: { center: "items-center", "flex-start": "items-start", "flex-end": "items-end",
    start: "items-start", end: "items-end", stretch: "items-stretch", baseline: "items-baseline" },
  alignSelf: { auto: "self-auto", center: "self-center", "flex-start": "self-start", "flex-end": "self-end",
    start: "self-start", end: "self-end", stretch: "self-stretch", baseline: "self-baseline" },
  justifyContent: { center: "justify-center", "flex-start": "justify-start", "flex-end": "justify-end",
    start: "justify-start", end: "justify-end", "space-between": "justify-between",
    "space-around": "justify-around", "space-evenly": "justify-evenly", normal: "justify-normal" },
  textAlign: { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify", start: "text-start", end: "text-end" },
  position: { static: "static", relative: "relative", absolute: "absolute", fixed: "fixed", sticky: "sticky" },
  overflow: { hidden: "overflow-hidden", auto: "overflow-auto", scroll: "overflow-scroll", visible: "overflow-visible", clip: "overflow-clip" },
  overflowX: { hidden: "overflow-x-hidden", auto: "overflow-x-auto", scroll: "overflow-x-scroll", visible: "overflow-x-visible" },
  overflowY: { hidden: "overflow-y-hidden", auto: "overflow-y-auto", scroll: "overflow-y-scroll", visible: "overflow-y-visible" },
  whiteSpace: { normal: "whitespace-normal", nowrap: "whitespace-nowrap", pre: "whitespace-pre",
    "pre-wrap": "whitespace-pre-wrap", "pre-line": "whitespace-pre-line", "break-spaces": "whitespace-break-spaces" },
  textDecoration: { none: "no-underline", underline: "underline", "line-through": "line-through", overline: "overline" },
  textTransform: { uppercase: "uppercase", lowercase: "lowercase", capitalize: "capitalize", none: "normal-case" },
  fontStyle: { italic: "italic", normal: "not-italic" },
  objectFit: { cover: "object-cover", contain: "object-contain", fill: "object-fill", none: "object-none", "scale-down": "object-scale-down" },
  boxSizing: { "border-box": "box-border", "content-box": "box-content" },
  textOverflow: { ellipsis: "text-ellipsis", clip: "text-clip" },
  pointerEvents: { none: "pointer-events-none", auto: "pointer-events-auto" },
  float: { left: "float-left", right: "float-right", none: "float-none" },
  listStyle: { none: "list-none" },
  listStyleType: { none: "list-none", disc: "list-disc", decimal: "list-decimal" },
  cursor: { pointer: "cursor-pointer", default: "cursor-default", "not-allowed": "cursor-not-allowed",
    wait: "cursor-wait", text: "cursor-text", move: "cursor-move", help: "cursor-help", grab: "cursor-grab", auto: "cursor-auto" },
  userSelect: { none: "select-none", text: "select-text", all: "select-all", auto: "select-auto" },
  visibility: { visible: "visible", hidden: "invisible", collapse: "collapse" },
  fontWeight: { 100: "font-thin", 200: "font-extralight", 300: "font-light", 400: "font-normal",
    500: "font-medium", 600: "font-semibold", 700: "font-bold", 800: "font-extrabold", 900: "font-black",
    normal: "font-normal", bold: "font-bold", lighter: "font-lighter", bolder: "font-bolder" },
};

/** Type-scale tokens from @theme, keyed by the rem value they carry. */
export const TEXT_TOKENS = new Map(Object.entries({
  "2.5rem": "page-title", "1.18rem": "page-subtitle", "1.25rem": "section-title",
  "1.05rem": "body", "0.95rem": "meta", "1.08rem": "label", "0.92rem": "helper",
}));
