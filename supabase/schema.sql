-- ============================================================================
-- Taksha Acharya — Supabase schema
-- Run this entire file in the Supabase SQL editor of your new project.
-- ============================================================================


-- ============================================================================
-- SCHEMAS
-- ============================================================================

create schema if not exists gunakul;
create schema if not exists acharya_taksha;


-- ============================================================================
-- PART 1: gunakul schema  (identity, masters, telemetry)
-- ============================================================================

-- Acharyas registry
create table if not exists gunakul.mst_acharyas (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  is_active   boolean not null default true,
  is_deleted  boolean not null default false,
  created_on  timestamptz not null default now()
);

-- Roles (learner / admin / founder)
create table if not exists gunakul.mst_roles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  created_on  timestamptz not null default now()
);

-- Learner categories (e.g. carpentry-trainee)
create table if not exists gunakul.mst_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  is_deleted  boolean not null default false,
  created_on  timestamptz not null default now()
);

-- Which categories have access to which acharyas
create table if not exists gunakul.map_category_acharya (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references gunakul.mst_categories(id) on delete cascade,
  acharya_id  uuid not null references gunakul.mst_acharyas(id) on delete cascade,
  created_on  timestamptz not null default now(),
  unique (category_id, acharya_id)
);

-- Users (learners + admins)
create table if not exists gunakul.mst_users (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null unique,
  name           text,
  preferred_lang text not null default 'bn' check (preferred_lang in ('bn', 'hi', 'en')),
  role_id        uuid references gunakul.mst_roles(id),
  category_id    uuid references gunakul.mst_categories(id),
  is_active      boolean not null default true,
  is_deleted     boolean not null default false,
  last_seen_on   timestamptz,
  created_on     timestamptz not null default now()
);

-- Event tracking (module open, section complete, etc.)
create table if not exists gunakul.log_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references gunakul.mst_users(id) on delete set null,
  acharya_id  uuid references gunakul.mst_acharyas(id) on delete set null,
  event_type  text not null,
  event_data  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Learning progress per module
create table if not exists gunakul.log_progress (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references gunakul.mst_users(id) on delete cascade,
  acharya_id         uuid not null references gunakul.mst_acharyas(id) on delete cascade,
  module_id          uuid not null,
  sections_completed jsonb not null default '[]'::jsonb,
  completed          boolean not null default false,
  completed_at       timestamptz,
  updated_on         timestamptz not null default now(),
  created_on         timestamptz not null default now(),
  unique (user_id, acharya_id, module_id)
);

-- Quiz attempts
create table if not exists gunakul.log_quiz (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references gunakul.mst_users(id) on delete set null,
  acharya_id  uuid references gunakul.mst_acharyas(id) on delete set null,
  module_id   uuid,
  score       integer not null default 0,
  total       integer not null default 0,
  questions   jsonb not null default '[]'::jsonb,
  created_on  timestamptz not null default now()
);

-- Chat conversation logs
create table if not exists gunakul.log_chat (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references gunakul.mst_users(id) on delete set null,
  acharya_id       uuid references gunakul.mst_acharyas(id) on delete set null,
  module_id        uuid,
  lang             text not null default 'en' check (lang in ('bn', 'hi', 'en')),
  user_message     text not null,
  ai_response      text not null,
  response_time_ms integer,
  created_on       timestamptz not null default now()
);

-- AI service call logs (cost tracking)
create table if not exists gunakul.log_ai_usage (
  id                   uuid primary key default gen_random_uuid(),
  ts                   timestamptz not null default now(),
  service              text,
  model                text,
  status               text,
  duration_ms          integer,
  input_tokens         integer,
  output_tokens        integer,
  cached_input_tokens  integer,
  chars                integer,
  lang                 text,
  acharya_id           uuid references gunakul.mst_acharyas(id) on delete set null,
  module_id            text,
  has_image            boolean not null default false,
  cost_usd             numeric(10,6),
  error_message        text
);

-- Self-assessment / apply logs
create table if not exists gunakul.log_apply (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references gunakul.mst_users(id) on delete set null,
  acharya_id  uuid references gunakul.mst_acharyas(id) on delete set null,
  module_id   uuid,
  log_type    text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists log_events_user_idx      on gunakul.log_events    (user_id, created_at desc);
create index if not exists log_events_acharya_idx   on gunakul.log_events    (acharya_id, created_at desc);
create index if not exists log_progress_user_idx    on gunakul.log_progress  (user_id, acharya_id);
create index if not exists log_quiz_user_idx        on gunakul.log_quiz      (user_id, acharya_id, created_on desc);
create index if not exists log_chat_user_idx        on gunakul.log_chat      (user_id, acharya_id, created_on desc);
create index if not exists log_ai_usage_ts_idx      on gunakul.log_ai_usage  (ts desc);
create index if not exists log_apply_user_idx       on gunakul.log_apply     (user_id, acharya_id, created_at desc);
create index if not exists mst_users_phone_idx      on gunakul.mst_users     (phone);

-- RLS (all access is server-side via service_role key which bypasses RLS;
-- enabling RLS here blocks any accidental anon/authenticated direct access)
alter table gunakul.mst_acharyas         enable row level security;
alter table gunakul.mst_roles            enable row level security;
alter table gunakul.mst_categories       enable row level security;
alter table gunakul.map_category_acharya enable row level security;
alter table gunakul.mst_users            enable row level security;
alter table gunakul.log_events           enable row level security;
alter table gunakul.log_progress         enable row level security;
alter table gunakul.log_quiz             enable row level security;
alter table gunakul.log_chat             enable row level security;
alter table gunakul.log_ai_usage         enable row level security;
alter table gunakul.log_apply            enable row level security;


-- ============================================================================
-- PART 2: acharya_taksha schema  (course content)
-- ============================================================================

-- Course modules
create table if not exists acharya_taksha.crs_modules (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  sort_order       integer not null default 0,
  theory_hours     numeric(4,1) not null default 0,
  practical_hours  numeric(4,1) not null default 0,
  icon             text,
  group_key        text,
  group_label_en   text,
  group_label_bn   text,
  group_label_hi   text,
  is_deleted       boolean not null default false,
  created_on       timestamptz not null default now()
);

-- Module translations (one row per module per language)
create table if not exists acharya_taksha.crs_module_tr (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references acharya_taksha.crs_modules(id) on delete cascade,
  lang        text not null check (lang in ('bn', 'hi', 'en')),
  title       text not null,
  short_desc  text,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  unique (module_id, lang)
);

-- Course sections
create table if not exists acharya_taksha.crs_sections (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references acharya_taksha.crs_modules(id) on delete cascade,
  slug             text not null,
  sort_order       integer not null default 0,
  estimated_hours  numeric(4,1) not null default 0,
  is_deleted       boolean not null default false,
  created_on       timestamptz not null default now(),
  unique (module_id, slug)
);

-- Section translations (one row per section per language)
create table if not exists acharya_taksha.crs_section_tr (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references acharya_taksha.crs_sections(id) on delete cascade,
  lang        text not null check (lang in ('bn', 'hi', 'en')),
  title       text not null,
  body        text,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  unique (section_id, lang)
);

-- Course videos
create table if not exists acharya_taksha.crs_videos (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references acharya_taksha.crs_modules(id) on delete cascade,
  youtube_id       text not null,
  start_seconds    integer not null default 0,
  duration         integer,
  sort_order       integer not null default 0,
  is_deleted       boolean not null default false,
  created_on       timestamptz not null default now()
);

-- Video translations
create table if not exists acharya_taksha.crs_video_tr (
  id        uuid primary key default gen_random_uuid(),
  video_id  uuid not null references acharya_taksha.crs_videos(id) on delete cascade,
  lang      text not null check (lang in ('bn', 'hi', 'en')),
  title     text not null,
  unique (video_id, lang)
);

-- Per-acharya config key-value store
create table if not exists acharya_taksha.mst_config (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       text,
  updated_on  timestamptz not null default now()
);

-- Indexes
create index if not exists crs_modules_sort_idx   on acharya_taksha.crs_modules  (sort_order) where is_deleted = false;
create index if not exists crs_sections_mod_idx   on acharya_taksha.crs_sections (module_id, sort_order) where is_deleted = false;
create index if not exists crs_videos_mod_idx     on acharya_taksha.crs_videos   (module_id, sort_order) where is_deleted = false;

-- RLS
alter table acharya_taksha.crs_modules    enable row level security;
alter table acharya_taksha.crs_module_tr  enable row level security;
alter table acharya_taksha.crs_sections   enable row level security;
alter table acharya_taksha.crs_section_tr enable row level security;
alter table acharya_taksha.crs_videos     enable row level security;
alter table acharya_taksha.crs_video_tr   enable row level security;
alter table acharya_taksha.mst_config     enable row level security;


-- ============================================================================
-- PART 3: Seed — minimum required data
-- ============================================================================

-- Taksha acharya record (slug must match NEXT_PUBLIC_ACHARYA_SLUG env var)
insert into gunakul.mst_acharyas (slug, name)
  values ('taksha', 'Taksha Acharya')
  on conflict (slug) do nothing;

-- Roles
insert into gunakul.mst_roles (slug, label) values
  ('learner', 'Learner'),
  ('admin',   'Admin'),
  ('founder', 'Founder')
  on conflict (slug) do nothing;

-- Default learner category for carpentry trainees
insert into gunakul.mst_categories (slug, label)
  values ('carpentry-trainee', 'Carpentry Trainee')
  on conflict (slug) do nothing;

-- Grant that category access to the Taksha acharya
insert into gunakul.map_category_acharya (category_id, acharya_id)
  select c.id, a.id
  from   gunakul.mst_categories c, gunakul.mst_acharyas a
  where  c.slug = 'carpentry-trainee'
  and    a.slug = 'taksha'
  on conflict (category_id, acharya_id) do nothing;
