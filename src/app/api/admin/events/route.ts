import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const PAGE_SIZE = 100;

/**
 * GET /api/admin/events?page=N&learnerId=UUID&eventType=quiz_complete
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) {
    return NextResponse.json({ rows: [], totalCount: 0, page: 0, pageSize: PAGE_SIZE, distinctTypes: [] });
  }

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
  const learnerId = url.searchParams.get("learnerId") || "";
  const eventType = url.searchParams.get("eventType") || "";

  let countQ = db.from("taksha_events").select("*", { count: "exact", head: true });
  let rowsQ = db.from("taksha_events").select("*").order("created_at", { ascending: false });

  if (learnerId && learnerId.length <= 80) {
    countQ = countQ.eq("learner_id", learnerId);
    rowsQ = rowsQ.eq("learner_id", learnerId);
  }
  if (eventType && eventType.length <= 60) {
    countQ = countQ.eq("event_type", eventType);
    rowsQ = rowsQ.eq("event_type", eventType);
  }

  const { count } = await countQ;
  const { data: rows, error } = await rowsQ.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    console.error("admin events error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }

  // Cheap distinct-types fetch for the filter dropdown — capped to 500 rows.
  const { data: typeRows } = await db
    .from("taksha_events")
    .select("event_type")
    .order("created_at", { ascending: false })
    .limit(500);
  const distinctTypes = Array.from(
    new Set((typeRows || []).map((r: { event_type: string }) => r.event_type))
  ).sort();

  return NextResponse.json({
    rows: rows || [],
    totalCount: count || 0,
    page,
    pageSize: PAGE_SIZE,
    distinctTypes,
  });
}
