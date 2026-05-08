import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { getLearnerSession } from "@/lib/server/phone-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const MAX_EVENT_DATA_BYTES = 2048;

/** POST /api/learner/events — append a telemetry event to gurukul.events. */
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const session = await getLearnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { eventType, eventData } = body as {
    eventType?: string;
    eventData?: Record<string, unknown>;
  };

  if (!eventType || typeof eventType !== "string" || eventType.length > 60) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  let data: Record<string, unknown> | null = null;
  if (eventData && typeof eventData === "object") {
    const serialised = JSON.stringify(eventData);
    if (serialised.length > MAX_EVENT_DATA_BYTES) {
      return NextResponse.json({ error: "eventData too large" }, { status: 413 });
    }
    data = eventData;
  }

  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });

  const { error } = await dbGunakul.from("log_events").insert({
    user_id: session.learnerId,
    acharya_id: acharyaId,
    event_type: eventType,
    event_data: data,
  });

  if (error) {
    console.error("event error:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
