import type { CSSProperties } from "react";

export const FONT_FAMILY = "var(--font-sans)";

/**
 * Typography tokens (baseline: Module Builder page).
 * Use these for consistent font family + sizing across pages.
 *
 * This is the OLD system - style objects that can only be applied by
 * spreading them into `style={{}}`. It survives for the pages not yet moved
 * to the `text-*` utilities; see docs/STYLING.md. Do not add a TYPO spread
 * to a new component.
 *
 * `satisfies` rather than a type annotation: it checks every token against
 * CSSProperties (which is what makes `textAlign: "center"` infer as the
 * literal rather than widening to `string` and failing to assign to a
 * `style` prop) while keeping the token names known to callers.
 */
export const TYPO = {
  pageTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-page-title)",
    fontWeight: 700,
    letterSpacing: "1px",
    color: "#111",
    lineHeight: 1.15,
    textAlign: "center",
  },
  pageSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-page-subtitle)",
    fontWeight: 500,
    color: "#111",
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-section-title)",
    fontWeight: 700,
    color: "#111",
    lineHeight: 1.25,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-body)",
    fontWeight: 500,
    color: "#222",
    lineHeight: 1.6,
  },
  meta: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-meta)",
    fontWeight: 600,
    color: "#444",
    lineHeight: 1.4,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-label)",
    fontWeight: 600,
    color: "#111",
    lineHeight: 1.25,
  },
  fieldHelper: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-helper)",
    fontWeight: 500,
    color: "#888",
    lineHeight: 1.4,
  },
  input: {
    fontFamily: FONT_FAMILY,
    fontSize: "var(--text-label)",
    fontWeight: 500,
    color: "#111",
  },
} satisfies Record<string, CSSProperties>;

/** The token names, for a prop that names one. */
export type TypoToken = keyof typeof TYPO;

