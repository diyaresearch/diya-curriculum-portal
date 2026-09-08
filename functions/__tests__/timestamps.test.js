/**
 * utils/timestamps.js — the one spelling of a Firestore write timestamp (#396).
 *
 * ~25 call sites used to hand-write
 * `admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()`. The
 * optional chaining matters: `admin` is the real firebase-admin module in a
 * deploy and a mock in every local run and test, and the mocks carry only the
 * parts of the FieldValue namespace their callers happened to need. These
 * tests pin both halves of that fallback, because a helper that quietly lost
 * the guards would fail only under a mock — i.e. only in development.
 */

const { serverTimestamp, timestampFromDate } = require("../utils/timestamps");

describe("serverTimestamp", () => {
  test("returns the FieldValue sentinel when the admin SDK provides one", () => {
    const admin = { firestore: { FieldValue: { serverTimestamp: () => "SENTINEL" } } };
    expect(serverTimestamp(admin)).toBe("SENTINEL");
  });

  test("falls back to a real Date when the namespace is missing", () => {
    expect(serverTimestamp({ firestore: {} })).toBeInstanceOf(Date);
    expect(serverTimestamp({})).toBeInstanceOf(Date);
    expect(serverTimestamp(undefined)).toBeInstanceOf(Date);
  });

  test("does not throw on an admin double that only exposes .auth()", () => {
    // The shape several route tests pass in. The old inline expression
    // survived this only because of the optional chaining.
    const admin = { auth: () => ({}) };
    expect(() => serverTimestamp(admin)).not.toThrow();
  });
});

describe("timestampFromDate", () => {
  test("converts through Timestamp.fromDate when available", () => {
    const admin = { firestore: { Timestamp: { fromDate: (d) => ({ seconds: d.getTime() / 1000 }) } } };
    expect(timestampFromDate(admin, new Date(1000))).toEqual({ seconds: 1 });
  });

  test("returns the Date unchanged when Timestamp is missing", () => {
    const date = new Date(1000);
    expect(timestampFromDate({ firestore: {} }, date)).toBe(date);
    expect(timestampFromDate(undefined, date)).toBe(date);
  });
});
