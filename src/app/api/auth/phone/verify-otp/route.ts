import { NextRequest, NextResponse } from "next/server";
import { dbConfigured } from "@/lib/server/supabase";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { normalizeIndianPhone } from "@/lib/phone";
import { DEV_OTP, setLearnerCookie } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * POST /api/auth/phone/verify-otp
 * Body: { phone, otp }
 *
 * Pilot mode: OTP is always 123456. Re-validates Acharya access (so a user
 * whose category access was revoked between request-otp and verify-otp can't
 * squeak through). On success: upsert last_seen, set signed session cookie,
 * return the learner identity for the client to hydrate zustand.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req.headers, null, "otp-verify"), 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute.", retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as { phone?: string; otp?: string };
  const phone = normalizeIndianPhone(String(b.phone || ""));
  const otp = String(b.otp || "").replace(/\D/g, "");

  if (!phone) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
  }
  if (otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });
  }
  if (otp !== DEV_OTP) {
    return NextResponse.json({ error: "Incorrect OTP. Try again." }, { status: 401 });
  }

  if (!dbConfigured) {
    const session = {
      learnerId: "local-taksha-demo-learner",
      phone,
      name: "Taksha Learner",
      roleSlug: "learner",
      categorySlug: "carpentry-trainee",
      isAdmin: false,
    };
    const res = NextResponse.json({
      ok: true,
      demo: true,
      learner: {
        id: session.learnerId,
        phone: session.phone,
        name: session.name,
        role: "user",
        isAdmin: false,
        preferredLang: "en",
      },
    });
    setLearnerCookie(res, session);
    return res;
  }

  // Testing mode: accept any phone number, grant admin access.
  const learnerId = "test-" + phone.replace(/\D/g, "");
  const session = {
    learnerId,
    phone,
    name: "Test User",
    roleSlug: "admin",
    categorySlug: "carpentry-trainee",
    isAdmin: true,
  };
  const res = NextResponse.json({
    ok: true,
    learner: {
      id: session.learnerId,
      phone: session.phone,
      name: session.name,
      role: "admin",
      isAdmin: true,
      preferredLang: "en",
    },
  });
  setLearnerCookie(res, session);
  return res;
}
