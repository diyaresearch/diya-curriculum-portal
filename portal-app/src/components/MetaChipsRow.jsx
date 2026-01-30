import React from "react";

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (React.isValidElement(value)) return true;
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

function toDisplayValue(value) {
  if (value === null || value === undefined) return "—";
  if (React.isValidElement(value)) return value;
  if (Array.isArray(value)) {
    const s = value.filter(Boolean).join(", ").trim();
    return s || "—";
  }
  const s = String(value).trim();
  return s || "—";
}

const MetaChipsRow = ({ items = [], align = "center", style }) => {
  const chipBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "#e2e8f0",
    color: "#111",
    fontWeight: 600,
    fontSize: "0.95rem",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: align === "left" ? "flex-start" : "center",
        flexWrap: "wrap",
        gap: 12,
        ...style,
      }}
    >
      {items
        .filter((x) => x && x.label && hasValue(x.value))
        .map(({ label, value }, idx) => (
          <span key={`${label}-${idx}`} style={chipBase}>
            <span style={{ opacity: 0.85 }}>{label}:</span>{" "}
            <span>{toDisplayValue(value)}</span>
          </span>
        ))}
    </div>
  );
};

export default MetaChipsRow;

