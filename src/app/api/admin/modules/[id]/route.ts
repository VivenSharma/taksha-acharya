import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const LANGS = ["en", "hi", "bn"] as const;

type Lang = typeof LANGS[number];

function pickTr<T extends { lang: string }>(rows: T[] | undefined, lang: Lang): T | undefined {
  return (rows || []).find((r) => r.lang === lang);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ module: null, sections: [] });

  const { id } = await ctx.params;
  if (!id || id.length > 120) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data: mod, error: mErr } = await dbAcharya
    .from("crs_modules")
    .select(`
      id, slug, sort_order, theory_hours, practical_hours,
      icon, group_key, group_label_en, group_label_bn, group_label_hi,
      crs_module_tr ( lang, title, short_desc, status )
    `)
    .eq("slug", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (mErr || !mod) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const moduleTr = (mod.crs_module_tr || []) as Array<{ lang: string; title: string | null }>;
  const modulePayload = {
    id: mod.slug,
    title_en: pickTr(moduleTr, "en")?.title || "",
    title_bn: pickTr(moduleTr, "bn")?.title || pickTr(moduleTr, "en")?.title || "",
    title_hi: pickTr(moduleTr, "hi")?.title || pickTr(moduleTr, "en")?.title || "",
    icon: mod.icon || "book",
    theory_hours: mod.theory_hours || 0,
    practical_hours: mod.practical_hours || 0,
    sort_order: mod.sort_order || 0,
    group_key: mod.group_key || "general",
    group_label_en: mod.group_label_en,
    group_label_bn: mod.group_label_bn,
    group_label_hi: mod.group_label_hi,
  };

  const { data: sections, error: sErr } = await dbAcharya
    .from("crs_sections")
    .select(`
      id, slug, sort_order, estimated_hours,
      crs_section_tr ( id, lang, title, body, status )
    `)
    .eq("module_id", mod.id)
    .eq("is_deleted", false)
    .order("sort_order");

  if (sErr) {
    console.error("admin module sections error:", sErr);
    return NextResponse.json({ error: "Failed to load sections" }, { status: 502 });
  }

  const sectionPayload = (sections || []).map((s) => {
    const trs = (s.crs_section_tr || []) as Array<{
      id: string;
      lang: Lang;
      title: string | null;
      body: string | null;
      status: "draft" | "review" | "published" | null;
    }>;
    const en = pickTr(trs, "en"); const bn = pickTr(trs, "bn"); const hi = pickTr(trs, "hi");
    return {
      id: s.id,
      module_id: mod.slug,
      title_en: en?.title || "",
      title_bn: bn?.title || en?.title || "",
      title_hi: hi?.title || en?.title || "",
      sort_order: s.sort_order || 0,
      estimated_hours: s.estimated_hours || 0,
      content: {
        en: en ? { id: en.id, section_id: s.id, lang: "en", body: en.body || "", status: en.status || "draft" } : null,
        hi: hi ? { id: hi.id, section_id: s.id, lang: "hi", body: hi.body || "", status: hi.status || "draft" } : null,
        bn: bn ? { id: bn.id, section_id: s.id, lang: "bn", body: bn.body || "", status: bn.status || "draft" } : null,
      },
    };
  });

  return NextResponse.json({ module: modulePayload, sections: sectionPayload });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!id || id.length > 120 || !body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: mod } = await dbAcharya.from("crs_modules").select("id").eq("slug", id).eq("is_deleted", false).maybeSingle();
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  for (const key of ["icon", "group_key", "group_label_en", "group_label_bn", "group_label_hi"]) {
    if (typeof body[key] === "string") patch[key] = String(body[key]).slice(0, 160);
  }
  for (const key of ["sort_order", "theory_hours", "practical_hours"]) {
    if (Number.isFinite(Number(body[key]))) patch[key] = Number(body[key]);
  }
  if (Object.keys(patch).length > 0) {
    const { error } = await dbAcharya.from("crs_modules").update(patch).eq("id", mod.id);
    if (error) return NextResponse.json({ error: "Module update failed" }, { status: 502 });
  }

  for (const lang of LANGS) {
    const title = body[`title_${lang}`];
    if (typeof title !== "string") continue;
    const { data: existing } = await dbAcharya
      .from("crs_module_tr")
      .select("id")
      .eq("module_id", mod.id)
      .eq("lang", lang)
      .maybeSingle();
    const row = { module_id: mod.id, lang, title: title.slice(0, 200), status: "published" };
    const result = existing
      ? await dbAcharya.from("crs_module_tr").update(row).eq("id", existing.id)
      : await dbAcharya.from("crs_module_tr").insert(row);
    if (result.error) return NextResponse.json({ error: "Title update failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const { id } = await ctx.params;
  if (!id || id.length > 120) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error } = await dbAcharya.from("crs_modules").update({ is_deleted: true }).eq("slug", id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
