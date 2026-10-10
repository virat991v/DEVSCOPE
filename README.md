
# DEVSCOPE

**Student Development & GitHub Activity Platform**

> A clear view of student development, from assignment to evidence.

---

## Status

Phase 1 complete — foundation, visual benchmark, demo shell.

## Quick start

```bash
cd devatlasapp
npm install
npm run dev
# → http://localhost:5173
```

No credentials required for demo mode. Use the **Demo** pill at the bottom of the screen to switch between faculty, student, and admin views.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first), design tokens |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| UI primitives | Radix UI |
| Icons | lucide-react |
| Backend (Phase 2+) | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| GitHub integration (Phase 3+) | GitHub App |

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build (tsc + vite)
npm run preview    # Preview production build
npm run lint       # Lint with oxlint
```

## Environment setup

```bash
cp .env.example .env.local
# Fill in Supabase and GitHub credentials for Phase 2+
```

See [`.env.example`](.env.example) for all variable names and descriptions.

## Documentation

| File | Contents |
|------|----------|
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | Product decisions and scope |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System boundaries, data flows, trade-offs |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, components, interactions |
| [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) | Entities, activity semantics, privacy |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | Completed work, validation, next steps |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Setup, sync recovery, deployment, rollback |
| [`docs/UI_REFERENCES.md`](docs/UI_REFERENCES.md) | Adopted component sources and licenses |

## Project structure

```
src/
  components/
    ui/          # Radix-based primitives (Button, Badge, Card, …)
    shared/      # AppShell, Sidebar, TopBar, DemoSwitcher
  features/
    faculty/     # FacultyOverview, AttentionQueue
    students/    # StudentProfile, StudentWorkspace
    activity/    # ActivityHeatmap
    submissions/ # EvidenceRail
    streaks/     # DevelopmentTower
  lib/           # utils, demo-data
  services/      # Typed service boundary + demo adapter
  styles/        # index.css — design tokens + Tailwind
  types/         # Domain types
```

## Implementation phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Foundation, visual benchmark, demo shell |
| 2 | ⬜ Planned | Supabase schema, auth, real academic workflows |
| 3 | ⬜ Planned | GitHub App integration, webhook ingestion |
| 4 | ⬜ Planned | Activity attribution, streaks, analytics |
| 5 | ⬜ Planned | Notifications, imports/exports, admin controls |
| 6 | ⬜ Planned | Release validation, security review, deployment |

## External credentials needed

Phase 2+: Supabase project URL, anon key, service-role key  
Phase 3+: GitHub App ID, private key, client ID/secret, webhook secret

