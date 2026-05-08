'use client';

import { useEffect, useRef } from 'react';
import { initLearner, trackEvent } from '@/lib/learner-sync';
import { useStore } from '@/lib/store';
import { usePathname } from 'next/navigation';

export default function LearnerInit() {
  const initialized = useRef(false);
  const lastPageView = useRef<string>('');
  const pathname = usePathname();
  const { selectedModuleId, lang, learnerId } = useStore();

  // Initialize learner on first mount — MUST complete before events can fire.
  // `initialized` ref makes it idempotent across React strict-mode double-invokes.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initLearner();
  }, []);

  // Track page views — only fires after learner is initialized, and only
  // once per unique (pathname, moduleId, lang) tuple per session to avoid
  // double-fires from React strict mode in dev and from rapid re-renders.
  useEffect(() => {
    if (!learnerId) return;
    const tab = pathname.replace('/', '') || 'home';
    const key = `${tab}|${selectedModuleId}|${lang}`;
    if (lastPageView.current === key) return;
    lastPageView.current = key;
    trackEvent('page_view', selectedModuleId, { tab, lang });
  }, [pathname, selectedModuleId, lang, learnerId]);

  return null;
}
