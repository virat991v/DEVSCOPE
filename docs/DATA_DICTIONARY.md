# DevAtlas — Data Dictionary

**Version:** 0.1

---

## Privacy classifications

| Level | Description | Examples |
|-------|-------------|---------|
| Public academic | Visible to enrolled student + assigned faculty | Roll number, batch, assignment state |
| Student-private | Student only | Personal GitHub activity breakdown |
| Faculty-only | Faculty + admin only | Faculty notes, evaluation drafts, internal flags |
| Admin-only | Institution admin only | Audit logs, sync health, configuration |

---

## Entity groups

### Identity

**institutions** — The top-level tenant. All records scoped here.  
**profiles** — User account linked to `auth.users`. Holds display name, email, role.  
**institution_memberships** — Links a profile to an institution with an enrollment period.  
**role_assignments** — Server-controlled role grants. Never from student-editable fields.  
**students** — Student-specific attributes (roll number, batch membership).  
**faculty** — Faculty-specific attributes and batch assignments.

### Academics

**academic_courses** — Course definition (name, code, credits).  
**academic_years** — Calendar year grouping (2024–25, etc.).  
**academic_divisions** — Division within a year (A, B, C, E…).  
**academic_batches** — Specific batch (SE-E-B). Display labels from config, not hard-coded routes.  
**semesters** — Semester within a batch (start/end dates, timezone).  
**batch_memberships** — Student enrollment in a batch with start/end dates. Preserved for transfers and historical reports.  
**faculty_batch_assignments** — Faculty access grant to a batch.

### Work

**projects** — Individual or team project. Belongs to a batch.  
**project_members** — Student membership in a project with dates.  
**project_repositories** — Links a project to an approved GitHub repository.  
**assignments** — Published task with deadline, rubric, and mode (individual/team).  
**assignment_targets** — Links an assignment to specific students or teams.  
**assignment_extensions** — Per-student deadline extension with reason and faculty audit.  
**submissions** — Student/team response to an assignment. Has state machine.  
**submission_versions** — Immutable history of each submission revision.  
**submission_evidence** — Links a submission to specific commit SHA, PR URL, etc.

### Evaluation

**rubrics** — Reusable set of criteria.  
**rubric_criteria** — Individual criterion (label, description, max points).  
**evaluations** — Faculty evaluation of a submission. Draft until published.  
**criterion_results** — Per-criterion score and comment within an evaluation.  
**outcomes** — Faculty-defined learning outcomes (Phase 5).  
**outcome_mappings** — Links rubric criteria to outcomes (Phase 5).  
**faculty_notes** — Private faculty notes on a student. Not visible to student.

### GitHub

**github_accounts** — Verified GitHub identity linked to a platform user. One identity per institution.  
**github_installations** — GitHub App installation record (org or user). Not equivalent to one student account.  
**installation_repositories** — Repositories accessible via an installation.  
**repositories** — Canonical repository record with approval state.  
**commits** — Normalized commit metadata. Does not store source code or diffs. SHA + author identity + timestamps.  
**commit_branch_refs** — Branch membership for a commit (many-to-many). A commit can belong to multiple branches.  
**pull_requests** — PR metadata. State tracked; newer state never overwritten by older delivery.  
**issues** — Issue metadata.

### Derived records

**student_daily_activity** — Precomputed per-student per-day aggregates. Drives heatmap. Never N+1 queries.  
**student_streaks** — Persisted current/longest streak, last qualifying date, timezone, policy version.  
**milestone_definitions** — Configurable thresholds and labels.  
**milestone_awards** — Idempotent award records. Prevent duplicate notifications on retry.  
**activity_policy_versions** — Versioned streak/observation rules with effective dates.

### Operations

**notifications** — In-app notification with read/unread state. Grouped and deduplicated by rule/entity/window.  
**notification_preferences** — Per-user opt-in/out per notification type.  
**saved_views** — Per-user filter/sort state (Phase 5).  
**sync_jobs** — Background job queue. Lease expiry, retry count, exponential backoff, dead-letter state.  
**webhook_receipts** — Durable receipt of a GitHub webhook delivery. Identity separate from processing status.  
**audit_logs** — Immutable log of role changes, repository approvals, reviews, configuration changes, exports. No secrets logged.  
**system_settings** — Institution-level configuration: timezone, thresholds, retention policy, holiday calendars.

---

## Activity semantics

- **Observed commit:** a commit SHA first seen on a configured tracked branch of an approved repository, within an active academic association, attributed to a verified GitHub actor.
- **Authorship:** the GitHub author field. The pusher is not necessarily the author. Do not match students by display name; require verified account linking.
- **Qualifying day (default streak rule):** a reporting day with ≥ 3 distinct authored commits meeting the above criteria. Reporting day derived from committed timestamp in configured institution timezone (Asia/Kolkata by default).
- **Coverage states:** `healthy` (sync current), `pending_import` (outside history window), `stale` (sync overdue), `disconnected` (installation lost), `unavailable` (data not available). A zero with `healthy` coverage is different from no evidence because sync failed.
- **Streak-excluded:** merge commits and identified bots excluded by default. PR/issue activity not counted toward commit-only streak unless policy extended.

---

## ID conventions

- Internal IDs: UUID
- GitHub IDs: stored as TEXT or BIGINT to avoid JS integer precision loss
- Usernames and repository names: display attributes only, not stable identity keys
- Webhook delivery ID: unique constraint for deduplication

---

## Constraint rules

- Unique constraint on repository + SHA (commit deduplication)
- Unique constraint on external PR/issue identity per installation
- Unique constraint on webhook delivery ID
- Unique constraint on milestone award per student + threshold
- Composite FK or equivalent validated constraints to prevent cross-institution associations
