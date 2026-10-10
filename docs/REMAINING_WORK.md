# Remaining Work

**Last updated:** 2026-10-09

## Immediate blockers and required verification

1. Create the institution's actual academic-course records and active student batch memberships. The connected classroom flow intentionally rejects joining a class outside the student's batch.
2. Reconcile the linked project's legacy migration ledger before using `supabase db push`: remote schema is populated but reports no historical migrations. Preserve a reviewed backup/schema comparison; do not blindly replay 001–016.
3. Audit active production faculty/admin role assignments before promotion. Migration 017 protects only future self-service signups.
4. Decide whether public self-signup is allowed. The current hosted-style configuration and UI expose signup, while the existing product documentation describes invitation-only access.
5. Provide production values through secure hosted configuration, not this repository: Supabase Auth redirect allow-list, Google OAuth credentials, GitHub OAuth/App credentials, webhook secret, exact `ALLOWED_ORIGIN`, job scheduler authentication, Vercel variables, and storage policies.

## Critical security work

- Replace the broad invitation read policy with a server-side token validation/acceptance workflow.
- Review existing active privileged roles; migration 017 only prevents future metadata-based escalation.
- Scope submissions to published assignments and active classroom/batch membership in RLS.
- Scope GitHub account/activity/repository visibility to actual academic authorization rather than institution-wide access where the directive requires it.
- Add grade-history/audit controls and server-side validation for manual-grade mutations.
- Run real RLS integration tests using anonymous, student, unrelated faculty, assigned faculty, and admin identities.

## Product gaps by priority

1. Add real academic-course and enrolment administration, then add classroom approval, faculty enrollment/removal, co-teachers, imports, and class settings. The join-code core is already deployed and verified in staging.
2. Complete assignment lifecycle: targeting, attachments, due/late rules, evidence types, resubmission history, manual grading, grade history, feedback, and notifications.
3. GitHub reliability: repo attachment/approval, incremental synchronization, signed webhook normalization, atomic durable jobs, reconciliation, rate limits, connection health.
4. Complete classroom-scoped dashboard data, announcements, notification delivery, messaging, realtime cache updates, reporting, pagination, and search.
5. Private/public verified developer portfolios with explicit publication control and faculty verification.
6. Opt-in, transparent developer leaderboard with scoped participation and anti-manipulation controls.
7. Accessibility/performance/security/production readiness: error boundaries, database integration coverage, representative-data benchmarks, Vercel validation, and operating documentation.

## Known implementation defects to resolve in Milestone 1

- `saveEvaluation` uses a conflict target absent from the schema and does not request its inserted row.
- `submitAssignment` does not reliably create a version because the upsert does not select the returned submission.
- Several production pages still reference demo batch identifiers.
- Admin invitation creation omits `institution_id` and cannot be a reliable production path.
- Integration health uses a placeholder institution id and requests a missing webhook column.
- GitHub sync/webhook workers do not yet implement the normalization, durable raw-event strategy, atomic claims, or reconciliation required by the product directive.
- Portfolio and leaderboard modules have no schema, routes, service layer, or tests.
- The classroom core is deployed to the linked staging project. Current staging setup has no course rows or student batch memberships, so the first human-created class requires that institutional setup data.
