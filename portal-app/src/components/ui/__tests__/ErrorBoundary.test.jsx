import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { setErrorSink } from "@/utils/errorReporter";

function Boom() {
  throw new Error("render exploded");
}

function MaybeBoom({ throws }) {
  if (throws) throw new Error("render exploded");
  return <p>recovered</p>;
}

let removeSink = () => {};

beforeEach(() => {
  // React logs caught render errors; keep the suite output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  removeSink();
  removeSink = () => {};
});

describe("ErrorBoundary", () => {
  test("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  test("shows a recoverable fallback instead of a blank page when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong on this page/i)).toBeInTheDocument();
    // The user must always have a way out.
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to home/i })).toBeInTheDocument();
  });

  test("hands the error to a custom fallback when one is given", () => {
    render(
      <ErrorBoundary fallback={(error) => <p>caught: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("caught: render exploded")).toBeInTheDocument();
  });

  test("reports the crash under the boundary's name", () => {
    const sink = vi.fn();
    removeSink = setErrorSink(sink);

    render(
      <ErrorBoundary name="route">
        <Boom />
      </ErrorBoundary>
    );

    expect(sink).toHaveBeenCalledTimes(1);
    const report = sink.mock.calls[0][0];
    expect(report.boundary).toBe("route");
    expect(report.error.message).toBe("render exploded");
    // The component stack is the part that names what actually threw.
    expect(report.componentStack).toContain("Boom");
  });

  test("'try again' re-renders the children", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <MaybeBoom throws />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Whatever made it throw has to be gone, or it just throws again.
    rerender(
      <ErrorBoundary>
        <MaybeBoom throws={false} />
      </ErrorBoundary>
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  test("clears itself when a reset key changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/broken"]}>
        <MaybeBoom throws />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={["/fine"]}>
        <MaybeBoom throws={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("stays in the fallback while the reset keys are unchanged", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/broken"]}>
        <MaybeBoom throws />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary resetKeys={["/broken"]}>
        <MaybeBoom throws={false} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  test("calls onReset when it clears", () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]} onReset={onReset}>
        <MaybeBoom throws />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary resetKeys={["b"]} onReset={onReset}>
        <MaybeBoom throws={false} />
      </ErrorBoundary>
    );

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
