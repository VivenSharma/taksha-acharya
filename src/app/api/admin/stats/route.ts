import { NextResponse } from "next/server";
import { dbAcharya, dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";
import { memoCache } from "@/lib/server/cache";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) {
    return NextResponse.json({
      modules: 0, sections: 0, contentRows: 0, videos: 0, learners: 0, quizAttempts: 0,
    });
  }

  // Counts don't need to be fresh to the second. A 30s server-side cache
  // collapses this 6-query page-load into a sub-5ms hit for any repeat view.
  const stats = await memoCache("admin:stats", 30, async () => {
    const acharyaId = await getAcharyaId();
    const [modules, sections, content, videos, learners, quizzes] = await Promise.all([
      dbAcharya.from("crs_modules").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      dbAcharya.from("crs_sections").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      dbAcharya.from("crs_section_tr").select("id", { count: "exact", head: true }),
      dbAcharya.from("crs_videos").select("id", { count: "exact", head: true }),
      dbGunakul.from("mst_users").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      acharyaId
        ? dbGunakul.from("log_quiz").select("id", { count: "exact", head: true }).eq("acharya_id", acharyaId)
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      modules: modules.count || 0,
      sections: sections.count || 0,
      contentRows: content.count || 0,
      videos: videos.count || 0,
      learners: learners.count || 0,
      quizAttempts: quizzes.count || 0,
    };
  });

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
  });
}
