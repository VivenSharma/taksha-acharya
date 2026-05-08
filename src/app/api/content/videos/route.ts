import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured, isSupabaseSchemaExposureError } from "@/lib/server/supabase";
import { memoCache, CONTENT_CACHE_HEADERS } from "@/lib/server/cache";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * GET /api/content/videos?moduleId=M15-video-library&limit=3
 *
 * Returns videos for a module (by slug). Shape stays backwards-compatible
 * with the legacy taksha_videos response.
 */
export async function GET(req: NextRequest) {
  if (!dbConfigured) {
    return NextResponse.json({ videos: [] }, { headers: CONTENT_CACHE_HEADERS });
  }

  const url = new URL(req.url);
  const moduleSlug = url.searchParams.get("moduleId") || "M15-video-library";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam
    ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 0))
    : undefined;

  if (moduleSlug.length > 120) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }

  const cacheKey = `acharya:videos:${moduleSlug}:${limit ?? "all"}`;
  const videos = await memoCache(cacheKey, 60, async () => {
    const { data: mod } = await dbAcharya
      .from("crs_modules")
      .select("id")
      .eq("slug", moduleSlug)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!mod) return [];

    let q = dbAcharya
      .from("crs_videos")
      .select(`
        id, youtube_id, start_seconds, duration, sort_order,
        crs_video_tr ( lang, title )
      `)
      .eq("module_id", mod.id)
      .eq("is_deleted", false)
      .order("sort_order");
    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((v) => {
      const trs = (v.crs_video_tr || []) as Array<{ lang: string; title: string | null }>;
      const pick = (l: string) => trs.find((t) => t.lang === l);
      const en = pick("en"); const bn = pick("bn"); const hi = pick("hi");
      return {
        id: v.id,
        youtube_id: v.youtube_id,
        module_id: moduleSlug,
        title_en: en?.title || "",
        title_bn: bn?.title || en?.title || "",
        title_hi: hi?.title || en?.title || "",
        duration: v.duration,
        start_seconds: v.start_seconds,
        sort_order: v.sort_order,
      };
    });
  }).catch((err) => {
    console.error("acharya videos error:", err);
    if (isSupabaseSchemaExposureError(err)) return [];
    return null;
  });

  if (videos === null) {
    return NextResponse.json({ error: "Failed to load videos" }, { status: 502 });
  }
  return NextResponse.json({ videos }, { headers: CONTENT_CACHE_HEADERS });
}
