import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Navbar reads auth state and the user's plan through several contexts; the
// point here is the boundary around it, not what it renders, so it is a stub
// that either works or throws.
let navbarThrows = false;
let footerThrows = false;

vi.mock("@/components/layout/Navbar", () => ({
  default: () => {
    if (navbarThrows) throw new Error("navbar exploded");
    return <nav>the navbar</nav>;
  },
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => {
    if (footerThrows) throw new Error("footer exploded");
    return <footer>the footer</footer>;
  },
}));

vi.mock("@/auth/googleAuth", () => ({
  handleGoogleRedirectOnce: vi.fn(async () => undefined),
}));

const { default: Layout } = await import("@/components/layout/Layout");

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <p>page content</p>
      </Layout>
    </MemoryRouter>
  );
}

beforeEach(() => {
  navbarThrows = false;
  footerThrows = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Layout error boundaries", () => {
  test("renders the chrome and the page when nothing throws", () => {
    renderLayout();

    expect(screen.getByText("the navbar")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByText("the footer")).toBeInTheDocument();
  });

  test("keeps the page when the navbar throws", () => {
    navbarThrows = true;
    renderLayout();

    // Before #378 this took the whole app down: the route boundary is inside
    // <main>, below where the navbar renders.
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/navigation bar didn't load/i);
  });

  test("drops a broken footer silently", () => {
    footerThrows = true;
    renderLayout();

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByText("the navbar")).toBeInTheDocument();
    // Nothing in the footer is needed to finish a task - no alarm for it.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
