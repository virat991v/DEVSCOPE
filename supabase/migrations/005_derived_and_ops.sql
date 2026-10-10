-- Migration 005: Derived records — daily activity, streaks, milestones, coverage
-- DevAtlas Phase 2

-- ─── Coverage states ──────────────────────────────────────
create type public.coverage_state as enum (
  'healthy', 'pending_import', 'stale', 'disconnected', 'unavailable'
);

-- ─── Activity policy versions ─────────────────────────────
-- Versioned streak/observation rules. Changes apply prospectively by default.
create table public.activity_policy_versions (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  min_commits_per_day int  not null default 3,
  timezone            text not null default 'Asia/Kolkata',
  tracked_branch_policy text not null default 'default_branch',
  exclude_merge_commits boolean not null default true,
  exclude_bots        boolean not null default true,
  effective_from      date not null default current_date,
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now()
);

-- ─── Student daily activity (precomputed aggregate) ───────
-- Drives heatmap. Never computed on every page load.
create table public.student_daily_activity (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  reporting_date      date not null,           -- date in configured timezone
  commit_count        int  not null default 0,
  pr_count            int  not null default 0,
  issue_count         int  not null default 0,
  qualifies_streak    boolean not null default false,
  coverage_state      public.coverage_state not null default 'healthy',
  policy_version_id   uuid references public.activity_policy_versions(id),
  computed_at         timestamptz not null default now(),
  unique (profile_id, reporting_date)
);

create index student_daily_activity_profile_date_idx
  on public.student_daily_activity(profile_id, reporting_date desc);
create index student_daily_activity_institution_date_idx
  on public.student_daily_activity(institution_id, reporting_date desc);

-- ─── Student streaks ──────────────────────────────────────
create table public.student_streaks (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references public.profiles(id) on delete cascade,
  institution_id        uuid not null references public.institutions(id) on delete cascade,
  current_streak        int not null default 0,
  longest_streak        int not null default 0,
  last_qualifying_date  date,
  policy_version_id     uuid references public.activity_policy_versions(id),
  updated_at            timestamptz not null default now(),
  unique (profile_id, institution_id)
);

-- ─── Milestone definitions ────────────────────────────────
create table public.milestone_definitions (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  threshold       int not null,
  label           text not null,
  sort_order      int not null default 0,
  unique (institution_id, threshold)
);

-- Default milestone thresholds — inserted per institution in seed
-- 5, 10, 25, 50, 100, 150, 200

-- ─── Milestone awards (idempotent) ───────────────────────
create table public.milestone_awards (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  milestone_id    uuid not null references public.milestone_definitions(id) on delete cascade,
  awarded_at      timestamptz not null default now(),
  -- Prevent duplicate awards per student per milestone
  unique (profile_id, milestone_id)
);

create index milestone_awards_profile_idx on public.milestone_awards(profile_id);

-- ─── Webhook receipts (durable, deduplication) ───────────
create type public.webhook_processing_state as enum (
  'received', 'processing', 'processed', 'failed', 'dead_letter', 'ignored'
);

create table public.webhook_receipts (
  id                  uuid primary key default gen_random_uuid(),
  delivery_id         text not null unique,   -- X-GitHub-Delivery header
  installation_id     text,
  event_type          text not null,
  action              text,
  payload_size        int,
  processing_state    public.webhook_processing_state not null default 'received',
  retry_count         int not null default 0,
  error_message       text,
  received_at         timestamptz not null default now(),
  processed_at        timestamptz
);

create index webhook_receipts_state_idx on public.webhook_receipts(processing_state);
create index webhook_receipts_received_idx on public.webhook_receipts(received_at desc);

-- ─── Sync jobs ────────────────────────────────────────────
create type public.sync_job_state as enum (
  'pending', 'claimed', 'processing', 'done', 'failed', 'dead_letter'
);

create table public.sync_jobs (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  job_type        text not null,      -- e.g. 'backfill_repository', 'reconcile_installation'
  payload         jsonb not null default '{}',
  state           public.sync_job_state not null default 'pending',
  claimed_at      timestamptz,
  lease_expires_at timestamptz,
  completed_at    timestamptz,
  retry_count     int not null default 0,
  max_retries     int not null default 5,
  next_retry_at   timestamptz,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index sync_jobs_state_idx on public.sync_jobs(state, next_retry_at);
create index sync_jobs_institution_idx on public.sync_jobs(institution_id);

-- ─── Notifications ────────────────────────────────────────
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  title           text not null,
  body            text not null,
  link_path       text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications(profile_id, is_read, created_at desc);

-- ─── Audit logs (immutable, append-only) ──────────────────
create table public.audit_logs (
  id              bigint primary key generated always as identity,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  actor_id        uuid references public.profiles(id),
  action          text not null,
  entity_type     text not null,
  entity_id       text,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index audit_logs_institution_idx on public.audit_logs(institution_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- Prevent updates/deletes on audit_logs
create or replace rule audit_logs_no_update as on update to public.audit_logs do instead nothing;
create or replace rule audit_logs_no_delete as on delete to public.audit_logs do instead nothing;

-- triggers
create trigger sync_jobs_updated_at before update on public.sync_jobs
  for each row execute function public.set_updated_at();
