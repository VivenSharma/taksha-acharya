import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const PAGE_SIZE = 50;

/**
 * GET /api/admin/apply-logs?page=N&learnerId=UUID&moduleId=M01-intro
 * Each row's `data` JSONB carries { input, score, feedback, nextStep, hasPhoto }.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) {
    return NextResponse.json({ rows: [], totalCount: 0, page: 0, pageSize: PAGE_SIZE });
  }

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
  const learnerId = url.searchParams.get("learnerId") || "";
  const moduleId = url.searchParams.get("moduleId") || "";

  let countQ = db.from("taksha_apply_logs").select("*", { count: "exact", head: true });
  let rowsQ = db.from("taksha_apply_logs").select("*").order("created_at", { ascending: false });

  if (learnerId && learnerId.length <= 80) {
    countQ = countQ.eq("learner_id", learnerId);
    rowsQ = rowsQ.eq("learner_id", learnerId);
  }
  if (moduleId && moduleId.length <= 80) {
    countQ = countQ.eq("module_id", moduleId);
    rowsQ = rowsQ.eq("module_id", moduleId);
  }

  const { count } = await countQ;
  const { data: rows, error } = await rowsQ.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    console.error("admin apply-logs error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }

  return NextResponse.json({
    rows: rows || [],
    totalCount: count || 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
