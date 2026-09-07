/**
 * Coverage for useApi (#370/#369). The cancellation behaviour in particular
 * is easy to regress and impossible to notice by hand.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import useApi from "@/hooks/useApi";
import { ApiError } from "@/utils/apiClient";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useApi", () => {
  test("starts loading, then exposes data", async () => {
    const { result } = renderHook(() => useApi(async () => ({ ok: 1 }), []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: 1 });
    expect(result.current.error).toBeNull();
  });

  test("surfaces an ApiError without throwing", async () => {
    const boom = new ApiError("nope", { status: 500, code: "INTERNAL_ERROR" });
    const { result } = renderHook(() => useApi(async () => { throw boom; }, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeNull();
  });

  test("wraps a non-ApiError so callers always get the same shape", async () => {
    const { result } = renderHook(() =>
      useApi(async () => { throw new TypeError("x is not a function"); }, [])
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error.code).toBe("UNKNOWN");
  });

  test("does not run while disabled, and stays in the loading state", async () => {
    const request = vi.fn(async () => ({}));
    const { result } = renderHook(() => useApi(request, [], { enabled: false }));

    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  test("aborts the in-flight request on unmount", async () => {
    let seenSignal;
    const { unmount } = renderHook(() =>
      useApi((signal) => {
        seenSignal = signal;
        return new Promise(() => {}); // never settles
      }, [])
    );

    await waitFor(() => expect(seenSignal).toBeDefined());
    expect(seenSignal.aborted).toBe(false);
    unmount();
    expect(seenSignal.aborted).toBe(true);
  });

  test("a stale response cannot overwrite a newer one when deps change", async () => {
    // The out-of-order bug this hook exists to prevent: id=1 resolves AFTER
    // id=2, and must not win.
    const resolvers = {};
    const { result, rerender } = renderHook(
      ({ id }) =>
        useApi(
          (signal) =>
            new Promise((resolve, reject) => {
              resolvers[id] = resolve;
              signal.addEventListener("abort", () =>
                reject(Object.assign(new Error("aborted"), { code: "ABORTED" }))
              );
            }),
          [id]
        ),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => expect(resolvers[1]).toBeDefined());
    rerender({ id: 2 });
    await waitFor(() => expect(resolvers[2]).toBeDefined());

    await act(async () => {
      resolvers[2]({ id: 2 });
      resolvers[1]({ id: 1 }); // late arrival from the abandoned render
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 2 });
  });

  test("refetch re-runs the request", async () => {
    let n = 0;
    const { result } = renderHook(() => useApi(async () => ({ n: ++n }), []));

    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
  });
});
