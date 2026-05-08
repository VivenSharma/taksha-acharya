import { NextResponse } from "next/server";
import { dbAcharya, dbConfigured, isSupabaseSchemaExposureError } from "@/lib/server/supabase";
import { memoCache, CONTENT_CACHE_HEADERS } from "@/lib/server/cache";
import { TAKSHA_MODULES } from "@/lib/taksha-demo-content";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * GET /api/content/modules?lang=bn
 *
 * Returns this Acharya's module list in the requested language, falling back
 * to the English translation when a language row isn't present yet. Shape is
 * kept backwards-compatible with the old taksha_modules payload so the client
 * keeps working: { id, title_bn, title_hi, title_en, icon, sort_order, … }.
 * (The 'id' field stays as the module SLUG so existing client routing and
 * keying on M01-north-star continues to work.)
 */
export async function GET(req: Request) {
  if (!dbConfigured) {
    return NextResponse.json({ modules: TAKSHA_MODULES }, { headers: CONTENT_CACHE_HEADERS });
  }

  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") || "bn";
  if (!["bn", "hi", "en"].includes(lang)) {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }

  const modules = await memoCache(`acharya:modules`, 60, async () => {
    const { data, error } = await dbAcharya
      .from("crs_modules")
      .select(`
        id, slug, sort_order, theory_hours, practical_hours,
        icon, group_key, group_label_en, group_label_bn, group_label_hi,
        crs_module_tr ( lang, title, short_desc, status )
      `)
      .eq("is_deleted", false)
      .order("sort_order");
    if (error) throw error;

    return (data || []).map((m) => {
      const trs = (m.crs_module_tr || []) as Array<{
        lang: string; title: string | null; short_desc: string | null; status: string | null;
      }>;
      const pick = (l: string) => trs.find((t) => t.lang === l);
      const en = pick("en"); const bn = pick("bn"); const hi = pick("hi");
      return {
        id: m.slug,
        title_en: en?.title || "",
        title_bn: bn?.title || en?.title || "",
        title_hi: hi?.title || en?.title || "",
        icon: m.icon,
        sort_order: m.sort_order,
        theory_hours: m.theory_hours,
        practical_hours: m.practical_hours,
        group_key: m.group_key,
        group_label_en: m.group_label_en,
        group_label_bn: m.group_label_bn,
        group_label_hi: m.group_label_hi,
      };
    });
  }).catch((err) => {
    console.error("acharya modules error:", err);
    if (isSupabaseSchemaExposureError(err)) return TAKSHA_MODULES;
    return null;
  });

  if (modules === null) {
    return NextResponse.json({ error: "Failed to load modules" }, { status: 502 });
  }
  return NextResponse.json({ modules }, { headers: CONTENT_CACHE_HEADERS });
}
