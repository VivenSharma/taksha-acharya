# Chhota Hanuman — Backend Upgrade Plan
## Making Chhota More Robust, Scalable, Cheaper, Faster — UX Frozen

**Date:** 2026-04-15
**Decision source:** Master Trainer review
**Constraint:** The frontend is **frozen**. No CSS change, no component change, no visible behavior change. All upgrades live in `src/app/api/*` and `src/lib/*`. The `{ reply: string }` contract of `/api/chat` does not change.
**Target:** `github.com/omnidel-ai/taksha-acharya-app` on `master`.
**Live:** https://taksha-acharya-app.vercel.app/

---

## The Test Every Change Passes

Before any PR lands, I must be able to answer **YES** to this question:

> *"If a learner opens Chhota before and after this change, can they tell anything is different?"*

If YES → the change is rejected or gated behind a flag.
If NO → the change ships after PR review + preview deploy + approval.

---

## Current State (verified 2026-04-15)

| Component | What it does today | Where it lives |
|---|---|---|
| `/api/chat` | Vercel AI SDK `generateText` · `claude-4-sonnet-20250514` · 700 max tokens · system prompt concatenated each call · no caching | `src/app/api/chat/route.ts` |
| `/api/quiz` | `generateObject` · `claude-haiku-4-5-20251001` · 5 MCQs via zod schema · no caching | `src/app/api/quiz/route.ts` |
| `/api/tts` | Google Chirp3-HD Orus · bn/hi/en · 5KB char cap | `src/app/api/tts/route.ts` |
| System prompt | 152 lines · sent as string on every request · zero learner personalization | `src/lib/system-prompt.ts` |
| Rate limit | In-memory per-IP, 10/min | `src/lib/rate-limit.ts` |
| Persistence | Supabase `jzrsnfpgydiaoeiijypm` · 7 migrations, RLS on all learner tables | `supabase/migrations/*` |
| Tracking | `acharya_chat_logs` + `acharya_events` (fire-and-forget from client) | `src/lib/learner-sync.ts` |

**Today's cost per active learner per day (rough estimate):**
- 30 chat turns × ~1.5k input + 500 output tokens = **~$0.12/day** on Sonnet
- At 1000 learners × 90 days = **~$10,800 per cohort**

---

## The 8 Upgrades, Ranked By Impact × Safety

### Tier A — High impact, very low risk (DO FIRST)

#### PR-01 — Prompt caching on `/api/chat` and `/api/quiz`
- **What:** Mark the 152-line system prompt as cached (Anthropic `cache_control: ephemeral`). Within the 5-min cache window, repeat requests hit the cache at 10% of normal input-token cost.
- **How:** Vercel AI SDK supports this via `providerOptions.anthropic.cacheControl` on the system message. No dep change. ~15 lines of code.
- **UX impact:** ZERO. Identical replies. 100-300ms faster on cached hits (less Anthropic processing).
- **Cost impact:** **-30% to -60%** on chat costs after 5 min of steady traffic. At 1000 learners, saves ~$3-5k per cohort.
- **Risk:** Effectively zero. Rollback = revert the PR.
- **Effort:** 30 min.

#### PR-02 — Server-side retry with exponential backoff
- **What:** On 503/529/overloaded errors from Anthropic, retry 2x with backoff before returning `{ error }`.
- **How:** Wrap the `generateText` call in a small retry helper. Vercel AI SDK has built-in retry but current code doesn't configure it explicitly.
- **UX impact:** ZERO in the happy path. On transient failures, learner sees a slightly longer "thinking" indicator instead of "Chat service error."
- **Cost impact:** Marginal (~+1% from retries) — offset by fewer lost turns.
- **Risk:** Low. Bounded by 2 retries.
- **Effort:** 45 min.

#### PR-03 — Structured logging + latency metrics
- **What:** Replace `console.error` with structured JSON logs. Log per-turn: tokens-in, tokens-out, latency, cache hit, error class.
- **How:** Small `logger.ts` lib. Emits JSON. Vercel captures. Optional Sentry wire-up (deferred).
- **UX impact:** ZERO.
- **Operational impact:** You can now answer *"Which question is slowest? Which errors out most? What's my p95 latency?"*
- **Risk:** Zero.
- **Effort:** 45 min.

---

### Tier B — High impact, moderate surgery

#### PR-04 — Learner context injection (no new tables)
- **What:** When `/api/chat` receives `{ learnerId, moduleId, lang }`, do a fast Supabase read of `acharya_progress` and `acharya_quiz_attempts` for this learner, and prepend a short `[LEARNER CONTEXT]` block to the system prompt. Uses the cached prompt from PR-01 for the base, so only the small context block is un-cached.
- **How:** Add `buildLearnerContext(learnerId)` in `src/lib/`. Called inside `/api/chat` handler. ~40 lines.
- **UX impact:** ZERO visible. Replies become learner-aware: *"You just finished M07 on soil nutrients, so recall that NPK…"* — but the reply style, tone, length are unchanged.
- **Cost impact:** Small (+5% from extra tokens). Offset by better first-try answers → fewer follow-ups.
- **Risk:** Low. Context read failure falls back to generic answer.
- **Effort:** 2h.

#### PR-05 — Chat response streaming (opt-in via flag)
- **What:** Replace `generateText` (bulk) with `streamText` internally, reassemble into a single string before returning. OR: add a flag to enable true SSE streaming to the client later.
- **UX impact:** **ZERO** if we reassemble before returning (current contract preserved). If we want visible streaming, that's a separate future UX decision — not this PR.
- **Cost impact:** Same.
- **Risk:** Must carefully confirm the returned string matches the bulk response.
- **Effort:** 1.5h.

---

### Tier C — Good value, low risk, lower priority

#### PR-06 — Quiz result caching
- **What:** Cache generated quizzes by `{moduleId, lang}` in Supabase with a 7-day TTL. Serve from cache if present; only call Haiku on cache miss.
- **UX impact:** ZERO — same quiz shape. A learner who retakes the quiz within 7 days gets the same questions (today they get new ones — if Master Trainer says the fresh-questions feel is important, skip this).
- **Cost impact:** **-80% to -95%** on quiz costs (Haiku is already cheap, but 7-day reuse collapses to ~1 generation per module per week).
- **Risk:** Low. Flag-gate so we can disable.
- **Effort:** 1.5h.
- **Needs decision from you:** is quiz freshness part of the UX? If yes, don't do PR-06.

#### PR-07 — Module content pre-render at build time
- **What:** Modules table rarely changes. Next.js ISR (Incremental Static Regeneration) can pre-render module pages and revalidate every hour.
- **UX impact:** ZERO — same rendered output. Faster first paint on 4G.
- **Cost impact:** Slightly more Vercel build minutes. Less Supabase reads on every page load.
- **Risk:** Low.
- **Effort:** 1h.

---

### Tier D — Infrastructure, do last

#### PR-08 — Sentry (errors) + PostHog or Mixpanel (usage events) — optional
- **What:** Real error tracking and usage analytics. Sentry catches unhandled errors from both API and client.
- **UX impact:** ZERO.
- **Cost:** Free tier covers our scale.
- **Risk:** Zero.
- **Effort:** 1.5h.
- **Deferrable:** only wire up when pilot learner joins and we need real telemetry.

---

## What Is Explicitly NOT In This Plan

- ❌ Switching from Vercel AI SDK to raw Anthropic SDK (not needed — Vercel AI SDK supports cache_control)
- ❌ Switching from Messages API to Managed Agents (Master Trainer's decision — keeps Chhota simple)
- ❌ Adding sessions, memory tables, or persistent state beyond what exists
- ❌ Adding a Do Tab, TP Dashboard, photo diagnosis, weekly PDF, or any Bada capability (stays in `taksha-acharya-ccmanaged`)
- ❌ Changing the reply voice, tone, or length contract
- ❌ Adding new tabs, new pages, new routes that the user can see
- ❌ Touching anything in `src/app/(app)/**` (the frontend pages)
- ❌ Changing the `{ reply: string }` response shape

---

## Suggested Execution Order

| PR | Capability | Tier | Time | Risk | Priority |
|---|---|---|---|---|---|
| **PR-01** | Prompt caching | A | 30m | 🟢 none | **1st — do today** |
| **PR-02** | Retry on Anthropic errors | A | 45m | 🟢 none | 2nd |
| **PR-03** | Structured logging | A | 45m | 🟢 none | 3rd |
| **PR-04** | Learner context injection | B | 2h | 🟡 low | 4th (most UX bang from backend change) |
| **PR-05** | Streaming (invisible reassembly) | B | 1.5h | 🟡 medium | 5th |
| **PR-06** | Quiz caching (pending your OK) | C | 1.5h | 🟢 low | 6th — after your decision |
| **PR-07** | ISR on module pages | C | 1h | 🟢 low | 7th |
| **PR-08** | Sentry + analytics | D | 1.5h | 🟢 none | Last — when pilot joins |

**Total: ~10 hours** spread across ~6-8 PRs.

---

## Discipline For Every PR (what I commit to)

1. Feature branch (`feat/*` or `fix/*` or `chore/*`), never direct to `master`
2. Passes lint + typecheck + build in CI (I'll wait for green)
3. Preview deploy to Vercel preview URL
4. **Diff log in PR body:** UNCHANGED / CHANGED / ADDED / REMOVED
5. **Side-by-side comparison** of preview URL vs current live URL — one thing a reviewer can click
6. **Zero UX-observable differences** (or I explain why with screenshots before/after)
7. Squash-merge only, with atomic message
8. Git tag bracketing (`v{N}-before`, `v{N}-approved`) for rollback

---

## Questions For You Before PR-01

1. **OK to start with PR-01 (prompt caching) right now?** Smallest possible change, highest cost ROI, zero UX risk.
2. **On PR-04 (learner context):** any objection to adding a small read of existing Supabase tables inside `/api/chat`? No new tables. No schema change.
3. **On PR-06 (quiz caching):** is the current behavior of "every quiz is fresh" part of the UX that must be preserved? If yes, I skip PR-06.
4. **Sentry/PostHog (PR-08):** any org-level secret constraints? Or can I sign up with `ram@ky21c.org` and use free tier?

---

## Next Step After You Approve This Plan

I open **PR-01 (prompt caching)** as a feature branch PR. ~30 min. You review. If green, we promote and I go to PR-02. No batched merges. No multi-PR feature bombs.

---

*End of plan. Nothing in this doc has been coded yet. Zero code changes until you sign off.*
