import { NextRequest, NextResponse } from "next/server";
import {
  answerCallbackQuery,
  getFileAsDataUrl,
  sendMessage,
  type ReplyMarkup,
} from "@/lib/server/telegram";
import {
  appendChatLog,
  completeQuizSession,
  getChatHistory,
  getOrCreateTelegramUser,
  getProgressSummary,
  getQuizSession,
  markSectionComplete,
  setMode,
  setPreferredLang,
  setSelectedModule,
  startQuizSession,
  updateQuizSession,
  type Lang,
  type TelegramUserRecord,
} from "@/lib/server/supabase";
import {
  fetchAcharyaChat,
  fetchModules,
  fetchQuiz,
  fetchSections,
  type ModuleRow,
  type QuizQuestion,
  type SectionRow,
} from "@/lib/server/acharya-api";

export const runtime = "nodejs";
export const preferredRegion = "bom1";
export const maxDuration = 60;

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number }>;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: { message_id?: number; chat: { id: number } };
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
};

export async function POST(req: NextRequest) {
  const update = await req.json().catch(() => null) as TelegramUpdate | null;

  try {
    if (update?.callback_query) await handleCallback(update.callback_query);
    else if (update?.message) await handleMessage(update.message);
  } catch (err) {
    console.error("[telegram] webhook error:", err);
    const chatId = update?.message?.chat.id || update?.callback_query?.message?.chat.id;
    if (chatId) {
      await sendMessage(chatId, "Something went wrong. Please try again.");
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "acharya-telegram-webhook" });
}

async function handleMessage(message: TelegramMessage) {
  const from = message.from;
  if (!from) return;

  const chatId = message.chat.id;
  const user = await getOrCreateTelegramUser(from, chatId);
  const text = (message.text || message.caption || "").trim();
  const command = text.split(/\s+/)[0]?.toLowerCase() || "";

  if (command === "/start") {
    await sendHome(chatId, user);
    return;
  }
  if (command === "/help") {
    await sendHelp(chatId, user);
    return;
  }
  if (command === "/chat" || command === "/ask") {
    await setMode(user.telegram_user_id, "chat");
    await sendMessage(chatId, "Chat mode is on. Send your question.", mainMenu());
    return;
  }
  if (command === "/quiz") {
    await sendModulePicker(chatId, user.preferred_lang, 1);
    return;
  }
  if (command === "/courses") {
    await sendCourses(chatId, user.preferred_lang, 1);
    return;
  }
  if (command === "/progress") {
    await sendProgress(chatId, user);
    return;
  }
  if (command === "/lang") {
    await sendLanguagePicker(chatId);
    return;
  }

  if (isMenuText(text, "Home")) {
    await sendHome(chatId, user);
    return;
  }
  if (isMenuText(text, "Courses")) {
    await sendCourses(chatId, user.preferred_lang, 1);
    return;
  }
  if (isMenuText(text, "Quiz")) {
    await sendModulePicker(chatId, user.preferred_lang, 1);
    return;
  }
  if (isMenuText(text, "Progress")) {
    await sendProgress(chatId, user);
    return;
  }
  if (isMenuText(text, "Help")) {
    await sendHelp(chatId, user);
    return;
  }
  if (isMenuText(text, "Language")) {
    await sendLanguagePicker(chatId);
    return;
  }
  if (isMenuText(text, "Chat")) {
    await setMode(user.telegram_user_id, "chat");
    await sendMessage(chatId, "Chat mode is on. Send your question.", mainMenu());
    return;
  }

  const activeQuiz = await getQuizSession(user.telegram_user_id);
  if (activeQuiz) {
    await sendMessage(chatId, "Finish the current quiz using the answer buttons, or send /quiz to start again.");
    return;
  }

  if (!text && !message.photo?.length) {
    await sendMessage(chatId, "Send a message, or use /courses, /quiz, /progress.", mainMenu());
    return;
  }

  await handleChatMessage(chatId, user, message);
}

async function handleCallback(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  const data = query.data || "";
  if (!chatId) return;

  await answerCallbackQuery(query.id);
  const user = await getOrCreateTelegramUser(query.from, chatId);

  if (data.startsWith("lang:")) {
    const lang = data.slice(5) as Lang;
    if (!isLang(lang)) return;
    await setPreferredLang(user.telegram_user_id, lang);
    await sendMessage(chatId, `Language set to ${LANG_LABEL[lang]}.`, mainMenu());
    return;
  }
  if (data === "chat") {
    await setMode(user.telegram_user_id, "chat");
    await sendMessage(chatId, "Chat mode is on. Send your question.", mainMenu());
    return;
  }
  if (data === "courses") {
    await sendCourses(chatId, user.preferred_lang, 1);
    return;
  }
  if (data === "quiz") {
    await sendModulePicker(chatId, user.preferred_lang, 1);
    return;
  }
  if (data === "progress") {
    await sendProgress(chatId, user);
    return;
  }
  if (data === "help") {
    await sendHelp(chatId, user);
    return;
  }
  if (data === "lang") {
    await sendLanguagePicker(chatId);
    return;
  }
  if (data.startsWith("modpage:")) {
    await sendCourses(chatId, user.preferred_lang, Number(data.slice(8)) || 1);
    return;
  }
  if (data.startsWith("quizpage:")) {
    await sendModulePicker(chatId, user.preferred_lang, Number(data.slice(9)) || 1);
    return;
  }
  if (data.startsWith("mod:")) {
    const moduleId = data.slice(4);
    await setSelectedModule(user.telegram_user_id, moduleId);
    await sendSections(chatId, moduleId, user.preferred_lang);
    return;
  }
  if (data.startsWith("section:")) {
    await sendSection(chatId, user, data.slice(8));
    return;
  }
  if (data.startsWith("done:")) {
    const [, moduleId, sectionId] = data.split(":");
    await markSectionComplete(user, moduleId, sectionId);
    await sendMessage(chatId, "Marked complete.", mainMenu());
    return;
  }
  if (data.startsWith("quizmod:")) {
    await startQuiz(chatId, user, data.slice(8));
    return;
  }
  if (data.startsWith("ans:")) {
    await answerQuiz(chatId, user, Number(data.slice(4)));
  }
}

async function sendHome(chatId: number, user: TelegramUserRecord) {
  const progress = await getProgressSummary(user.telegram_user_id);
  const selected = user.selected_module_id || "none";
  await sendMessage(
    chatId,
    `Acharya on Telegram

Selected module: ${selected}
Modules completed: ${progress.completedModules}
Quiz attempts: ${progress.quizAttempts}

Choose a command below, or send a question.`,
    mainMenu(),
  );
}

function mainMenu(): ReplyMarkup {
  return {
    keyboard: [
      [{ text: "Home" }, { text: "Chat" }],
      [{ text: "Courses" }, { text: "Quiz" }],
      [{ text: "Progress" }, { text: "Language" }],
      [{ text: "Help" }],
    ],
    resize_keyboard: true,
  };
}

async function sendHelp(chatId: number, _user: TelegramUserRecord) {
  await sendMessage(
    chatId,
    [
      "/start - welcome menu",
      "/chat - ask Acharya a question",
      "/quiz - take a quiz",
      "/courses - browse course modules",
      "/progress - see your progress",
      "/lang - change language",
      "/help - list commands",
    ].join("\n"),
    mainMenu(),
  );
}

async function sendLanguagePicker(chatId: number) {
  await sendMessage(chatId, "Choose language.", {
    inline_keyboard: [[
      { text: "English", callback_data: "lang:en" },
      { text: "Hindi", callback_data: "lang:hi" },
      { text: "Bengali", callback_data: "lang:bn" },
    ]],
  });
}

async function sendCourses(chatId: number, lang: Lang, page: number) {
  const modules = await fetchModules(lang);
  if (modules.length === 0) {
    await sendMessage(chatId, "No course modules are available yet.", mainMenu());
    return;
  }
  const { rows, keyboard, totalPages } = paginateModules(modules, page, "mod");
  await sendMessage(chatId, `Choose a course module.\nPage ${rows.page}/${totalPages}`, { inline_keyboard: keyboard });
}

async function sendModulePicker(chatId: number, lang: Lang, page: number) {
  const modules = await fetchModules(lang);
  if (modules.length === 0) {
    await sendMessage(chatId, "No modules are available for quiz yet.", mainMenu());
    return;
  }
  const { rows, keyboard, totalPages } = paginateModules(modules, page, "quizmod");
  await sendMessage(chatId, `Choose a module for quiz.\nPage ${rows.page}/${totalPages}`, { inline_keyboard: keyboard });
}

function paginateModules(modules: ModuleRow[], page: number, action: "mod" | "quizmod") {
  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(modules.length / perPage));
  const cleanPage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (cleanPage - 1) * perPage;
  const sliced = modules.slice(start, start + perPage);
  const keyboard = sliced.map((m) => ([{
    text: `${m.sort_order || ""}. ${title(m)}`.trim(),
    callback_data: `${action}:${m.id}`,
  }]));
  if (cleanPage < totalPages) {
    keyboard.push([{ text: "Next", callback_data: `${action === "mod" ? "modpage" : "quizpage"}:${cleanPage + 1}` }]);
  }
  if (cleanPage > 1) {
    keyboard.push([{ text: "Previous", callback_data: `${action === "mod" ? "modpage" : "quizpage"}:${cleanPage - 1}` }]);
  }
  return { rows: { page: cleanPage, sliced }, keyboard, totalPages };
}

async function sendSections(chatId: number, moduleId: string, lang: Lang) {
  const sections = await fetchSections(moduleId, lang);
  if (sections.length === 0) {
    await sendMessage(chatId, "No sections are available for this module yet.", mainMenu());
    return;
  }
  await sendMessage(chatId, "Choose a section.", {
    inline_keyboard: sections.map((s) => ([{ text: title(s), callback_data: `section:${s.id}` }])),
  });
}

async function sendSection(chatId: number, user: TelegramUserRecord, sectionId: string) {
  const moduleId = user.selected_module_id;
  if (!moduleId) {
    await sendMessage(chatId, "Please choose a course first with /courses.");
    return;
  }
  const sections = await fetchSections(moduleId, user.preferred_lang);
  const section = sections.find((s) => s.id === sectionId);
  if (!section) {
    await sendMessage(chatId, "Section not found.");
    return;
  }
  const body = section.content?.body || "";
  await sendMessage(chatId, `${title(section)}\n\n${body}`, {
    inline_keyboard: [[{ text: "Mark complete", callback_data: `done:${moduleId}:${section.id}` }]],
  });
}

async function handleChatMessage(chatId: number, user: TelegramUserRecord, message: TelegramMessage) {
  const text = (message.text || message.caption || "").trim();
  const photo = message.photo?.slice().sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
  const image = photo ? await getFileAsDataUrl(photo.file_id).catch(() => null) : null;

  await sendMessage(chatId, "Thinking...");
  const started = Date.now();
  const history = await getChatHistory(user.telegram_user_id, user.selected_module_id, user.preferred_lang);
  const reply = await fetchAcharyaChat({
    message: text || "[image submitted]",
    history,
    moduleId: user.selected_module_id,
    lang: user.preferred_lang,
    learnerId: String(user.telegram_user_id),
    image,
  });

  await appendChatLog({
    telegramUserId: user.telegram_user_id,
    moduleId: user.selected_module_id,
    lang: user.preferred_lang,
    userMessage: text || "[image submitted]",
    aiResponse: reply,
    responseTimeMs: Date.now() - started,
  });
  await sendMessage(chatId, reply, mainMenu());
}

async function startQuiz(chatId: number, user: TelegramUserRecord, moduleId: string) {
  await sendMessage(chatId, "Generating quiz...");
  const progress = await getProgressSummary(user.telegram_user_id);
  const questions = await fetchQuiz({
    moduleId,
    lang: user.preferred_lang,
    learnerId: String(user.telegram_user_id),
    completedModuleIds: progress.completedModuleIds,
  });
  if (questions.length === 0) {
    await sendMessage(chatId, "Could not generate a quiz right now. Please try again.");
    return;
  }
  await startQuizSession(user.telegram_user_id, moduleId, questions);
  await sendQuizQuestion(chatId, questions, 0);
}

async function answerQuiz(chatId: number, user: TelegramUserRecord, answer: number) {
  const session = await getQuizSession(user.telegram_user_id);
  if (!session) {
    await sendMessage(chatId, "No active quiz. Send /quiz to start.");
    return;
  }
  const current = session.questions[session.current_index];
  if (!current || answer < 0 || answer > 3) return;

  const correct = answer === current.correct;
  const nextIndex = session.current_index + 1;
  const nextScore = session.score + (correct ? 1 : 0);
  const answers = [...session.answers, answer];
  await sendMessage(chatId, `${correct ? "Correct." : "Not correct."} ${current.explanation}`);

  if (nextIndex >= session.questions.length) {
    await completeQuizSession({
      telegramUserId: user.telegram_user_id,
      moduleId: session.module_id,
      score: nextScore,
      total: session.questions.length,
      questions: session.questions,
      answers,
    });
    await sendMessage(chatId, `Quiz complete. Score: ${nextScore}/${session.questions.length}`, mainMenu());
    return;
  }

  await updateQuizSession(user.telegram_user_id, {
    currentIndex: nextIndex,
    score: nextScore,
    answers,
  });
  await sendQuizQuestion(chatId, session.questions, nextIndex);
}

async function sendQuizQuestion(chatId: number, questions: QuizQuestion[], index: number) {
  const q = questions[index];
  if (!q) return;
  await sendMessage(chatId, `Question ${index + 1}/${questions.length}\n\n${q.q}`, {
    inline_keyboard: q.options.map((option, idx) => ([{ text: option, callback_data: `ans:${idx}` }])),
  });
}

async function sendProgress(chatId: number, user: TelegramUserRecord) {
  const progress = await getProgressSummary(user.telegram_user_id);
  const lines = [
    `Modules completed: ${progress.completedModules}`,
    `Sections completed: ${progress.sectionsCompleted}`,
    `Quiz attempts: ${progress.quizAttempts}`,
    progress.averageQuizScore !== null ? `Average quiz score: ${progress.averageQuizScore}%` : "Average quiz score: none",
  ];
  await sendMessage(chatId, lines.join("\n"), mainMenu());
}

function isMenuText(text: string, expected: string) {
  return text.trim().toLowerCase() === expected.toLowerCase();
}

function isLang(value: string): value is Lang {
  return value === "en" || value === "hi" || value === "bn";
}

function title(item: ModuleRow | SectionRow) {
  return item.title_en || item.title_hi || item.title_bn || item.id;
}
