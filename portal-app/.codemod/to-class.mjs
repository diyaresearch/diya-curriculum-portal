import { KEYWORD, TEXT_TOKENS, colorName, arb, spaceStep, cssValue, cssName } from "./map.mjs";

const SIDE = {
  margin: ["m", "mt", "mr", "mb", "ml", "mx", "my"],
  padding: ["p", "pt", "pr", "pb", "pl", "px", "py"],
};
const EDGE_PROP = {
  marginTop: "mt", marginRight: "mr", marginBottom: "mb", marginLeft: "ml",
  paddingTop: "pt", paddingRight: "pr", paddingBottom: "pb", paddingLeft: "pl",
  top: "top", right: "right", bottom: "bottom", left: "left",
  marginInline: "mx", marginBlock: "my", paddingInline: "px", paddingBlock: "py",
};
const SIZE_PROP = {
  width: "w", height: "h", minWidth: "min-w", minHeight: "min-h", maxWidth: "max-w", maxHeight: "max-h",
};

/** Split a CSS shorthand ("8px 14px") respecting functions like rgba(). */
function splitParts(v) {
  const out = []; let depth = 0, cur = "";
  for (const ch of String(v)) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** "12px" | 12 -> 12 ; anything else -> null */
function px(v) {
  if (typeof v === "number") return v;
  const m = /^(-?\d*\.?\d+)px$/.exec(String(v).trim());
  return m ? parseFloat(m[1]) : null;
}

/** A length -> Tailwind sizing suffix (scale step, keyword, or [arbitrary]). */
function lengthSuffix(raw) {
  if (typeof raw === "number") {
    const step = spaceStep(raw);
    return step ?? `[${raw}px]`;
  }
  const s = String(raw).trim();
  if (s === "auto") return "auto";
  if (s === "100%") return "full";
  if (s === "50%") return "1/2";
  if (s === "100vw") return "screen";
  if (s === "100vh") return "screen";
  if (s === "fit-content") return "fit";
  if (s === "max-content") return "max";
  if (s === "min-content") return "min";
  if (s === "0") return "0";
  const n = px(raw);
  if (n !== null) { const step = spaceStep(n); if (step) return step; }
  return `[${arb(s)}]`;
}

/**
 * One CSS declaration -> Tailwind classes. Every branch returns: either the
 * mapped utilities, or `fallback()`, which produces Tailwind's arbitrary-value
 * form so nothing is ever silently dropped.
 */
export function declToClasses(prop, rawValue) {
  const value = typeof rawValue === "number" ? rawValue : String(rawValue).trim();
  const decl = cssValue(prop, rawValue);
  const fallback = () => [`[${cssName(prop)}:${arb(decl)}]`];

  // --- keyword enums -------------------------------------------------------
  if (KEYWORD[prop]) {
    const hit = KEYWORD[prop][value];
    if (hit) return [hit];
    return fallback();
  }

  switch (prop) {
    // --- colours ----------------------------------------------------------
    case "color": {
      const c = colorName(value, "text");
      return c ? [`text-${c}`] : fallback();
    }
    case "background":
    case "backgroundColor": {
      // `background` is a shorthand; only a bare colour is safe to map.
      const c = colorName(value, "bg");
      if (c && splitParts(value).length === 1) return [`bg-${c}`];
      if (value === "none") return ["bg-none"];
      return fallback();
    }
    case "borderColor": {
      const c = colorName(value, "border");
      return c ? [`border-${c}`] : fallback();
    }

    // --- typography -------------------------------------------------------
    case "fontSize": {
      const s = String(value);
      const varToken = /^var\(--text-([a-z-]+)\)$/.exec(s);
      if (varToken) return [`text-${varToken[1]}`];
      const tok = TEXT_TOKENS.get(s);
      if (tok) return [`text-${tok}`];
      return [`text-[${arb(decl)}]`];
    }
    case "fontFamily": {
      if (/var\(--font-sans\)/.test(String(value))) return ["font-sans"];
      if (/^["']?Open Sans/.test(String(value))) return ["font-sans"];
      return fallback();
    }
    case "lineHeight": {
      const n = typeof value === "number" ? value : parseFloat(value);
      if (String(value) === "1") return ["leading-none"];
      if (!Number.isNaN(n) && String(n) === String(value)) return [`leading-[${n}]`];
      return [`leading-[${arb(decl)}]`];
    }
    case "letterSpacing":
      return [`tracking-[${arb(decl)}]`];
    case "textShadow":
      return [`[text-shadow:${arb(decl)}]`];

    // --- box model --------------------------------------------------------
    case "margin":
    case "padding": {
      const [all, t, r, b, l, x, y] = SIDE[prop];
      // A numeric value is a single px length, not a shorthand to split.
      if (typeof value === "number") return [`${all}-${lengthSuffix(value)}`];
      const parts = splitParts(value);
      const suf = parts.map((p) => (p === "auto" ? "auto" : lengthSuffix(p)));
      if (parts.length === 1) return [`${all}-${suf[0]}`];
      if (parts.length === 2) return [`${y}-${suf[0]}`, `${x}-${suf[1]}`];
      if (parts.length === 4) return [`${t}-${suf[0]}`, `${r}-${suf[1]}`, `${b}-${suf[2]}`, `${l}-${suf[3]}`];
      if (parts.length === 3) return [`${t}-${suf[0]}`, `${x}-${suf[1]}`, `${b}-${suf[2]}`];
      return fallback();
    }
    case "gap":
      return [`gap-${lengthSuffix(value)}`];
    case "rowGap": return [`gap-y-${lengthSuffix(value)}`];
    case "columnGap": return [`gap-x-${lengthSuffix(value)}`];

    // --- borders ----------------------------------------------------------
    case "border": {
      if (value === "none" || value === "0") return ["border-0"];
      const parts = splitParts(value);
      if (parts.length === 3) {
        const [w, style, col] = parts;
        const n = px(w);
        const c = colorName(col, "border");
        if (style === "solid" && n !== null && c) {
          return [n === 1 ? "border" : `border-${n}`, `border-${c}`];
        }
      }
      return fallback();
    }
    case "borderRadius": {
      const s = String(value);
      if (s === "50%" || px(value) >= 999) return ["rounded-full"];
      const n = px(value);
      const NAMED = { 2: "rounded-xs", 4: "rounded-sm", 6: "rounded-md", 8: "rounded-lg",
                      12: "rounded-xl", 16: "rounded-2xl", 24: "rounded-3xl", 0: "rounded-none" };
      if (n !== null && NAMED[n]) return [NAMED[n]];
      return [`rounded-[${arb(decl)}]`];
    }
    case "boxShadow":
      return value === "none" ? ["shadow-none"] : [`shadow-[${arb(decl)}]`];

    // --- sizing / position ------------------------------------------------
    default: {
      if (SIZE_PROP[prop]) return [`${SIZE_PROP[prop]}-${lengthSuffix(value)}`];
      if (EDGE_PROP[prop]) {
        const n = px(value);
        if (typeof value === "number" || n !== null) {
          const step = spaceStep(n ?? value);
          if (step) return [`${EDGE_PROP[prop]}-${step}`];
        }
        if (String(value) === "0") return [`${EDGE_PROP[prop]}-0`];
        if (String(value) === "auto") return [`${EDGE_PROP[prop]}-auto`];
        return [`${EDGE_PROP[prop]}-[${arb(decl)}]`];
      }
      if (prop === "zIndex") return [`z-[${value}]`];
      if (prop === "opacity") {
        const n = Number(value);
        if (!Number.isNaN(n) && Number.isInteger(n * 100) && (n * 100) % 5 === 0) return [`opacity-${n * 100}`];
        return [`opacity-[${arb(decl)}]`];
      }
      if (prop === "flex") return [`flex-[${arb(decl)}]`];
      if (prop === "flexGrow") return [`grow-[${value}]`];
      if (prop === "flexShrink") return [`shrink-[${value}]`];
      if (prop === "transition") return [`[transition:${arb(decl)}]`];
      if (prop === "transform") return [`[transform:${arb(decl)}]`];
      if (prop === "transformOrigin") return [`origin-[${arb(decl)}]`];
      return fallback();
    }
  }
}
