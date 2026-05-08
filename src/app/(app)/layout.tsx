'use client';

import Shell from '@/components/shell/Shell';
import ModuleLoader from '@/components/ModuleLoader';
import ConfigWarning from '@/components/ConfigWarning';
import LearnerInit from '@/components/LearnerInit';
import { useHydrated } from '@/lib/useHydration';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-paper">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Shell>
      <ModuleLoader />
      <LearnerInit />
      <ConfigWarning />
      {children}
    </Shell>
  );
}
