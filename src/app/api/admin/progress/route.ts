import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ rows: [], moduleCount: 0 });

  const url = new URL(req.url);
  const learnerId = url.searchParams.get("learnerId") || "";
  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ rows: [], moduleCount: 0 });

  const { data: modules } = await dbAcharya
    .from("crs_modules")
    .select("id, slug, sort_order, crs_module_tr(lang, title)")
    .eq("is_deleted", false)
    .order("sort_order");
  const moduleMap: Record<string, { slug: string; title: string; sortOrder: number }> = {};
  (modules || []).forEach((m) => {
    const trs = (m.crs_module_tr || []) as Array<{ lang: string; title: string | null }>;
    moduleMap[m.id] = {
      slug: m.slug,
      title: trs.find((t) => t.lang === "en")?.title || m.slug,
      sortOrder: m.sort_order || 0,
    };
  });

  let q = dbGunakul
    .from("log_progress")
    .select("*")
    .eq("acharya_id", acharyaId)
    .order("updated_on", { ascending: false })
    .limit(1000);
  if (learnerId && learnerId.length <= 120) q = q.eq("user_id", learnerId);

  const { data, error } = await q;
  if (error) {
    console.error("admin progress error:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 502 });
  }

  const userIds = Array.from(new Set((data || []).map((r: { user_id?: string | null }) => r.user_id).filter(Boolean)));
  const userMap: Record<string, { name: string | null; phone: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await dbGunakul.from("mst_users").select("id, name, phone").in("id", userIds);
    (users || []).forEach((u: { id: string; name: string | null; phone: string | null }) => { userMap[u.id] = { name: u.name, phone: u.phone }; });
  }

  const rows = (data || []).map((r: Record<string, unknown>) => {
    const userId = String(r.user_id || "");
    const moduleId = String(r.module_id || "");
    const sectionsCompleted = Array.isArray(r.sections_completed) ? r.sections_completed : [];
    return {
      id: String(r.id),
      learnerId: userId,
      learnerName: userMap[userId]?.name || null,
      learnerPhone: userMap[userId]?.phone || null,
      moduleId: moduleMap[moduleId]?.slug || moduleId || null,
      moduleTitle: moduleMap[moduleId]?.title || moduleMap[moduleId]?.slug || moduleId || "Unknown module",
      sectionsCompleted,
      completed: !!r.completed,
      completedAt: r.completed_at as string | null,
      updatedAt: String(r.updated_on || r.created_on || ""),
      sortOrder: moduleMap[moduleId]?.sortOrder || 0,
    };
  });

  return NextResponse.json({ rows, moduleCount: modules?.length || 0 });
}
