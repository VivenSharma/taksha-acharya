import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const PAGE_SIZE = 50;
const FETCH_CAP = 5000;

interface Conversation {
  key: string;
  learnerId: string | null;
  moduleId: string | null;
  lang: string | null;
  messageCount: number;
  firstAt: string;
  lastAt: string;
  latestUserMessage: string | null;
  latestAiResponse: string | null;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ rows: [], totalCount: 0, page: 0, pageSize: PAGE_SIZE });

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
  const learnerId = url.searchParams.get("learnerId") || "";
  const moduleSlug = url.searchParams.get("moduleId") || "";
  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ rows: [], totalCount: 0, page, pageSize: PAGE_SIZE });

  let moduleUuid = "";
  if (moduleSlug) {
    const { data: mod } = await dbAcharya.from("crs_modules").select("id").eq("slug", moduleSlug).maybeSingle();
    moduleUuid = mod?.id || moduleSlug;
  }

  let q = dbGunakul
    .from("log_chat")
    .select("*")
    .eq("acharya_id", acharyaId)
    .order("created_on", { ascending: false })
    .limit(FETCH_CAP);
  if (learnerId && learnerId.length <= 120) q = q.eq("user_id", learnerId);
  if (moduleUuid && moduleUuid.length <= 120) q = q.eq("module_id", moduleUuid);

  const { data, error } = await q;
  if (error) {
    console.error("admin chat logs error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }

  const moduleIds = Array.from(new Set((data || []).map((r: { module_id?: string | null }) => r.module_id).filter(Boolean)));
  const moduleMap: Record<string, string> = {};
  if (moduleIds.length > 0) {
    const { data: mods } = await dbAcharya.from("crs_modules").select("id, slug").in("id", moduleIds);
    (mods || []).forEach((m: { id: string; slug: string }) => { moduleMap[m.id] = m.slug; });
  }

  const map = new Map<string, Conversation>();
  for (const r of (data || []) as Array<{
    user_id: string | null;
    module_id: string | null;
    lang: string | null;
    user_message: string | null;
    ai_response: string | null;
    created_on?: string | null;
    created_at?: string | null;
  }>) {
    const at = r.created_on || r.created_at || "";
    const slug = r.module_id ? moduleMap[r.module_id] || r.module_id : null;
    const key = `${r.user_id ?? "anon"}|${slug ?? "-"}|${r.lang ?? "-"}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        learnerId: r.user_id,
        moduleId: slug,
        lang: r.lang,
        messageCount: 1,
        firstAt: at,
        lastAt: at,
        latestUserMessage: r.user_message,
        latestAiResponse: r.ai_response,
      });
    } else {
      existing.messageCount++;
      if (at > existing.lastAt) {
        existing.lastAt = at;
        existing.latestUserMessage = r.user_message;
        existing.latestAiResponse = r.ai_response;
      }
      if (at < existing.firstAt) existing.firstAt = at;
    }
  }

  const all = Array.from(map.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  return NextResponse.json({
    rows: all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    totalCount: all.length,
    page,
    pageSize: PAGE_SIZE,
  });
}
