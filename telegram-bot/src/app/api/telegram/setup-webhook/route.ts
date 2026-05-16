import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function GET() {
  const webhookUrl = process.env.WEBHOOK_URL || "";
  if (!webhookUrl) {
    return NextResponse.json({ error: "WEBHOOK_URL is not configured" }, { status: 500 });
  }

  try {
    const result = await setWebhook(webhookUrl);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[telegram] setup webhook failed:", err);
    return NextResponse.json({ error: "Webhook setup failed" }, { status: 502 });
  }
}
