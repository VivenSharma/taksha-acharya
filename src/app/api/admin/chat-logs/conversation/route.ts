import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

/**
 * GET /api/admin/chat-logs/conversation?learnerId=UUID&moduleId=M01&lang=bn
 * Returns every message in a single conversation, oldest first.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ messages: [] });

  const url = new URL(req.url);
  const learnerId = url.searchParams.get("learnerId") || "";
  const moduleId = url.searchParams.get("moduleId") || "";
  const lang = url.searchParams.get("lang") || "";

  if (!learnerId || learnerId.length > 80) {
    return NextResponse.json({ error: "Invalid learnerId" }, { status: 400 });
  }

  let q = db
    .from("taksha_chat_logs")
    .select("*")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (moduleId && moduleId.length <= 80) q = q.eq("module_id", moduleId);
  if (lang && ["bn", "hi", "en"].includes(lang)) q = q.eq("lang", lang);

  const { data, error } = await q;
  if (error) {
    console.error("admin chat-log conversation error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }

  return NextResponse.json({ messages: data || [] });
}
