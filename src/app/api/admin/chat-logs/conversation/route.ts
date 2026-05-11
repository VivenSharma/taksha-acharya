import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ messages: [] });

  const url = new URL(req.url);
  const learnerId = url.searchParams.get("learnerId") || "";
  const moduleSlug = url.searchParams.get("moduleId") || "";
  const lang = url.searchParams.get("lang") || "";
  if (!learnerId || learnerId.length > 120) return NextResponse.json({ error: "Invalid learnerId" }, { status: 400 });

  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ messages: [] });

  let q = dbGunakul
    .from("log_chat")
    .select("*")
    .eq("acharya_id", acharyaId)
    .eq("user_id", learnerId)
    .order("created_on", { ascending: true })
    .limit(500);

  if (moduleSlug && moduleSlug.length <= 120) {
    const { data: mod } = await dbAcharya.from("crs_modules").select("id").eq("slug", moduleSlug).maybeSingle();
    q = q.eq("module_id", mod?.id || moduleSlug);
  }
  if (lang && ["bn", "hi", "en"].includes(lang)) q = q.eq("lang", lang);

  const { data, error } = await q;
  if (error) {
    console.error("admin chat conversation error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }

  const messages = (data || []).map((m: Record<string, unknown>) => ({
    id: String(m.id),
    learner_id: m.user_id as string | null,
    module_id: m.module_id as string | null,
    lang: m.lang as string | null,
    user_message: m.user_message as string | null,
    ai_response: m.ai_response as string | null,
    response_time_ms: m.response_time_ms as number | null,
    created_at: String(m.created_on || m.created_at || ""),
  }));

  return NextResponse.json({ messages });
}
