import { NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ module: null, sections: [] });

  const { id } = await ctx.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: mod, error: mErr } = await db
    .from("taksha_modules")
    .select("*")
    .eq("id", id)
    .single();
  if (mErr || !mod) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sections, error: sErr } = await db
    .from("taksha_sections")
    .select("*")
    .eq("module_id", id)
    .order("sort_order");
  if (sErr) {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 502 });
  }

  const secs = sections || [];
  let sectionsWithContent: unknown[] = [];
  if (secs.length > 0) {
    const { data: contents } = await db
      .from("taksha_content")
      .select("*")
      .in(
        "section_id",
        secs.map((s: { id: string }) => s.id)
      );
    const contentMap = new Map<string, Record<string, unknown>>();
    for (const s of secs) contentMap.set(s.id, { bn: null, hi: null, en: null });
    for (const c of (contents || []) as Array<{ section_id: string; lang: string }>) {
      const entry = contentMap.get(c.section_id);
      if (entry) entry[c.lang] = c;
    }
    sectionsWithContent = secs.map((s: { id: string; [k: string]: unknown }) => ({
      ...s,
      content: contentMap.get(s.id) || { bn: null, hi: null, en: null },
    }));
  }

  return NextResponse.json({ module: mod, sections: sectionsWithContent });
}
