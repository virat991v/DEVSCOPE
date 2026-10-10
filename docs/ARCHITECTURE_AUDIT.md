# Architecture Audit

**Audited:** 2026-10-09  
**Scope:** repository source, migrations, Edge Functions, configuration, and baseline local validation. No Supabase project, GitHub configuration, production database, deployment, or credentials were changed or queried.

## Executive summary

DevAtlas is a Vite 8 single-page React 19 application using TypeScript, Tailwind CSS v4, React Router v7, TanStack Query v5, React Hook Form/Zod, Radix UI, and Supabase JS v2. It has a solid visual shell and an unusually broad initial Supabase foundation: identity, academic batches, assignments, submissions, evaluations, GitHub staging, derived activity, RLS, OAuth state, and five Edge Functions are present.

The application is not yet production-ready. Several pages are correctly isolated demo experiences, but other production paths are incomplete or have schema/query mismatches. Most importantly, migrations 013 and 015 allow the signup trigger to use client-provided metadata to create faculty or administrator roles. Migration 017 now removes that behavior for future signups; applying it requires the normal non-destructive migration process.

This workspace is not a Git working tree (`git status` reports no repository), so commit history, branch state, remote configuration, and database migration deployment status cannot be verified here.

## Architecture observed

| Area | Current implementation |
| --- | --- |
| App entry | `src/main.tsx` creates a browser router; `src/App.tsx` owns the query client, public/authenticated routes, role-specific shells, and lazy secondary routes. |
| Identity | `src/app/AuthContext.tsx` separates Supabase session state from profile/role state and calls the restricted `ensure_my_profile()` RPC for recovery. `RouteGuards.tsx` protects routes, but correctly treats database RLS as the authorization boundary. |
| UI | Reusable components live in `src/components/ui` and shell components in `src/components/shared`. Existing CSS tokens match the required dark teal/cyan palette. |
| Data access | `src/services/index.ts` exposes a common service interface and chooses a deterministic demo adapter only when Supabase credentials are absent; `src/services/supabase-adapter.ts` is the production adapter. |
| Database | Sequential migrations `001`–`017` define institution identity, batches, work/evaluation, GitHub entities, derived activity/operations, RLS, OAuth state, secure token storage, GitHub repo staging, and profile recovery. |
| GitHub backend | Edge Functions cover OAuth start/callback, repository sync, signed webhook receipt storage, and a job worker. Secrets remain server-side in the source design. |
| Deployment | Vite build output is suitable for Vercel static hosting. There is no checked-in Vercel configuration, deployment workflow, or database deployment evidence. |

## Existing functionality

- Public landing page plus email/password, Google OAuth, GitHub OAuth login UI, password reset, callback, and invite UI routes.
- Role-aware route guards, role home pages, lazy-loaded protected routes, skip link, skeletons, responsive shell, navigation, and deterministic demo personas.
- Supabase profile recovery RPC and PKCE configuration. The browser client only uses VITE-prefixed URL and anon-key variables; no service-role key is in frontend source.
- Database tables, indexes, update triggers, enum types, and base RLS policies for the initial batch-oriented data model.
- GitHub OAuth state is one-time and expiry-bound; access tokens are stored in a table with deny-all client RLS. Webhook HMAC validation and delivery-id de-duplication are implemented in source.
- The project currently builds successfully. Lint succeeds with eight warnings and no errors.

## Incomplete or non-functional paths

- The product model is batch-based, not the required department/course/classroom/membership model. There are no classroom, course assignment, enrollment-code, announcement, message, portfolio, public portfolio, leaderboard, or verification tables/routes.
- `src/App.tsx` still serves placeholders for activity, analytics, and progress routes.
- `StudentAssignmentsPage.tsx` and faculty `ProjectsPage.tsx` use hard-coded demo batch identifiers even when Supabase is configured.
- The production student submission adapter upserts without requesting the row back, so it cannot reliably write an immutable submission version. It also does not validate that supplied GitHub evidence belongs to an approved student repository.
- The evaluation adapter uses `onConflict: 'submission_id,faculty_id'`, but the schema has a unique constraint only on `submission_id`; real evaluation saves will fail. It also cannot retrieve the inserted evaluation id without a returning select.
- `createInvite` omits the required `institution_id`; the invitation UI cannot be a working creation flow. Invitation reading is broad and not suitable for confidential invitation data.
- GitHub repository discovery works in source but does not queue the activity jobs described in its comments. It lacks rate-limit/retry state handling. Webhook jobs retain only a summary rather than enough event material to normalize commits/PRs/issues, and worker claiming is not atomic.
- Integration health passes the literal institution id `placeholder`, and queries a nonexistent `institution_id` column on `webhook_receipts`; live health data is therefore not trustworthy.
- The frontend route guard does not itself make a system secure; several RLS policies are too broad for the specification and need targeted integration tests before dependent modules go live.
- There are no automated browser, database/RLS, or Edge Function integration tests. The new regression test covers the first authorization hardening migration structurally; it is not a substitute for a migrated Supabase test database.

## Security and database risks

1. **Critical — fixed forward in migration 017:** `handle_new_user()` in migrations 013/015 read `raw_user_meta_data.role`, which a client can supply. That could mint faculty/admin roles. Existing active privileged assignments must be reviewed separately before deployment; migration 017 does not revoke existing data.
2. **High:** `invitations: read by token` is implemented as `USING (true)`, which is not token-scoped and risks disclosure of invite emails/tokens if table grants permit selection. Replace it with a narrowly scoped server-side invitation validation/acceptance flow before production use.
3. **High:** student submission insertion only checks `profile_id = auth.uid()`, not that the assignment is published to the student’s active batch. Tighten this with a migration and RLS tests before enabling live submission.
4. **High:** some faculty/admin GitHub read policies are institution-wide rather than limited to assigned academic scope; `pull_requests` and `issues` are accessible through any approved repository without a member/assigned-faculty check.
5. **High:** no database evidence is available that migrations 001–016, Google OAuth, GitHub secrets, Edge Functions, allowed origins, or RLS are deployed. Do not call source presence a deployment verification.
6. **Medium:** Edge Functions default `ALLOWED_ORIGIN` to `*`; production must use exact Vercel origins. Job-worker invocation and scheduler authentication must be explicitly configured and verified.
7. **Medium:** hosted auth configuration must be tightened: production password requirements, confirmed email policy, redirect allow-list, captcha/rate limits, and public self-signup policy all need an explicit product decision.

## Baseline validation

| Command | Result |
| --- | --- |
| `npm run lint` | Passes with 8 warnings (Fast Refresh boundaries, state-in-effect, and `Date` used during render). |
| `npm run build` | Passes; Vite produces split feature chunks. |
| Remote Supabase/database checks | Not run: this workspace does not expose a linked project or authorized server-side access. |

## Recommended implementation order

1. Apply and verify migration 017 in a disposable/local Supabase instance, then audit active production role assignments before promotion.
2. Build a server-side invitation and role-grant workflow; only then remove broad invitation read access and decide whether public self-signup remains enabled.
3. Repair and test the authorization/data foundation: assignment visibility/targeting, student submission RLS, grade-change audit history, scoped faculty access, query correctness, and test infrastructure.
4. Introduce the academic structure required by the directive (departments, academic years, batches/divisions, courses, classrooms, classroom memberships) without replacing existing batch history.
5. Deliver a complete classroom vertical slice before dashboards: create/manage classroom, invite/join, people, stream, settings.
6. Deliver the assignment/submission/manual-grading vertical slice with immutable versions, evidence validation, notifications, and RLS integration tests.
7. Complete secure GitHub synchronization/webhook normalization/reconciliation, then add derived analytics.
8. Add announcements, notifications/realtime, dashboards, portfolios, and opt-in leaderboard in that order; finish with accessibility, performance, full E2E, Vercel/Supabase production validation.
