/**
 * The guarantee this provider exists to make: one auth listener and one user
 * document read for the whole app, no matter how many components ask.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const authCallbacks = [];
const onAuthStateChanged = vi.fn((auth, cb) => {
  authCallbacks.push(cb);
  return () => {};
});
const onSnapshot = vi.fn(() => () => {});

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (...args) => onAuthStateChanged(...args),
  signOut: vi.fn(async () => undefined),
}));
vi.mock("firebase/firestore", () => ({
  doc: (...args) => ({ args }),
  onSnapshot: (...args) => onSnapshot(...args),
}));
vi.mock("@/firebase/firebaseConfig", () => ({ db: {}, app: {} }));

const { AuthProvider, useAuth } = await import("@/context/AuthProvider");
const { default: useUserRole } = await import("@/hooks/useUserRole");
const { default: useUserData } = await import("@/hooks/useUserData");

function AuthConsumer() {
  const { user, role, loading } = useAuth();
  return <div>a:{loading ? "loading" : `${user?.uid ?? "anon"}/${role ?? "none"}`}</div>;
}
function RoleConsumer() {
  const { user, role } = useUserRole();
  return <div>b:{`${user?.uid ?? "anon"}/${role ?? "none"}`}</div>;
}
function DataConsumer() {
  const { user, userData, loading } = useUserData();
  return <div>c:{loading ? "loading" : `${user?.uid ?? "anon"}/${userData?.role ?? "none"}`}</div>;
}

function renderApp() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
        <RoleConsumer />
        <DataConsumer />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authCallbacks.length = 0;
  onAuthStateChanged.mockClear();
  onSnapshot.mockClear();
});

describe("AuthProvider", () => {
  test("registers exactly one auth listener however many consumers there are", () => {
    renderApp();
    // Three consumers, two of them through the legacy hooks. Before #368 this
    // was three listeners and three reads of the same users/{uid} document.
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  test("opens exactly one user-document listener when a user signs in", async () => {
    renderApp();
    authCallbacks[0]({ uid: "u1" });
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
  });

  test("every consumer sees the same user and role", async () => {
    renderApp();
    authCallbacks[0]({ uid: "u1" });
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

    const handler = onSnapshot.mock.calls[0][1];
    handler({ exists: () => true, data: () => ({ role: "teacherPlus" }) });

    expect(await screen.findByText("a:u1/teacherPlus")).toBeInTheDocument();
    expect(screen.getByText("b:u1/teacherPlus")).toBeInTheDocument();
    expect(screen.getByText("c:u1/teacherPlus")).toBeInTheDocument();
  });

  test("resolves loading for a signed-out visitor without reading a document", async () => {
    renderApp();
    authCallbacks[0](null);
    expect(await screen.findByText("a:anon/none")).toBeInTheDocument();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  test("resolves loading even when the document listener errors", async () => {
    // A rules denial must not leave every consumer spinning forever.
    renderApp();
    authCallbacks[0]({ uid: "u1" });
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

    const onError = onSnapshot.mock.calls[0][2];
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    onError(new Error("permission-denied"));
    expect(await screen.findByText("a:u1/none")).toBeInTheDocument();
    spy.mockRestore();
  });

  test("useAuth outside the provider throws rather than returning empty state", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/must be used inside an <AuthProvider>/);
    spy.mockRestore();
  });
});
