import Image from 'next/image';

export const metadata = {
  title: 'Taksha Acharya — Technical Architecture',
  description: 'System architecture, data pipeline, and infrastructure for the Vocational Carpentry Trainee training platform',
};

export default function TechPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-forest text-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-5">
            <Image src="/brand/taksha.jpg" alt="Taksha" width={72} height={72} className="rounded-full border-3 border-gold shadow-lg" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Taksha Acharya</h1>
              <p className="text-white/60 text-base mt-1">Production Architecture Overview</p>
            </div>
          </div>
          <p className="text-white/80 text-lg mt-6 max-w-3xl leading-relaxed">
            AI-powered training platform for Vocational-certified carpentry trainees. 38 modules, trilingual (Bengali/Hindi/English),
            with voice-first interaction, adaptive quizzes, and field application assessment. Every learner interaction captured end-to-end.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* What's New — April 10 */}
        <section className="bg-forest/5 border-2 border-forest rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-forest text-white text-xs font-bold px-3 py-1 rounded-full">UPDATED APRIL 10, 2026</span>
            <h2 className="text-xl md:text-2xl font-bold text-forest">What Changed — Based on Nirmaan&apos;s Review</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">1. GitHub Organization — omnidel-ai</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Repo migrated from personal account (Rambadrinathan) to professional GitHub org: <strong>github.com/omnidel-ai</strong>.
                Team plan ($4/user/month). Repo is private. Branch protection enforced — no direct pushes to master,
                every change requires a Pull Request with at least 1 approval. Nirmaan invited as team member.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">2. CI/CD Pipeline — GitHub Actions</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">
                Every push and every Pull Request automatically runs 3 checks. If any check fails, the code is blocked from merging.
                No more deploying from the terminal and hoping nothing breaks.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-sage-dark text-center">
                  <p className="text-2xl font-bold text-forest">Lint</p>
                  <p className="text-xs text-stone-500 mt-1">ESLint — code quality and patterns</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-sage-dark text-center">
                  <p className="text-2xl font-bold text-forest">Type Check</p>
                  <p className="text-xs text-stone-500 mt-1">TypeScript — catches logical errors</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-sage-dark text-center">
                  <p className="text-2xl font-bold text-forest">Build</p>
                  <p className="text-xs text-stone-500 mt-1">Next.js — all 17 routes compile</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">3. Vercel AI SDK Migration</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">
                Replaced all raw <code className="bg-sage/50 px-1 rounded text-xs">fetch()</code> calls to the Anthropic API with the official Vercel AI SDK.
                Two key changes:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 border border-sage-dark">
                  <p className="text-sm font-bold text-stone-800">Chat — generateText()</p>
                  <p className="text-xs text-stone-500 mt-1">Official SDK handles HTTP, errors, and response parsing. Can swap Claude for GPT/Gemini in one line — no vendor lock-in.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-sage-dark">
                  <p className="text-sm font-bold text-stone-800">Quiz — generateObject() + Zod Schema</p>
                  <p className="text-xs text-stone-500 mt-1">Claude MUST return exactly 5 questions, 4 options each, valid correct index. Bengali quiz failures: <strong className="text-red-600">~10% before</strong> → <strong className="text-forest">0% now</strong>.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">4. Auto-Deploy on Merge</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Vercel connected to the GitHub org. Every merged PR auto-deploys to production. No more running <code className="bg-sage/50 px-1 rounded text-xs">npx vercel</code> from the terminal. The flow is now: code → push → CI checks → PR review → merge → live in 60 seconds.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">5. Phase B Codex Fixes (4 PRs)</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">
                Four separate PRs — each small, independent, auto-checked by CI:
              </p>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-sage-dark">
                  <span className="text-forest font-bold">PR #3</span>
                  <span className="text-stone-600">Quiz frontend validation — catches malformed responses before rendering</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-sage-dark">
                  <span className="text-forest font-bold">PR #4</span>
                  <span className="text-stone-600">Learn page race protection — cancels stale fetches on fast module switching</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-sage-dark">
                  <span className="text-forest font-bold">PR #5</span>
                  <span className="text-stone-600">Admin pagination — 50 learners per page, scales to 10,000+</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-sage-dark">
                  <span className="text-forest font-bold">PR #6</span>
                  <span className="text-stone-600">Session expiry — clears stale localStorage after 30 days</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System at a Glance */}
        <Section title="System at a Glance">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric value="12" label="Supabase Tables" detail="Content + Learner + Analytics" />
            <Metric value="115" label="Content Sections" detail="38 modules x 3-4 each" />
            <Metric value="345" label="Content Rows" detail="115 sections x 3 languages" />
            <Metric value="10/10" label="E2E Test" detail="All data paths verified" />
          </div>
        </Section>

        {/* Tech Stack */}
        <Section title="Technology Stack">
          <div className="space-y-3">
            <StackCard
              layer="Frontend"
              tech="Next.js 15 (App Router) + TypeScript"
              detail="11 routes (6 learner tabs + admin panel + reception + tech page). Tailwind CSS v4 with custom design tokens (forest, sage, cream, gold). Zustand for client state with localStorage persistence and SSR hydration safety layer."
            />
            <StackCard
              layer="Database"
              tech="Supabase (PostgreSQL) — 12 Tables"
              detail="Content tables (modules, sections, content, videos, badges) with public-read RLS. Learner tables (learners, progress, quiz_attempts, earned_badges, apply_logs) with write-enabled RLS. Analytics tables (chat_logs, events) for full interaction capture. Row Level Security on all tables. Foreign key constraints enforce referential integrity."
            />
            <StackCard
              layer="AI — Chat"
              tech="Claude Sonnet via Vercel AI SDK"
              detail="generateText() from @ai-sdk/anthropic. 252-line system prompt covering all 9 compulsory NOS + 6 electives. Taksha persona: warm, patient, field-focused. No markdown output (responses convert to speech). Model-portable — swap provider in one line."
            />
            <StackCard
              layer="AI — Quiz"
              tech="Claude Haiku via Vercel AI SDK + Zod"
              detail="generateObject() with Zod schema enforcement. Guarantees exactly 5 MCQs with 4 options each — zero JSON parse failures in any language. Bengali/Hindi quiz reliability: ~90% (old) → 100% (current). Questions + answers cached in Supabase."
            />
            <StackCard
              layer="AI — Apply"
              tech="Claude Sonnet (Evaluation Mode)"
              detail="Field application assessment. Farmer describes what they did (voice or text). Sonnet evaluates against QP criteria. Returns structured JSON: score (1-10), specific feedback, next step. Logged to acharya_apply_logs."
            />
            <StackCard
              layer="Voice"
              tech="Google Cloud TTS (Chirp3-HD) + Web Speech API"
              detail="TTS: bn-IN/hi-IN/en-IN male voice (Orus). Pre-processing strips markdown, fixes numeric ranges, removes emoji. Speech input: browser-native Web Speech API, zero cost, supports Bengali/Hindi/English recognition."
            />
            <StackCard
              layer="Auth"
              tech="Supabase Auth + Device Fingerprint"
              detail="Learners: anonymous device-based identity. Canvas + screen + timezone + language hash generates stable fingerprint. No email required. Admin: email/password via Supabase Auth with session management."
            />
            <StackCard
              layer="Deploy"
              tech="Vercel (Auto-deploy from GitHub)"
              detail="Connected to GitHub org (omnidel-ai). Every merged PR auto-deploys to production. Preview deployments on every PR branch. Serverless functions for API routes. Static pre-rendering for learner pages."
            />
            <StackCard
              layer="CI/CD"
              tech="GitHub Actions + Branch Protection"
              detail="Every push runs 3 checks: ESLint (code quality), TypeScript (type safety), Next.js build (compilation). Branch protection on master — no direct pushes, every change requires a PR with at least 1 approval. Secrets managed via GitHub Secrets."
            />
          </div>
        </Section>

        {/* Database Schema */}
        <Section title="Database Schema — 12 Tables">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold text-forest mb-3">Content Tables (admin-managed)</h3>
              <div className="space-y-2">
                <TableRow name="acharya_modules" rows="38" desc="ID, NOS code, trilingual titles, icon, hours, sort order, group" />
                <TableRow name="acharya_sections" rows="115" desc="FK to module, trilingual titles, sort order, estimated hours" />
                <TableRow name="acharya_content" rows="345" desc="FK to section, lang (bn/hi/en), markdown body, publish status" />
                <TableRow name="acharya_videos" rows="120" desc="YouTube ID, FK to module, trilingual titles, duration" />
                <TableRow name="acharya_badges" rows="7" desc="ID, icon, trilingual titles, condition description" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-forest mb-3">Learner Tables (auto-captured)</h3>
              <div className="space-y-2">
                <TableRow name="acharya_learners" rows="auto" desc="Device fingerprint, name, phone, preferred language, last seen" />
                <TableRow name="acharya_progress" rows="auto" desc="Per learner per module. Sections completed array, completion flag" />
                <TableRow name="acharya_quiz_attempts" rows="auto" desc="Score, total, full questions+answers cached as JSON" />
                <TableRow name="acharya_earned_badges" rows="auto" desc="Badge ID, earned timestamp" />
                <TableRow name="acharya_apply_logs" rows="auto" desc="Voice/text input, AI score, feedback, next step as JSON" />
                <TableRow name="acharya_chat_logs" rows="auto" desc="User message, AI response, response time (ms), language, module" />
                <TableRow name="acharya_events" rows="auto" desc="Event type, module, JSONB payload. Every interaction." />
              </div>
            </div>
          </div>
        </Section>

        {/* Data Pipeline */}
        <Section title="Data Pipeline — Every Interaction Captured">
          <p className="text-base text-stone-600 mb-4">
            Fire-and-forget async writes. localStorage as instant cache, Supabase as permanent record.
            Network failure does not block UI. Data syncs on next successful write.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-forest text-white">
                  <th className="text-left px-4 py-3 font-semibold">User Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Frontend Function</th>
                  <th className="text-left px-4 py-3 font-semibold">Supabase Table</th>
                  <th className="text-left px-4 py-3 font-semibold">Data Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage">
                <PipelineRow action="First visit" fn="initLearner()" table="acharya_learners" data="Device fingerprint, language, timestamp" />
                <PipelineRow action="Return visit" fn="initLearner()" table="acharya_learners" data="last_seen updated" />
                <PipelineRow action="Switch tab" fn="trackEvent()" table="acharya_events" data="page_view, tab name, module context" />
                <PipelineRow action="Expand section" fn="trackEvent()" table="acharya_events" data="section_expand, section ID" />
                <PipelineRow action="Mark complete" fn="syncProgress()" table="acharya_progress" data="Sections array, completion %, timestamp" />
                <PipelineRow action="Ask Taksha" fn="syncChatMessage()" table="acharya_chat_logs" data="User msg, AI response, response time (ms), lang" />
                <PipelineRow action="Take quiz" fn="syncQuizAttempt()" table="acharya_quiz_attempts" data="Score, all 5 Q+A cached, module, timestamp" />
                <PipelineRow action="Field apply" fn="syncApplyLog()" table="acharya_apply_logs" data="Voice/text input, AI score, feedback, next step" />
                <PipelineRow action="Earn badge" fn="trackEvent()" table="acharya_earned_badges" data="Badge ID, earned timestamp" />
                <PipelineRow action="Switch language" fn="initLearner()" table="acharya_learners" data="preferred_lang updated" />
              </tbody>
            </table>
          </div>
        </Section>

        {/* Architecture Diagram */}
        <Section title="System Architecture">
          <pre className="bg-stone-900 text-green-400 text-sm md:text-base p-6 rounded-2xl overflow-x-auto leading-relaxed font-mono shadow-lg">{`
┌────────────────────────────────────────────────────────────┐
│                    VERCEL (Serverless Edge)                 │
│                                                            │
│  Reception ─► 6 Learner Tabs ─► Admin Panel               │
│    /           /learn /ask /quiz /video /apply /progress   │
│                /admin /admin/modules /admin/learners       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Client State (Zustand)                  │   │
│  │   selectedModule | lang | progress | chatHistory     │   │
│  │   quizAttempts | earnedBadges | learnerId            │   │
│  │   ──── persisted to localStorage ────                │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────┐  ┌────────┴──────┐  ┌──────────┐            │
│  │ /api/chat│  │  /api/quiz    │  │ /api/tts │            │
│  │ AI SDK   │  │  AI SDK+Zod   │  │ Chirp3   │            │
│  └────┬─────┘  └───────┬──────┘  └────┬─────┘            │
└───────┼────────────────┼──────────────┼────────────────────┘
        │                │              │
   ┌────▼──────┐  ┌──────▼──────┐  ┌───▼──────────┐
   │  Claude   │  │   Claude    │  │  Google TTS  │
   │  Sonnet   │  │   Haiku     │  │  Chirp3-HD   │
   │  (chat +  │  │   (quiz)    │  │  (bn/hi/en)  │
   │  apply)   │  │             │  │              │
   └───────────┘  └─────────────┘  └──────────────┘

   ┌─────────────────────────────────────────────────┐
   │              SUPABASE (PostgreSQL)               │
   │                                                  │
   │  CONTENT (read)          LEARNER (write)         │
   │  ┌─────────────────┐    ┌─────────────────────┐ │
   │  │ modules     38  │    │ learners    (auto)   │ │
   │  │ sections   115  │    │ progress    (auto)   │ │
   │  │ content    345  │    │ quiz_attempts (auto) │ │
   │  │ videos     120  │    │ earned_badges (auto) │ │
   │  │ badges       7  │    │ apply_logs  (auto)   │ │
   │  └─────────────────┘    │ chat_logs   (auto)   │ │
   │                          │ events      (auto)   │ │
   │  RLS: public-read        └─────────────────────┘ │
   │                          RLS: anon write-enabled  │
   │                                                   │
   │  Auth: device fingerprint (learner)               │
   │        email/password (admin)                     │
   └───────────────────────────────────────────────────┘`}
          </pre>
        </Section>

        {/* Content Architecture */}
        <Section title="Content Architecture">
          <p className="text-base text-stone-600 mb-4">
            Content stored per-section per-language. Each language is a separate row with its own publish status.
            Bengali can ship before Hindi is ready. Admin panel provides CRUD for all content.
          </p>
          <pre className="bg-white border border-sage-dark rounded-xl p-5 text-sm font-mono text-stone-700 overflow-x-auto">{`Module M07: Soil Nutrients (30h)
├── Section 1: NPK ও অণুপুষ্টি (7h)
│   ├── content [bn] 800 words — published
│   ├── content [hi] 600 words — published
│   └── content [en] 700 words — published
├── Section 2: জৈব সার (8h)
│   ├── content [bn] 750 words — published
│   ├── content [hi] 500 words — published
│   └── content [en] 650 words — published
├── Section 3: রাসায়নিক সার (8h)
│   └── ... (3 languages)
└── Section 4: সমন্বিত পুষ্টি ব্যবস্থাপনা (7h)
    └── ... (3 languages)`}</pre>
        </Section>

        {/* Learner Experience */}
        <Section title="Learner Experience — 7 Screens">
          <div className="grid md:grid-cols-2 gap-4">
            <TabCard icon="🏠" name="Reception" desc="Welcome page with Taksha intro, Vocational certification badge, feature preview, and language selection (big buttons: Bengali / Hindi / English). No cold drops." />
            <TabCard icon="📖" name="শেখো (Learn)" desc="Expandable sections with trilingual content per module. Mark complete per section. Progress tracked locally + Supabase." />
            <TabCard icon="💬" name="জিজ্ঞেস করো (Ask)" desc="AI chat with Taksha persona. Voice input (Web Speech API) + voice output (TTS). Quick action buttons. Module-contextualized. Every message logged." />
            <TabCard icon="📝" name="পরীক্ষা (Quiz)" desc="5 MCQs generated on demand by Haiku. Trilingual. Score + explanation per question. Retry for Bengali JSON stability. All attempts saved." />
            <TabCard icon="🌾" name="প্রয়োগ (Apply)" desc="Voice-first field application recording. Farmer speaks/types what they did. Sonnet evaluates with score (1-10), feedback, next step. All evaluations logged." />
            <TabCard icon="📊" name="অগ্রগতি (Progress)" desc="Overall + per-module toggle. Modules completed, quiz scores, badges earned. Reads from Zustand (instant) backed by Supabase (persistent)." />
            <TabCard icon="🔧" name="Admin Panel" desc="Auth-gated (email/password). Dashboard with content coverage stats. Module list with section/content counts. Per-module content editor (add/edit/delete sections, 3 languages). Learner analytics." />
          </div>
        </Section>

        {/* QA */}
        <Section title="Quality Assurance">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
              <h3 className="text-base font-bold text-forest mb-3">4-Layer Code QA</h3>
              <div className="space-y-3">
                <QAItem num={1} title="Static Review" desc="3 parallel agents. 13 bugs found and fixed pre-deploy: hydration mismatches, missing error handling, stale closures, Supabase client crash safety." />
                <QAItem num={2} title="Build + Route" desc="Zero errors, zero warnings. 11 routes smoke-tested. All API routes return proper JSON errors." />
                <QAItem num={3} title="Visual + Functional" desc="Headless browser (Playwright). Screenshots of every page. Language switching, section expand, mobile viewport (375px), admin login." />
                <QAItem num={4} title="DB Integrity" desc="12 SQL checks: module count, section coverage, content per language, no orphans, no fake Bengali/Hindi, no empty content, no duplicate sort orders." />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
              <h3 className="text-base font-bold text-forest mb-3">E2E Data Pipeline Test</h3>
              <p className="text-sm text-stone-600 mb-3">
                Automated Node.js script simulates complete user journey. Hits live Vercel APIs. Verifies every write in Supabase. Cleans up after.
              </p>
              <pre className="bg-sage/30 text-xs font-mono p-3 rounded-lg text-stone-700 leading-relaxed">{`node scripts/e2e-user-journey.js

 1. LEARNER CREATION
   ✓ Create learner with device fingerprint
 2. PAGE VIEW TRACKING
   ✓ Track /learn page view
   ✓ Track /ask page view
 3. SECTION INTERACTION
   ✓ Track section expand
 4. PROGRESS SYNC
   ✓ Save progress — 1 section complete
   ✓ Track section_complete event
 5. CHAT + SYNC
   ✓ Send chat to live API and save log
 6. QUIZ + SYNC
   ✓ Generate quiz and save attempt
 7. APPLY + SYNC
   ✓ Submit evaluation and save log
 8. VERIFICATION
   ✓ All records exist (7 events,
     1 chat, 1 quiz, 1 progress, 1 apply)

RESULT: 10/10 passed, 0 failed`}</pre>
            </div>
          </div>
        </Section>

        {/* Security Hardening */}
        <Section title="Security Hardening (Codex Audit)">
          <p className="text-base text-stone-600 mb-4">
            Full codebase audit performed by GPT-5.4 (OpenAI Codex). 232,854 tokens analyzed.
            Every source file in src/ and supabase/migrations/ reviewed. All CRITICAL and HIGH findings fixed.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
              <h3 className="text-base font-bold text-red-600 mb-3">What Codex Found</h3>
              <div className="space-y-2 text-sm">
                <Finding severity="CRITICAL" desc="RLS wide open on all learner tables. Any anon client could read/write every learner's data." />
                <Finding severity="CRITICAL" desc="Chat logs and analytics fully exposed. Conversations harvestable by any client." />
                <Finding severity="HIGH" desc="Admin panel had no role check. Any authenticated user could access admin." />
                <Finding severity="HIGH" desc="Admin CRUD broken. Content tables had SELECT-only policies." />
                <Finding severity="HIGH" desc="AI API endpoints (chat, quiz, TTS) unprotected. No rate limit, no auth, no input validation." />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
              <h3 className="text-base font-bold text-forest mb-3">What We Fixed</h3>
              <div className="space-y-2 text-sm">
                <Fix title="RLS Tightened" desc="Learner tables: anon INSERT-only for events/chat/apply. Admin (authenticated) gets full read for analytics. 7 migrations applied." />
                <Fix title="Admin Role Enforced" desc="Only the designated admin email can access /admin. Others see 'Access Denied'." />
                <Fix title="Admin CRUD Fixed" desc="Content tables now have INSERT/UPDATE/DELETE policies for authenticated role." />
                <Fix title="API Rate-Limited" desc="10 requests/min per IP on all AI endpoints. Input validation: message 2000 chars, text 5000 chars." />
                <Fix title="E2E Verified" desc="All 10 data pipeline tests pass after security hardening. Zero functionality regression." />
              </div>
            </div>
          </div>
          <div className="bg-sage/30 rounded-xl p-5 border border-sage-dark">
            <h3 className="text-base font-bold text-forest mb-2">RLS Policy Summary (Current Production)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-forest/20">
                    <th className="text-left py-2 pr-4 font-semibold text-stone-700">Table</th>
                    <th className="text-center py-2 px-2 font-semibold text-stone-700">Anon Read</th>
                    <th className="text-center py-2 px-2 font-semibold text-stone-700">Anon Write</th>
                    <th className="text-center py-2 px-2 font-semibold text-stone-700">Admin Read</th>
                    <th className="text-center py-2 px-2 font-semibold text-stone-700">Admin Write</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage text-xs">
                  <RLSRow table="modules, sections, content, videos, badges" anonR="Yes" anonW="No" adminR="Yes" adminW="Yes" />
                  <RLSRow table="learners" anonR="Yes (own)" anonW="INSERT" adminR="Yes (all)" adminW="No" />
                  <RLSRow table="progress" anonR="Yes (own)" anonW="INSERT + UPDATE" adminR="Yes (all)" adminW="No" />
                  <RLSRow table="quiz_attempts" anonR="Yes (own)" anonW="INSERT" adminR="Yes (all)" adminW="No" />
                  <RLSRow table="chat_logs, events, apply_logs" anonR="No" anonW="INSERT" adminR="Yes (all)" adminW="No" />
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Key Design Decisions */}
        <Section title="Key Design Decisions">
          <div className="grid md:grid-cols-2 gap-4">
            <Decision q="Why not a native mobile app?" a="Target users have Rs 8,000 Android phones with 32GB storage. PWA avoids the app store barrier. Chrome on Android supports speech recognition, TTS, and offline localStorage. One link. No install." />
            <Decision q="Why content per-row per-language, not JSON columns?" a="Each language gets its own publish status. Bengali content can ship while Hindi is still being reviewed. The admin panel shows word count per language per section. Supabase queries filter by lang column, not JSON path." />
            <Decision q="Why Zustand over React Context?" a="One line of middleware gives localStorage persistence across sessions. SSR hydration handled with a useHydrated hook that shows a spinner until the store rehydrates. Context can not do either." />
            <Decision q="Why Haiku for quiz, Sonnet for chat?" a="Cost. Chat needs the full 252-line system prompt with persona and deep QP knowledge (700 token responses). Quiz needs structured 5-MCQ JSON. Haiku is 10x cheaper. Zod schema via generateObject() enforces exact output structure — zero parse failures in any language." />
            <Decision q="Why anonymous device fingerprint for learners?" a="Target users do not have email accounts. Canvas + screen + timezone + language hash generates a stable ID without asking the user anything. Optional name/phone fields for later identification. Zero friction on first visit." />
            <Decision q="Why fire-and-forget for Supabase writes?" a="A farmer on 4G in rural Bengal cannot wait for a database round-trip before the UI responds. localStorage is the source of truth for the session. Supabase is the permanent record. If the write fails, the user never knows. Data syncs eventually." />
          </div>
        </Section>

        {/* Development Process */}
        <Section title="Development Process">
          <p className="text-base text-stone-600 mb-6">
            Professional CI/CD pipeline. No manual deploys. Every change is checked, reviewed, and auto-deployed.
          </p>
          <pre className="bg-stone-900 text-green-400 text-sm md:text-base p-6 rounded-2xl overflow-x-auto leading-relaxed font-mono shadow-lg">{`
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                         │
│                                                                 │
│  Developer writes code                                         │
│       │                                                         │
│       ▼                                                         │
│  git push (feature branch)                                     │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              GITHUB ACTIONS (automatic)                  │   │
│  │                                                          │   │
│  │   ┌──────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │   │  LINT    │  │  TYPECHECK  │  │     BUILD        │  │   │
│  │   │  ESLint  │  │  tsc        │  │  next build      │  │   │
│  │   │          │  │  --noEmit   │  │  (all 17 routes) │  │   │
│  │   └────┬─────┘  └──────┬──────┘  └────────┬─────────┘  │   │
│  │        │               │                   │             │   │
│  │        └───────────────┼───────────────────┘             │   │
│  │                        │                                 │   │
│  │              All 3 pass? ──► ✅ Green checkmark          │   │
│  │              Any fails?  ──► ❌ Red X (blocked)          │   │
│  └────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  Pull Request created                                          │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BRANCH PROTECTION (enforced)                │   │
│  │                                                          │   │
│  │   • CI must pass (all 3 checks green)                   │   │
│  │   • At least 1 reviewer must approve                    │   │
│  │   • No direct pushes to master                          │   │
│  └────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  Reviewer approves + merges to master                          │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              VERCEL (automatic)                          │   │
│  │                                                          │   │
│  │   Detects merge ──► Builds ──► Deploys to production    │   │
│  │                                                          │   │
│  │   taksha-acharya-app.vercel.app                       │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

INFRASTRUCTURE

  GitHub Org:  github.com/omnidel-ai
  CI/CD:       GitHub Actions (lint + typecheck + build)
  Hosting:     Vercel (auto-deploy on merge)
  Database:    Supabase (PostgreSQL + RLS)
  AI:          Vercel AI SDK (@ai-sdk/anthropic)
  Schema:      Zod (structured AI output)
  Secrets:     GitHub Secrets (4 keys encrypted)`}
          </pre>
        </Section>

        {/* Links */}
        <Section title="Links">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <LinkCard label="Live App" url="https://taksha-acharya-app.vercel.app" />
            <LinkCard label="Admin Panel" url="https://taksha-acharya-app.vercel.app/admin" />
            <LinkCard label="GitHub" url="https://github.com/omnidel-ai/taksha-acharya-app" />
            <LinkCard label="Supabase" url="https://supabase.com/dashboard/project/jzrsnfpgydiaoeiijypm" />
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-10 border-t border-sage-dark mt-8">
          <p className="text-sm text-stone-500">
            Vocational Qualification Pack AGR/Q0405 v2.0 (Carpentry Trainee, NSQF Level 4)
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Agriculture Skill Council of India. Approved 22-10-2024.
          </p>
          <p className="text-xs text-stone-400 mt-1">
            390-540 hours. 9 Compulsory NOS (70%) + 6 Elective NOS (30%). Assessment: MCQ 20-30%, Viva 20%, Practical 50-60%.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold text-forest mb-5 pb-3 border-b-2 border-forest/20">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm text-center">
      <p className="text-3xl md:text-4xl font-bold text-forest">{value}</p>
      <p className="text-sm font-bold text-stone-700 mt-1">{label}</p>
      <p className="text-xs text-stone-400 mt-0.5">{detail}</p>
    </div>
  );
}

function StackCard({ layer, tech, detail }: { layer: string; tech: string; detail: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <span className="text-xs font-bold text-white bg-forest px-2 py-0.5 rounded">{layer}</span>
        <span className="text-base font-bold text-stone-800 font-mono">{tech}</span>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{detail}</p>
    </div>
  );
}

function TableRow({ name, rows, desc }: { name: string; rows: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 bg-sage/20 rounded-lg px-3 py-2">
      <code className="text-xs font-mono text-forest font-bold whitespace-nowrap mt-0.5">{name}</code>
      <span className="text-xs text-stone-400 whitespace-nowrap mt-0.5">({rows})</span>
      <span className="text-xs text-stone-600 leading-snug">{desc}</span>
    </div>
  );
}

function PipelineRow({ action, fn, table, data }: { action: string; fn: string; table: string; data: string }) {
  return (
    <tr className="hover:bg-sage/20">
      <td className="px-4 py-3 font-semibold text-stone-800 text-sm">{action}</td>
      <td className="px-4 py-3 font-mono text-xs text-forest">{fn}</td>
      <td className="px-4 py-3 font-mono text-xs text-stone-500">{table}</td>
      <td className="px-4 py-3 text-sm text-stone-600">{data}</td>
    </tr>
  );
}

function TabCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-xl p-4 border border-sage-dark shadow-sm">
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <h3 className="text-base font-bold text-stone-800">{name}</h3>
        <p className="text-sm text-stone-600 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Decision({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-sage-dark shadow-sm">
      <p className="text-base font-bold text-forest">{q}</p>
      <p className="text-sm text-stone-600 mt-2 leading-relaxed">{a}</p>
    </div>
  );
}

function QAItem({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 bg-forest text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{num}</span>
      <div>
        <h4 className="text-sm font-bold text-stone-800">{title}</h4>
        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function LinkCard({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block bg-white rounded-xl p-4 border border-sage-dark shadow-sm hover:border-forest hover:shadow-md transition-all">
      <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm text-forest font-bold mt-1 truncate">{url.replace('https://', '')}</p>
    </a>
  );
}

function Finding({ severity, desc }: { severity: string; desc: string }) {
  const color = severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${color}`}>{severity}</span>
      <span className="text-stone-600 leading-snug">{desc}</span>
    </div>
  );
}

function Fix({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-forest text-sm flex-shrink-0 mt-0.5">&#10003;</span>
      <div>
        <span className="font-bold text-stone-800">{title}:</span>{' '}
        <span className="text-stone-600">{desc}</span>
      </div>
    </div>
  );
}

function RLSRow({ table, anonR, anonW, adminR, adminW }: { table: string; anonR: string; anonW: string; adminR: string; adminW: string }) {
  return (
    <tr>
      <td className="py-2 pr-4 font-mono text-stone-700">{table}</td>
      <td className="py-2 px-2 text-center">{anonR}</td>
      <td className="py-2 px-2 text-center">{anonW}</td>
      <td className="py-2 px-2 text-center">{adminR}</td>
      <td className="py-2 px-2 text-center">{adminW}</td>
    </tr>
  );
}
