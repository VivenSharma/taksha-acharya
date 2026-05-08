import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbAcharya, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { getLearnerSession } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * POST /api/learner/progress
 * Upserts a row in `gurukul.progress` keyed on (user_id, acharya_id, module_id).
 * `moduleId` in the request body is the module SLUG (e.g. "M01-north-star");
 * we resolve it to the actual UUID via `gurukul.modules`.
 */
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const session = await getLearnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { moduleId, sectionsCompleted, completed } = body as {
    moduleId?: string;
    sectionsCompleted?: string[];
    completed?: boolean;
  };

  if (!moduleId || typeof moduleId !== "string" || moduleId.length > 120) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }
  if (!Array.isArray(sectionsCompleted) || sectionsCompleted.length > 200) {
    return NextResponse.json({ error: "Invalid sectionsCompleted" }, { status: 400 });
  }
  const clean = sectionsCompleted.filter(
    (id) => typeof id === "string" && id.length > 0 && id.length <= 200
  );

  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });

  const { data: mod, error: modErr } = await dbAcharya
    .from("crs_modules")
    .select("id")
    .eq("slug", moduleId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (modErr || !mod) {
    console.error("progress: module slug not found:", moduleId, modErr);
    return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  }

  const { error } = await dbGunakul
    .from("log_progress")
    .upsert(
      {
        user_id: session.learnerId,
        acharya_id: acharyaId,
        module_id: mod.id,
        sections_completed: clean,
        completed: !!completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_on: new Date().toISOString(),
      },
      { onConflict: "user_id,acharya_id,module_id" }
    );

  if (error) {
    console.error("progress upsert error:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
