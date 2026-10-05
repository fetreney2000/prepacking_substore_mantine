import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `useState` that survives navigation and reloads: the value is mirrored into
 * `localStorage` under `key`.
 *
 * Every table in the app had 5-10 independent booleans for column visibility
 * that reset on each page load (review item #24). The first render always
 * uses `initial` so server and client markup match; the stored value is
 * applied in an effect, which keeps hydration happy.
 */
export function usePersistedState<T>(key: string, initial: T): [
  T,
  (next: T | ((prev: T) => T)) => void,
] {
  const [value, setValue] = useState<T>(initial);
  // Read through a ref: `initial` must not be an effect dependency, or a
  // caller passing an object literal would re-run the effect every render.
  const initialRef = useRef(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return;
      const stored = JSON.parse(raw);
      // A corrupted or hand-edited value of another type must not reach state
      // (checked={null} would flip a controlled input to uncontrolled).
      if (typeof stored === typeof initialRef.current) setValue(stored as T);
    } catch {
      // storage unavailable or unreadable - keep the defaults
    }
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // persistence is a convenience, never a reason to fail
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
