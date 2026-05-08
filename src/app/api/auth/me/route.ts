import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ email: null });
  return NextResponse.json({ email: session.email });
}
