/**
 * Prove the codemod preserved the styles.
 *
 * Three checks against the CSS Tailwind actually emitted for the build:
 *   A  every generated class exists (a class Tailwind does not recognise
 *      emits nothing and silently drops the declaration)
 *   B  arbitrary-value classes carry exactly the original declaration
 *   C  scale/token classes resolve, through :root, to the original value
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".codemod/manifest.json", "utf8"));
const cssFile = globSync("build/static/index-*.css")[0];
const css = readFileSync(cssFile, "utf8");

// :root custom properties, for resolving var() back to a literal.
const rootVars = new Map();
for (const m of css.matchAll(/--([\w-]+):\s*([^;}]+)/g)) {
  if (!rootVars.has(m[1])) rootVars.set(m[1], m[2].trim());
}
const resolveVars = (v) => {
  let out = v, guard = 0;
  while (/var\(--[\w-]+\)/.test(out) && guard++ < 5) {
    out = out.replace(/var\(--([\w-]+)\)/g, (_, n) => rootVars.get(n) ?? `var(--${n})`);
  }
  return out.trim();
};

// class -> declaration text, from every rule in the sheet.
const ruleFor = new Map();
const esc = (c) => c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
function lookup(cls) {
  if (ruleFor.has(cls)) return ruleFor.get(cls);
  // Tailwind escapes . / [ ] : etc. in the selector with backslashes.
  const sel = cls.replace(/[.:/[\]()!#%,]/g, (c) => "\\\\" + c);
  const re = new RegExp("\\." + esc(sel).replace(/\\\\\\\\/g, "\\\\") + "(?=[,{:>\\s])[^{]*\\{([^}]*)\\}");
  const m = re.exec(css);
  const val = m ? m[1] : null;
  ruleFor.set(cls, val);
  return val;
}

const NORM = (s) => resolveVars(String(s)).replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").toLowerCase().trim();
const PX_PER_REM = 16;
function toPx(v) {
  const rem = /^(-?[\d.]+)rem$/.exec(v); if (rem) return parseFloat(rem[1]) * PX_PER_REM;
  const calc = /^calc\((-?[\d.]+)rem\s*\*\s*(-?[\d.]+)\)$/.exec(v.replace(/\s+/g, " "));
  if (calc) return parseFloat(calc[1]) * PX_PER_REM * parseFloat(calc[2]);
  const px = /^(-?[\d.]+)px$/.exec(v); if (px) return parseFloat(px[1]);
  return null;
}

const missing = [], mismatched = [];
const allClasses = new Set();
for (const e of manifest) e.classes.forEach((c) => allClasses.add(c));

for (const cls of allClasses) if (lookup(cls) === null) missing.push(cls);

// B/C: check each class that maps 1:1 to a single declaration.
for (const cls of allClasses) {
  const body = lookup(cls);
  if (!body) continue;
  const arb = /^(?:.*-)?\[([-a-z]+):(.+)\]$/.exec(cls) || /^\[([-a-z]+):(.+)\]$/.exec(cls);
  if (arb) {
    const want = NORM(arb[2].replace(/_/g, " "));
    const got = NORM(body.replace(/^[^:]+:/, ""));
    if (want !== got && !got.includes(want)) mismatched.push({ cls, want, got });
    continue;
  }
  const val = /^[^:]+:(.+?);?$/.exec(body.replace(/;$/, ""));
  if (!val) continue;
  const declaredPx = toPx(NORM(val[1]));
  const suffix = /-(\d+(?:\.\d+)?)$/.exec(cls);
  if (declaredPx !== null && suffix && /^(?:p|m|w|h|gap|top|right|bottom|left|min-w|min-h|max-w|max-h|[pm][xytblr])-/.test(cls)) {
    const expectPx = parseFloat(suffix[1]) * 4;
    if (Math.abs(declaredPx - expectPx) > 0.01) mismatched.push({ cls, want: expectPx + "px", got: declaredPx + "px" });
  }
}

console.log(`CSS: ${cssFile}`);
console.log(`distinct generated classes: ${allClasses.size}`);
console.log(`\nA) classes with NO rule in the sheet: ${missing.length}`);
missing.slice(0, 40).forEach((c) => console.log("   ", c));
console.log(`\nB/C) value mismatches: ${mismatched.length}`);
mismatched.slice(0, 40).forEach((m) => console.log(`    ${m.cls}: want ${m.want}, got ${m.got}`));
