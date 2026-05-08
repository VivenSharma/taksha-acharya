import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { logQuizCall } from '@/lib/server/ai-logger';
import { memoCache } from '@/lib/server/cache';
import { GEMINI_QUIZ_MODEL, generateGeminiJson, geminiConfigured } from '@/lib/server/gemini';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

const MODEL = 'claude-haiku-4-5-20251001';

// Tighter descriptions push the model toward shorter output, which is the
// single biggest driver of latency here (Haiku ≈ 100 tok/s).
const QuizSchema = z.object({
  questions: z.array(
    z.object({
      q: z.string().describe('Question text, under 20 words'),
      options: z.array(z.string()).describe('Exactly 4 short options, each under 12 words'),
      correct: z.number().describe('Zero-based index of correct option (0-3)'),
      explanation: z.string().describe('One short sentence, under 25 words'),
    })
  ).describe('Exactly 5 questions'),
});

type QuizPayload = z.infer<typeof QuizSchema>;

const GeminiQuizJsonSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Question text, under 20 words' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string', description: 'Short option, under 12 words' },
          },
          correct: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string', description: 'One short sentence, under 25 words' },
        },
        required: ['q', 'options', 'correct', 'explanation'],
      },
    },
  },
  required: ['questions'],
} as const;

export async function POST(req: NextRequest) {
  const { moduleId, lang, completedModuleIds, learnerId } = await req.json();

  const key = rateLimitKey(req.headers, learnerId, 'quiz');
  const rl = rateLimit(key);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.', retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  if (!moduleId || typeof moduleId !== 'string' || moduleId.length > 50) {
    return NextResponse.json({ error: 'Invalid moduleId' }, { status: 400 });
  }

  // Validate the optional completed-modules context — cheap defence against
  // a client shipping a multi-MB array.
  let completedIds: string[] = [];
  if (Array.isArray(completedModuleIds)) {
    completedIds = completedModuleIds
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 80)
      .slice(0, 40);
  }

  if (!process.env.ANTHROPIC_API_KEY && !geminiConfigured()) {
    return NextResponse.json({ error: 'Quiz service not configured' }, { status: 500 });
  }

  const langInstruction: Record<string, string> = {
    bn: `Generate all questions, options, and explanations in Bengali (বাংলা লিপি). Use simple Bengali a low-literacy farmer can understand.

SCRIPT RULE (strict): EVERY word must be in Bengali script. Any English loan word — brand names, product terms, technical vocabulary — MUST be transliterated into Bengali script, NOT left in Latin letters. Examples: "TMIL" → টিএমআইএল · "Balcony" → বালকনি · "project" → প্রজেক্ট · "client" → ক্লায়েন্ট · "maintenance" → মেইনটেনেন্স. Do NOT mix Latin letters into Bengali text. Exceptions: URLs and scientific Latin names only.`,
    hi: `Generate all questions, options, and explanations in Hindi (हिन्दी). Use simple Hindi.

SCRIPT RULE (strict): EVERY word must be in Devanagari script. Any English loan word — brand names, product terms, technical vocabulary — MUST be transliterated into Devanagari, NOT left in Latin letters. Examples: "TMIL" → टीएमआईएल · "Balcony" → बालकनी · "project" → प्रोजेक्ट · "client" → क्लायंट · "maintenance" → मेंटेनेंस. Do NOT mix Latin letters into Hindi text. Exceptions: URLs and scientific Latin names only.`,
    en: 'Generate all questions, options, and explanations in simple English.',
  };

  const completedBlock = completedIds.length > 0
    ? `

The learner has already completed these modules: ${completedIds.join(', ')}.
- Prefer questions that cross-reference ${moduleId} with 1-2 of the completed modules above where it's naturally relevant (e.g. tie irrigation practice to soil/nutrient knowledge the learner already has).
- Do NOT quiz on modules the learner hasn't completed.
- Keep 3 of the 5 questions squarely on ${moduleId} itself; the remaining 1-2 can be cross-module where it adds value.`
    : '';

  const prompt = `Generate exactly 5 multiple-choice questions for Vocational Carpentry Trainee training (QP AGR/Q0405), module: ${moduleId}

Each question must test practical knowledge a carpentry trainee needs in the field.

${langInstruction[lang] || langInstruction.bn}${completedBlock}

Module topic mapping:
- M01-intro: Horticulture sector overview, carpentry trainee responsibilities
- M02-fundamentals: Vegetable classification, agro-climatic zones, plant anatomy
- M03-land-prep: Site selection, soil types, water sources, topography
- M04-planting-material: Seeds, seedlings, seed treatment, grafting, storage
- M05-prep-for-planting: Farm layout, primary/secondary cultivation, seedbed preparation
- M06-planting: Planting methods, spacing, depth, transplanting, aftercare
- M07-soil-nutrients: NPK, micro-nutrients, Soil Health Card, FYM, vermicompost, chemical fertilizers, INM
- M08-weed-control: Weed types, control methods, solarization, critical period 20-45 days
- M09-pest-disease: Pests (cutworm, aphid, nematode), diseases (leaf spot, late blight, bacterial wilt), IPM hierarchy, bio-pesticides, safety
- M10-irrigation: Drip (90-95%), sprinkler (70-80%), flood, scheduling, fertigation, water conservation
- M11-entrepreneurship: B:C ratio, marketing channels, government schemes, record keeping
- M12-hygiene: Personal hygiene, sanitization, workplace cleanliness
- M13-safety: PPE, chemical safety, first aid, waste disposal, emergency procedures
- M14-employability: English, digital skills, communication, entrepreneurship
- M15 to M18: Cole crops (cauliflower, cabbage) - 15-25C, pH 5.5-7.0, damping off, black leg
- M19 to M22: Leafy vegetables (spinach, coriander) - deep ploughing, seed treatment, broadcasting
- M23 to M26: Underground crops (potato, onion) - curing, sprout control, harvest when leaves half dry
- M27 to M30: Cucurbit crops (cucumber, gourd) - warm 25-35C, pit method, direct sow, trellis
- M31 to M34: Legume crops (peas, beans) - 3 planting methods, Rhizobium, manure 1 week before
- M35 to M38: Okra - deep ploughing + planking, raised beds, harvest 5-8cm every 2-3 days, YVMV`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const started = Date.now();

  async function runGeneration() {
    if (!process.env.ANTHROPIC_API_KEY) {
      const object = await generateGeminiJson<QuizPayload>({
        model: GEMINI_QUIZ_MODEL,
        prompt,
        schema: GeminiQuizJsonSchema,
        maxOutputTokens: 2500,
        temperature: 0.35,
        abortSignal: controller.signal,
      });
      const parsed = QuizSchema.parse(object);
      logQuizCall({
        model: GEMINI_QUIZ_MODEL,
        status: 'ok',
        durationMs: Date.now() - started,
        lang,
        moduleId,
      });
      return parsed.questions;
    }

    const result = await generateObject({
      model: anthropic(MODEL),
      schema: QuizSchema,
      prompt,
      // Was 4000 — 5 questions with tightened schema need ~900 tokens.
      // Cap tighter so Haiku stops earlier and the stream drains sooner.
      maxOutputTokens: 1500,
      providerOptions: {
        anthropic: { structuredOutputMode: 'jsonTool' },
      },
      abortSignal: controller.signal,
    });

    const u = result.usage as unknown as {
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
    } | undefined;
    logQuizCall({
      model: MODEL,
      status: 'ok',
      durationMs: Date.now() - started,
      usage: {
        inputTokens: u?.inputTokens,
        outputTokens: u?.outputTokens,
        cachedInputTokens: u?.cachedInputTokens,
      },
      lang,
      moduleId,
    });

    return result.object.questions;
  }

  // Cache only the non-personalised quizzes (no completedModuleIds). When a
  // learner has completed related modules, we want a fresh cross-referenced
  // quiz each time. For the common first-time case, a 15-min cache means the
  // second through Nth learners for a given module+lang get the same quiz
  // in ~5ms instead of waiting 10 s for Haiku.
  const cacheable = completedIds.length === 0;
  const cacheKey = `quiz:${moduleId}:${lang}`;

  try {
    const questions = cacheable
      ? await memoCache(cacheKey, 15 * 60, runGeneration)
      : await runGeneration();

    clearTimeout(timeoutId);

    return NextResponse.json({ questions });
  } catch (err) {
    clearTimeout(timeoutId);
    const aborted = err instanceof Error && (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));
    const errorMessage = err instanceof Error ? err.message : String(err);
    logQuizCall({
      model: process.env.ANTHROPIC_API_KEY ? MODEL : GEMINI_QUIZ_MODEL,
      status: aborted ? 'timeout' : 'error',
      durationMs: Date.now() - started,
      lang,
      moduleId,
      errorMessage,
    });
    console.error('Quiz error:', err);
    if (aborted) {
      return NextResponse.json({ error: 'Quiz generation timed out.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Quiz generation failed' }, { status: 502 });
  }
}
