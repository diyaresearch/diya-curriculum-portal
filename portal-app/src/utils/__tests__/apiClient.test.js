/**
 * Coverage for the shared API client (#370). These are the guarantees every
 * migrated call site now depends on, so they are worth pinning down.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, api, apiRequest } from "@/utils/apiClient";

const currentUser = { getIdToken: vi.fn(async () => "test-token") };

vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    get currentUser() {
      return globalThis.__testUser;
    },
  }),
}));

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  globalThis.__testUser = currentUser;
  currentUser.getIdToken.mockClear();
  global.fetch = vi.fn();
});

afterEach(() => {
  delete globalThis.__testUser;
});

describe("apiRequest", () => {
  test("returns the parsed body verbatim, without unwrapping an envelope", async () => {
    // Most server routes return raw JSON, not { success, data } - unwrapping
    // here would break them, so the body must come back untouched.
    global.fetch.mockResolvedValue(jsonResponse({ Title: "raw", sections: [] }));
    await expect(apiRequest("/api/lesson/1")).resolves.toEqual({ Title: "raw", sections: [] });
  });

  test("attaches a bearer token by default", async () => {
    global.fetch.mockResolvedValue(jsonResponse({}));
    await apiRequest("/api/user/me");
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });

  test("omits the token when auth is off, and when nobody is signed in", async () => {
    global.fetch.mockResolvedValue(jsonResponse({}));
    await apiRequest("/api/units", { auth: false });
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(currentUser.getIdToken).not.toHaveBeenCalled();

    globalThis.__testUser = null;
    await apiRequest("/api/units");
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  test("turns the server's error envelope into an ApiError with its code", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(
        { success: false, error: { code: "AUTH_ERROR", message: "Authorization token required" } },
        { status: 401 }
      )
    );
    const err = await apiRequest("/api/user/me").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.message).toBe("Authorization token required");
    expect(err.isAuthError).toBe(true);
  });

  test("still produces a usable ApiError when the body is not JSON", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("not json");
      },
      text: async () => "<html>bad gateway</html>",
    });
    const err = await apiRequest("/api/units").catch((e) => e);
    expect(err.status).toBe(502);
    expect(err.code).toBe("HTTP_ERROR");
    expect(err.message).toMatch(/502/);
  });

  test("maps a network failure to NETWORK_ERROR rather than leaking TypeError", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await apiRequest("/api/units").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.status).toBe(0);
  });

  test("maps an abort to ABORTED so callers can ignore it", async () => {
    global.fetch.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const err = await apiRequest("/api/units").catch((e) => e);
    expect(err.code).toBe("ABORTED");
  });

  test("JSON-encodes an object body but leaves FormData to the browser", async () => {
    global.fetch.mockResolvedValue(jsonResponse({}));
    await api.post("/api/lesson", { Title: "x" });
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"Title":"x"}');

    const form = new FormData();
    await api.post("/api/upload", form);
    const [, formInit] = global.fetch.mock.calls[1];
    expect(formInit.headers["Content-Type"]).toBeUndefined();
    expect(formInit.body).toBe(form);
  });

  test("returns null for 204 and for an empty body", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => "" });
    await expect(api.del("/api/lesson/1")).resolves.toBeNull();
  });

  test("normalizes a path with no leading slash", async () => {
    global.fetch.mockResolvedValue(jsonResponse({}));
    await apiRequest("api/units");
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/units$/);
  });
});
