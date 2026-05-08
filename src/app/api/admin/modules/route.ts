import { NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ modules: [] });

  const { data: mods, error } = await db
    .from("taksha_modules")
    .select("*")
    .order("sort_order");
  if (error) {
    return NextResponse.json({ error: "Failed to load modules" }, { status: 502 });
  }
  if (!mods) return NextResponse.json({ modules: [] });

  const [{ data: sections }, { data: contents }] = await Promise.all([
    db.from("taksha_sections").select("module_id"),
    db
      .from("taksha_content")
      .select("section_id, taksha_sections!inner(module_id)")
      .eq("status", "published"),
  ]);

  const sectionCount: Record<string, number> = {};
  (sections || []).forEach((s: { module_id: string }) => {
    sectionCount[s.module_id] = (sectionCount[s.module_id] || 0) + 1;
  });

  const contentCount: Record<string, number> = {};
  (contents || []).forEach((c: unknown) => {
    const cc = c as { taksha_sections?: { module_id: string } | { module_id: string }[] };
    const sec = Array.isArray(cc.taksha_sections) ? cc.taksha_sections[0] : cc.taksha_sections;
    const mid = sec?.module_id;
    if (mid) contentCount[mid] = (contentCount[mid] || 0) + 1;
  });

  const enriched = mods.map((m: { id: string; [k: string]: unknown }) => ({
    ...m,
    sectionCount: sectionCount[m.id] || 0,
    contentCount: contentCount[m.id] || 0,
  }));

  return NextResponse.json({ modules: enriched });
}
