# logs/

Runtime log files written by the server. Not checked in (see `.gitignore`).

- `app.log` — structured app events (one JSON per line).
- `ai/calls.jsonl` — every paid AI / TTS call with tokens + computed USD cost.

Inspect the dashboard at `/admin/usage` (admin-only) or tail manually:

```bash
tail -f logs/app.log
tail -f logs/ai/calls.jsonl | jq .
```

On Vercel, the filesystem is read-only, so these files exist only in dev.
For prod-grade retention, forward via Axiom / Logtail / a Supabase table.
