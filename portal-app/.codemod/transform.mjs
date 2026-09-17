import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { declToClasses } from "./to-class.mjs";
import { cssValue, cssName } from "./map.mjs";
const traverse = _traverse.default ?? _traverse;

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--file="))?.slice(7);

// Modal.jsx passes `style={{overlay,content}}` to react-modal - that is the
// library's configuration API, not a DOM inline style. Never touch it.
const SKIP_FILES = new Set(["src/components/ui/Modal.jsx"]);

const files = (ONLY ? [ONLY] : execSync("grep -rl 'style={{' src --include=*.jsx --include=*.tsx --include=*.js --include=*.ts", { encoding: "utf8" }).trim().split("\n"))
  .filter((f) => !SKIP_FILES.has(f));

const isStatic = (n) =>
  n && (n.type === "StringLiteral" || n.type === "NumericLiteral" ||
    (n.type === "TemplateLiteral" && n.expressions.length === 0) ||
    (n.type === "UnaryExpression" && n.operator === "-" && n.argument.type === "NumericLiteral"));
const valueOf = (n) =>
  n.type === "StringLiteral" ? n.value :
  n.type === "NumericLiteral" ? n.value :
  n.type === "UnaryExpression" ? -n.argument.value :
  n.quasis[0].value.cooked;

/** The utility family a class belongs to, for conflict detection. */
function family(cls) {
  const m = /^(-?[a-z]+(?:-[a-z]+)*?)-(?:\[|\d|auto|full|none|px|screen|min|max|fit)/.exec(cls);
  return m ? m[1] : cls.replace(/-\[.*$/, "");
}

const manifest = [];
let converted = 0, skipped = 0;
const skipReasons = [];

for (const file of files) {
  const code = readFileSync(file, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
  catch (e) { console.error("PARSE FAIL", file, e.message); continue; }

  const edits = [];

  traverse(ast, {
    JSXAttribute(path) {
      const n = path.node;
      if (n.name?.name !== "style" || n.value?.type !== "JSXExpressionContainer") return;
      const obj = n.value.expression;
      if (obj.type !== "ObjectExpression") return;

      const line = code.slice(0, n.start).split("\n").length;
      const decls = [];
      for (const p of obj.properties) {
        if (p.type !== "ObjectProperty" || p.computed || !isStatic(p.value)) {
          skipped++; skipReasons.push(`${file}:${line} ${p.type === "SpreadElement" ? "spread" : "dynamic value"}`);
          return;
        }
        decls.push([p.key.name ?? p.key.value, valueOf(p.value)]);
      }
      if (!decls.length) return;

      const classes = [];
      for (const [prop, value] of decls) classes.push(...declToClasses(prop, value));

      // The sibling className, if any.
      const attrs = path.parent.attributes;
      const cn = attrs.find((a) => a.type === "JSXAttribute" && a.name?.name === "className");
      let cnEdit = null;
      if (cn) {
        if (cn.value?.type === "StringLiteral") {
          const existing = cn.value.value.split(/\s+/).filter(Boolean);
          const clash = existing.filter((e) => classes.some((c) => family(c) === family(e)));
          if (clash.length) {
            // Inline style used to beat the stylesheet; as classes the CSS
            // order decides instead. Never guess - hand this one back.
            skipped++; skipReasons.push(`${file}:${line} className conflict [${clash.join(" ")}]`);
            return;
          }
          cnEdit = { start: cn.value.start, end: cn.value.end,
                     text: JSON.stringify([...existing, ...classes].join(" ")) };
        } else {
          skipped++; skipReasons.push(`${file}:${line} dynamic className`);
          return;
        }
      }

      // Swallow the whitespace before the style attribute so removing it does
      // not leave a blank gap or a trailing space.
      let s = n.start;
      while (s > 0 && /\s/.test(code[s - 1])) s--;

      if (cnEdit) {
        edits.push({ start: s, end: n.end, text: "" });
        edits.push(cnEdit);
      } else {
        edits.push({ start: s, end: n.end, text: `${code.slice(s, n.start)}className=${JSON.stringify(classes.join(" "))}` });
      }
      converted++;
      manifest.push({ file, line, decls: decls.map(([p, v]) => [cssName(p), cssValue(p, v)]), classes });
    },
  });

  if (APPLY && edits.length) {
    edits.sort((a, b) => b.start - a.start);
    let out = code;
    for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    writeFileSync(file, out);
  }
}

writeFileSync(".codemod/manifest.json", JSON.stringify(manifest, null, 1));
console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: converted ${converted} sites, skipped ${skipped}`);
if (!APPLY) {
  const byReason = {};
  for (const r of skipReasons) { const k = r.replace(/^.*? /, ""); byReason[k] = (byReason[k] ?? 0) + 1; }
  console.log("\nskip reasons:"); Object.entries(byReason).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${String(v).padStart(3)}  ${k}`));
}
