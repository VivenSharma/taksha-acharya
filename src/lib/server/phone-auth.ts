import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "taksha-learner-session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "taksha-dev-secret-change-me"; // prod MUST override

// OTP for the pilot: always 123456. Per-Acharya `dev_otp` on gurukul.acharya_config
// can override this later; reading it adds a round-trip, so we keep a constant
// fallback for now.
export const DEV_OTP = "123456";

export interface LearnerSession {
  learnerId: string;
  phone: string;
  name: string;
  roleSlug: string;       // founder | admin | instructor | learner
  categorySlug: string;   // internal_staff | field_worker | gardener | …
  isAdmin: boolean;       // role in {founder, admin}
  exp: number;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function createToken(session: Omit<LearnerSession, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...session, exp }), "utf8").toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function parseToken(token: string): LearnerSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.exp !== "number" || decoded.exp * 1000 < Date.now()) return null;
    if (typeof decoded.learnerId !== "string" || typeof decoded.phone !== "string") return null;
    return decoded as LearnerSession;
  } catch {
    return null;
  }
}

export async function getLearnerSession(): Promise<LearnerSession | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c) return null;
  return parseToken(c.value);
}

export function setLearnerCookie(res: NextResponse, session: Omit<LearnerSession, "exp">) {
  const token = createToken(session);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearLearnerCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { COOKIE_NAME as LEARNER_COOKIE_NAME };
