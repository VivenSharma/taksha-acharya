import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { moduleId, sortOrder } = body as { moduleId?: string; sortOrder?: number };
  if (!moduleId || typeof moduleId !== "string" || moduleId.length > 80) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }

  const { error } = await db.from("taksha_sections").insert({
    module_id: moduleId,
    title_bn: "নতুন বিভাগ",
    title_hi: "नया खंड",
    title_en: "New Section",
    sort_order: typeof sortOrder === "number" ? sortOrder : 1,
    estimated_hours: 1,
  });

  if (error) {
    console.error("add section:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
