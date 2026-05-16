create extension if not exists pgcrypto;

create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null,
  username text,
  first_name text,
  last_name text,
  preferred_lang text not null default 'en' check (preferred_lang in ('bn', 'hi', 'en')),
  selected_module_id text,
  mode text not null default 'chat' check (mode in ('chat')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.telegram_chat_logs (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete cascade,
  module_id text,
  lang text not null default 'en' check (lang in ('bn', 'hi', 'en')),
  user_message text not null,
  ai_response text not null,
  response_time_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_progress (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete cascade,
  module_id text not null,
  sections_completed jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (telegram_user_id, module_id)
);

create table if not exists public.telegram_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete cascade,
  module_id text not null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  current_index integer not null default 0,
  score integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete cascade,
  module_id text not null,
  score integer not null,
  total integer not null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telegram_chat_logs_user_created_idx
  on public.telegram_chat_logs (telegram_user_id, created_at desc);

create index if not exists telegram_progress_user_idx
  on public.telegram_progress (telegram_user_id);

create index if not exists telegram_quiz_sessions_user_status_idx
  on public.telegram_quiz_sessions (telegram_user_id, status, created_at desc);

create index if not exists telegram_quiz_attempts_user_created_idx
  on public.telegram_quiz_attempts (telegram_user_id, created_at desc);

alter table public.telegram_users enable row level security;
alter table public.telegram_chat_logs enable row level security;
alter table public.telegram_progress enable row level security;
alter table public.telegram_quiz_sessions enable row level security;
alter table public.telegram_quiz_attempts enable row level security;

drop policy if exists "telegram bot users all" on public.telegram_users;
drop policy if exists "telegram bot chat logs all" on public.telegram_chat_logs;
drop policy if exists "telegram bot progress all" on public.telegram_progress;
drop policy if exists "telegram bot quiz sessions all" on public.telegram_quiz_sessions;
drop policy if exists "telegram bot quiz attempts all" on public.telegram_quiz_attempts;

create policy "telegram bot users all"
  on public.telegram_users
  for all
  to anon
  using (true)
  with check (true);

create policy "telegram bot chat logs all"
  on public.telegram_chat_logs
  for all
  to anon
  using (true)
  with check (true);

create policy "telegram bot progress all"
  on public.telegram_progress
  for all
  to anon
  using (true)
  with check (true);

create policy "telegram bot quiz sessions all"
  on public.telegram_quiz_sessions
  for all
  to anon
  using (true)
  with check (true);

create policy "telegram bot quiz attempts all"
  on public.telegram_quiz_attempts
  for all
  to anon
  using (true)
  with check (true);
