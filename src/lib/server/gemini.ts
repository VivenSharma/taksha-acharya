import "server-only";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
export const GEMINI_QUIZ_MODEL = process.env.GEMINI_QUIZ_MODEL || GEMINI_TEXT_MODEL;

function geminiKey() {
  return process.env.GEMINI_API_KEY || "";
}

export function geminiConfigured() {
  return !!geminiKey();
}

function geminiUrl(model: string, method: "generateContent" | "streamGenerateContent", sse = false) {
  const qs = new URLSearchParams({ key: geminiKey() });
  if (sse) qs.set("alt", "sse");
  return `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:${method}?${qs}`;
}

export function toGeminiContents(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string,
  image?: string | null,
): GeminiContent[] {
  const contents: GeminiContent[] = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  const parts: GeminiPart[] = [{ text: message }];
  if (image?.startsWith("data:image/")) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  } else if (image) {
    parts[0] = {
      text: `${message}\n\nThe learner attached an image URL, but this Gemini fallback only accepts inline uploaded image data. Ask for a short description if visual detail is required.`,
    };
  }
  contents.push({ role: "user", parts });
  return contents;
}

export async function streamGeminiText(opts: {
  model?: string;
  system: string;
  contents: GeminiContent[];
  maxOutputTokens?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
}): Promise<Response> {
  const res = await fetch(geminiUrl(opts.model || GEMINI_TEXT_MODEL, "streamGenerateContent", true), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.contents,
      generationConfig: {
        maxOutputTokens: opts.maxOutputTokens ?? 900,
        temperature: opts.temperature ?? 0.55,
      },
    }),
    signal: opts.abortSignal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini stream failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let pending = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const json = JSON.parse(raw) as GeminiResponse;
              const text = json.candidates?.[0]?.content?.parts
                ?.map((p) => p.text || "")
                .join("");
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // Ignore malformed SSE fragments; the next chunk may contain the usable delta.
            }
          }
        }
        const tail = decoder.decode();
        if (tail) pending += tail;
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function generateGeminiJson<T>(opts: {
  model?: string;
  system?: string;
  prompt: string;
  schema: unknown;
  maxOutputTokens?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const maxOutputTokens = opts.maxOutputTokens ?? 2500;
  const prompt = `${opts.prompt}

Return only valid JSON. Do not include markdown fences, prose, comments, or trailing text.`;
  const res = await fetch(geminiUrl(opts.model || GEMINI_QUIZ_MODEL, "generateContent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
        maxOutputTokens,
        temperature: opts.temperature ?? 0.35,
      },
    }),
    signal: opts.abortSignal,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini JSON failed (${res.status}): ${raw.slice(0, 500)}`);
  }
  const json = raw ? (JSON.parse(raw) as GeminiResponse) : {};
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error(json.error?.message || "Gemini returned empty JSON");
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(
        `Gemini returned malformed JSON: ${
          err instanceof Error ? err.message : String(err)
        }. Body starts: ${text.slice(0, 300)}`,
      );
    }
  }
}
