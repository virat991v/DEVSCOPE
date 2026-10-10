# Completed Work

## 2026-10-09 — Repository audit and signup role hardening

### Verified repository observations

- React/Vite/Tailwind/Supabase architecture, routes, service boundary, migrations, RLS, GitHub Edge Functions, environment variable names, and existing documentation were inspected.
- Frontend source does not contain a Supabase service-role key; only Vite URL/anon-key variables are declared.
- `npm run build` completed successfully.
- `npm run lint` completed without errors and reported eight non-blocking warnings.

### Implemented

- Added `supabase/migrations/017_harden_signup_role_assignment.sql`.
  - Future auth signups always receive the `student` role.
  - Client-supplied auth metadata can no longer create faculty or administrator assignments.
  - The change is forward-only and does not modify existing profiles or role assignments.
- Added `tests/signup-role-hardening.test.mjs` and an `npm test` script.
  - The regression test ensures the hardening migration assigns only `student`, does not read a client `role`, remains idempotent, and keeps direct execution revoked from browser roles.
- Added current-state planning and handoff documents:
  - `docs/ARCHITECTURE_AUDIT.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/REMAINING_WORK.md`

### Tests run

| Command | Result |
| --- | --- |
| `npm run lint` | Passed with 8 warnings. |
| `npm run build` | Passed. |
| `npm test` | Passed: 2/2 signup-role hardening regression tests. |

### Deliberately not performed

- No existing role assignment was changed.
- No secret, auth-provider, GitHub, Vercel, or Supabase production configuration was changed.
- No deployment was performed.

## 2026-10-09 — Connected classroom core (live staging verification)

### Implemented

- Added `supabase/migrations/018_classroom_core.sql`.
  - Adds classrooms, faculty links, student memberships, classroom announcements, and classroom-specific assignments without deleting or replacing existing batch data.
  - Adds secure command RPCs for faculty classroom creation, student code-based joining, faculty announcement publishing, and faculty assignment publishing.
  - Writes durable in-app notifications for both sides of the workflow:
    - faculty are notified when a student joins or requests a classroom;
    - active students are notified when faculty publish an announcement or assignment.
  - Adds RLS policies that scope streams, rosters, and classroom assignments to active student membership or the assigned faculty member.
  - Tightens student submission creation/revision so it requires an authorized published batch/classroom assignment.
  - Adds relevant tables to the Supabase Realtime publication; client subscriptions invalidate React Query caches and refetch the database source of truth.
- Added `src/features/classrooms/ClassroomsPage.tsx` and `classroom-service.ts`.
  - Faculty can create a classroom and publish stream posts or assignments.
  - Students can join by classroom code, see stream/classwork, and receive notification updates.
  - Faculty see the live classroom roster.
  - Demo mode deliberately shows no fabricated classroom data.
- Added `/classrooms` and `/classrooms/:classroomId` routes for faculty and students, sidebar navigation, and search navigation.
- Extended `src/types/supabase.ts` for the new tables, enums, functions, and `assignments.classroom_id`.
- Added structural authorization tests in `tests/classroom-core-migration.test.mjs`.

### Tests run

| Command | Result |
| --- | --- |
| `npm test` | Passed: 5/5 tests, including classroom schema/authorization/realtime regression checks. |
| `npm run lint` | Passed with the same 8 pre-existing warnings. |
| `npm run build` | Passed. |

### Live Supabase work completed

- Applied `017_harden_signup_role_assignment.sql` directly to the authorized linked Supabase staging project (`gfhnpphasczrifpxnvxz`). The `on_auth_user_created` trigger was then verified.
- Applied `018_classroom_core.sql` directly to that staging project. Verified that the four classroom tables and four command RPCs exist.
- Ran a rollback-only end-to-end transaction using existing staging faculty and student identities. It created a temporary course and enrolment, then exercised: faculty class creation, student code join, faculty announcement, faculty assignment, student stream/classwork read, and persisted notification delivery. The final student authorization assertion passed.
- Verified after rollback that no temporary course or classroom record remains; the realtime publication contains announcements, assignments, memberships, and notifications; protected classroom tables have zero direct client write policies.

### Remaining setup before a person can create the first class

- Staging currently has batches but no academic-course records and no student batch memberships. An administrator must create the real courses and enrol students into their assigned batches; this is institution-owned data and was not invented during technical verification.
- The linked project's legacy migration history is empty even though its pre-existing schema is populated. Do not run `supabase db push` until that history drift is reconciled against a reviewed backup/schema comparison. Migrations 017 and 018 were intentionally applied as reviewed SQL files to avoid replaying 001–016.
