# DevScope — Implementation Status

**Last updated:** Phase 3 complete

---

## Phase 1 — Foundation and visual benchmark ✅

### Completed

- [x] Project scaffolded: React 19 + TypeScript + Vite 8 + Tailwind v4
- [x] Design tokens defined as CSS custom properties and Tailwind `@theme` extensions
- [x] All core types defined (`src/types/index.ts`)
- [x] Deterministic demo data for 300 students across 5 batches (`src/lib/demo-data.ts`)
- [x] Typed service boundary with demo adapter (`src/services/index.ts`)
- [x] App shell: 232px collapsible sidebar + 56px topbar + skip link
- [x] Role-aware navigation (faculty / student / admin)
- [x] Demo persona switcher (faculty ↔ student ↔ admin)
- [x] **Reference page 1:** Faculty Overview — batch selector, 4 summary metrics, attention queue, student table, deadlines, batch activity chart
- [x] **Reference page 2:** Student Profile (faculty view) — identity header, GitHub state, tabs, heatmap, evidence rail, faculty notes
- [x] **Reference page 3:** Student Workspace — next-to-do, active project progress, heatmap, streak/consistency, development tower, recent feedback
- [x] Activity Heatmap — keyboard accessible, day detail panel, stale/pending states, screen-reader list
- [x] Attention Queue — academic vs data problem distinction
- [x] Evidence Rail — assignment→repository→submission→evaluation
- [x] Development Tower — floor-based consistency, textual equivalent, progress bar
- [x] TypeScript: zero errors (`tsc --noEmit` passes)
- [x] Production build: 144KB gzip JS ✓

### Validation

```
npm run build  →  ✓ built, 0 errors, 0 warnings
tsc --noEmit   →  EXIT 0
```

---

## Phase 2 — Real academic workflows ✅

### Completed

- [x] Supabase client singleton (`src/lib/supabase.ts`) with `isSupabaseConfigured` flag
- [x] TypeScript database types (`src/types/supabase.ts`) — hand-authored, matches schema
- [x] SQL migrations (7 files):
  - `001_identity.sql` — institutions, profiles, role_assignments, invitations
  - `002_academics.sql` — batches, semesters, memberships, faculty assignments
  - `003_work.sql` — projects, assignments, rubrics, submissions, evaluations
  - `004_github.sql` — github_accounts, installations, repos, commits, PRs
  - `005_derived_and_ops.sql` — daily_activity, streaks, milestones, webhooks, sync_jobs, notifications, audit_logs
  - `006_rls_policies.sql` — full RLS policies + helper functions
  - `007_seed.sql` — dev seed data (institution, batches, milestones, policy)
- [x] `AuthContext` — session state, profile fetch, role from `role_assignments`
- [x] Route guards: `RequireAuth` + `RequireGuest` with loading state
- [x] `App.tsx` updated — `AuthProvider`, guards, all new routes wired
- [x] Real Supabase service adapter (`src/services/supabase-adapter.ts`) — full `DevAtlasService` implementation
- [x] Auth pages: `SignInPage`, `AcceptInvitePage`
- [x] **BatchesPage**, **StudentDirectoryPage**, **AssignmentsPage**, **AssignmentDetailPage**, **StudentAssignmentsPage**, **NotificationsPage**, **AdminPage**, **SettingsPage**
- [x] Color system migration: teal `#0D7377` / cyan `#14FFEC` palette
- [x] Full rebrand: DevAtlas → **DevScope**, logo `DA` → `DS`
- [x] Auth/routing race condition fix (INITIAL_SESSION skip + unmount guard)

### Validation

```
npm run build  →  ✓ built in 919ms, 0 errors, 0 warnings
tsc --noEmit   →  EXIT 0
```

---

## Phase 3 — GitHub Integration ✅

### Completed

#### Database

- [x] `008_github_oauth_states.sql` — one-time state tokens, bound to authenticated user, expire after 10 min, consumed exactly once
  - `create_github_oauth_state(profile_id, institution_id)` → returns opaque hex token (service_role only)
  - `consume_github_oauth_state(state_token)` → returns profile_id or NULL; atomic consume-and-validate (service_role only)
  - RLS: users can read their own rows; no client-side insert/update/delete

#### Supabase Edge Functions (4 functions, all in `supabase/functions/`)

- [x] **`github-start-oauth`** — Authenticated user POSTs; function verifies Supabase JWT, creates state token, returns signed GitHub OAuth redirect URL. State token bound to profile + institution.
- [x] **`github-oauth-callback`** — Receives `{ code, state }` from frontend. Validates + consumes state (prevents replay/CSRF), exchanges code for GitHub user access token (server-side only, never in browser), fetches verified GitHub identity via `/user`, enforces one-GitHub-identity-per-student-per-institution, upserts `github_accounts` with `connection_state = 'identity_connected'`.
- [x] **`github-webhook`** — HMAC-SHA256 signature verification against raw request bytes (constant-time compare). Deduplicates by `X-GitHub-Delivery`. Responds within GitHub's 10s window — no inline processing. Inserts durable `webhook_receipts` row, then queues `sync_jobs` row for async worker. Unsupported/unknown events acknowledged and marked `ignored`.
- [x] **`process-webhook-jobs`** — Async worker (called by pg_cron or admin trigger). Claims up to 10 pending jobs with lease. Handles `push`, `pull_request`, `issues`, `installation`, `installation_repositories` events. Exponential backoff with jitter on failure. Dead-letters after `max_retries` exceeded. Idempotent — duplicate events produce no double-counts.

#### Frontend services

- [x] **`src/services/github.ts`** — `beginGitHubOAuth()`, `handleGitHubCallback()`, `getGitHubAccount()`, `disconnectGitHub()`, `getProjectRepositories()`, `approveRepository()`, `declineRepository()`, `getIntegrationHealth()`. All secrets stay server-side.

#### UI components (in `src/features/github/`)

- [x] **`GitHubCallbackPage`** — `/github-callback` route. Reads `code` + `state` from URL, sends to Edge Function, shows loading/success/error states, redirects to settings on success.
- [x] **`GitHubConnectionPanel`** — All 9 connection states with actionable next steps:
  - `not_connected` → Connect button (calls `beginGitHubOAuth()`)
  - `authorization_pending` → Restart link
  - `identity_connected` → Install App link
  - `installation_pending` → Install Now link
  - `repository_selection_pending` → Contact faculty instruction
  - `initial_sync` → Importing history note
  - `healthy` → Account + last sync timestamp
  - `degraded` → Problem detail + App settings link
  - `disconnected` → Reconnect button
  - Disconnect action on all connected states
  - Data collection disclosure always visible
  - Demo mode: buttons disabled with explanation
- [x] **`RepositoryApprovalPanel`** — Faculty approve/decline proposed repositories with reason. Shows coverage state for approved repos. Empty state. Demo mode safe.
- [x] **`IntegrationHealthPage`** — Admin route `/integrations`. Summary counters (pending/failed/dead-letter). Retry-all action. Recent sync jobs table with expandable error details. Webhook receipts table. Refetch every 30s. Demo data for unconfigured mode.

#### Wiring

- [x] `SettingsPage` GitHub tab → replaced static UI with `GitHubConnectionPanel`
- [x] `App.tsx` → `/github-callback` route, `/integrations` → `IntegrationHealthPage`
- [x] `.env.example` → `VITE_GITHUB_APP_URL`, `GITHUB_OAUTH_CALLBACK_URL`, `ALLOWED_ORIGIN` documented

### Security properties

| Property | Implementation |
|---|---|
| State token is cryptographically random | `gen_random_bytes(32)` in Postgres |
| State token expires | 10-minute TTL, enforced in DB |
| State token consumed exactly once | `UPDATE … RETURNING` with used_at guard |
| Code never reaches the browser | Edge Function exchanges code for token |
| No GitHub secrets in VITE_ vars | Only `VITE_GITHUB_APP_URL` (install link, no secret) |
| Webhook signature verified over raw bytes | Before JSON parsing, constant-time compare |
| One GitHub identity per student per institution | Checked before upsert, 409 on conflict |
| Duplicate webhooks | `delivery_id` unique constraint in `webhook_receipts` |
| Job worker crash-safe | Lease TTL + retry_count + dead-letter state |

### Validation

```
tsc --noEmit  →  EXIT 0 (0 errors)
npm run build →  ✓ built in 603ms, 0 errors
                  773.77 kB raw / 218.57 kB gzip (informational warning only)
```

### Manual steps required before GitHub integration is live

1. Create a GitHub App in your GitHub account:
   - Settings → Developer settings → GitHub Apps → New GitHub App
   - Callback URL: `https://your-app.pages.dev/github-callback`
   - Webhook URL: `https://your-project.supabase.co/functions/v1/github-webhook`
   - Permissions: `Contents: Read`, `Pull requests: Read`, `Issues: Read`, `Metadata: Read`
   - Events: `Push`, `Pull request`, `Issues`, `Installation`, `Installation repositories`
2. Set Supabase secrets (not VITE_ vars):
   ```
   GITHUB_APP_CLIENT_ID=...
   GITHUB_APP_CLIENT_SECRET=...
   GITHUB_WEBHOOK_SECRET=...
   GITHUB_OAUTH_CALLBACK_URL=https://your-app.pages.dev/github-callback
   ALLOWED_ORIGIN=https://your-app.pages.dev
   ```
3. Set `VITE_GITHUB_APP_URL=https://github.com/apps/your-app-slug` in `.env.local`
4. Run migration `008_github_oauth_states.sql` in Supabase SQL editor
5. Deploy Edge Functions: `supabase functions deploy github-start-oauth github-oauth-callback github-webhook process-webhook-jobs`
6. Configure pg_cron to call `process-webhook-jobs` every minute (or use Supabase scheduled function)

---

## Phase 4 — Activity and outcomes ⬜

**Planned:**
- Commit attribution rules (verified actor, no display-name matching)
- Daily activity aggregation worker: fills `student_daily_activity` from `commits`
- Heatmap explorer from live `student_daily_activity` data
- Configurable streak policy with versioning (`activity_policy_versions`)
- Milestone awards (idempotent, prevents duplicate notifications on backfill)
- Transparent attention rules (coverage-aware: zero ≠ unknown)
- Analytics page: activity over time, assignment completion, review turnaround, streak distribution

---

## Phase 5 — Product completeness ⬜

**Planned:**
- In-app notifications with grouping/deduplication
- CSV import/export (injection-protected, previewed)
- Saved views, deadline extensions
- Accessible print reports
- Admin controls: academic structure, role assignments, threshold policies

---

## Phase 6 — Release validation ⬜

**Planned:**
- End-to-end test stories (Playwright)
- RLS policy tests
- Security review
- Performance measurement under documented conditions
- Screenshot review at 1440px, 1024px, 390px
- Deployment runbook

---

## Blockers requiring external credentials

| Item | Needed for |
|------|-----------|
| Supabase URL + anon key in `.env.local` | Phase 2/3 real mode |
| Supabase service-role key (Edge Functions secret) | Phase 3 Edge Functions |
| GitHub App (create in GitHub Developer Settings) | Phase 3 live integration |
| pg_cron or scheduled function configured | Phase 3 job worker |
