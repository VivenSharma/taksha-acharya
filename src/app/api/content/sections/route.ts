import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { memoCache, CONTENT_CACHE_HEADERS } from "@/lib/server/cache";
import { getTakshaSections } from "@/lib/taksha-demo-content";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * GET /api/content/sections?moduleId=M01-north-star&lang=bn
 *
 * Resolves the module slug to a UUID, then returns sections + the
 * requested-language body. Shape backwards-compatible with the legacy
 * taksha_sections response: each section carries { id, title_*, content }.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const moduleSlug = url.searchParams.get("moduleId");
  const lang = url.searchParams.get("lang") || "bn";

  if (!moduleSlug || moduleSlug.length > 120) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }
  if (!["bn", "hi", "en"].includes(lang)) {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }

  if (!dbConfigured) {
    return NextResponse.json({ sections: getTakshaSections(moduleSlug) }, { headers: CONTENT_CACHE_HEADERS });
  }

  const cacheKey = `acharya:sections:${moduleSlug}:${lang}`;
  const merged = await memoCache(cacheKey, 60, async () => {
    const { data: mod, error: mErr } = await dbAcharya
      .from("crs_modules")
      .select("id")
      .eq("slug", moduleSlug)
      .eq("is_deleted", false)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!mod) return [];

    const { data: sections, error: sErr } = await dbAcharya
      .from("crs_sections")
      .select(`
        id, slug, sort_order, estimated_hours,
        crs_section_tr ( lang, title, body, status )
      `)
      .eq("module_id", mod.id)
      .eq("is_deleted", false)
      .order("sort_order");
    if (sErr) throw sErr;

    return (sections || []).map((s) => {
      const trs = (s.crs_section_tr || []) as Array<{
        lang: string; title: string | null; body: string | null; status: string | null;
      }>;
      const pick = (l: string) => trs.find((t) => t.lang === l);
      const en = pick("en"); const bn = pick("bn"); const hi = pick("hi");
      const chosen = pick(lang) || en;
      const bodyOk = chosen && (chosen.status === "published" || chosen.status === "review")
        ? chosen.body
        : (en && (en.status === "published" || en.status === "review") ? en.body : null);
      return {
        id: s.id,
        title_en: en?.title || "",
        title_bn: bn?.title || en?.title || "",
        title_hi: hi?.title || en?.title || "",
        sort_order: s.sort_order,
        estimated_hours: s.estimated_hours,
        content: bodyOk ? { body: bodyOk } : null,
      };
    });
  }).catch((err) => {
    console.error("acharya sections error:", err);
    return null;
  });

  if (merged === null) {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 502 });
  }
  return NextResponse.json({ sections: merged }, { headers: CONTENT_CACHE_HEADERS });
}
