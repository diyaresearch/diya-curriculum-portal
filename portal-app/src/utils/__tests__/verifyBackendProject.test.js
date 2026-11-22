/**
 * Coverage for the frontend/backend project mismatch check.
 *
 * The behaviour worth pinning down is the quiet half: this runs on every dev
 * boot, so a backend that is not up yet, or one too old to report a project,
 * must not produce noise that trains people to ignore the console. What it
 * does have to shout about is a genuine disagreement, since the alternative
 * symptom is a 401 that blames the token instead of the config.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { verifyBackendProject } from "@/utils/verifyBackendProject";

function health(body, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Point this bundle at a project, the way an .env file would. */
function setFrontend({ projectId, emulator = false }) {
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", projectId);
  vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", emulator ? "true" : "false");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifyBackendProject", () => {
  test("stays silent when both halves name the same project", async () => {
    setFrontend({ projectId: "curriculum-portal-staging" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => health({ status: "ok", projectId: "curriculum-portal-staging", emulator: false }))
    );

    await expect(verifyBackendProject()).resolves.toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  test("reports a mismatch and names both projects", async () => {
    setFrontend({ projectId: "curriculum-portal-staging" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => health({ status: "ok", projectId: "curriculum-portal-1ce8f", emulator: false }))
    );

    await expect(verifyBackendProject()).resolves.toBe(false);

    const message = console.error.mock.calls[0][0];
    expect(message).toContain("curriculum-portal-staging");
    expect(message).toContain("curriculum-portal-1ce8f");
    // The whole point is connecting the 401 to its actual cause.
    expect(message).toContain("401");
  });

  test("catches a mismatch even when the backend reports Firestore down", async () => {
    // /api/health answers 503 with the same identity fields when the
    // credential is dead. A credential outage is a different problem and must
    // not hide this one, so the body is read regardless of status.
    setFrontend({ projectId: "curriculum-portal-staging" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        health({ status: "degraded", projectId: "curriculum-portal-1ce8f", emulator: false }, { status: 503 })
      )
    );

    await expect(verifyBackendProject()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  test("flags one half being on the emulator while the other is not", async () => {
    setFrontend({ projectId: "demo-diya-portal", emulator: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => health({ status: "ok", projectId: "demo-diya-portal", emulator: false }))
    );

    await expect(verifyBackendProject()).resolves.toBe(false);
    expect(console.error.mock.calls[0][0]).toContain("emulator");
  });

  test("says nothing when the backend is not running", async () => {
    setFrontend({ projectId: "curriculum-portal-1ce8f" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    await expect(verifyBackendProject()).resolves.toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  test("says nothing to a backend that predates the projectId field", async () => {
    setFrontend({ projectId: "curriculum-portal-1ce8f" });
    vi.stubGlobal("fetch", vi.fn(async () => health({ status: "ok", firestore: "reachable" })));

    await expect(verifyBackendProject()).resolves.toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});
