/**
 * One sink for render-time crashes (#378).
 *
 * Every boundary reports here instead of calling console.error with its own
 * hand-rolled prefix, so a crash always carries the same three things: which
 * boundary caught it, the error, and the component stack - the part that
 * actually names the component that threw.
 *
 * No third-party reporting service is wired to this app, and the backend has
 * no client-log endpoint, so the console is currently the only destination.
 * `setErrorSink` is the seam for adding one later (Sentry's captureException,
 * a POST to a log route) without touching a single boundary.
 */

/** @type {((report: {error: unknown, boundary: string, componentStack: string|null}) => void)|null} */
let sink = null;

/**
 * Register the destination for reported errors. Replaces any previous sink.
 *
 * @param {((report: object) => void)|null} fn
 * @returns {() => void} removes this sink again (handy in tests)
 */
export function setErrorSink(fn) {
  sink = typeof fn === "function" ? fn : null;
  const registered = sink;
  return () => {
    if (sink === registered) sink = null;
  };
}

/**
 * Report a crash. Never throws: it runs inside componentDidCatch, where an
 * exception would take down the boundary that was meant to contain one.
 *
 * @param {unknown} error
 * @param {{boundary?: string, componentStack?: string|null}} context
 * @returns {{error: unknown, boundary: string, componentStack: string|null}}
 */
export function reportError(error, context = {}) {
  const report = {
    error,
    boundary: context.boundary || "unknown",
    componentStack: context.componentStack ?? null,
  };

  console.error(`Unhandled render error [${report.boundary}]:`, error, report.componentStack);

  if (sink) {
    try {
      sink(report);
    } catch (sinkError) {
      // A broken reporter must not become the crash it was reporting.
      console.error("Error sink threw while reporting:", sinkError);
    }
  }

  return report;
}
