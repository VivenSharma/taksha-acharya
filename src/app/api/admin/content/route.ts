import { NextRequest, NextResponse } from "next/server";
import { dbAcharya, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as { sectionId?: string; lang?: string; body?: string } | null;
  if (!body?.sectionId || body.sectionId.length > 120) return NextResponse.json({ error: "Invalid sectionId" }, { status: 400 });
  if (!["bn", "hi", "en"].includes(body.lang || "")) return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  if (typeof body.body !== "string" || body.body.length > 50000) return NextResponse.json({ error: "Invalid body text" }, { status: 400 });

  const { data: existing } = await dbAcharya
    .from("crs_section_tr")
    .select("id, title")
    .eq("section_id", body.sectionId)
    .eq("lang", body.lang)
    .maybeSingle();

  const row = {
    section_id: body.sectionId,
    lang: body.lang,
    title: existing?.title || "Untitled Section",
    body: body.body,
    status: "published",
  };
  const result = existing
    ? await dbAcharya.from("crs_section_tr").update(row).eq("id", existing.id)
    : await dbAcharya.from("crs_section_tr").insert(row);

  if (result.error) return NextResponse.json({ error: "Write failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
