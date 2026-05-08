'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

/**
 * Pings /api/content/modules once — if it returns an empty list AND the
 * environment isn't configured server-side, display the setup warning.
 *
 * No direct Supabase access; the check is fully server-mediated.
 */
export default function ConfigWarning() {
  const [needsConfig, setNeedsConfig] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.content.modules()
      .then((mods) => {
        if (cancelled) return;
        // If there are no modules AND the env URL is unset, it's a config problem.
        if (mods.length === 0 && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          setNeedsConfig(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setNeedsConfig(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!needsConfig) return null;

  return (
    <div className="bg-terra/10 border border-terra/30 text-terra rounded-lg mx-3 mt-3 px-4 py-3 text-xs leading-relaxed">
      <strong>Supabase not configured.</strong> The app cannot reach content. Set{' '}
      <code className="bg-cream px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
      <code className="bg-cream px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
      <code className="bg-cream px-1 rounded">.env.local</code> and restart.
    </div>
  );
}
