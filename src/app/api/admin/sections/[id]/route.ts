import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const TITLE_FIELD_LANG: Record<string, "en" | "hi" | "bn"> = {
  title_en: "en",
  title_hi: "hi",
  title_bn: "bn",
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!id || id.length > 120 || !body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sectionPatch: Record<string, unknown> = {};
  if (Number.isFinite(Number(body.sort_order))) sectionPatch.sort_order = Number(body.sort_order);
  if (Number.isFinite(Number(body.estimated_hours))) sectionPatch.estimated_hours = Number(body.estimated_hours);
  if (Object.keys(sectionPatch).length > 0) {
    const { error } = await dbAcharya.from("crs_sections").update(sectionPatch).eq("id", id);
    if (error) return NextResponse.json({ error: "Section update failed" }, { status: 502 });
  }

  for (const [field, lang] of Object.entries(TITLE_FIELD_LANG)) {
    const title = body[field];
    if (typeof title !== "string") continue;
    const { data: existing } = await dbAcharya
      .from("crs_section_tr")
      .select("id, body, status")
      .eq("section_id", id)
      .eq("lang", lang)
      .maybeSingle();
    const row = {
      section_id: id,
      lang,
      title: title.slice(0, 240),
      body: existing?.body || "",
      status: existing?.status || "draft",
    };
    const result = existing
      ? await dbAcharya.from("crs_section_tr").update(row).eq("id", existing.id)
      : await dbAcharya.from("crs_section_tr").insert(row);
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

  const { error } = await dbAcharya.from("crs_sections").update({ is_deleted: true }).eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
