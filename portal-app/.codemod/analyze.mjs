import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const traverse = _traverse.default ?? _traverse;

const files = execSync("grep -rl 'style={{' src", { encoding: "utf8" }).trim().split("\n");

const stats = { total: 0, allStatic: 0, hasDynamic: 0, hasSpread: 0, withClassName: 0, withClassNameStatic: 0 };
const props = new Map();      // cssProp -> count
const dynProps = new Map();   // cssProp -> count (dynamic value)
const valueShapes = new Map();// cssProp -> Set(sample values)

function isStaticValue(node) {
  if (!node) return false;
  if (node.type === "StringLiteral" || node.type === "NumericLiteral") return true;
  if (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral") return true;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
  return false;
}
function staticValue(node) {
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "NumericLiteral") return node.value;
  if (node.type === "UnaryExpression") return -node.argument.value;
  if (node.type === "TemplateLiteral") return node.quasis[0].value.cooked;
  return undefined;
}

for (const file of files) {
  const code = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch (e) { console.error("PARSE FAIL", file, e.message); continue; }

  traverse(ast, {
    JSXAttribute(path) {
      const n = path.node;
      if (n.name?.name !== "style") return;
      if (n.value?.type !== "JSXExpressionContainer") return;
      const expr = n.value.expression;
      if (expr.type !== "ObjectExpression") return;

      stats.total++;
      let dynamic = false, spread = false;
      for (const p of expr.properties) {
        if (p.type === "SpreadElement") { spread = true; continue; }
        if (p.type !== "ObjectProperty") { dynamic = true; continue; }
        const key = p.key.name ?? p.key.value;
        props.set(key, (props.get(key) ?? 0) + 1);
        if (isStaticValue(p.value)) {
          if (!valueShapes.has(key)) valueShapes.set(key, new Set());
          const s = valueShapes.get(key);
          if (s.size < 12) s.add(JSON.stringify(staticValue(p.value)));
        } else {
          dynamic = true;
          dynProps.set(key, (dynProps.get(key) ?? 0) + 1);
        }
      }
      if (spread) stats.hasSpread++;
      if (dynamic) stats.hasDynamic++;
      if (!dynamic && !spread) stats.allStatic++;

      // does the same element carry a className?
      const attrs = path.parent.attributes ?? [];
      const cn = attrs.find((a) => a.type === "JSXAttribute" && a.name?.name === "className");
      if (cn) {
        stats.withClassName++;
        if (cn.value?.type === "StringLiteral" && !dynamic && !spread) stats.withClassNameStatic++;
      }
    },
  });
}

console.log("=== SITE STATS ===");
console.log(stats);
console.log("\n=== CSS PROPERTIES USED (count, dynamic-count) ===");
[...props.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(String(v).padStart(4), String(dynProps.get(k) ?? 0).padStart(4), " ", k));
