-- Migration 004: GitHub — accounts, installations, repositories, commits, PRs, issues
-- DevAtlas Phase 2

-- ─── GitHub connection states ─────────────────────────────
create type public.github_connection_state as enum (
  'not_connected', 'authorization_pending', 'identity_connected',
  'installation_pending', 'repository_selection_pending',
  'initial_sync', 'healthy', 'degraded', 'disconnected'
);

-- ─── GitHub accounts (verified identity, one per user per institution) ──
create table public.github_accounts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  github_id       text not null,         -- stored as text to avoid JS int precision loss
  github_login    text not null,         -- display attribute only, not identity key
  connection_state public.github_connection_state not null default 'not_connected',
  connected_at    timestamptz,
  disconnected_at timestamptz,
  last_sync_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One GitHub identity per student per institution
  unique (institution_id, github_id),
  -- One linked account per student per institution
  unique (institution_id, profile_id)
);

create index github_accounts_profile_idx on public.github_accounts(profile_id);

-- ─── GitHub App installations ─────────────────────────────
-- One installation can cover multiple repos / org members
create table public.github_installations (
  id                  uuid primary key default gen_random_uuid(),
  installation_id     text not null unique,  -- GitHub installation ID as text
  account_id          uuid not null references public.github_accounts(id) on delete cascade,
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  account_login       text not null,
  account_type        text not null default 'User',   -- User or Organization
  is_suspended        boolean not null default false,
  installed_at        timestamptz not null default now(),
  uninstalled_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Repository approval states ───────────────────────────
create type public.repo_approval_state as enum (
  'proposed', 'approved', 'declined', 'disconnected', 'archived'
);

-- ─── Repositories (approved academic repositories only) ───
create table public.repositories (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  installation_id uuid references public.github_installations(id),
  github_repo_id  text not null,    -- GitHub repo ID as text
  owner           text not null,    -- display attribute only
  name            text not null,    -- display attribute only
  full_name       text not null,    -- owner/name
  is_private      boolean not null default true,
  approval_state  public.repo_approval_state not null default 'proposed',
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  decline_reason  text,
  last_sync_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- GitHub repo ID unique per installation
  unique (installation_id, github_repo_id)
);

create index repositories_project_idx    on public.repositories(project_id);
create index repositories_approval_idx   on public.repositories(approval_state);

-- Add FK from submissions back to repositories (deferred from migration 003)
alter table public.submissions
  add constraint submissions_repository_fk
  foreign key (repository_id) references public.repositories(id);

-- ─── Commits ──────────────────────────────────────────────
-- Never stores source code or diffs.
create table public.commits (
  id              uuid primary key default gen_random_uuid(),
  repository_id   uuid not null references public.repositories(id) on delete cascade,
  sha             text not null,
  author_github_id text,           -- verified actor (text, avoids int precision loss)
  author_login    text,            -- display attribute only
  committed_at    timestamptz,     -- from GitHub, may be null/invalid — flagged separately
  authored_at     timestamptz,
  message_excerpt text,            -- first 120 chars only, no full diff
  is_merge_commit boolean not null default false,
  additions       int,
  deletions       int,
  changed_files   int,
  created_at      timestamptz not null default now(),
  -- Deduplicate: one SHA per repository
  unique (repository_id, sha)
);

create index commits_repository_idx    on public.commits(repository_id);
create index commits_author_idx        on public.commits(author_github_id);
create index commits_committed_at_idx  on public.commits(committed_at);

-- ─── Commit branch refs (many-to-many) ───────────────────
-- A commit can belong to multiple branches
create table public.commit_branch_refs (
  id              uuid primary key default gen_random_uuid(),
  commit_id       uuid not null references public.commits(id) on delete cascade,
  repository_id   uuid not null references public.repositories(id) on delete cascade,
  branch_name     text not null,
  is_reachable    boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (commit_id, branch_name)
);

-- ─── Pull requests ────────────────────────────────────────
create table public.pull_requests (
  id              uuid primary key default gen_random_uuid(),
  repository_id   uuid not null references public.repositories(id) on delete cascade,
  github_pr_id    text not null,       -- GitHub PR node ID as text
  number          int not null,
  title           text not null default '',
  state           text not null default 'open',    -- open / closed / merged
  author_github_id text,
  author_login    text,
  created_at_gh   timestamptz,
  merged_at       timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Deduplicate by GitHub PR ID per repository
  unique (repository_id, github_pr_id)
);

create index pull_requests_repository_idx on public.pull_requests(repository_id);

-- ─── Issues ───────────────────────────────────────────────
create table public.issues (
  id              uuid primary key default gen_random_uuid(),
  repository_id   uuid not null references public.repositories(id) on delete cascade,
  github_issue_id text not null,
  number          int not null,
  title           text not null default '',
  state           text not null default 'open',
  author_github_id text,
  author_login    text,
  created_at_gh   timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (repository_id, github_issue_id)
);

-- triggers
create trigger github_accounts_updated_at before update on public.github_accounts
  for each row execute function public.set_updated_at();
create trigger github_installations_updated_at before update on public.github_installations
  for each row execute function public.set_updated_at();
create trigger repositories_updated_at before update on public.repositories
  for each row execute function public.set_updated_at();
create trigger pull_requests_updated_at before update on public.pull_requests
  for each row execute function public.set_updated_at();
create trigger issues_updated_at before update on public.issues
  for each row execute function public.set_updated_at();
