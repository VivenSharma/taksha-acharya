import { NextResponse } from "next/server";
import { clearLearnerCookie } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearLearnerCookie(res);
  return res;
}
