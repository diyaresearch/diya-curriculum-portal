/**
 * Loading state for things the user *does*, as opposed to things a page
 * loads (#369).
 *
 * useApi covers reads. The gap this fills is submits, saves and deletes -
 * where nothing tracked pending state at all, so every one of them could be
 * fired twice by an impatient double-click, and the button gave no sign it
 * had registered the first press.
 *
 *   const save = useAsyncAction(async () => {
 *     await api.post("/api/lesson/", lessonData);
 *     toast.success("Saved");
 *   });
 *
 *   <button onClick={save.run} disabled={save.pending}>
 *     {save.pending ? <Loading variant="button" message="Saving..." /> : "Save"}
 *   </button>
 *
 * `run` resolves rather than rejects: the point is to drive UI, and an
 * unhandled rejection out of an onClick handler helps nobody. Check
 * `action.error`, or handle it inside the callback.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/utils/apiClient";

export default function useAsyncAction(action) {
  const [state, setState] = useState({ pending: false, error: null });

  // Survives unmount-during-await: setting state on a gone component is a
  // no-op in React 18 but still a leak of intent, and the guard is free.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Kept current in an effect rather than assigned during render, so a caller
  // can pass an inline arrow without this hook writing a ref mid-render
  // (react-hooks/refs).
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });

  // Guards the double-click: a second call while one is in flight is dropped
  // rather than queued. A ref, not `state.pending`, because two clicks in the
  // same tick would both read the pre-update value.
  const inFlight = useRef(false);

  const run = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setState({ pending: true, error: null });

    try {
      const result = await actionRef.current(...args);
      if (mounted.current) setState({ pending: false, error: null });
      return result;
    } catch (error) {
      const wrapped =
        error instanceof ApiError
          ? error
          : new ApiError(error?.message || "Something went wrong.", { code: "UNKNOWN" });
      if (mounted.current) setState({ pending: false, error: wrapped });
      return undefined;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => setState({ pending: false, error: null }), []);

  return { run, reset, pending: state.pending, error: state.error };
}
