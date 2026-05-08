import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
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

  const acharyaId = await getAcharyaId();
  if (!acharyaId) {
    return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });
  }

  // Fetch identity + related role / category, and verify Acharya access via
  // category_acharya_access. Supabase joins are exposed as nested objects on
  // the response.
  const { data, error } = await dbGunakul
    .from("mst_users")
    .select(`
      id, name, preferred_lang,
      role:mst_roles!mst_users_role_id_fkey ( slug ),
      category:mst_categories!mst_users_category_id_fkey!inner (
        slug,
        map_category_acharya!inner ( acharya_id )
      )
    `)
    .eq("phone", phone)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("category.map_category_acharya.acharya_id", acharyaId)
    .maybeSingle();

  if (error) {
    console.error("otp-verify lookup error:", error);
    return NextResponse.json({ error: "Service error. Try again shortly." }, { status: 502 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "This number is not registered for the pilot." },
      { status: 404 }
    );
  }

  // Supabase returns nested relations as either a single object or an array
  // depending on relationship cardinality; `maybeSingle()` with !inner joins
  // gives us a single row but the nested relation may still come back as an
  // array. Normalise both cases.
  const roleSlug = (() => {
    const r = (data as { role?: { slug?: string } | Array<{ slug?: string }> }).role;
    if (!r) return "learner";
    const row = Array.isArray(r) ? r[0] : r;
    return (row?.slug as string) || "learner";
  })();
  const categorySlug = (() => {
    const c = (data as { category?: { slug?: string } | Array<{ slug?: string }> }).category;
    if (!c) return "";
    const row = Array.isArray(c) ? c[0] : c;
    return (row?.slug as string) || "";
  })();

  const isAdmin = roleSlug === "founder" || roleSlug === "admin";

  // Fire-and-forget last_seen bump.
  dbGunakul.from("mst_users")
    .update({ last_seen_on: new Date().toISOString() })
    .eq("id", data.id)
    .then(({ error: e }) => {
      if (e) console.warn("verify-otp last_seen update failed:", e.message);
    });

  const session = {
    learnerId: data.id as string,
    phone,
    name: (data.name as string) || "",
    roleSlug,
    categorySlug,
    isAdmin,
  };

  const res = NextResponse.json({
    ok: true,
    learner: {
      id: session.learnerId,
      phone: session.phone,
      name: session.name,
      role: isAdmin ? roleSlug : "user",
      isAdmin,
      preferredLang: (data.preferred_lang as string) || "bn",
    },
  });
  setLearnerCookie(res, session);
  return res;
}
