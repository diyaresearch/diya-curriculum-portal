import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import RouteErrorBoundary from "@/components/ui/RouteErrorBoundary";

function Broken() {
  throw new Error("this page is broken");
}

function Nav() {
  return <Link to="/fine">Go somewhere else</Link>;
}

function renderApp(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {/* The nav sits outside the boundary, the way it does in Layout. */}
      <Nav />
      <RouteErrorBoundary>
        <Routes>
          <Route path="/broken" element={<Broken />} />
          <Route path="/fine" element={<p>a working page</p>} />
        </Routes>
      </RouteErrorBoundary>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("RouteErrorBoundary", () => {
  test("catches a page that throws without taking the nav with it", () => {
    renderApp("/broken");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go somewhere else/i })).toBeInTheDocument();
  });

  test("clears the crash when the user navigates to another page", async () => {
    const user = userEvent.setup();
    renderApp("/broken");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /go somewhere else/i }));

    // Before #378 the boundary kept its error state across the navigation, so
    // every page reached from the navbar showed the crash screen too.
    expect(screen.getByText("a working page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
