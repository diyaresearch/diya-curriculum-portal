// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Firebase Auth (via undici) needs TextEncoder/TextDecoder in Jest.
import { TextDecoder, TextEncoder } from "util";
import { ReadableStream } from "stream/web";

// Prevent Firebase Auth from starting real listeners/timers in Jest.
jest.mock("firebase/auth", () => {
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
    signInWithRedirect: jest.fn(async () => undefined),
    getRedirectResult: jest.fn(async () => null),
    onAuthStateChanged: jest.fn((auth, cb) => mockAuth.onAuthStateChanged(cb)),
    signOut: jest.fn(async () => undefined),
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

// react-pdf pulls in ESM pdfjs builds that Jest (CRA) can't parse.
jest.mock("react-pdf", () => {
  const React = require("react");
  return {
    Document: ({ children }) => React.createElement("div", null, children),
    Page: () => React.createElement("div", null),
    pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
  };
});

// Axios is ESM-only in this repo's dependency tree; CRA/Jest won't transform it.
jest.mock("axios", () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    create: () => mockAxios,
    defaults: {},
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: mockAxios };
});
