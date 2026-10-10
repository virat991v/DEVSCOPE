# DevAtlas — Architecture

**Version:** 0.1 (Phase 1 — demo shell)

---

## System boundaries

```
Browser (React + Vite)
  │
  ├── Demo adapter (deterministic fixture data)   ← current
  │
  └── Supabase (Phase 2+)
        ├── PostgreSQL (RLS-enforced tables)
        ├── Supabase Auth (role assignment server-controlled)
        ├── Edge Functions (webhook intake, background jobs)
        └── Scheduled workers (reconciliation, streak recompute)

GitHub App (Phase 3+)
  └── Webhooks → Edge Function → durable job queue → PostgreSQL
```

## Frontend organization

```
src/
  app/              Route layouts and guards (Phase 2)
  components/
    ui/             Radix-based primitives (Button, Badge, Card, …)
    shared/         AppShell, Sidebar, TopBar, DemoSwitcher
  features/
    faculty/        FacultyOverview, AttentionQueue
    students/       StudentProfile, StudentWorkspace
    activity/       ActivityHeatmap
    submissions/    EvidenceRail
    streaks/        DevelopmentTower
  hooks/            Shared React hooks (Phase 2)
  services/         Typed service boundary + demo adapter
  lib/              utils, demo-data
  types/            Domain types (index.ts)
  styles/           index.css (Tailwind v4 + design tokens)
```

## Service boundary

All data access goes through the `DevAtlasService` interface in `src/services/index.ts`. The demo adapter returns deterministic fixture data. The production adapter (Phase 2) will call Supabase. No production code may silently substitute fake data after an API error.

## Data flow (Phase 1 — demo)

```
Page component
  → useQuery(queryKey, () => service.getX(...))
  → demoService.getX(...)
  → deterministic fixture data from src/lib/demo-data.ts
  → rendered UI
```

## Data flow (Phase 3 — GitHub ingestion)

```
GitHub webhook
  → Edge Function (verify signature, durable receipt)
  → webhook_receipts table
  → background job worker (claim → process → upsert)
  → commits / pull_requests / issues tables
  → student_daily_activity recompute
  → heatmap / streak recalculate
```

## Authorization model

- All authorization enforced in PostgreSQL RLS policies (Phase 2)
- Institution scope in schema prevents cross-institution access
- Role assignments come from server-controlled role_assignments table — never from student-editable profile metadata
- Faculty cannot access batches they are not assigned to
- Students can only read their own private data

## Key trade-offs

| Decision | Rationale |
|----------|-----------|
| PostgreSQL for background jobs | Avoids Redis/Kafka dependency; bounded concurrency via row-level locking |
| Tailwind v4 CSS-first tokens | Single source of truth; no separate config file |
| Demo adapter behind typed boundary | Safe to test locally without live credentials; swapped in Phase 2 |
| No realtime subscriptions initially | Added only when it improves a specific workflow |
| Supabase Auth | Avoids second password system; RLS integrates with auth.users |

## Performance targets

| Metric | Target |
|--------|--------|
| LCP | ≤ 2.5s |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |
| Initial JS (gzip) | ≤ 250KB (current: 144KB ✓) |

## Deployment target

- Frontend: static host (Cloudflare Pages or equivalent), SPA fallback route required
- Backend: Supabase project (PostgreSQL + Auth + Edge Functions)
- Secrets: never in browser bundles or VITE_ prefixed variables
