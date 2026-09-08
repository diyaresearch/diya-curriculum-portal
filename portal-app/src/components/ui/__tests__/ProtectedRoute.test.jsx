import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import ProtectedRoute from "@/components/ui/ProtectedRoute";
import { ROLES } from "@/constants/roles";

const mockAuth = vi.hoisted(() => ({ value: {} }));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => mockAuth.value,
}));

function renderGuarded(auth, guardProps) {
  mockAuth.value = { loading: false, user: null, role: null, ...auth };
  return render(
    <MemoryRouter initialEntries={["/guarded"]}>
      <Routes>
        <Route
          path="/guarded"
          element={
            <ProtectedRoute {...guardProps}>
              <p>the guarded page</p>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<p>the home page</p>} />
        <Route path="/my-plans" element={<p>my plans</p>} />
        <Route path="/teacher-plus" element={<p>the teacherPlus dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const guardedPage = () => screen.queryByText("the guarded page");

describe("ProtectedRoute", () => {
  test("waits for auth rather than bouncing a signed-in user mid-resolution", () => {
    renderGuarded({ loading: true }, { requireAuth: true });

    // The bug this replaces: each page redirected from its own effect, so a
    // signed-in user whose auth had not resolved yet was sent to the home page.
    expect(guardedPage()).not.toBeInTheDocument();
    expect(screen.queryByText("the home page")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("renders the page for a signed-in user", () => {
    renderGuarded({ user: { uid: "u1" } }, { requireAuth: true });

    expect(guardedPage()).toBeInTheDocument();
  });

  test("redirects a signed-out visitor to the home page", () => {
    renderGuarded({}, { requireAuth: true });

    expect(guardedPage()).not.toBeInTheDocument();
    expect(screen.getByText("the home page")).toBeInTheDocument();
  });

  test("honours redirectTo", () => {
    renderGuarded({}, { requireAuth: true, redirectTo: "/my-plans" });

    expect(screen.getByText("my plans")).toBeInTheDocument();
  });

  test("lets an allowed role through", () => {
    renderGuarded(
      { user: { uid: "u1" }, role: ROLES.TEACHER_PLUS },
      { allowedRoles: [ROLES.TEACHER_PLUS, ROLES.ADMIN] }
    );

    expect(guardedPage()).toBeInTheDocument();
  });

  test("turns away a signed-in user without the role", () => {
    renderGuarded(
      { user: { uid: "u1" }, role: ROLES.TEACHER_DEFAULT },
      { allowedRoles: [ROLES.TEACHER_PLUS] }
    );

    expect(guardedPage()).not.toBeInTheDocument();
    expect(screen.getByText("the home page")).toBeInTheDocument();
  });

  test("allowedRoles implies authentication", () => {
    renderGuarded({}, { allowedRoles: [ROLES.TEACHER_PLUS] });

    expect(screen.getByText("the home page")).toBeInTheDocument();
  });

  test("sends a TeacherPlus user to their dashboard", () => {
    renderGuarded(
      { user: { uid: "u1" }, role: ROLES.TEACHER_PLUS },
      { redirectTeacherPlus: true }
    );

    expect(screen.getByText("the teacherPlus dashboard")).toBeInTheDocument();
  });
});
