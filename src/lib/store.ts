import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang, Module, Progress, QuizAttempt, EarnedBadge } from './types';

interface AppState {
  // Global selectors
  selectedModuleId: string;
  lang: Lang;
  setModule: (id: string) => void;
  setLang: (lang: Lang) => void;

  // Modules cache
  modules: Module[];
  setModules: (modules: Module[]) => void;

  // Local progress (synced to Supabase async)
  progress: Record<string, Progress>;
  updateProgress: (moduleId: string, update: Partial<Progress>) => void;

  // Quiz attempts (local cache)
  quizAttempts: QuizAttempt[];
  addQuizAttempt: (attempt: QuizAttempt) => void;

  // Badges
  earnedBadges: EarnedBadge[];
  addBadge: (badge: EarnedBadge) => void;

  // Chat history (per module)
  chatHistory: Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>;
  addChatMessage: (moduleId: string, role: 'user' | 'assistant', content: string) => void;
  // Streaming helpers — append a token to the trailing assistant message (or
  // create a new empty assistant message if the last one was from the user).
  appendToLastAssistantMessage: (moduleId: string, chunk: string) => void;
  // Replace the trailing assistant message outright (e.g. error fallback).
  replaceLastAssistantMessage: (moduleId: string, content: string) => void;
  clearChat: (moduleId: string) => void;

  // Learner identity
  learnerId: string | null;
  deviceId: string | null;
  setLearner: (id: string, deviceId: string) => void;

  // Phone-based auth identity (set after /api/auth/phone/verify-otp)
  userName: string | null;
  userPhone: string | null;
  userRole: 'user' | 'admin' | 'founder' | null;
  isAdmin: boolean;
  setUser: (u: {
    learnerId: string;
    phone: string;
    name: string;
    role: 'user' | 'admin' | 'founder';
    isAdmin: boolean;
  }) => void;
  clearUser: () => void;

  // Voice preference
  voiceEnabled: boolean;
  toggleVoice: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedModuleId: 'M01-workshop-safety',
      lang: 'en',
      setModule: (id) => set({ selectedModuleId: id }),
      setLang: (lang) => set({ lang }),

      modules: [],
      setModules: (modules) => set({ modules }),

      progress: {},
      updateProgress: (moduleId, update) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [moduleId]: { ...state.progress[moduleId], ...update, module_id: moduleId } as Progress,
          },
        })),

      quizAttempts: [],
      addQuizAttempt: (attempt) =>
        set((state) => ({ quizAttempts: [...state.quizAttempts, attempt] })),

      earnedBadges: [],
      addBadge: (badge) =>
        set((state) => ({ earnedBadges: [...state.earnedBadges, badge] })),

      chatHistory: {},
      addChatMessage: (moduleId, role, content) =>
        set((state) => {
          const history = state.chatHistory[moduleId] || [];
          return {
            chatHistory: {
              ...state.chatHistory,
              [moduleId]: [...history.slice(-20), { role, content }],
            },
          };
        }),
      appendToLastAssistantMessage: (moduleId, chunk) =>
        set((state) => {
          const history = state.chatHistory[moduleId] || [];
          const last = history[history.length - 1];
          if (last && last.role === 'assistant') {
            const updated: Array<{ role: 'user' | 'assistant'; content: string }> = [
              ...history.slice(0, -1),
              { role: 'assistant', content: last.content + chunk },
            ];
            return {
              chatHistory: {
                ...state.chatHistory,
                [moduleId]: updated,
              },
            };
          }
          const appended: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...history.slice(-20),
            { role: 'assistant', content: chunk },
          ];
          return {
            chatHistory: {
              ...state.chatHistory,
              [moduleId]: appended,
            },
          };
        }),
      replaceLastAssistantMessage: (moduleId, content) =>
        set((state) => {
          const history = state.chatHistory[moduleId] || [];
          const last = history[history.length - 1];
          if (last && last.role === 'assistant') {
            const updated: Array<{ role: 'user' | 'assistant'; content: string }> = [
              ...history.slice(0, -1),
              { role: 'assistant', content },
            ];
            return {
              chatHistory: { ...state.chatHistory, [moduleId]: updated },
            };
          }
          const appended: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...history.slice(-20),
            { role: 'assistant', content },
          ];
          return {
            chatHistory: {
              ...state.chatHistory,
              [moduleId]: appended,
            },
          };
        }),
      clearChat: (moduleId) =>
        set((state) => ({
          chatHistory: { ...state.chatHistory, [moduleId]: [] },
        })),

      learnerId: null,
      deviceId: null,
      setLearner: (id, deviceId) => set({ learnerId: id, deviceId }),

      userName: null,
      userPhone: null,
      userRole: null,
      isAdmin: false,
      setUser: (u) =>
        set({
          learnerId: u.learnerId,
          // Synthesize a deviceId so existing learner-sync checks
          // (`learnerId && deviceId`) keep working without special-casing.
          deviceId: 'phone:' + u.phone,
          userName: u.name,
          userPhone: u.phone,
          userRole: u.role,
          isAdmin: u.isAdmin,
        }),
      clearUser: () =>
        set({
          learnerId: null,
          deviceId: null,
          userName: null,
          userPhone: null,
          userRole: null,
          isAdmin: false,
          chatHistory: {},
          progress: {},
          quizAttempts: [],
          earnedBadges: [],
        }),

      voiceEnabled: false,
      toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
    }),
    {
      name: 'taksha-acharya-store',
      version: 2,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        return {
          ...(persisted as Partial<AppState>),
          modules: [],
        };
      },
      partialize: (state) => ({
        selectedModuleId: state.selectedModuleId,
        lang: state.lang,
        progress: state.progress,
        quizAttempts: state.quizAttempts,
        earnedBadges: state.earnedBadges,
        chatHistory: state.chatHistory,
        learnerId: state.learnerId,
        deviceId: state.deviceId,
        userName: state.userName,
        userPhone: state.userPhone,
        userRole: state.userRole,
        isAdmin: state.isAdmin,
        voiceEnabled: state.voiceEnabled,
        _savedAt: Date.now(),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const saved = (state as unknown as { _savedAt?: number })._savedAt;
        if (saved && Date.now() - saved > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('taksha-acharya-store');
          window.location.reload();
        }
      },
    }
  )
);
