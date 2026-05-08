import { NextRequest, NextResponse } from "next/server";
import { TAKSHA_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getLearnerSession } from "@/lib/server/phone-auth";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

function modeInstruction(mode: string, moduleId: string | null, lang: string) {
  const langLine = lang === "bn"
    ? "Speak Bengali when the learner speaks Bengali, using Bengali script for transcriptions."
    : lang === "hi"
    ? "Speak Hindi when the learner speaks Hindi, using Devanagari for transcriptions."
    : "Speak English when the learner speaks English.";

  const base = [
    langLine,
    moduleId ? `The learner is currently on module ${moduleId}.` : "",
    "This is a real-time voice conversation. Keep each spoken reply short, natural, and practical.",
    "Do not use markdown, bullets, numbered lists, or emoji.",
  ].filter(Boolean).join("\n");

  if (mode === "apply") {
    return `${base}
Apply mode: the learner is reporting field work. Ask at most one short clarifying question if essential. Once you have concrete client/site/action detail, give a concise evaluation aloud: a one-line summary, a score out of 10, one practical feedback point, and one next step.`;
  }
  return `${base}
Ask mode: answer the learner's question as Taksha, the Taksha Workshop carpentry and woodworking trainer.`;
}

export async function POST(req: NextRequest) {
  const session = await getLearnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(rateLimitKey(req.headers, session.learnerId, "gemini-live-token"), 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many voice sessions. Please wait.", retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = body && typeof body === "object" && "mode" in body ? String(body.mode) : "ask";
  const lang = body && typeof body === "object" && "lang" in body ? String(body.lang) : "bn";
  const moduleId = body && typeof body === "object" && typeof (body as { moduleId?: unknown }).moduleId === "string"
    ? String((body as { moduleId: string }).moduleId).slice(0, 120)
    : null;

  if (mode !== "ask" && mode !== "apply") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  if (!["bn", "hi", "en"].includes(lang)) {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini Live is not configured" }, { status: 500 });
  }

  const systemInstruction = `${TAKSHA_SYSTEM_PROMPT}\n\n${modeInstruction(mode, moduleId, lang)}`;
  const now = Date.now();
  const nowUtc = new Date(now).toISOString();
  const expire_time = new Date(now + 30 * 60 * 1000).toISOString();
  const new_session_expire_time = new Date(now + 2 * 60 * 1000).toISOString();
  const tokenRequest = {
    uses: 1,
    expire_time,
    new_session_expire_time,
    bidi_generate_content_setup: {
      model: `models/${LIVE_MODEL}`,
      generation_config: {
        response_modalities: ["AUDIO"],
        temperature: mode === "apply" ? 0.35 : 0.55,
      },
      session_resumption: {},
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      input_audio_transcription: {},
      output_audio_transcription: {},
    },
  };

  try {
    console.log("gemini live token request:", JSON.stringify({
      nowUtc,
      secondsUntilNewSessionExpire: Math.round((Date.parse(new_session_expire_time) - now) / 1000),
      tokenRequest,
    }, null, 2));
    const tokenRes = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(tokenRequest),
    });
    const rawTokenBody = await tokenRes.text();
    let token: { name?: string } = {};
    try {
      token = rawTokenBody ? JSON.parse(rawTokenBody) as { name?: string } : {};
    } catch {
      token = {};
    }
    if (!tokenRes.ok || !token.name) {
      console.error("gemini live token error - FULL RESPONSE:", {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        model: LIVE_MODEL,
        body: rawTokenBody,
        requestBody: tokenRequest,
      });
      return NextResponse.json(
        {
          error: "Could not create Gemini Live token",
          detail: process.env.NODE_ENV === "development" ? rawTokenBody : undefined,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
      websocketUrl:
        `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token.name)}`,
      setup: {
        // The ephemeral token already carries bidi_generate_content_setup.
        // The Live socket still expects a first setup message, but with an
        // empty field mask Google uses the token-bound setup and ignores this.
      },
    });
  } catch (err) {
    console.error("gemini live token error:", err);
    return NextResponse.json({ error: "Could not create Gemini Live token" }, { status: 502 });
  }
}
