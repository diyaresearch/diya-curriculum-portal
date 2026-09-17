import type { Metric } from "web-vitals";

/**
 * Optional Core Web Vitals reporting. Nothing is wired up to consume it -
 * index.tsx calls this with no handler, which is the no-op path.
 */
const reportWebVitals = (onPerfEntry?: (metric: Metric) => void): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // web-vitals v3 renamed get* -> on*, and v4 replaced FID with INP
    // (Google retired FID as a Core Web Vital in March 2024).
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
