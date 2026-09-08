/**
 * setTimeout that cannot outlive the component (#374).
 *
 * A timer started in an event handler is not covered by an effect's cleanup,
 * so it keeps running after unmount and fires into a component that is gone:
 * TestimonialsSection scheduled four of these per interaction to end a
 * carousel transition, and several pages used one to navigate a couple of
 * seconds after a save - so leaving the page early meant an unexpected
 * redirect landing on whatever the user had opened instead.
 *
 *   const setSafeTimeout = useSafeTimeout();
 *   setSafeTimeout(() => setIsTransitioning(false), 400);
 *
 * Every pending timer is cleared on unmount. Returns the id, so a caller that
 * wants to cancel one early still can.
 */

import { useCallback, useEffect, useRef } from "react";

/**
 * Browser setTimeout returns a number; @types/node also declares a Node
 * Timeout in scope. Naming the browser overload's return type keeps
 * clearTimeout happy without depending on which lib wins.
 */
type TimerId = ReturnType<typeof setTimeout>;

export default function useSafeTimeout(): (callback: () => void, delay?: number) => TimerId {
  const timers = useRef(new Set<TimerId>());

  useEffect(
    () => () => {
      for (const id of timers.current) clearTimeout(id);
      timers.current.clear();
    },
    []
  );

  return useCallback((callback: () => void, delay?: number): TimerId => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, delay);
    timers.current.add(id);
    return id;
  }, []);
}
