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

export type LoadingVariant = "page" | "inline" | "button";

const SIZES: Record<LoadingVariant, number> = { page: 34, inline: 22, button: 15 };

function Spinner({ size, color }: { size: number; color: string }) {
  return (
    <span
      aria-hidden="true"
      // .diya-spin is defined in index.css, with its keyframes and the
      // @media (prefers-reduced-motion) rule that stops the spin for users
      // who ask for less movement.
      className="diya-spin inline-block shrink-0 rounded-full"
      // Ring geometry and colour are computed from props, so they stay inline
      // - a Tailwind class cannot take a runtime value (#360).
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 9))}px solid ${color}33`,
        borderTopColor: color,
      }}
    />
  );
}

export interface LoadingProps {
  variant?: LoadingVariant;
  /** Pass "" to show the spinner alone. */
  message?: string;
  /** Defaults to the brand navy (--color-navy). */
  color?: string;
}

export default function Loading({
  variant = "inline",
  message = "Loading...",
  color = "#162040",
}: LoadingProps) {
  const size = SIZES[variant] ?? SIZES.inline;

  if (variant === "button") {
    return (
      <>
        <Spinner size={size} color={color} />
        <span role="status" aria-live="polite" className="ml-2">
          {message}
        </span>
      </>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3.5 ${
        variant === "page" ? "min-h-[60vh] text-body" : "p-6"
      }`}
      style={{ color }}
    >
      <Spinner size={size} color={color} />
      {message ? <span>{message}</span> : null}
    </div>
  );
}
