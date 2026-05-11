import { NextRequest, NextResponse } from "next/server";
import { dbGunakul, dbConfigured, getAcharyaId } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/server/auth";
import { normalizeIndianPhone } from "@/lib/phone";

const PAGE_SIZE = 50;

type UserRow = {
  id: string;
  name?: string | null;
  phone?: string | null;
  preferred_lang?: string | null;
  last_seen_on?: string | null;
  created_on?: string | null;
  is_active?: boolean | null;
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ learners: [], totalCount: 0, page: 0, pageSize: PAGE_SIZE });

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
  const acharyaId = await getAcharyaId();

  const { count } = await dbGunakul
    .from("mst_users")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);

  const { data: rows, error } = await dbGunakul
    .from("mst_users")
    .select("*")
    .eq("is_deleted", false)
    .order("last_seen_on", { ascending: false, nullsFirst: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    console.error("admin users error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 502 });
  }

  const learnerIds = ((rows || []) as UserRow[]).map((r) => r.id);
  const [{ data: progress }, { data: quizzes }] = await Promise.all([
    acharyaId && learnerIds.length
      ? dbGunakul.from("log_progress").select("user_id, completed").eq("acharya_id", acharyaId).in("user_id", learnerIds)
      : Promise.resolve({ data: [] }),
    acharyaId && learnerIds.length
      ? dbGunakul.from("log_quiz").select("user_id, score, total").eq("acharya_id", acharyaId).in("user_id", learnerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const progressCount: Record<string, number> = {};
  (progress || []).forEach((p: { user_id: string; completed: boolean }) => {
    if (p.completed) progressCount[p.user_id] = (progressCount[p.user_id] || 0) + 1;
  });

  const quizStats: Record<string, { count: number; score: number; total: number }> = {};
  (quizzes || []).forEach((q: { user_id: string; score: number; total: number }) => {
    quizStats[q.user_id] ||= { count: 0, score: 0, total: 0 };
    quizStats[q.user_id].count += 1;
    quizStats[q.user_id].score += q.score || 0;
    quizStats[q.user_id].total += q.total || 0;
  });

  const learners = ((rows || []) as UserRow[]).map((r) => ({
    id: r.id,
    device_id: r.id,
    name: r.name || null,
    phone: r.phone || null,
    preferred_lang: r.preferred_lang || "en",
    created_at: r.created_on || "",
    last_seen: r.last_seen_on || r.created_on || "",
    isActive: r.is_active !== false,
    progressCount: progressCount[r.id] || 0,
    quizCount: quizStats[r.id]?.count || 0,
    avgScore: quizStats[r.id]?.total ? Math.round((quizStats[r.id].score / quizStats[r.id].total) * 100) : 0,
  }));

  return NextResponse.json({ learners, totalCount: count || 0, page, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const phone = normalizeIndianPhone(String(body?.phone || ""));
  const name = String(body?.name || "").trim();
  const preferredLang = ["bn", "hi", "en"].includes(String(body?.preferred_lang)) ? String(body?.preferred_lang) : "en";
  if (!phone) return NextResponse.json({ error: "Enter a valid Indian phone number." }, { status: 400 });
  if (!name || name.length > 160) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const acharyaId = await getAcharyaId();
  if (!acharyaId) return NextResponse.json({ error: "Acharya not configured" }, { status: 500 });

  const [{ data: role }, { data: category }] = await Promise.all([
    dbGunakul.from("mst_roles").select("id").eq("slug", "learner").maybeSingle(),
    dbGunakul
      .from("mst_categories")
      .select("id, map_category_acharya!inner(acharya_id)")
      .eq("is_deleted", false)
      .eq("map_category_acharya.acharya_id", acharyaId)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!role?.id || !category?.id) {
    return NextResponse.json({ error: "Default learner role/category is not configured." }, { status: 500 });
  }

  const { error } = await dbGunakul.from("mst_users").insert({
    name,
    phone,
    preferred_lang: preferredLang,
    role_id: role.id,
    category_id: category.id,
    is_active: true,
    is_deleted: false,
    last_seen_on: null,
  });
  if (error) {
    console.error("admin add user error:", error);
    return NextResponse.json({ error: "Could not add user. Phone may already exist." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as { id?: string; isActive?: boolean } | null;
  if (!body?.id || body.id.length > 120 || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { error } = await dbGunakul.from("mst_users").update({ is_active: body.isActive }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!dbConfigured) return NextResponse.json({ ok: true });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id || id.length > 120) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { error } = await dbGunakul.from("mst_users").update({ is_deleted: true, is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
