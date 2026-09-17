import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export interface BackButtonProps {
  /** Navigate here instead of going back in history. */
  to?: string;
  /** Router state to carry along; only meaningful together with `to`. */
  state?: unknown;
  /** Where to land when there is no history to go back to. */
  fallbackTo?: string;
  label?: string;
  /** Takes over entirely - `to` and the history fallback are not consulted. */
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Consistent back button styling across the app.
 *
 * - If `to` is provided, navigates there.
 * - Otherwise navigates back in history (with safe fallback).
 */
const BackButton = ({
  to,
  state,
  fallbackTo = "/",
  label = "Back",
  onClick,
  className = "",
  style,
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }
    if (to) {
      navigate(to, state ? { state } : undefined);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors text-gray-900 font-medium ${className}`}
      style={style}
    >
      <span aria-hidden>←</span>
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
