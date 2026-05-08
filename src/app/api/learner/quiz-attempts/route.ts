import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbAcharya, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { getLearnerSession } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/** POST /api/learner/quiz-attempts — append a quiz attempt to gurukul.quiz_attempts. */
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const session = await getLearnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { moduleId, score, total, questions } = body as {
    moduleId?: string;
    score?: number;
    total?: number;
    questions?: unknown[];
  };

  if (!moduleId || typeof moduleId !== "string" || moduleId.length > 120) {
    return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
  }
  if (
    typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100 ||
    typeof total !== "number" || !Number.isFinite(total) || total < 1 || total > 100
  ) {
    return NextResponse.json({ error: "Invalid score/total" }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length > 100) {
    return NextResponse.json({ error: "Invalid questions" }, { status: 400 });
  }

  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });

  const { data: mod } = await dbAcharya
    .from("crs_modules")
    .select("id")
    .eq("slug", moduleId)
    .eq("is_deleted", false)
    .maybeSingle();

  const { error } = await dbGunakul.from("log_quiz").insert({
    user_id: session.learnerId,
    acharya_id: acharyaId,
    module_id: mod ? mod.id : null,
    score,
    total,
    questions,
  });

  if (error) {
    console.error("quiz attempt error:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
