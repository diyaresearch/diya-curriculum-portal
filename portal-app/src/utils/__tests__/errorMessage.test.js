import { describe, expect, test } from "vitest";

import { ApiError } from "@/utils/apiClient";
import { toUserMessage } from "@/utils/errorMessage";

describe("toUserMessage", () => {
  test("explains a network failure in terms the user can act on", () => {
    expect(toUserMessage(new ApiError("Failed to fetch", { code: "NETWORK_ERROR" }))).toMatch(
      /connection/i
    );
  });

  test("returns null for a cancelled request so nothing is shown", () => {
    expect(toUserMessage(new ApiError("Request cancelled", { code: "ABORTED" }))).toBeNull();
  });

  test("maps auth failures to a sign-in prompt, not the server's wording", () => {
    const err = new ApiError("jwt malformed", { status: 401, code: "AUTH_ERROR" });
    expect(toUserMessage(err)).toMatch(/sign in again/i);
  });

  test("hides 5xx detail behind a generic message", () => {
    const err = new ApiError("TypeError: db.collection is not a function", { status: 500 });
    expect(toUserMessage(err)).toMatch(/server had a problem/i);
    expect(toUserMessage(err)).not.toMatch(/TypeError/);
  });

  test("keeps a 4xx message the server wrote for a human", () => {
    const err = new ApiError("This module is already in your library.", { status: 422 });
    expect(toUserMessage(err)).toBe("This module is already in your library.");
  });

  test("falls back for a plain Error and for a non-error", () => {
    expect(toUserMessage(new Error("boom"), "Could not save.")).toBe("Could not save.");
    expect(toUserMessage(undefined)).toMatch(/something went wrong/i);
  });
});
