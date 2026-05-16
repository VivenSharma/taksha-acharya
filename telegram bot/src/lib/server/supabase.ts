import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { QuizQuestion } from "./acharya-api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = ReturnType<typeof createClient<any, any, any>>;

export type Lang = "bn" | "hi" | "en";
export type TelegramMode = "chat";

export interface TelegramUserRecord {
  id: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_lang: Lang;
  selected_module_id: string | null;
  mode: TelegramMode;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ActiveQuizSession {
  id: string;
  telegram_user_id: number;
  module_id: string;
  questions: QuizQuestion[];
  answers: number[];
  current_index: number;
  score: number;
}

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";
const authOpts = { persistSession: false, autoRefreshToken: false } as const;

export const db: DB = url && anonKey
  ? createClient(url, anonKey, { auth: authOpts })
  : createClient("https://placeholder.supabase.co", "placeholder", { auth: authOpts });

export const dbConfigured = !!url && !!anonKey
  && url !== "placeholder"
  && anonKey !== "placeholder";

export async function getOrCreateTelegramUser(
  user: { id: number; username?: string; first_name?: string; last_name?: string },
  chatId: number,
): Promise<TelegramUserRecord> {
  if (!dbConfigured) {
    return normalizeUser({
      id: "local",
      telegram_user_id: user.id,
      telegram_chat_id: chatId,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      preferred_lang: "en",
      selected_module_id: null,
      mode: "chat",
    });
  }

  const existing = await db
    .from("telegram_users")
    .select("*")
    .eq("telegram_user_id", user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const { data, error } = await db
      .from("telegram_users")
      .update({
        telegram_chat_id: chatId,
        username: user.username || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeUser(data);
  }

  const { data, error } = await db
    .from("telegram_users")
    .insert({
      telegram_user_id: user.id,
      telegram_chat_id: chatId,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      preferred_lang: "en",
      mode: "chat",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeUser(data);
}

export async function setPreferredLang(telegramUserId: number, lang: Lang) {
  if (!dbConfigured) return;
  const { error } = await db
    .from("telegram_users")
    .update({ preferred_lang: lang, updated_at: new Date().toISOString() })
    .eq("telegram_user_id", telegramUserId);
  if (error) throw error;
}

export async function setMode(telegramUserId: number, mode: TelegramMode) {
  if (!dbConfigured) return;
  const { error } = await db
    .from("telegram_users")
    .update({ mode, updated_at: new Date().toISOString() })
    .eq("telegram_user_id", telegramUserId);
  if (error) throw error;
}

export async function setSelectedModule(telegramUserId: number, moduleId: string) {
  if (!dbConfigured) return;
  const { error } = await db
    .from("telegram_users")
    .update({ selected_module_id: moduleId, updated_at: new Date().toISOString() })
    .eq("telegram_user_id", telegramUserId);
  if (error) throw error;
}

export async function appendChatLog(input: {
  telegramUserId: number;
  moduleId: string | null;
  lang: Lang;
  userMessage: string;
  aiResponse: string;
  responseTimeMs: number;
}) {
  if (!dbConfigured) return;
  const { error } = await db.from("telegram_chat_logs").insert({
    telegram_user_id: input.telegramUserId,
    module_id: input.moduleId,
    lang: input.lang,
    user_message: input.userMessage.slice(0, 4000),
    ai_response: input.aiResponse.slice(0, 8000),
    response_time_ms: Math.max(0, Math.min(120000, Math.round(input.responseTimeMs))),
  });
  if (error) throw error;
}

export async function getChatHistory(
  telegramUserId: number,
  moduleId: string | null,
  lang: Lang,
): Promise<ChatHistoryItem[]> {
  if (!dbConfigured) return [];
  let q = db
    .from("telegram_chat_logs")
    .select("user_message, ai_response")
    .eq("telegram_user_id", telegramUserId)
    .eq("lang", lang)
    .order("created_at", { ascending: false })
    .limit(4);
  if (moduleId) q = q.eq("module_id", moduleId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).reverse().flatMap((row: { user_message: string; ai_response: string }) => ([
    { role: "user" as const, content: row.user_message },
    { role: "assistant" as const, content: row.ai_response },
  ]));
}

export async function markSectionComplete(user: TelegramUserRecord, moduleId: string, sectionId: string) {
  if (!dbConfigured || !moduleId || !sectionId) return;

  const { data: existing, error: readError } = await db
    .from("telegram_progress")
    .select("sections_completed")
    .eq("telegram_user_id", user.telegram_user_id)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (readError) throw readError;

  const current = Array.isArray(existing?.sections_completed)
    ? existing.sections_completed.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const sectionsCompleted = Array.from(new Set([...current, sectionId]));

  const { error } = await db.from("telegram_progress").upsert(
    {
      telegram_user_id: user.telegram_user_id,
      module_id: moduleId,
      sections_completed: sectionsCompleted,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id,module_id" },
  );
  if (error) throw error;
}

export async function getProgressSummary(telegramUserId: number) {
  if (!dbConfigured) {
    return {
      completedModules: 0,
      sectionsCompleted: 0,
      quizAttempts: 0,
      averageQuizScore: null as number | null,
      completedModuleIds: [] as string[],
    };
  }

  const [{ data: progress, error: pErr }, { data: quizzes, error: qErr }] = await Promise.all([
    db
      .from("telegram_progress")
      .select("module_id, completed, sections_completed")
      .eq("telegram_user_id", telegramUserId),
    db
      .from("telegram_quiz_attempts")
      .select("module_id, score, total")
      .eq("telegram_user_id", telegramUserId),
  ]);
  if (pErr) throw pErr;
  if (qErr) throw qErr;

  const completedModuleIds = (progress || [])
    .filter((row: { completed?: boolean }) => !!row.completed)
    .map((row: { module_id: string }) => row.module_id);
  const sectionsCompleted = (progress || []).reduce((sum: number, row: { sections_completed?: unknown }) => {
    return sum + (Array.isArray(row.sections_completed) ? row.sections_completed.length : 0);
  }, 0);
  const quizScore = (quizzes || []).reduce((sum: number, row: { score: number }) => sum + (row.score || 0), 0);
  const quizTotal = (quizzes || []).reduce((sum: number, row: { total: number }) => sum + (row.total || 0), 0);

  return {
    completedModules: completedModuleIds.length,
    sectionsCompleted,
    quizAttempts: (quizzes || []).length,
    averageQuizScore: quizTotal > 0 ? Math.round((quizScore / quizTotal) * 100) : null,
    completedModuleIds,
  };
}

export async function startQuizSession(
  telegramUserId: number,
  moduleId: string,
  questions: QuizQuestion[],
) {
  if (!dbConfigured) return;
  const { error: deleteError } = await db
    .from("telegram_quiz_sessions")
    .delete()
    .eq("telegram_user_id", telegramUserId)
    .eq("status", "active");
  if (deleteError) throw deleteError;

  const { error } = await db.from("telegram_quiz_sessions").insert({
    telegram_user_id: telegramUserId,
    module_id: moduleId,
    questions,
    answers: [],
    current_index: 0,
    score: 0,
    status: "active",
  });
  if (error) throw error;
}

export async function getQuizSession(telegramUserId: number): Promise<ActiveQuizSession | null> {
  if (!dbConfigured) return null;
  const { data, error } = await db
    .from("telegram_quiz_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    telegram_user_id: Number(data.telegram_user_id),
    module_id: String(data.module_id),
    questions: normalizeQuestions(data.questions),
    answers: Array.isArray(data.answers) ? data.answers.map(Number) : [],
    current_index: Number(data.current_index || 0),
    score: Number(data.score || 0),
  };
}

export async function updateQuizSession(
  telegramUserId: number,
  patch: { currentIndex: number; score: number; answers: number[] },
) {
  if (!dbConfigured) return;
  const { error } = await db
    .from("telegram_quiz_sessions")
    .update({
      current_index: patch.currentIndex,
      score: patch.score,
      answers: patch.answers,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_user_id", telegramUserId)
    .eq("status", "active");
  if (error) throw error;
}

export async function completeQuizSession(input: {
  telegramUserId: number;
  moduleId: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
  answers: number[];
}) {
  if (!dbConfigured) return;
  const now = new Date().toISOString();
  const [{ error: insertError }, { error: updateError }] = await Promise.all([
    db.from("telegram_quiz_attempts").insert({
      telegram_user_id: input.telegramUserId,
      module_id: input.moduleId,
      score: input.score,
      total: input.total,
      questions: input.questions,
      answers: input.answers,
    }),
    db
      .from("telegram_quiz_sessions")
      .update({ status: "completed", updated_at: now })
      .eq("telegram_user_id", input.telegramUserId)
      .eq("status", "active"),
  ]);
  if (insertError) throw insertError;
  if (updateError) throw updateError;
}

function normalizeUser(row: Record<string, unknown>): TelegramUserRecord {
  const lang = row.preferred_lang === "bn" || row.preferred_lang === "hi" || row.preferred_lang === "en"
    ? row.preferred_lang
    : "en";
  return {
    id: String(row.id),
    telegram_user_id: Number(row.telegram_user_id),
    telegram_chat_id: Number(row.telegram_chat_id),
    username: typeof row.username === "string" ? row.username : null,
    first_name: typeof row.first_name === "string" ? row.first_name : null,
    last_name: typeof row.last_name === "string" ? row.last_name : null,
    preferred_lang: lang,
    selected_module_id: typeof row.selected_module_id === "string" ? row.selected_module_id : null,
    mode: "chat",
  };
}

function normalizeQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const q = item as Partial<QuizQuestion>;
    return {
      q: String(q.q || ""),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
      correct: Number.isInteger(q.correct) ? Number(q.correct) : 0,
      explanation: String(q.explanation || ""),
    };
  }).filter((q) => q.q && q.options.length === 4);
}
