import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "taksha-admin-session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@taksha.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  // Dev fallback — a deploy MUST set SESSION_SECRET, otherwise cookies are invalid across restarts.
  "taksha-dev-secret-change-me";

// Hardcoded test admin — always valid, no env var required.
const TEST_ADMIN_EMAIL = "admintest@acharya.com";
const TEST_ADMIN_PASSWORD = "admin12345";

// All email addresses that are valid admin sessions.
const VALID_ADMIN_EMAILS = new Set([
  ADMIN_EMAIL.trim().toLowerCase(),
  TEST_ADMIN_EMAIL,
]);

export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}

/**
 * Check credentials. Returns the canonical email on success, null on failure.
 * Accepts either the env-var admin account or the hardcoded test admin.
 */
export function verifyAdminCredentials(email: string, password: string): string | null {
  if (!email || !password) return null;
  const emailLower = email.trim().toLowerCase();

  if (emailLower === TEST_ADMIN_EMAIL) {
    const a = Buffer.from(password);
    const b = Buffer.from(TEST_ADMIN_PASSWORD);
    if (a.length !== b.length) return null;
    return crypto.timingSafeEqual(a, b) ? TEST_ADMIN_EMAIL : null;
  }

  if (!ADMIN_PASSWORD) return null;
  if (emailLower !== ADMIN_EMAIL.trim().toLowerCase()) return null;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? ADMIN_EMAIL : null;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function createToken(email: string): string {
  // Encode the email as base64url so it can't contain the '.' separator.
  // Using encodeURIComponent was wrong because `.` isn't percent-encoded,
  // and any email like "user@example.com" produced a 4-piece token that
  // parseToken rejected.
  const emailEnc = Buffer.from(email, "utf8").toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${emailEnc}.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

interface Session {
  email: string;
  exp: number;
}

function parseToken(token: string): Session | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailEnc, expStr, sig] = parts;
  const expected = sign(`${emailEnc}.${expStr}`);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  let email: string;
  try {
    email = Buffer.from(emailEnc, "base64url").toString("utf8");
  } catch {
    return null;
  }
  return { email, exp };
}

export async function getAdminSession(): Promise<Session | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c) return null;
  const session = parseToken(c.value);
  if (!session) return null;
  if (!VALID_ADMIN_EMAILS.has(session.email.toLowerCase())) return null;
  return session;
}

export async function requireAdmin(): Promise<Session | NextResponse> {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return s;
}

export function setAdminCookie(res: NextResponse, email: string) {
  const token = createToken(email);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { COOKIE_NAME };
