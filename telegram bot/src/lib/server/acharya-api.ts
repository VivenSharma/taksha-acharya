import "server-only";
import type { ChatHistoryItem, Lang } from "./supabase";

export interface ModuleRow {
  id: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  sort_order?: number;
}

export interface SectionRow {
  id: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  sort_order?: number;
  content?: { body?: string | null } | null;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

function acharyaBaseUrl(): string {
  const webhookUrl = process.env.WEBHOOK_URL || "";
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      return url.origin;
    } catch {
      // Fall through to local default.
    }
  }
  return "http://localhost:3000";
}

async function readTextResponse(res: Response): Promise<string> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.slice(0, 500) || `HTTP ${res.status}`);
  }
  return text;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await readTextResponse(res);
  return (text ? JSON.parse(text) : {}) as T;
}

export async function fetchModules(lang: Lang): Promise<ModuleRow[]> {
  const url = new URL("/api/content/modules", acharyaBaseUrl());
  url.searchParams.set("lang", lang);
  const json = await readJson<{ modules?: ModuleRow[] }>(await fetch(url, { cache: "no-store" }));
  return Array.isArray(json.modules) ? json.modules : [];
}

export async function fetchSections(moduleId: string, lang: Lang): Promise<SectionRow[]> {
  const url = new URL("/api/content/sections", acharyaBaseUrl());
  url.searchParams.set("moduleId", moduleId);
  url.searchParams.set("lang", lang);
  const json = await readJson<{ sections?: SectionRow[] }>(await fetch(url, { cache: "no-store" }));
  return Array.isArray(json.sections) ? json.sections : [];
}

export async function fetchAcharyaChat(input: {
  message: string;
  history: ChatHistoryItem[];
  moduleId: string | null;
  lang: Lang;
  learnerId: string;
  image?: string | null;
}): Promise<string> {
  const res = await fetch(new URL("/api/chat", acharyaBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      history: input.history,
      moduleId: input.moduleId,
      lang: input.lang,
      learnerId: input.learnerId,
      image: input.image || undefined,
    }),
  });
  return readTextResponse(res);
}

export async function fetchQuiz(input: {
  moduleId: string;
  lang: Lang;
  learnerId: string;
  completedModuleIds: string[];
}): Promise<QuizQuestion[]> {
  const json = await readJson<{ questions?: QuizQuestion[] }>(await fetch(new URL("/api/quiz", acharyaBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleId: input.moduleId,
      lang: input.lang,
      learnerId: input.learnerId,
      completedModuleIds: input.completedModuleIds,
    }),
  }));
  return normalizeQuestions(json.questions);
}

function normalizeQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item) => {
    const q = item as Partial<QuizQuestion>;
    return {
      q: String(q.q || ""),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
      correct: Number.isInteger(q.correct) ? Number(q.correct) : 0,
      explanation: String(q.explanation || ""),
    };
  }).filter((q) => q.q && q.options.length === 4 && q.correct >= 0 && q.correct <= 3);
}
