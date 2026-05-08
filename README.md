# Taksha Acharya — Taksha Workshop Carpentry Skill Training

Internal AI training agent for the Taksha Workshop Carpentry Skill team. One of many Acharyas in the Gurukul platform. 21 modules, trilingual (Bangla/Hindi/English), mobile-first, phone-OTP gated.

**Source of truth for content:** `D:\obsidian-vault\01_projects\karmyog-vatika-gardens\training\vatika-training-playbook.md` (v2.0).

## Stack
Next.js 16 + React 19 + Tailwind v4 + Supabase (**`omnidel-platform` project, ref `wmiqcagazrixayzgmnws`, `gurukul` schema**) + Anthropic Claude Sonnet (chat, streaming) + Claude Haiku (quiz) + Google Chirp3-HD TTS (bn/hi/en).

## One-time setup (Ram, before first real use)

### 1. Apply schema + seed to Supabase
Open Supabase dashboard → project `omnidel-platform` (ref `wmiqcagazrixayzgmnws`) → SQL Editor. Paste and run in this order (these live in the `omnidel-work-os-main` repo, not this one):
- `supabase/migrations/gurukul_000_init.sql`
- `supabase/migrations/gurukul_001_backfill.sql`

### 2. Set Vercel env vars
On the Vercel project `taksha-acharya-app`, Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://wmiqcagazrixayzgmnws.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` = service-role key (server-only)
- `NEXT_PUBLIC_ACHARYA_SLUG` = `taksha`
- `SESSION_SECRET` = any long random string (same across all instances/deploys)
- `ANTHROPIC_API_KEY` = Anthropic API key
- `GEMINI_API_KEY` = Gemini API key for Live voice, and chat/quiz fallback when Anthropic is not set
- `GEMINI_LIVE_MODEL` = optional Gemini Live model override
- `GEMINI_TEXT_MODEL` / `GEMINI_QUIZ_MODEL` = optional Gemini fallback model overrides
- `GOOGLE_TTS_KEY` = Google Cloud TTS key

### 3. Trigger redeploy
After env vars are set, redeploy: `cd "E:\Omnidel.AI MetaFolder\training\taksha-acharya-app" && vercel`

> **Canonical location (2026-04-21):** `E:\Omnidel.AI MetaFolder\training\taksha-acharya-app` — moved from `D:\` under the E:-default-drive + OmniDEL-is-training-platform conventions.

## Access

- **Canonical URL:** https://taksha-acharya-app.vercel.app
- **Versioned URL:** https://taksha-acharya-v1-0418-initial.vercel.app
- **Login:** phone + OTP. OTP is `123456` for the pilot. Allow-list is `gurukul.users` on the platform project; ask an admin to add your number if you get "not registered".

## Content refresh workflow

When the vault playbook MD changes:
```
node scripts/generate-taksha-seed.js
```
Then re-apply `supabase/seed-taksha-content.sql` in Supabase SQL Editor.

## What's in v1

21 modules (M00–M20):
- M00 Welcome from Master Trainer (placeholder slot for founder video)
- M01 The 3-Month North Star (100 TMIL + 100 Balconies + 10 Projects + ₹25K/day = ₹1.085 Cr)
- M02–M20 The 19 playbook sections from the v2.0 training playbook

Trilingual status:
- **M00 + M01:** fully trilingual hand-crafted (THE spine)
- **M02–M20:** English canonical + bn/hi stubs tagged `status=review` for Ram + Reena post-preview edits

## Roadmap

- **v1.1:** phone-based auth replacing PIN; human bn/hi translations for M02–M20
- **v1.2:** gbrain-karmyog RAG layer for free-form Q&A beyond structured modules
- **v2:** Master Trainer's recorded welcome video wired into M00

## Dev

```
npm install
npm run dev       # local at http://localhost:3000
npm run build     # production build
npm run typecheck # TS check
```

---

_Forked from taksha-acharya-app. Different Supabase table prefix (`taksha_`), different system prompt, different persona, different content._
