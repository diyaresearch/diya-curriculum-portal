import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Loading from "@/components/ui/Loading";

describe("Loading", () => {
  test("announces the wait to assistive tech", () => {
    // None of the ten hand-rolled "Loading..." divs this replaces did.
    render(<Loading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading...");
  });

  test("shows a caller's message", () => {
    render(<Loading message="Loading module details..." />);
    expect(screen.getByText("Loading module details...")).toBeInTheDocument();
  });

  test("renders without a message when one is not wanted", () => {
    render(<Loading message="" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("the button variant stays inline for use inside a <button>", () => {
    render(
      <button type="button">
        <Loading variant="button" message="Saving..." />
      </button>
    );
    expect(screen.getByRole("button")).toHaveTextContent("Saving...");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
