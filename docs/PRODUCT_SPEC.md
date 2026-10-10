# DevAtlas — Product Specification

**Version:** 0.1 (Phase 1)  
**Brand:** DevAtlas — Student Development & GitHub Activity Platform  
**Defining idea:** A clear view of student development, from assignment to evidence.

---

## Purpose

Faculty need to understand what approximately 300 students are building, which assignments need review, where academic work is blocked, and what development evidence supports an outcome. Students need a calm workspace for assignments, projects, GitHub activity, feedback, and personal consistency.

## Core relationship

```
Academic structure → student/team → project → assignment
  → approved repository → development evidence
  → submission → faculty evaluation → outcome
```

GitHub activity supports this relationship. It is not the grading system.

## Non-negotiable constraints

- No AI/ML features, chatbots, generated evaluations, predictive risk scores, or automated claims about code quality.
- Track only explicitly approved academic repositories.
- Never treat commits, lines changed, or streaks as academic merit, effort, authorship proof, or grades.
- Do not store repository source code, complete diffs, ZIP archives, or file contents.
- Every visible action must work, have a meaningful disabled state, or be clearly outside the current release.

## Roles

| Role | Access scope |
|------|-------------|
| Student | Own private activity and feedback, assigned work, GitHub connection, allowed personal settings |
| Faculty | Assigned batches and authorized projects, assignments, reviews, repository approval, analytics |
| Institution Admin | Memberships, faculty assignments, academic configuration, integrations, audit/sync health |

## Release priority

### Required (this release)
Authentication, role-aware navigation, academic structure, batch membership, student directory and profiles, individual and team projects, repository approval, assignments, explicit submissions, rubric-based faculty reviews, GitHub connection and ingestion, heatmaps, configurable streaks, milestones, development tower, attention queue, meaningful analytics, in-app notifications, audit logs, admin sync monitoring, CSV import/export, accessible responsive UI, isolated demo mode.

### Add after stable
Private saved views, per-student deadline extensions, course-outcome mappings, accessible print reports, keyboard shortcuts, notification digest preferences, configurable semester calendars.

### Deferred
Public leaderboards, social feeds, chat, mobile native apps, plagiarism detection, full LMS features, automated repository creation, outbound email/SMS, complex gamification.

## Streak policy (initial)

- Rule: ≥ 3 qualifying commits on a reporting day
- Default timezone: Asia/Kolkata
- Exclusions: merge commits and identified bots excluded by default
- Milestones: 5, 10, 25, 50, 100, 150, 200 qualifying days
- Tower labels: Getting Started, Building Rhythm, Consistent Practice, Sustained Practice, Long-Term Commitment
- Streaks reflect observed academic consistency — not effort, mastery, or expertise

## Privacy

- Explain what data is collected before GitHub connection
- Limit collection to approved academic scope
- On disconnect/revocation, stop future sync promptly
- Apply documented retention/deletion policy to existing records
- Never expose another project's private commit messages through a global timeline
