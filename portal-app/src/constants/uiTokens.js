export function getLevelChipStyles(levelValue) {
  const level = String(levelValue || "").trim().toLowerCase();

  // Defaults (neutral)
  const neutral = {
    backgroundColor: "#f8f9fa",
    borderColor: "#e5e7eb",
    color: "#111",
  };

  if (!level) return neutral;

  const isBeginner = level.includes("beginner") || level.includes("basic");
  const isIntermediate = level.includes("intermediate");
  const isAdvanced = level.includes("advanced");

  if (isBeginner) {
    return { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" };
  }
  if (isIntermediate) {
    return { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e3a8a" };
  }
  if (isAdvanced) {
    return { backgroundColor: "#faf5ff", borderColor: "#e9d5ff", color: "#5b21b6" };
  }

  return neutral;
}

