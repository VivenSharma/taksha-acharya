import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const PAGE_SIZE = 50;

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

  let countQ = dbGunakul.from("log_quiz").select("id", { count: "exact", head: true }).eq("acharya_id", acharyaId);
  let q = dbGunakul
    .from("log_quiz")
    .select("*")
    .eq("acharya_id", acharyaId)
    .order("created_on", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (learnerId && learnerId.length <= 120) {
    countQ = countQ.eq("user_id", learnerId);
    q = q.eq("user_id", learnerId);
  }
  if (moduleUuid && moduleUuid.length <= 120) {
    countQ = countQ.eq("module_id", moduleUuid);
    q = q.eq("module_id", moduleUuid);
  }

  const [{ count }, { data, error }] = await Promise.all([countQ, q]);
  if (error) {
    console.error("admin quiz results error:", error);
    return NextResponse.json({ error: "Failed to load quiz results" }, { status: 502 });
  }

  const userIds = Array.from(new Set((data || []).map((r: { user_id?: string | null }) => r.user_id).filter(Boolean)));
  const moduleIds = Array.from(new Set((data || []).map((r: { module_id?: string | null }) => r.module_id).filter(Boolean)));
  const userMap: Record<string, { name: string | null; phone: string | null }> = {};
  const moduleMap: Record<string, string> = {};
  await Promise.all([
    userIds.length
      ? dbGunakul.from("mst_users").select("id, name, phone").in("id", userIds).then(({ data }) => {
          (data || []).forEach((u: { id: string; name: string | null; phone: string | null }) => { userMap[u.id] = { name: u.name, phone: u.phone }; });
        })
      : Promise.resolve(),
    moduleIds.length
      ? dbAcharya.from("crs_modules").select("id, slug").in("id", moduleIds).then(({ data }) => {
          (data || []).forEach((m: { id: string; slug: string }) => { moduleMap[m.id] = m.slug; });
        })
      : Promise.resolve(),
  ]);

  const rows = (data || []).map((r: Record<string, unknown>) => {
    const userId = String(r.user_id || "");
    const moduleId = String(r.module_id || "");
    const score = Number(r.score || 0);
    const total = Number(r.total || 0);
    return {
      id: String(r.id),
      learnerId: userId,
      learnerName: userMap[userId]?.name || null,
      learnerPhone: userMap[userId]?.phone || null,
      moduleId: moduleMap[moduleId] || moduleId || null,
      score,
      total,
      percent: total ? Math.round((score / total) * 100) : 0,
      questions: r.questions || [],
      createdAt: String(r.created_on || r.created_at || ""),
    };
  });

  return NextResponse.json({ rows, totalCount: count || 0, page, pageSize: PAGE_SIZE });
}
