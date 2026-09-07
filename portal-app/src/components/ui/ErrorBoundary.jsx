/**
 * Catches render-time exceptions so one broken component doesn't blank the
 * whole app (#367 - "Add error boundaries for JavaScript errors").
 *
 * Without this, any exception thrown during render unmounts the entire React
 * tree and leaves the user on a white page with no way forward but a manual
 * reload. There were none in the codebase before this.
 *
 * Still a class component: componentDidCatch has no hook equivalent, by
 * design - React has never shipped one.
 */

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No error-reporting service is wired up in this app yet, so the console
    // is the only sink. Keep the component stack - it is the part that
    // actually identifies which component threw.
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.handleReset);
    }

    return (
      <div
        role="alert"
        style={{
          margin: "48px auto",
          maxWidth: 560,
          padding: 28,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          textAlign: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 10, color: "#162040" }}>
          Something went wrong on this page
        </h2>
        <p style={{ color: "#4b5563", marginBottom: 22, lineHeight: 1.5 }}>
          The rest of the app is still working. You can try this page again, or head back to the
          home page.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              background: "#162040",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 22px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: "#fff",
              color: "#162040",
              border: "1px solid #162040",
              borderRadius: 6,
              padding: "10px 22px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to home
          </a>
        </div>
      </div>
    );
  }
}
