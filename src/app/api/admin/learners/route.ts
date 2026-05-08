import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) {
    return NextResponse.json({ learners: [], totalCount: 0, page: 0, pageSize: PAGE_SIZE });
  }

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);

  const { count } = await db
    .from("taksha_learners")
    .select("*", { count: "exact", head: true });

  const { data: rows, error } = await db
    .from("taksha_learners")
    .select("*")
    .order("last_seen", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    console.error("admin learners error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ learners: [], totalCount: count || 0, page, pageSize: PAGE_SIZE });
  }

  const learnerIds = rows.map((r: { id: string }) => r.id);
  const [{ data: progress }, { data: quizzes }] = await Promise.all([
    db.from("taksha_progress").select("learner_id, completed").in("learner_id", learnerIds),
    db.from("taksha_quiz_attempts").select("learner_id, score, total").in("learner_id", learnerIds),
  ]);

  const progressCount: Record<string, number> = {};
  (progress || []).forEach((p: { learner_id: string; completed: boolean }) => {
    if (p.completed) progressCount[p.learner_id] = (progressCount[p.learner_id] || 0) + 1;
  });

  const quizStats: Record<string, { count: number; score: number; total: number }> = {};
  (quizzes || []).forEach((q: { learner_id: string; score: number; total: number }) => {
    if (!quizStats[q.learner_id]) quizStats[q.learner_id] = { count: 0, score: 0, total: 0 };
    quizStats[q.learner_id].count++;
    quizStats[q.learner_id].score += q.score;
    quizStats[q.learner_id].total += q.total;
  });

  const learners = rows.map((r: { id: string; [k: string]: unknown }) => ({
    ...r,
    progressCount: progressCount[r.id] || 0,
    quizCount: quizStats[r.id]?.count || 0,
    avgScore: quizStats[r.id] ? Math.round((quizStats[r.id].score / quizStats[r.id].total) * 100) : 0,
  }));

  return NextResponse.json({ learners, totalCount: count || 0, page, pageSize: PAGE_SIZE });
}
