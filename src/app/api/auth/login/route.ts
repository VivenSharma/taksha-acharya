import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail, setAdminCookie, verifyAdminCredentials } from "@/lib/server/auth";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Login is always keyed on IP (no learner yet); capped tighter than others.
  const rl = rateLimit(rateLimitKey(req.headers, null, 'login'), 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts", retryInSeconds: rl.resetInSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };
  if (!verifyAdminCredentials(email || "", password || "")) {
    // Uniform response to avoid user-enumeration
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ email: getAdminEmail() });
  setAdminCookie(res, getAdminEmail());
  return res;
}
