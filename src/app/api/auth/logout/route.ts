import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/server/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
