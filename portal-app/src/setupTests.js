// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Firebase Auth (via undici) needs TextEncoder/TextDecoder under jsdom.
import { TextDecoder, TextEncoder } from "util";
import { ReadableStream } from "stream/web";

// Prevent Firebase Auth from starting real listeners/timers in tests.
vi.mock("firebase/auth", () => {
  class GoogleAuthProvider {
    setCustomParameters() {}
  }

  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: (cb) => {
      if (typeof cb === "function") cb(null);
      return () => {};
    },
  };

  return {
    __esModule: true,
    getAuth: () => mockAuth,
    GoogleAuthProvider,
    signInWithRedirect: vi.fn(async () => undefined),
    getRedirectResult: vi.fn(async () => null),
    onAuthStateChanged: vi.fn((auth, cb) => mockAuth.onAuthStateChanged(cb)),
    signOut: vi.fn(async () => undefined),
  };
});

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream;
}

// react-pdf renders through pdfjs, which needs a real canvas/worker that
// jsdom doesn't provide. The factory is async because vi.mock is hoisted
// above this file's own imports, so it can't close over one.
vi.mock("react-pdf", async () => {
  const React = await import("react");
  return {
    Document: ({ children }) => React.createElement("div", null, children),
    Page: () => React.createElement("div", null),
    pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
  };
});
