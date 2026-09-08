import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { reportError, setErrorSink } from "@/utils/errorReporter";

let removeSink = () => {};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // The sink is module state - leaving one registered leaks into the next test.
  removeSink();
  removeSink = () => {};
});

describe("reportError", () => {
  test("logs the boundary, the error and the component stack", () => {
    const error = new Error("boom");
    reportError(error, { boundary: "route", componentStack: "\n at Broken" });

    expect(console.error).toHaveBeenCalledWith(
      "Unhandled render error [route]:",
      error,
      "\n at Broken"
    );
  });

  test("names the boundary 'unknown' when the caller gives no context", () => {
    const report = reportError(new Error("boom"));
    expect(report).toMatchObject({ boundary: "unknown", componentStack: null });
  });

  test("forwards the report to a registered sink", () => {
    const sink = vi.fn();
    removeSink = setErrorSink(sink);

    const error = new Error("boom");
    reportError(error, { boundary: "navbar", componentStack: "stack" });

    expect(sink).toHaveBeenCalledWith({
      error,
      boundary: "navbar",
      componentStack: "stack",
    });
  });

  test("survives a sink that throws", () => {
    removeSink = setErrorSink(() => {
      throw new Error("the reporter is down");
    });

    expect(() => reportError(new Error("boom"))).not.toThrow();
  });

  test("stops reporting once the sink is removed", () => {
    const sink = vi.fn();
    setErrorSink(sink)();

    reportError(new Error("boom"));
    expect(sink).not.toHaveBeenCalled();
  });
});
