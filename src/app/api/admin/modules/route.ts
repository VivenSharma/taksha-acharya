import { NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

type ModuleTr = { lang: string; title: string | null; short_desc: string | null; status: string | null };

function toClientModule(m: {
  id: string;
  slug: string;
  sort_order: number;
  theory_hours: number | null;
  practical_hours: number | null;
  icon: string | null;
  group_key: string | null;
  group_label_en: string | null;
  group_label_bn: string | null;
  group_label_hi: string | null;
  crs_module_tr?: ModuleTr[];
}) {
  const trs = m.crs_module_tr || [];
  const pick = (lang: string) => trs.find((t) => t.lang === lang);
  const en = pick("en"); const bn = pick("bn"); const hi = pick("hi");
  return {
    id: m.slug,
    dbId: m.id,
    title_en: en?.title || "",
    title_bn: bn?.title || en?.title || "",
    title_hi: hi?.title || en?.title || "",
    icon: m.icon || "book",
    sort_order: m.sort_order || 0,
    theory_hours: m.theory_hours || 0,
    practical_hours: m.practical_hours || 0,
    group_key: m.group_key || "general",
    group_label_en: m.group_label_en,
    group_label_bn: m.group_label_bn,
    group_label_hi: m.group_label_hi,
  };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ modules: [] });

  const { data: mods, error } = await dbAcharya
    .from("crs_modules")
    .select(`
      id, slug, sort_order, theory_hours, practical_hours,
      icon, group_key, group_label_en, group_label_bn, group_label_hi,
      crs_module_tr ( lang, title, short_desc, status )
    `)
    .eq("is_deleted", false)
    .order("sort_order");
  if (error) {
    console.error("admin modules error:", error);
    return NextResponse.json({ error: "Failed to load modules" }, { status: 502 });
  }
  if (!mods) return NextResponse.json({ modules: [] });

  const moduleIds = mods.map((m) => m.id);
  const [{ data: sections }] = await Promise.all([
    dbAcharya.from("crs_sections").select("id, module_id").in("module_id", moduleIds).eq("is_deleted", false),
  ]);

  const sectionCount: Record<string, number> = {};
  const sectionIds: string[] = [];
  (sections || []).forEach((s: { id: string; module_id: string }) => {
    sectionCount[s.module_id] = (sectionCount[s.module_id] || 0) + 1;
    sectionIds.push(s.id);
  });

  let sectionTranslations: Array<{ section_id: string; status: string | null }> = [];
  if (sectionIds.length > 0) {
    const { data } = await dbAcharya
      .from("crs_section_tr")
      .select("section_id, status")
      .in("section_id", sectionIds);
    sectionTranslations = data || [];
  }

  const sectionToModule = new Map((sections || []).map((s: { id: string; module_id: string }) => [s.id, s.module_id]));
  const contentCount: Record<string, number> = {};
  (sectionTranslations || []).forEach((t: { section_id: string; status: string | null }) => {
    if (t.status && !["published", "review"].includes(t.status)) return;
    const mid = sectionToModule.get(t.section_id);
    if (mid) contentCount[mid] = (contentCount[mid] || 0) + 1;
  });

  const enriched = mods.map((m) => ({
    ...toClientModule(m),
    sectionCount: sectionCount[m.id] || 0,
    contentCount: contentCount[m.id] || 0,
  }));

  return NextResponse.json({ modules: enriched });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const slug = String(body.slug || "").trim().toLowerCase();
  const title = String(body.title_en || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be 3-80 lowercase letters, numbers, or hyphens." }, { status: 400 });
  }
  if (!title || title.length > 200) {
    return NextResponse.json({ error: "English title is required." }, { status: 400 });
  }

  const { count } = await dbAcharya
    .from("crs_modules")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);

  const { data: moduleRow, error } = await dbAcharya
    .from("crs_modules")
    .insert({
      slug,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : (count || 0) + 1,
      theory_hours: Number.isFinite(Number(body.theory_hours)) ? Number(body.theory_hours) : 0,
      practical_hours: Number.isFinite(Number(body.practical_hours)) ? Number(body.practical_hours) : 0,
      icon: String(body.icon || "book").slice(0, 40),
      group_key: String(body.group_key || "general").slice(0, 80),
      group_label_en: String(body.group_label_en || body.group_key || "General").slice(0, 120),
      group_label_bn: String(body.group_label_bn || body.group_key || "General").slice(0, 120),
      group_label_hi: String(body.group_label_hi || body.group_key || "General").slice(0, 120),
      is_deleted: false,
    })
    .select("id")
    .single();

  if (error || !moduleRow) {
    console.error("admin create module error:", error);
    return NextResponse.json({ error: "Could not create module. Slug may already exist." }, { status: 502 });
  }

  const rows = (["en", "bn", "hi"] as const).map((lang) => ({
    module_id: moduleRow.id,
    lang,
    title: String(body[`title_${lang}`] || title).slice(0, 200),
    short_desc: "",
    status: "published",
  }));
  const { error: trError } = await dbAcharya.from("crs_module_tr").insert(rows);
  if (trError) {
    console.error("admin create module translations error:", trError);
    return NextResponse.json({ error: "Module created but translations failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: slug });
}
