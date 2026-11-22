/**
 * Both signup pages render (they crashed on first render in production).
 *
 * Each form read `googleUser` - to default the email field - a few lines
 * above the `const { user: googleUser } = useAuth()` that declares it. A
 * `const` read before its declaration is a ReferenceError, so every visit to
 * /teacher-signup or /student-signup hit the route error boundary. Nothing
 * rendered these pages in a test, which is how it shipped; lint now has
 * `no-use-before-define` as well.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/firebase/firebaseConfig", () => ({ app: {}, db: {} }));

const authState = { user: null };
vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    user: authState.user,
    userData: null,
    role: null,
    loading: false,
    logout: vi.fn(),
  }),
}));

async function renderAt(path) {
  const { TeacherSignup, StudentSignup } = await import("@/pages/sign_up");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/teacher-signup" element={<TeacherSignup />} />
        <Route path="/student-signup" element={<StudentSignup />} />
      </Routes>
    </MemoryRouter>
  );
}

const PAGES = [
  ["/teacher-signup", /Sign Up as a Teacher/i],
  ["/student-signup", /Sign Up as a Student/i],
];

beforeEach(() => {
  authState.user = null;
});

describe.each(PAGES)("%s", (path, heading) => {
  test("renders for a signed-out visitor", async () => {
    await renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  test("renders for a signed-in Google user who has no account yet", async () => {
    authState.user = { uid: "new-user", email: "new.teacher@example.com" };
    await renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });
});
