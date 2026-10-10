-- Migration 001: Identity — institutions, profiles, memberships, role assignments
-- DevAtlas Phase 2
-- Run against a fresh Supabase project.

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Institutions ─────────────────────────────────────────
create table public.institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  timezone     text not null default 'Asia/Kolkata',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Profiles (linked to auth.users) ──────────────────────
-- One profile per auth user. institution_id scopes the user.
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  display_name      text not null,
  email             text not null,
  avatar_initials   text not null default '',
  roll_number       text,
  github_username   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index profiles_institution_idx on public.profiles(institution_id);
create index profiles_email_idx on public.profiles(email);

-- ─── Role assignments (server-controlled) ─────────────────
-- Never populated from client-submitted metadata.
create type public.user_role as enum ('student', 'faculty', 'admin');

create table public.role_assignments (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  role            public.user_role not null,
  assigned_by     uuid references public.profiles(id),
  assigned_at     timestamptz not null default now(),
  revoked_at      timestamptz,
  unique (profile_id, institution_id, role)
);

create index role_assignments_profile_idx on public.role_assignments(profile_id, institution_id);

-- ─── Invitations ──────────────────────────────────────────
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  email           text not null,
  role            public.user_role not null,
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by      uuid references public.profiles(id),
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz not null default now()
);

create index invitations_email_idx on public.invitations(email);
create index invitations_token_idx on public.invitations(token);

-- ─── Updated_at trigger function ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger institutions_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
