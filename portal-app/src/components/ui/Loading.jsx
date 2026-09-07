/**
 * The one pending indicator (#369).
 *
 * Before this, "loading" was spelled ten different ways: a bare
 * <div>Loading...</div>, one with padding 40, one with padding 24, a
 * full-height centred block reading "Loading module details...", "Loading
 * PDF...", "Loading page 3..." - and six async paths that showed nothing at
 * all, so the screen simply sat there looking broken.
 *
 * Three variants, because the three places a wait happens genuinely differ:
 *
 *   page    replacing a whole route while its data arrives
 *   inline  a section of a page that is still filling in
 *   button  next to a label inside a button that is mid-submit
 *
 * All of them set role="status" and aria-live="polite", so a screen reader
 * announces the wait. None of the hand-rolled versions did.
 */

import { TYPO } from "@/constants/typography";

const SIZES = { page: 34, inline: 22, button: 15 };

function Spinner({ size, color }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 9))}px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        // The keyframes live in index.css; @media (prefers-reduced-motion)
        // there stops the spin for users who ask for less movement.
        animation: "diya-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export default function Loading({ variant = "inline", message = "Loading...", color = "#162040" }) {
  const size = SIZES[variant] ?? SIZES.inline;

  if (variant === "button") {
    return (
      <>
        <Spinner size={size} color={color} />
        <span role="status" aria-live="polite" style={{ marginLeft: 8 }}>
          {message}
        </span>
      </>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color,
        ...(variant === "page"
          ? { minHeight: "60vh", fontSize: TYPO?.body ?? "1.2rem" }
          : { padding: 24 }),
      }}
    >
      <Spinner size={size} color={color} />
      {message ? <span>{message}</span> : null}
    </div>
  );
}
