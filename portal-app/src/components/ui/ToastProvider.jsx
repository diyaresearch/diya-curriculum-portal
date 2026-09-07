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

import { TYPO } from "@/constants/typography";

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;

const TONE = {
  success: { bg: "#ecfdf5", border: "#10b981", fg: "#065f46", icon: "✓" },
  error: { bg: "#fef2f2", border: "#ef4444", fg: "#991b1b", icon: "!" },
  info: { bg: "#eff6ff", border: "#3b82f6", fg: "#1e40af", icon: "i" },
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
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 5000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "min(420px, calc(100vw - 32px))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.tone] || TONE.info;
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                borderLeft: `4px solid ${tone.border}`,
                color: tone.fg,
                borderRadius: 8,
                padding: "12px 14px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                fontSize: TYPO?.body ?? "1rem",
              }}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, lineHeight: 1.4 }}>
                {tone.icon}
              </span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  padding: 0,
                }}
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
