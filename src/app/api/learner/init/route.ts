import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbConfigured } from "@/lib/server/supabase";
import { getLearnerSession } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * POST /api/learner/init
 *
 * With phone auth, the canonical learner id comes from the signed session
 * cookie set by /api/auth/phone/verify-otp — we don't create users on the
 * fly any more. This route just refreshes `last_seen` and optionally bumps
 * `preferred_lang` so the admin panel shows accurate recency.
 *
 * Body: { deviceId?, lang? } — deviceId is ignored (legacy parameter).
 */
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ learnerId: null });

  const session = await getLearnerSession();
  if (!session) {
    // Not logged in — this is not an error; the client calls /init on mount
    // before the user has signed in. Just return null.
    return NextResponse.json({ learnerId: null });
  }

  const body = await req.json().catch(() => null) as { lang?: string } | null;
  const preferredLang = body && ["bn", "hi", "en"].includes(body.lang || "")
    ? body.lang
    : undefined;

  const update: Record<string, unknown> = { last_seen_on: new Date().toISOString() };
  if (preferredLang) update.preferred_lang = preferredLang;

  const { error } = await dbGunakul.from("mst_users").update(update).eq("id", session.learnerId);
  if (error) {
    console.error("learner init last_seen update failed:", error);
    // Non-fatal — client can still function with the session cookie.
  }

  return NextResponse.json({ learnerId: session.learnerId });
}
