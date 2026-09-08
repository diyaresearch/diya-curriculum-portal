/**
 * The one channel for transient success/failure messages (#367).
 *
 * Replaces 32 alert() calls spread across 12 files. alert() blocks the whole
 * page on a modal the app cannot style, reads as a browser warning rather
 * than part of the product, and cannot show two things at once - so
 * "saved successfully" arrived looking exactly as alarming as
 * "failed to delete".
 *
 * Mounted once, above the router (see App.jsx), so a toast raised just before
 * a navigate() survives the transition instead of being unmounted mid-render.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;

// Held as class strings rather than hex, so a tone is applied the same way
// every other colour in the app now is (#360). The hexes are spelled out
// instead of using Tailwind's own red-500/emerald-500/blue-500: those were
// the v3 values, and Tailwind 4 redefined its default palette in OKLCH, so
// the named utilities would shift these three toasts a shade.
const TONE = {
  success: { skin: "bg-[#ecfdf5] border-[#10b981] text-[#065f46]", icon: "✓" },
  error: { skin: "bg-[#fef2f2] border-[#ef4444] text-[#991b1b]", icon: "!" },
  info: { skin: "bg-[#eff6ff] border-[#3b82f6] text-[#1e40af]", icon: "i" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, { tone = "info", duration = AUTO_DISMISS_MS } = {}) => {
      // A null message means "nothing worth saying" - toUserMessage returns
      // that for a cancelled request. Callers shouldn't have to special-case it.
      if (!message) return null;

      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, tone }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, { ...options, tone: "success" }),
      error: (message, options) => show(message, { ...options, tone: "error" }),
      info: (message, options) => show(message, { ...options, tone: "info" }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // role=status + aria-live announces these to a screen reader without
        // stealing focus, which is the accessible equivalent of what alert()
        // was doing by force.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[5000] flex max-w-[min(420px,calc(100vw-32px))] flex-col gap-2"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.tone] || TONE.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border border-l-4 px-3.5 py-3 text-body shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${tone.skin}`}
            >
              <span aria-hidden="true" className="font-bold leading-[1.4]">
                {tone.icon}
              </span>
              <span className="flex-1 leading-[1.4]">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="cursor-pointer border-0 bg-transparent p-0 text-[1.1rem] leading-none text-inherit"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast().success(...) / .error(...) / .info(...)
 *
 * Throws when used outside the provider rather than silently doing nothing -
 * a message the user never sees is exactly the failure mode #367 is about.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>. It is mounted in App.jsx.");
  }
  return context;
}
