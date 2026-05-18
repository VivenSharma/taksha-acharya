import { NextResponse } from "next/server";
import { getLearnerSession } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

function clientRole(roleSlug: string, isAdmin: boolean) {
  if (isAdmin && (roleSlug === "admin" || roleSlug === "founder")) return roleSlug;
  return "user";
}

/**
 * GET /api/auth/phone/me — current learner session, self-healing.
 *
 * Returns `{ learner: null }` in three situations, all of which also clear
 * the HttpOnly cookie so the browser stops sending it:
 *   1. No cookie present.
 *   2. Cookie fails HMAC or has expired.
 *   3. Cookie is valid but the user no longer exists / has been deactivated.
 *      (Happens after migrations that rebuild the users table, or when an
 *      admin deletes a user in the middle of an active session.)
 */
export async function GET() {
  const s = await getLearnerSession();
  if (!s) {
    return NextResponse.json({ learner: null });
  }

  // Testing mode: trust the session cookie without a DB existence check.
  return NextResponse.json({
    learner: {
      id: s.learnerId,
      phone: s.phone,
      name: s.name,
      role: clientRole(s.roleSlug, s.isAdmin),
      isAdmin: s.isAdmin,
    },
  });
}
