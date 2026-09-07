import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import useSafeTimeout from "@/hooks/useSafeTimeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSafeTimeout", () => {
  test("runs the callback like setTimeout", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useSafeTimeout());
    result.current(spy, 500);

    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("does not fire after unmount", () => {
    // The bug this exists for: a timer started in a handler outlives the
    // component and fires into something that is gone.
    const spy = vi.fn();
    const { result, unmount } = renderHook(() => useSafeTimeout());
    result.current(spy, 500);

    unmount();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });

  test("clears several pending timers on unmount", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { result, unmount } = renderHook(() => useSafeTimeout());
    result.current(a, 100);
    result.current(b, 200);

    unmount();
    vi.advanceTimersByTime(500);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  test("returns the id so a caller can cancel early", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useSafeTimeout());
    const id = result.current(spy, 300);

    clearTimeout(id);
    vi.advanceTimersByTime(600);
    expect(spy).not.toHaveBeenCalled();
  });

  test("the scheduler identity is stable across renders", () => {
    // Otherwise every effect listing it as a dependency would re-run.
    const { result, rerender } = renderHook(() => useSafeTimeout());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
