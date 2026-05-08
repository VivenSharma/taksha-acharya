'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api-client';

/**
 * Loads module list into zustand store on first mount via
 * GET /api/content/modules. No direct Supabase in the client bundle.
 */
export default function ModuleLoader() {
  const { modules, setModules } = useStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (modules.length > 0) return;
    if (attempted.current) return;
    attempted.current = true;

    api.content.modules()
      .then((mods) => {
        if (mods && mods.length > 0) setModules(mods);
      })
      .catch((err) => {
        console.error('Failed to load modules:', err);
        attempted.current = false; // allow retry on next render
      });
  }, [modules.length, setModules]);

  return null;
}
