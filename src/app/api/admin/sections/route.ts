import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as { moduleId?: string; sortOrder?: number } | null;
  if (!body?.moduleId || body.moduleId.length > 120) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }

  const { data: mod } = await dbAcharya
    .from("crs_modules")
    .select("id")
    .eq("slug", body.moduleId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 1;
  const { data: section, error } = await dbAcharya
    .from("crs_sections")
    .insert({
      module_id: mod.id,
      slug: `section-${Date.now()}`,
      sort_order: sortOrder,
      estimated_hours: 1,
      is_deleted: false,
    })
    .select("id")
    .single();

  if (error || !section) {
    console.error("admin add section error:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }

  const { error: trError } = await dbAcharya.from("crs_section_tr").insert([
    { section_id: section.id, lang: "en", title: "New Section", body: "", status: "draft" },
    { section_id: section.id, lang: "hi", title: "नया खंड", body: "", status: "draft" },
    { section_id: section.id, lang: "bn", title: "নতুন বিভাগ", body: "", status: "draft" },
  ]);
  if (trError) return NextResponse.json({ error: "Section created but titles failed" }, { status: 502 });

  return NextResponse.json({ ok: true });
}
