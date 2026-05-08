import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { ModelMessage } from 'ai';
import { TAKSHA_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { logChatCall } from '@/lib/server/ai-logger';

// Keep Node runtime (Anthropic SDK + ai-logger rely on node APIs) but pin the
// deployment region to Mumbai so round-trip to Indian learners is ~20 ms
// instead of ~300 ms via the default US region.
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
// Vercel serverless default is 10 s; streaming replies can take longer.
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // ~4MB base64 cap
const MODEL = 'claude-4-sonnet-20250514';

export async function POST(req: NextRequest) {
  const { message, history, moduleId, lang, image, learnerId } = await req.json();

  // Rate limit per learner when we know who they are (so one device can't
  // starve 50 users on the same Wi-Fi). Fall back to IP otherwise.
  const key = rateLimitKey(req.headers, learnerId, 'chat');
  const rl = rateLimit(key);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.', retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  if (!message || typeof message !== 'string' || message.length > 4000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  if (image !== undefined && image !== null) {
    if (typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max ~3MB)' }, { status: 413 });
    }
    if (!image.startsWith('data:image/') && !/^https?:\/\//.test(image)) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Chat service not configured' }, { status: 500 });
  }

  const langMap: Record<string, string> = {
    bn: 'Bengali (বাংলা লিপি)',
    hi: 'Hindi (हिन्दी)',
    en: 'English',
  };
  const langName = langMap[lang] || 'Bengali (বাংলা লিপি)';

  // Strict script rule: every word must be rendered in the target script.
  // Loan words (brand names, English technical terms) are transliterated —
  // NEVER left in Latin letters. Without this Claude leaves words like
  // English technical words untransliterated inside Bengali/
  // Hindi replies, which looks jarring and hurts comprehension.
  const scriptRule = lang === 'bn'
    ? `\n\nSCRIPT RULE (strict): Write the ENTIRE response in Bengali script (বাংলা লিপি). Any English loan word — brand names, product terms, anything without a native Bengali word — MUST be transliterated into Bengali script, NOT left in Latin letters. Examples: "TMIL" → টিএমআইএল · "Balcony" → বালকনি · "project" → প্রজেক্ট · "daily practice" → ডেইলি সেলস · "client" → ক্লায়েন্ট · "maintenance" → মেইনটেনেন্স · "quote" → কোট. Do NOT mix Latin letters into Bengali sentences. The only exceptions are URLs, email addresses, and scientific Latin names.`
    : lang === 'hi'
    ? `\n\nSCRIPT RULE (strict): Write the ENTIRE response in Devanagari script (हिन्दी). Any English loan word — brand names, product terms, anything without a native Hindi word — MUST be transliterated into Devanagari, NOT left in Latin letters. Examples: "TMIL" → टीएमआईएल · "Balcony" → बालकनी · "project" → प्रोजेक्ट · "daily practice" → डेली सेल्स · "client" → क्लायंट · "maintenance" → मेंटेनेंस · "quote" → कोट. Do NOT mix Latin letters into Hindi sentences. The only exceptions are URLs, email addresses, and scientific Latin names.`
    : '';

  const systemSuffix = moduleId
    ? `\n\nThe user is currently studying module: ${moduleId}. Tailor your answers to this topic when relevant. Respond in ${langName}.${scriptRule}`
    : `\n\nRespond in ${langName}.${scriptRule}`;

  const messages: ModelMessage[] = [];
  if (history && Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      if (
        h &&
        (h.role === 'user' || h.role === 'assistant') &&
        typeof h.content === 'string' &&
        h.content.length <= 4000
      ) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  if (image) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: message },
        { type: 'image', image },
      ],
    });
  } else {
    messages.push({ role: 'user', content: message });
  }

  const started = Date.now();
  const abortSignal = AbortSignal.timeout(25000);

  const result = streamText({
    model: anthropic(MODEL),
    system: [
      {
        role: 'system',
        content: TAKSHA_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      {
        role: 'system',
        content: systemSuffix,
      },
    ],
    messages,
    maxOutputTokens: 900,
    abortSignal,
    onFinish({ usage, providerMetadata }) {
      const u = usage as unknown as {
        inputTokens?: number;
        outputTokens?: number;
        cachedInputTokens?: number;
      } | undefined;
      const anthropicMeta = (providerMetadata as Record<string, unknown> | undefined)?.anthropic as
        | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
        | undefined;
      const cachedInputTokens =
        u?.cachedInputTokens ?? anthropicMeta?.cacheReadInputTokens ?? 0;

      logChatCall({
        model: MODEL,
        status: 'ok',
        durationMs: Date.now() - started,
        usage: {
          inputTokens: u?.inputTokens,
          outputTokens: u?.outputTokens,
          cachedInputTokens,
        },
        lang,
        moduleId,
        hasImage: !!image,
      });
    },
    onError({ error }) {
      const aborted = error instanceof Error && (error.name === 'AbortError' || /aborted|timeout/i.test(error.message));
      const errorMessage = error instanceof Error ? error.message : String(error);
      logChatCall({
        model: MODEL,
        status: aborted ? 'timeout' : 'error',
        durationMs: Date.now() - started,
        lang,
        moduleId,
        hasImage: !!image,
        errorMessage,
      });
      console.error('Chat stream error:', error);
    },
  });

  // Plain text/event-stream — the client reads chunks with getReader().
  return result.toTextStreamResponse();
}
