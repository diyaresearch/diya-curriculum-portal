/**
 * Catches render-time exceptions so one broken component doesn't blank the
 * whole app (#367 - "Add error boundaries for JavaScript errors", extended in
 * #378 to reporting, resettable boundaries and the app chrome).
 *
 * Without this, any exception thrown during render unmounts the entire React
 * tree and leaves the user on a white page with no way forward but a manual
 * reload. There were none in the codebase before this.
 *
 * Still a class component: componentDidCatch has no hook equivalent, by
 * design - React has never shipped one.
 *
 * Props:
 *   name       label carried into the error report, so a log line says which
 *              boundary caught it ("route", "navbar", "root", ...)
 *   fallback   (error, reset) => node, for boundaries whose failure should
 *              not look like a whole page falling over (see Layout)
 *   resetKeys  values that, when any changes, clear the error and re-render
 *              the children. RouteErrorBoundary passes the pathname: without
 *              this the fallback stays up forever once a route has thrown,
 *              because navigating with the navbar swaps the children but
 *              leaves this component - and its error state - mounted.
 *   onReset    called after the boundary clears, for state the parent has to
 *              undo itself
 */

import React from "react";

import { reportError } from "@/utils/errorReporter";

function keysChanged(prev = [], next = []) {
  if (prev.length !== next.length) return true;
  return next.some((key, i) => !Object.is(key, prev[i]));
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      boundary: this.props.name || "app",
      componentStack: info?.componentStack,
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.handleReset();
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
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
        className="mx-auto my-12 max-w-[560px] rounded-xl border border-rule bg-surface p-7 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      >
        <h2 className="mb-2.5 text-[1.4rem] font-bold text-navy">
          Something went wrong on this page
        </h2>
        <p className="mb-[22px] leading-normal text-[#4b5563]">
          The rest of the app is still working. You can try this page again, or head back to the
          home page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="cursor-pointer rounded-md border-0 bg-navy px-[22px] py-2.5 font-semibold text-white"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-navy bg-surface px-[22px] py-2.5 font-semibold text-navy no-underline"
          >
            Go to home
          </a>
        </div>
      </div>
    );
  }
}
