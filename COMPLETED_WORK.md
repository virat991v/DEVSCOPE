# DevScope — Completed Work & Remaining Tasks

> Last updated after Google OAuth loop fix session.
> Tech stack: React 19 + TypeScript · Vite 8 · Tailwind v4 (CSS-first) · Supabase · React Router v7 · TanStack Query v5

---

## ✅ COMPLETED WORK

### 1. Design System & Tokens
- Merged Figma colour palette with existing codebase palette into `src/styles/index.css`
- All design tokens live under `@theme {}` — no `tailwind.config.js`
- Tokens: `--color-primary`, `--color-primary-bright`, `--color-primary-dim`, `--color-primary-hover`, `--color-canvas`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-border-strong`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-danger`, `--color-success-bright`, `--color-success-bg`, `--color-warning`

---

### 2. Authentication System (fully fixed)

#### Root cause that was fixed (Google OAuth loop)
The Supabase client had `flowType: 'implicit'` (library default) while the Supabase project enforces PKCE for OAuth. `signInWithOAuth` never generated a `code_verifier`, so when Google redirected back with `?code=`, the exchange failed silently. The callback page then navigated to `/login`.

#### Files changed
| File | What was done |
|---|---|
| `src/lib/supabase.ts` | Added `flowType: 'pkce'` + `detectSessionInUrl: true`; removed manual `detectSessionInUrl: false` |
| `src/features/auth/AuthCallbackPage.tsx` | Rewrote: no longer calls `exchangeCodeForSession()` manually; instead subscribes to `onAuthStateChange(SIGNED_IN / INITIAL_SESSION)` and navigates once session arrives |
| `src/app/AuthContext.tsx` | `fetchOrCreateProfile` upserts missing profile rows; `sessionClaimed` ref prevents Path A (`getSession`) from clobbering Path B listener result; listener registered before `getSession` call |
| `src/app/RouteGuards.tsx` | `RequireAuth` shows spinner while `loading: true`; never redirects during loading; `roleHome()` exported |
| `src/features/auth/SignInPage.tsx` | Email login: replaced 500ms setTimeout hack with reactive `useEffect` watching `signedIn && profile` |
| `src/features/auth/SignUpPage.tsx` | Email signup: replaced immediate navigate with `pendingRedirect` flag + `useEffect` watching `profile` |

#### Current working auth flow
```
Landing → /login → "Continue with Google"
  → signInWithOAuth generates code_verifier (stored in localStorage)
  → Browser navigates to Google
  → User selects account
  → Google → Supabase server → /auth/callback?code=xxx
  → Supabase initialize() detects ?code=, exchanges via stored verifier
  → Saves session → fires onAuthStateChange(SIGNED_IN)
  → AuthCallbackPage receives SIGNED_IN → loads role → navigate to dashboard ✅
```

---

### 3. Auth Pages (UI)
| Page | Route | Status |
|---|---|---|
| Sign In | `/login` | ✅ Split layout, Google button, email+password, forgot-password link |
| Sign Up | `/signup` | ✅ Role card selector (student/faculty), Google button, terms checkbox |
| Forgot Password | `/forgot-password` | ✅ Email reset request |
| Auth Callback | `/auth/callback` | ✅ Spinner + SIGNED_IN listener + role-based redirect |
| Accept Invite | `/accept-invite` | ✅ Invite token flow |

---

### 4. Landing Page
- `src/features/landing/LandingPage.tsx` — hero, features grid, how-it-works, student/faculty sections, CTA, footer
- `src/features/landing/LandingNavbar.tsx` — auth-aware: shows Sign In / Sign Up for guests, dashboard link for authenticated users
- Route `/` is always public — no auth guard

---

### 5. Route Architecture
```
/                   → LandingPage (public, no guard)
/login              → SignInPage (RequireGuest)
/sign-in            → alias for /login (RequireGuest)
/signup             → SignUpPage (RequireGuest)
/accept-invite      → AcceptInvitePage (RequireGuest)
/forgot-password    → ForgotPasswordPage (public)
/auth/callback      → AuthCallbackPage (public)
/github-callback    → GitHubCallbackPage (public)
/*                  → RequireAuth → AuthenticatedApp
  faculty: /overview, /students, /batches, /assignments, /notifications, /settings
  student: /workspace, /assignments, /notifications, /settings
  admin:   /admin, /batches, /students, /integrations, /notifications, /settings
```

---

### 6. Faculty Dashboard (`/overview`)
- Stats cards: Active Students, Qualified Commits, Avg Streak, Attention Items
- SVG bar chart: batch activity over last 7 days
- Needs-Attention panel (AttentionQueue) with severity/type badges
- Recent Development Activity feed
- Paginated student table with search, GitHub state badges, streak counts
- All Figma-aligned design

---

### 7. Student Workspace (`/workspace`)
- Next assignment card with evidence rail
- Active project progress
- Activity heatmap (GitHub-style)
- Development Tower (streak milestone visualiser)
- Recent feedback panel

---

### 8. Supporting Feature Pages
| Page | Route | Notes |
|---|---|---|
| Student Directory | `/students` | Searchable/sortable, batch filter, pagination |
| Student Profile | `/students/:id` | Header + tabs; overview tab fully implemented |
| Batches | `/batches` | Supabase data; faculty sees assigned, admin sees all |
| Assignments (faculty) | `/assignments` | Tabbed by status; deadline badges |
| Assignment Detail | `/assignments/:id` | Three-column review workspace |
| Student Assignments | `/assignments` (student) | Evidence rail + submit modal |
| Admin Hub | `/admin` | Stats, invites table, batch roster |
| GitHub Connection | (panel in Settings) | 9-state connection flow |
| GitHub Callback | `/github-callback` | OAuth callback handler |
| Integration Health | `/integrations` | Admin sync/webhook dashboard |
| Settings | `/settings` | Profile edit, GitHub tab, notifications prefs |
| Notifications | `/notifications` | Read/unread grouped list |

---

### 9. Shared UI Components
`Avatar`, `Badge`, `Button`, `Card`, `Skeleton`, `Tabs`, `Tooltip`, `GoogleAuthButton`, `ActivityHeatmap`, `DevelopmentTower`, `EvidenceRail`, `AttentionQueue`, `AppShell`, `Sidebar`, `TopBar`, `DemoSwitcher`

---

### 10. Database Migrations
| File | Purpose | Status |
|---|---|---|
| `001_identity.sql` | `institutions`, `profiles`, `role_assignments` tables | ✅ Run |
| `002_academics.sql` | Batches, academic periods | ✅ Run |
| `003_work.sql` | Assignments, submissions, evaluations | ✅ Run |
| `004_github.sql` | `github_accounts`, `github_events`, repositories | ✅ Run |
| `005_derived_and_ops.sql` | Streaks, milestones, notifications, ops tables | ✅ Run |
| `006_rls_policies.sql` | Base RLS policies for all tables | ✅ Run |
| `007_seed.sql` | Seed data | ✅ Run |
| `008_github_oauth_states.sql` | GitHub OAuth state table | ✅ Run |
| `008_signup_profile_trigger.sql` | DB trigger: auto-create profile on `auth.users` INSERT | ⚠️ Needs manual run in SQL Editor |
| `009_profile_rls_for_self_upsert.sql` | RLS: allow users to INSERT/SELECT their own profile | ⚠️ Needs manual run in SQL Editor |

---

## ⚠️ MANUAL STEPS REQUIRED (Supabase Dashboard)

These cannot be done in code — must be done in the Supabase dashboard.

### A. SQL Editor → Run these two files
1. Copy and run `supabase/migrations/008_signup_profile_trigger.sql`
2. Copy and run `supabase/migrations/009_profile_rls_for_self_upsert.sql`

Verify with:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'role_assignments', 'institutions')
ORDER BY tablename, policyname;
```

### B. Auth → URL Configuration
| Setting | Value |
|---|---|
| Site URL | `http://localhost:5173` |
| Redirect URLs | `http://localhost:5173/**` |
| Redirect URLs | `http://localhost:5173/auth/callback` |

### C. Auth → Providers → Google
- Enable Google provider ✅
- Enter Client ID and Client Secret from Google Cloud Console
- In Google Cloud Console → OAuth credentials → Authorized redirect URIs, add:
  ```
  https://gfhnpphasczrifpxnvxz.supabase.co/auth/v1/callback
  ```

### D. Confirm test user email
```sql
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'aaryavirat911@gmail.com';
```

---

## 🔴 REMAINING TASKS

### Priority 1 — Auth validation (must do before any new features)

- [ ] **Run migrations 008 + 009** in Supabase SQL Editor (see section above)
- [ ] **Confirm redirect URLs** in Supabase Auth settings
- [ ] **Test the full Google OAuth flow** end-to-end in browser:
  - Homepage → Sign In → Continue with Google → account chooser → callback → dashboard
  - Refresh dashboard while logged in → still logged in
  - Log out → back to homepage
  - Direct navigate to `/workspace` while logged out → redirected to `/login`
  - Direct navigate to `/login` while logged in → redirected to dashboard

---

### Priority 2 — Real data wiring (currently using demo/mock data)

Most feature pages query a `services/` layer that returns **demo data** when Supabase is unconfigured. These need real Supabase queries wired for production use:

- [ ] **Student Directory** — replace `service.getStudents()` with real Supabase query on `profiles` + `role_assignments` + `github_accounts`
- [ ] **Faculty Overview** — replace demo student list with real batch members query
- [ ] **Batches Page** — partially wired; needs batch membership count from real DB
- [ ] **Assignments** — faculty create/edit assignment writes to `assignments` table (currently mock)
- [ ] **Assignment Detail** — evaluation save and publish are placeholder `console.log` calls; need real `evaluations` INSERT/UPDATE
- [ ] **Student Assignments** — submit handler is mock; needs real `submissions` INSERT
- [ ] **Admin Page** — invite form is mock; needs real invitation token flow
- [ ] **Settings → Profile** — profile update save calls a mock; needs real `profiles` UPDATE
- [ ] **Notifications** — mark-as-read is optimistic only; needs real `notifications` UPDATE
- [ ] **GitHub Connection** — OAuth initiation and disconnect call service stubs; needs real GitHub OAuth app wiring

---

### Priority 3 — Missing / incomplete features

- [ ] **Institution onboarding** — no UI to create an institution; currently the DB trigger uses "first institution found". Admin needs a setup flow.
- [ ] **Faculty invitation system** — admin can invite faculty via email; invite token must be generated server-side and sent via Supabase email
- [ ] **Student Profile tabs** — Projects, Assignments, Activity, Outcomes tabs are placeholder `<PlaceholderPage>` components inside StudentProfile
- [ ] **GitHub webhook ingestion** — `github_events` table exists but no webhook handler processes incoming events
- [ ] **Streak calculation job** — `streaks` table exists; calculation logic not implemented (currently returns demo data)
- [ ] **Repository approval workflow** — `RepositoryApprovalPanel` UI is done; backend `approveRepository` / `declineRepository` service stubs need real DB writes
- [ ] **Evidence submission validation** — submission form accepts a commit SHA; no validation that the SHA belongs to the student's approved repository
- [ ] **Real-time notifications** — currently polling; should use Supabase Realtime channel subscription

---

### Priority 4 — Production readiness

- [ ] **Environment variables** — create `.env.production` with real Supabase URL + anon key
- [ ] **Production redirect URLs** — add `https://<your-domain>/**` and `https://<your-domain>/auth/callback` to Supabase Auth settings
- [ ] **Error boundaries** — add React error boundaries around feature routes to prevent full-page crashes
- [ ] **Loading skeletons** — some pages flash empty state before data loads; replace with `<Skeleton>` components
- [ ] **Code splitting** — current bundle is 833 KB gzipped; add `React.lazy` + `Suspense` on route-level imports
- [ ] **Remove debug console.log** — `[DevScope] OAuth callback:` logs in `AuthCallbackPage.tsx` should be removed before production deploy

---

## 🏗️ PROJECT ARCHITECTURE REFERENCE

```
devatlasapp/
├── src/
│   ├── app/
│   │   ├── AuthContext.tsx       ← session state, fetchOrCreateProfile
│   │   ├── RouteGuards.tsx       ← RequireAuth, RequireGuest, roleHome()
│   │   └── RootRedirect.tsx
│   ├── components/
│   │   ├── shared/               ← AppShell, Sidebar, TopBar, DemoSwitcher
│   │   └── ui/                   ← Avatar, Badge, Button, Card, GoogleAuthButton…
│   ├── features/
│   │   ├── auth/                 ← SignInPage, SignUpPage, AuthCallbackPage…
│   │   ├── landing/              ← LandingPage, LandingNavbar
│   │   ├── faculty/              ← FacultyOverview, AttentionQueue
│   │   ├── students/             ← StudentWorkspace, StudentProfile, StudentDirectoryPage
│   │   ├── assignments/          ← AssignmentsPage, AssignmentDetailPage, StudentAssignmentsPage
│   │   ├── admin/                ← AdminPage
│   │   ├── github/               ← GitHubConnectionPanel, GitHubCallbackPage…
│   │   ├── settings/             ← SettingsPage
│   │   ├── notifications/        ← NotificationsPage
│   │   ├── activity/             ← ActivityHeatmap
│   │   ├── streaks/              ← DevelopmentTower
│   │   └── submissions/          ← EvidenceRail
│   ├── lib/
│   │   ├── supabase.ts           ← singleton client (flowType:'pkce', detectSessionInUrl:true)
│   │   ├── demo-data.ts          ← 300-student fixture dataset
│   │   └── utils.ts
│   ├── services/                 ← data access layer (Supabase + demo fallback)
│   ├── styles/index.css          ← Tailwind v4 @theme tokens
│   └── types/                    ← Profile, Role, supabase generated types
├── supabase/migrations/          ← SQL migration files 001–009
└── COMPLETED_WORK.md             ← this file
```

---

## 🔑 KEY DECISIONS & CONSTRAINTS

| Decision | Reason |
|---|---|
| `flowType: 'pkce'` on Supabase client | Required for Google OAuth on modern Supabase projects |
| `detectSessionInUrl: true` | Lets `initialize()` auto-exchange the PKCE code; `AuthCallbackPage` must NOT call `exchangeCodeForSession` manually |
| No `tailwind.config.js` | Tailwind v4 is CSS-first; all tokens in `@theme {}` in `styles/index.css` |
| Supabase typed client returns `never` for relational selects | All such queries cast via `as unknown as ExplicitType` — intentional, do not remove |
| `lucide-react` v1.52 has no `Github` icon | Use `GitBranch` instead |
| Service role key never in frontend | Only `VITE_SUPABASE_ANON_KEY` in browser; service role stays server-side only |
| Dashboard routes are `/workspace` (student), `/overview` (faculty), `/admin` (admin) | NOT `/student/dashboard` or `/faculty/dashboard` — do not create those routes |
