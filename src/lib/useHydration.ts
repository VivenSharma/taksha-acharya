import { useEffect, useState } from 'react';

/**
 * Returns true only after the client has hydrated (zustand store loaded from localStorage).
 * Use this to prevent hydration mismatches with persisted state.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return hydrated;
}
