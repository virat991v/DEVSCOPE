-- Migration 007: Seed data for development
-- DevAtlas Phase 2
-- Run ONLY in development. Uses pg_catalog.set_config to disable triggers temporarily.
-- DO NOT run in production.

-- ─── Demo institution ─────────────────────────────────────
insert into public.institutions (id, name, slug, timezone) values
  ('00000000-0000-0000-0000-000000000001',
   'Apex Institute of Technology', 'apex', 'Asia/Kolkata');

-- ─── Academic year ────────────────────────────────────────
insert into public.academic_years (id, institution_id, label, start_date, end_date) values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   '2024-25', '2024-06-01', '2025-05-31');

-- ─── Divisions ────────────────────────────────────────────
insert into public.academic_divisions (id, institution_id, academic_year_id, name, year_label) values
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'E', '2nd Year'),
  ('00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'E', '3rd Year');

-- ─── Batches ──────────────────────────────────────────────
insert into public.academic_batches (id, institution_id, division_id, label, section) values
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'SE-E-A', 'A'),
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'SE-E-B', 'B'),
  ('00000000-0000-0000-0000-000000000032',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'SE-E-C', 'C');

-- ─── Milestone definitions ────────────────────────────────
insert into public.milestone_definitions (institution_id, threshold, label, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 5,   'Getting Started',       1),
  ('00000000-0000-0000-0000-000000000001', 10,  'Building Rhythm',       2),
  ('00000000-0000-0000-0000-000000000001', 25,  'Consistent Practice',   3),
  ('00000000-0000-0000-0000-000000000001', 50,  'Consistent Practice II',4),
  ('00000000-0000-0000-0000-000000000001', 100, 'Sustained Practice',    5),
  ('00000000-0000-0000-0000-000000000001', 150, 'Sustained Practice II', 6),
  ('00000000-0000-0000-0000-000000000001', 200, 'Long-Term Commitment',  7);

-- ─── Activity policy ──────────────────────────────────────
insert into public.activity_policy_versions
  (institution_id, min_commits_per_day, timezone, tracked_branch_policy, effective_from)
values
  ('00000000-0000-0000-0000-000000000001',
   3, 'Asia/Kolkata', 'default_branch', '2024-06-01');

-- Note: profiles and users are created via Supabase Auth invite flow.
-- Run supabase/seed-users.sh (provided) to create demo auth users in development.
