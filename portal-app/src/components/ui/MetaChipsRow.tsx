import { isValidElement, type CSSProperties, type ReactNode } from "react";

/**
 * A chip's value is whatever the calling page happened to read out of a
 * Firestore document - a string, a number, a list of tags, a rendered
 * element, or nothing at all. `unknown` rather than a union, because the
 * two helpers below exist precisely to narrow it.
 */
export type MetaChipValue = unknown;

export interface MetaChipItem {
  label: ReactNode;
  value: MetaChipValue;
}

function hasValue(value: MetaChipValue): boolean {
  if (value === null || value === undefined) return false;
  if (isValidElement(value)) return true;
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean).length > 0;
  }
  if (typeof value === "string") {
    const s = value.trim();
    return s.length > 0 && s !== "—";
  }
  // numbers (including 0) should be shown
  if (typeof value === "number") return Number.isFinite(value);
  // booleans/objects: stringify and check
  const s = String(value).trim();
  return s.length > 0 && s !== "—";
}

function toDisplayValue(value: MetaChipValue): ReactNode {
  if (value === null || value === undefined) return "—";
  if (isValidElement(value)) return value;
  if (Array.isArray(value)) {
    const s = value.filter(Boolean).join(", ").trim();
    return s || "—";
  }
  const s = String(value).trim();
  return s || "—";
}

const CHIP =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border " +
  "border-rule-strong bg-surface-sunken px-3.5 py-2 text-meta font-semibold leading-none text-ink-strong";

export interface MetaChipsRowProps {
  items?: readonly MetaChipItem[];
  align?: "left" | "center";
  /** Runtime override for the row itself; the chips' own look is in CHIP. */
  style?: CSSProperties;
}

const MetaChipsRow = ({ items = [], align = "center", style }: MetaChipsRowProps) => {
  return (
    <div
      className={`flex flex-wrap gap-3 ${align === "left" ? "justify-start" : "justify-center"}`}
      style={style}
    >
      {items
        .filter((x) => x && x.label && hasValue(x.value))
        .map(({ label, value }, idx) => (
          <span key={`${String(label)}-${idx}`} className={CHIP}>
            <span className="opacity-85">{label}:</span> <span>{toDisplayValue(value)}</span>
          </span>
        ))}
    </div>
  );
};

export default MetaChipsRow;
