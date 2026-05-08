import { api } from './api-client';
import { useStore } from './store';
import type { Lang } from './types';

/**
 * Client-side facade over the /api/learner/* endpoints.
 *
 * All writes go through the server — the browser no longer imports
 * @supabase/supabase-js for CRUD. Every function here is fire-and-forget
 * (awaits but swallows errors) so it never blocks the UI.
 */

/**
 * Generate a stable device fingerprint. Used as the learner's unique key.
 */
function generateDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'dev_' + Math.abs(hash).toString(36) + '_' + str.length.toString(36);
}

/** Initialize or retrieve the learner via /api/learner/init. */
export async function initLearner(): Promise<string | null> {
  const store = useStore.getState();

  if (store.learnerId && store.deviceId) {
    // Already initialised — still refresh last_seen/lang server-side.
    try {
      await api.learner.init(store.deviceId, store.lang);
    } catch { /* ignore */ }
    return store.learnerId;
  }

  const deviceId = generateDeviceId();
  try {
    const learnerId = await api.learner.init(deviceId, store.lang);
    if (learnerId) {
      store.setLearner(learnerId, deviceId);
    }
    return learnerId;
  } catch (err) {
    console.error('initLearner failed:', err);
    return null;
  }
}

export function trackEvent(
  eventType: string,
  moduleId?: string,
  data?: Record<string, unknown>
) {
  const store = useStore.getState();
  if (!store.learnerId) return;

  const eventData = {
    module_id: moduleId || store.selectedModuleId,
    ...(data || {}),
  };

  api.learner.event(store.learnerId, eventType, eventData).catch((err) => {
    console.error('trackEvent failed:', err);
  });
}

export function syncQuizAttempt(
  moduleId: string,
  score: number,
  total: number,
  questions: unknown[]
) {
  const store = useStore.getState();
  if (!store.learnerId) return;

  api.learner.quizAttempt(store.learnerId, moduleId, score, total, questions).catch((err) => {
    console.error('syncQuizAttempt failed:', err);
  });
}

export function syncChatMessage(
  moduleId: string,
  lang: Lang,
  userMessage: string,
  aiResponse: string,
  responseTimeMs?: number
) {
  const store = useStore.getState();
  if (!store.learnerId) return;

  api.learner.chatLog(store.learnerId, moduleId, lang, userMessage, aiResponse, responseTimeMs).catch((err) => {
    console.error('syncChatMessage failed:', err);
  });
}

export function syncProgress(
  moduleId: string,
  sectionsCompleted: string[],
  completed: boolean
) {
  const store = useStore.getState();
  if (!store.learnerId) return;

  api.learner.progress(store.learnerId, moduleId, sectionsCompleted, completed).catch((err) => {
    console.error('syncProgress failed:', err);
  });
}

export function syncApplyLog(
  moduleId: string,
  input: string,
  score: number,
  feedback: string,
  nextStep: string,
  hasPhoto = false,
) {
  const store = useStore.getState();
  if (!store.learnerId) return;

  api.learner.applyLog(store.learnerId, moduleId, input, score, feedback, nextStep, hasPhoto).catch((err) => {
    console.error('syncApplyLog failed:', err);
  });
}
