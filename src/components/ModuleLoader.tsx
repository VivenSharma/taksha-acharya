'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api-client';

/**
 * Loads module list into zustand store on first mount via
 * GET /api/content/modules. No direct Supabase in the client bundle.
 */
export default function ModuleLoader() {
  const { lang, setModules } = useStore();
  const inFlight = useRef(false);
  const lastLoadedLang = useRef<string | null>(null);

  useEffect(() => {
    if (inFlight.current) return;
    if (lastLoadedLang.current === lang) return;
    inFlight.current = true;

    api.content.modules()
      .then((mods) => {
        if (mods && mods.length > 0) {
          setModules(mods);
          lastLoadedLang.current = lang;
        }
      })
      .catch((err) => {
        console.error('Failed to load modules:', err);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [lang, setModules]);

  return null;
}
