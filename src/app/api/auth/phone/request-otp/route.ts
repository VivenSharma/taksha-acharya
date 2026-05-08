import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { normalizeIndianPhone } from "@/lib/phone";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/**
 * POST /api/auth/phone/request-otp
 * Body: { phone }
 *
 * Checks the phone exists in `gurukul.users` (active, not deleted) AND the
 * user's category grants access to this Acharya via `gurukul.category_acharya_access`.
 * Returns 404 "not registered" on either miss — no user enumeration.
 *
 * Pilot mode: does not send SMS. The OTP is always 123456 (constant on the
 * verify route); the user types it on the next screen.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req.headers, null, "otp-request"), 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute.", retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  if (!dbConfigured) {
    const body = await req.json().catch(() => null);
    const phone = normalizeIndianPhone(String((body as { phone?: string } | null)?.phone || ""));
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, phone, demo: true });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const phone = normalizeIndianPhone(String((body as { phone?: string }).phone || ""));
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 }
    );
  }

  const acharyaId = await getAcharyaId();
  if (!acharyaId) {
    return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });
  }

  // Single query: fetch the user + verify their category has access to THIS Acharya.
  // The !inner join on category_acharya_access restricts to accessible categories.
  const { data, error } = await dbGunakul
    .from("mst_users")
    .select("id, category_id, mst_categories!mst_users_category_id_fkey!inner(map_category_acharya!inner(acharya_id))")
    .eq("phone", phone)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("mst_categories.map_category_acharya.acharya_id", acharyaId)
    .maybeSingle();

  if (error) {
    console.error("otp-request lookup error:", error);
    return NextResponse.json({ error: "Service error. Try again shortly." }, { status: 502 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "This number is not registered for the pilot. Ask your admin to add you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, phone });
}
