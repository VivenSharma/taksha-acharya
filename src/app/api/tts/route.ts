import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { logTtsCall } from '@/lib/server/ai-logger';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 20;

const TTS_MODEL = 'google-tts-chirp3-hd';

// --- In-memory MP3 cache -------------------------------------------------
// Keyed by hash(lang + cleanText). 1-hour TTL. ~200 entries cap so a long
// session can't balloon the function memory. On Vercel, each warm instance
// keeps its own copy — that's still a big win because the streaming Ask flow
// calls TTS per-sentence and sentences like "ভালো প্রশ্ন!" repeat constantly
// across learners and modules.
const MAX_CACHE_ENTRIES = 200;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedAudio {
  buffer: Buffer;
  expires: number;
}
const audioCache = new Map<string, CachedAudio>();

function hashKey(lang: string, text: string): string {
  let h = 0xdeadbeef;
  const s = lang + '|' + text;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 13;
  }
  return (h >>> 0).toString(36) + ':' + s.length.toString(36);
}

function pruneCache() {
  const now = Date.now();
  // First sweep expired entries.
  for (const [k, v] of audioCache) {
    if (v.expires <= now) audioCache.delete(k);
  }
  // Then drop oldest insertion-order entries if still over cap.
  if (audioCache.size <= MAX_CACHE_ENTRIES) return;
  const overflow = audioCache.size - MAX_CACHE_ENTRIES;
  let i = 0;
  for (const k of audioCache.keys()) {
    if (i++ >= overflow) break;
    audioCache.delete(k);
  }
}

// Remembered "first voice that worked" per language. Avoids re-probing the
// Chirp3-HD → Wavenet → Standard chain on every request once we know which
// voice Google serves for this project.
const preferredVoiceByLang = new Map<string, { languageCode: string; name: string }>();

const voiceChain: Record<string, Array<{ languageCode: string; name: string }>> = {
  bn: [
    { languageCode: 'bn-IN', name: 'bn-IN-Chirp3-HD-Charon' },
    { languageCode: 'bn-IN', name: 'bn-IN-Wavenet-B' },
    { languageCode: 'bn-IN', name: 'bn-IN-Standard-B' },
  ],
  hi: [
    { languageCode: 'hi-IN', name: 'hi-IN-Chirp3-HD-Orus' },
    { languageCode: 'hi-IN', name: 'hi-IN-Wavenet-B' },
    { languageCode: 'hi-IN', name: 'hi-IN-Standard-B' },
  ],
  en: [
    { languageCode: 'en-IN', name: 'en-IN-Chirp3-HD-Orus' },
    { languageCode: 'en-IN', name: 'en-IN-Wavenet-B' },
    { languageCode: 'en-IN', name: 'en-IN-Standard-B' },
  ],
};

export async function POST(req: NextRequest) {
  const { text, lang, learnerId } = await req.json();

  // Higher per-minute cap than chat because the streaming flow fires one TTS
  // call per sentence — a single chat reply can legitimately need 6-8 TTS
  // calls within a few seconds.
  const key = rateLimitKey(req.headers, learnerId, 'tts');
  const rl = rateLimit(key, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.', retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  if (!text || typeof text !== 'string' || text.length > 5000) {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_TTS_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Voice service not configured' }, { status: 500 });
  }

  // Strip markdown, fix dashes for speech, remove emoji
  const cleanText = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\n/g, '. ')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 to $2')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s+—\s+/g, ', ')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/  +/g, ' ')
    .trim()
    .slice(0, 5000);

  if (!cleanText) {
    return NextResponse.json({ error: 'Empty text after cleaning' }, { status: 400 });
  }

  const langKey = String(lang || 'bn');
  const cacheKey = hashKey(langKey, cleanText);

  // Cache hit — return the cached MP3 instantly. Also set browser/edge
  // Cache-Control so repeat playback of the same sentence is ~0 ms.
  const cached = audioCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    logTtsCall({
      model: TTS_MODEL, status: 'ok', durationMs: 0,
      chars: 0, lang: langKey,
    });
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': cached.buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Cache': 'HIT',
      },
    });
  }

  // Try the remembered good voice first, then fall through to the static chain.
  const preferred = preferredVoiceByLang.get(langKey);
  const fallback = voiceChain[langKey] || voiceChain.bn;
  const candidates = preferred
    ? [preferred, ...fallback.filter((v) => v.name !== preferred.name)]
    : fallback;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const started = Date.now();
  const charCount = cleanText.length;

  try {
    let response: Response | null = null;
    let usedVoice = candidates[0].name;
    let lastErrText = '';

    for (const voiceConfig of candidates) {
      const r = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanText },
            voice: voiceConfig,
            audioConfig: { audioEncoding: 'MP3' },
          }),
          signal: controller.signal,
        }
      );
      if (r.ok) {
        response = r;
        usedVoice = voiceConfig.name;
        // Remember this voice for next time — skips the probe chain.
        preferredVoiceByLang.set(langKey, voiceConfig);
        break;
      }
      // Only fall through on voice-not-found errors; fail fast on auth/quota.
      lastErrText = await r.text();
      const voiceMissing = r.status === 400 && /voice|name/i.test(lastErrText);
      const unavailable = r.status === 404;
      if (!voiceMissing && !unavailable) {
        clearTimeout(timeoutId);
        logTtsCall({
          model: TTS_MODEL, status: 'error', durationMs: Date.now() - started,
          chars: charCount, lang: langKey, errorMessage: lastErrText.slice(0, 300),
        });
        console.error('Google TTS error:', r.status, lastErrText);
        return NextResponse.json({ error: 'Voice synthesis failed' }, { status: 502 });
      }
      // The remembered voice itself just failed — forget it so we don't retry
      // it first next time.
      if (preferredVoiceByLang.get(langKey)?.name === voiceConfig.name) {
        preferredVoiceByLang.delete(langKey);
      }
      console.warn(`[tts] ${voiceConfig.name} unavailable, trying next…`);
    }

    if (!response) {
      clearTimeout(timeoutId);
      logTtsCall({
        model: TTS_MODEL, status: 'error', durationMs: Date.now() - started,
        chars: charCount, lang: langKey, errorMessage: 'All voices failed: ' + lastErrText.slice(0, 200),
      });
      return NextResponse.json({ error: 'No voice available for this language' }, { status: 502 });
    }
    console.log(`[tts] ${langKey} → ${usedVoice} (${charCount} chars)`);

    const data = await response.json();
    clearTimeout(timeoutId);
    if (!data.audioContent) {
      logTtsCall({
        model: TTS_MODEL, status: 'error', durationMs: Date.now() - started,
        chars: charCount, lang: langKey, errorMessage: 'No audio returned',
      });
      return NextResponse.json({ error: 'No audio returned' }, { status: 502 });
    }

    logTtsCall({
      model: TTS_MODEL, status: 'ok', durationMs: Date.now() - started,
      chars: charCount, lang: langKey,
    });

    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    // Store in the in-memory cache and prune if needed.
    audioCache.set(cacheKey, { buffer: audioBuffer, expires: Date.now() + CACHE_TTL_MS });
    pruneCache();

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const aborted = err instanceof Error && (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));
    const errorMessage = err instanceof Error ? err.message : String(err);
    logTtsCall({
      model: TTS_MODEL, status: aborted ? 'timeout' : 'error',
      durationMs: Date.now() - started, chars: charCount, lang: langKey, errorMessage,
    });
    console.error('TTS error:', err);
    if (aborted) {
      return NextResponse.json({ error: 'Voice synthesis timed out.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
