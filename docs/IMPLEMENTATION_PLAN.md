# Implementation Plan

**Prepared:** 2026-10-09  
**Principle:** preserve the existing React/Supabase foundation and data. Every migration is forward-only, reviewed for RLS impact, and run first against a disposable Supabase database.

## Milestone 0 — audit and immediate hardening

**Status:** live verified on the authorized staging project.

1. `supabase/migrations/017_harden_signup_role_assignment.sql` has been applied and its auth-user trigger verified.
2. Inspect active `role_assignments` in the target project and confirm every faculty/admin grant has an authorized source. This is a review only; no automatic revocation.
3. Add a secure Edge Function/RPC-backed invitation lifecycle, then replace the broad invitation read policy. The function must validate token expiry, email, institution, single use, and requested role server-side.
4. Decide and record whether public self-registration is permitted. If it is not, disable it in hosted Supabase Auth after invitation acceptance is verified.

Files already changed for the first safe task:

- `supabase/migrations/017_harden_signup_role_assignment.sql`
- `tests/signup-role-hardening.test.mjs`
- `package.json`

## Milestone 1 — authorization and production data foundation

1. Add RLS regression tests for anonymous, student, unrelated faculty, assigned faculty, and administrator access.
2. Add forward migrations to scope submission reads/writes to active batch membership and published assignments; preserve already submitted records.
3. Repair `src/services/supabase-adapter.ts` mutation return/select handling, evaluation conflict target, grade history/audit writes, and explicit error propagation.
4. Replace hard-coded production batch selection in:
   - `src/features/assignments/StudentAssignmentsPage.tsx`
   - `src/features/projects/ProjectsPage.tsx`
   - `src/features/github/IntegrationHealthPage.tsx`
5. Add a protected server-side invitation/role management module used by `src/features/admin/AdminPage.tsx`.

**Exit criteria:** no client-selected privileged role; students cannot submit to unrelated work or modify grades; faculty are limited to assigned scope; production pages resolve actual profile memberships.

## Milestone 2 — classroom core

**Live migration and authorization flow verified on staging.**

1. `018_classroom_core.sql` has been applied without modifying existing records.
2. A rollback-only staging test verified faculty creation, student code join, announcement delivery, assignment delivery, student stream/classwork visibility, and notification persistence using actual role-based authorization.
3. RLS metadata verification confirmed that classroom resources have no direct client write policies and that the required tables are in the realtime publication.
4. Add faculty approval, faculty enrollment, leave/removal, co-teacher management, and enrollment imports as follow-up command functions/UI.

**Current exit criteria:** achieved for the join-code classroom core. Before manual use, an administrator must add real courses and student batch enrolments; the staging database currently has neither.

## Milestone 3 — academic structure and expanded classrooms

1. Add additive migrations for departments, courses, classrooms, classroom-faculty links, classroom memberships, enrollment controls, and audit fields. Map existing batches without deleting them.
2. Implement domain services and routes under `src/features/classrooms/`.
3. Update `Sidebar.tsx`, `App.tsx`, and navigation/breadcrumbs for role-specific classroom flows.
4. Implement classroom creation, join code/invitation, people, stream, settings, removal/leave flows, and RLS tests.

**Exit criteria:** a faculty member can create a classroom and an authorized student can join it safely; no cross-classroom access.

## Milestone 4 — assignments, submissions, and manual grades

1. Extend additive schema for assignment targets, attachments, evidence, grade history, and notifications.
2. Replace the present batch-only assignment UI with classroom-aware authoring in `src/features/assignments/`.
3. Add Zod validation, draft/publish/close lifecycle, evidence requirements, storage validation, immutable submission versions, manual evaluation, publish/withhold, revision, and audit entries.
4. Add service mutations and TanStack Query invalidation/realtime signals.
5. Add unit, RLS integration, and Playwright lifecycle tests.

**Exit criteria:** faculty create/publish/grade; student sees/submits/revises; grades are manual, private, persistent, and audited.

## Milestone 5 — GitHub integration reliability

1. Verify hosted secrets, exact CORS origins, callback URLs, GitHub OAuth/App permissions, and function deployment; no secrets enter Vite variables.
2. Refactor `supabase/functions/github-sync/index.ts` for rate limits, non-200 handling, durable jobs, incremental sync, and health timestamps.
3. Store minimal verified webhook event data sufficient for normalization; implement atomic job claiming and idempotent commit/PR/issue processing.
4. Enforce repository/identity attribution and use immutable GitHub evidence for submissions without auto-submitting or grading work.
5. Add function tests with signed webhook fixtures and failure/retry tests.

## Milestone 6 — daily workflow

1. Add announcements, in-app notification generation/preferences, selective realtime cache invalidation, and classroom-scoped messaging.
2. Replace dashboard fixture dependencies with explicit real queries and defined metric sources.
3. Add server-side pagination, query-key policy, error boundaries, and accessible empty/loading states.

## Milestone 7 — portfolio

1. Add private portfolio/project/skill/verification/publication tables with explicit public projection.
2. Implement portfolio editing, faculty verification/revocation, preview, and collision-safe public profile route with SEO metadata.
3. Prove through RLS/E2E tests that grades, enrollment data, and private repository contents cannot leak.

## Milestone 8 — opt-in leaderboard

1. Add opt-in settings, versioned rules, scoped periods/snapshots, transparent categories, and auditability.
2. Build classroom/batch/department/college views respecting membership and participation.
3. Test de-duplication, attribution ambiguity, history rewrites, and opt-out removal. Never use leaderboard output as a grade.

## Milestone 9 — production readiness

1. Run database migration rehearsal and backup/rollback plan.
2. Configure production Supabase Auth, Edge secrets, GitHub webhook, Vercel environment variables, and allowed URLs.
3. Run accessibility, 300-student performance, security/RLS, Edge Function, and complete Playwright acceptance suites.
4. Update deployment, architecture, database, API integration, test report, completion, and remaining-work documentation after every milestone.
