/**
 * Load data from the backend with one consistent { data, loading, error }
 * shape, so every screen reports the same three states the same way (#370,
 * and the loading half of #369).
 *
 *   const { data, loading, error, refetch } = useApi(
 *     (signal) => api.get(`/api/lesson/${lessonId}`, { signal }),
 *     [lessonId]
 *   );
 *
 * Notes on the implementation, both of which are load-bearing:
 *
 * 1. No setState runs synchronously in the effect body. `loading` starts true
 *    from useState, and every later write happens after an await. That is what
 *    react-hooks/set-state-in-effect asks for (enabled as an error in #526),
 *    and it also avoids the extra render an eager setLoading(true) would cost.
 *
 * 2. The effect aborts its request on cleanup, so a result from a stale
 *    render can never overwrite a newer one - the classic out-of-order
 *    response bug when a param changes mid-flight (#374).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/utils/apiClient";

/**
 * @param {(signal: AbortSignal) => Promise<any>} request
 *   Does the call. Pass the signal through so cancellation works.
 * @param {Array} deps
 *   Re-runs when these change, exactly like useEffect's dependency array.
 * @param {object} options
 *   enabled  skip the call while false (waiting on an id or a signed-in
 *            user, say). `loading` stays true so the UI keeps showing its
 *            pending state rather than flashing an empty one.
 */
export default function useApi(request, deps = [], { enabled = true } = {}) {
  // `loading` means "no result yet", so a disabled hook is still loading -
  // that is the point of `enabled`: hold the pending UI while an id or a
  // signed-in user is still resolving, instead of flashing an empty state.
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  // Kept in a ref so a caller can pass an inline arrow without the effect
  // re-firing every render; `deps` stays the single source of truth for when
  // to re-request.
  const requestRef = useRef(request);
  useEffect(() => {
    requestRef.current = request;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    (async () => {
      try {
        const data = await requestRef.current(controller.signal);
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || error?.code === "ABORTED") return;
        setState({
          data: null,
          loading: false,
          error:
            error instanceof ApiError
              ? error
              : new ApiError(error?.message || "Something went wrong.", { code: "UNKNOWN" }),
        });
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's dependency array by design, exactly as useEffect takes one.
  }, [...deps, enabled, reloadToken]);

  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  return { ...state, refetch };
}
