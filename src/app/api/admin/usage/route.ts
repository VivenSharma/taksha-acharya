import { NextResponse } from "next/server";
import fs from "node:fs";
import { requireAdmin } from "@/lib/server/auth";
import { db, dbConfigured } from "@/lib/server/supabase";
import { AI_LOG_FILE, type AICallLog } from "@/lib/server/ai-logger";

interface Aggregate {
  totalCalls: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalTtsChars: number;
  errors: number;
}

/** Map a Supabase row → AICallLog shape the client already renders. */
function rowToCall(r: Record<string, unknown>): AICallLog {
  return {
    ts: String(r.ts),
    service: r.service as AICallLog["service"],
    model: String(r.model),
    status: r.status as AICallLog["status"],
    durationMs: Number(r.duration_ms ?? 0),
    inputTokens: r.input_tokens == null ? undefined : Number(r.input_tokens),
    outputTokens: r.output_tokens == null ? undefined : Number(r.output_tokens),
    cachedInputTokens: r.cached_input_tokens == null ? undefined : Number(r.cached_input_tokens),
    chars: r.chars == null ? undefined : Number(r.chars),
    lang: (r.lang as string) || undefined,
    moduleId: (r.module_id as string) || undefined,
    hasImage: !!r.has_image,
    costUsd: Number(r.cost_usd ?? 0),
    errorMessage: (r.error_message as string) || undefined,
  };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const calls: AICallLog[] = [];
  let source: "supabase" | "file" | "none" = "none";

  // ---------- Primary source: Supabase ----------
  if (dbConfigured) {
    const { data, error } = await db
      .from("taksha_ai_usage")
      .select("*")
      .order("ts", { ascending: false })
      .limit(5000);
    if (!error && data) {
      for (const r of data) calls.push(rowToCall(r as Record<string, unknown>));
      source = "supabase";
    } else if (error) {
      console.error("usage supabase error:", error.message);
    }
  }

  // ---------- Fallback: file (dev) ----------
  if (calls.length === 0) {
    try {
      const raw = fs.readFileSync(AI_LOG_FILE, "utf8");
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      for (const l of lines) {
        try {
          const obj = JSON.parse(l);
          if (obj && typeof obj === "object" && "service" in obj) {
            calls.push(obj as AICallLog);
          }
        } catch { /* skip */ }
      }
      if (calls.length > 0) source = "file";
    } catch { /* no file */ }
  }

  if (calls.length === 0) {
    return NextResponse.json({
      available: false,
      source,
      message:
        "No AI usage yet. After the first /api/chat, /api/quiz or /api/tts call, this page will populate. " +
        "On Vercel prod, apply migration 003_ai_usage.sql; in dev, logs/ai/calls.jsonl is also written.",
      calls: [],
      summary: emptyAgg(),
      byService: {},
      byModel: {},
      byDay: {},
      byLang: {},
      totalCount: 0,
    });
  }

  // ---------- Aggregate ----------
  const summary = emptyAgg();
  const byService: Record<string, Aggregate> = {};
  const byModel: Record<string, Aggregate> = {};
  const byDay: Record<string, Aggregate> = {};
  const byLang: Record<string, Aggregate> = {};

  function bump(target: Aggregate, c: AICallLog) {
    target.totalCalls += 1;
    target.totalCostUsd += c.costUsd || 0;
    target.totalInputTokens += c.inputTokens || 0;
    target.totalOutputTokens += c.outputTokens || 0;
    target.totalCachedInputTokens += c.cachedInputTokens || 0;
    target.totalTtsChars += c.chars || 0;
    if (c.status !== "ok") target.errors += 1;
  }

  for (const c of calls) {
    bump(summary, c);
    byService[c.service] = byService[c.service] || emptyAgg();
    bump(byService[c.service], c);
    byModel[c.model] = byModel[c.model] || emptyAgg();
    bump(byModel[c.model], c);
    const day = (c.ts || "").slice(0, 10);
    if (day) {
      byDay[day] = byDay[day] || emptyAgg();
      bump(byDay[day], c);
    }
    const lang = c.lang || "unknown";
    byLang[lang] = byLang[lang] || emptyAgg();
    bump(byLang[lang], c);
  }

  // Supabase already returned newest-first; file source needs reverse.
  const recent = source === "supabase" ? calls.slice(0, 200) : calls.slice(-200).reverse();

  return NextResponse.json({
    available: true,
    source,
    summary,
    byService,
    byModel,
    byDay,
    byLang,
    recent,
    totalCount: calls.length,
  });
}

function emptyAgg(): Aggregate {
  return {
    totalCalls: 0,
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCachedInputTokens: 0,
    totalTtsChars: 0,
    errors: 0,
  };
}
