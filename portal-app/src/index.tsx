import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import reportWebVitals from "./reportWebVitals";

// index.html always carries this element; failing loudly here beats
// createRoot(null) throwing something less specific from inside React.
const container = document.getElementById("root");
if (!container) throw new Error('No #root element to mount into (index.html)');

const root = ReactDOM.createRoot(container);
// The last-resort boundary (#378). The one inside App.tsx only covers the
// routed content; a throw in ToastProvider, AuthProvider, BrowserRouter or
// Layout itself happens above it and would still blank the page. This one
// cannot rely on anything the app provides - no router, no toasts - so its
// fallback is the plain default, whose "Go to home" is a real page load.
root.render(
  <React.StrictMode>
    <ErrorBoundary name="root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://github.com/GoogleChrome/web-vitals
reportWebVitals();

// Dev only: warn loudly when this bundle and the backend are pointed at
// different Firebase projects. The two read their project from unrelated
// files, so they can disagree, and the symptom is a 401 that blames the
// token. Deliberately not awaited - it must never delay the first paint -
// and never runs in a production build, where both halves ship together.
if (import.meta.env.DEV) {
  import("@/utils/verifyBackendProject")
    .then(({ verifyBackendProject }) => verifyBackendProject())
    .catch(() => {});
}
