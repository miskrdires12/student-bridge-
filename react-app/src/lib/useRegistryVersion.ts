import { useEffect, useState } from 'react';
import { initStore } from '@/lib/store';

/**
 * Bumps every time the student registry is hydrated or mutated, so pages re-read getStudents().
 * Also joins the single-flight hydration pass: a page opened as a cold deep link is mounted before
 * the boot pass lands, and without this it would keep rendering an empty registry.
 */
export function useRegistryVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener('studentbridge_datachange', bump);
    initStore().catch(() => {});
    return () => window.removeEventListener('studentbridge_datachange', bump);
  }, []);

  return version;
}
