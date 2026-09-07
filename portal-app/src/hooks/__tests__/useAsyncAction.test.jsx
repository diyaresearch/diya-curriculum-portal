import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import useAsyncAction from "@/hooks/useAsyncAction";
import { ApiError } from "@/utils/apiClient";

describe("useAsyncAction", () => {
  test("tracks pending across the call", async () => {
    let finish;
    const { result } = renderHook(() =>
      useAsyncAction(() => new Promise((resolve) => { finish = resolve; }))
    );

    expect(result.current.pending).toBe(false);
    act(() => { result.current.run(); });
    await waitFor(() => expect(result.current.pending).toBe(true));

    await act(async () => { finish("done"); });
    expect(result.current.pending).toBe(false);
  });

  test("drops a second call while one is in flight", async () => {
    // The double-click this hook exists to stop. None of the submit handlers
    // guarded against it before.
    const action = vi.fn(() => new Promise(() => {}));
    const { result } = renderHook(() => useAsyncAction(action));

    act(() => {
      result.current.run();
      result.current.run();
      result.current.run();
    });

    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(action).toHaveBeenCalledTimes(1);
  });

  test("captures the failure instead of rejecting out of a click handler", async () => {
    const boom = new ApiError("nope", { status: 500 });
    const { result } = renderHook(() => useAsyncAction(async () => { throw boom; }));

    let returned = "unset";
    await act(async () => { returned = await result.current.run(); });

    expect(returned).toBeUndefined();
    expect(result.current.error).toBe(boom);
    expect(result.current.pending).toBe(false);
  });

  test("wraps a non-ApiError so callers see one shape", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => { throw new TypeError("bad"); })
    );
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error.code).toBe("UNKNOWN");
  });

  test("returns the action's value and passes arguments through", async () => {
    const { result } = renderHook(() => useAsyncAction(async (a, b) => a + b));
    let value;
    await act(async () => { value = await result.current.run(2, 3); });
    expect(value).toBe(5);
  });

  test("reset clears a previous error so the form can be retried", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => { throw new ApiError("x", { status: 400 }); })
    );
    await act(async () => { await result.current.run(); });
    expect(result.current.error).not.toBeNull();

    act(() => { result.current.reset(); });
    expect(result.current.error).toBeNull();
  });

  test("recovers after a failure - pending is not left stuck", async () => {
    let shouldFail = true;
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        if (shouldFail) throw new ApiError("first", { status: 500 });
        return "ok";
      })
    );

    await act(async () => { await result.current.run(); });
    expect(result.current.pending).toBe(false);

    shouldFail = false;
    let second;
    await act(async () => { second = await result.current.run(); });
    expect(second).toBe("ok");
    expect(result.current.error).toBeNull();
  });
});
