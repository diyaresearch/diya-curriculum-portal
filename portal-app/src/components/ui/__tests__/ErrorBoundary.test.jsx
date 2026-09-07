import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ErrorBoundary from "@/components/ui/ErrorBoundary";

function Boom() {
  throw new Error("render exploded");
}

beforeEach(() => {
  // React logs caught render errors; keep the suite output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
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
});
