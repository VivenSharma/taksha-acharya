import { NextRequest, NextResponse } from "next/server";
import { db, dbConfigured } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";

const ALLOWED_FIELDS = new Set([
  "title_bn",
  "title_hi",
  "title_en",
  "sort_order",
  "estimated_hours",
]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ ok: true });

  const { id } = await ctx.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (typeof v === "string" && v.length > 500) continue;
    patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await db.from("taksha_sections").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!dbConfigured) return NextResponse.json({ ok: true });

  const { id } = await ctx.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { error } = await db.from("taksha_sections").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
