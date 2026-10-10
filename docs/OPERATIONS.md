# DevAtlas — Operations

**Version:** 0.1

---

## Local development setup

```bash
# 1. Install dependencies
cd devatlasapp
npm install

# 2. Copy environment example
cp .env.example .env.local
# Fill in real values for Supabase + GitHub (Phase 2+)

# 3. Run dev server
npm run dev
# → http://localhost:5173

# 4. Type check
npx tsc --noEmit

# 5. Build for production
npm run build

# 6. Preview production build
npm run preview
```

## Demo mode

The app starts in demo mode with deterministic fixture data. No credentials required.  
Use the demo switcher (bottom-center pill) to switch between faculty, student, and admin views.  
Demo data is isolated from production; a demo reset cannot touch live data.

## Environment variables (Phase 2+)

See `.env.example` for all required variable names. Never put secrets in `VITE_`-prefixed variables — those are bundled into the browser.

Server-side only (Edge Functions / worker):
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Browser-safe (VITE_ prefix):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database migrations (Phase 2+)

```bash
# Apply migrations to development database
supabase db push

# Generate TypeScript types from schema
supabase gen types typescript --local > src/types/supabase.ts

# Reset development database (dev only, never production)
supabase db reset
```

## Sync recovery

If a GitHub App sync fails:
1. Check Integration Health page (Admin → Integrations)
2. Identify failed jobs in `sync_jobs` table (state = 'failed' or 'dead_letter')
3. Use the retry control in the UI (bounded, auditable)
4. Check rate limit headers in `webhook_receipts` if repeated failures
5. For stale coverage: queue a bounded reconciliation job, not a full reimport

## Retention and deletion

- Webhook receipt payloads: retained for 7 days (configurable), then redacted
- Commit metadata: retained for duration of academic association + configured period
- On GitHub disconnect: stop future sync immediately; existing academic records retained per policy
- Audit logs: retained indefinitely (institution admin access only)

## Deployment

**Frontend (Cloudflare Pages or equivalent):**
```bash
npm run build
# Deploy dist/ directory
# Configure SPA fallback: all routes → /index.html
# Set environment variables in host settings
```

**GitHub App registration:**
1. Create GitHub App at github.com/settings/apps/new
2. Set permissions: Contents: Read, Pull requests: Read, Issues: Read, Metadata: Read
3. Set webhook URL to your Edge Function endpoint
4. Generate and store private key (server-side only, never in browser)
5. Configure webhook secret

**Supabase:**
1. Create project at app.supabase.com
2. Run migrations: `supabase db push`
3. Enable RLS on all tables
4. Deploy Edge Functions: `supabase functions deploy`
5. Set secrets: `supabase secrets set GITHUB_WEBHOOK_SECRET=...`
6. Configure scheduled workers in Supabase cron

## Rollback

- Frontend: deploy previous build artifact (Cloudflare Pages: instant rollback in dashboard)
- Database: migrations are versioned; down migrations documented per-migration
- GitHub App: installation can be suspended/reinstalled; ingestion state is recoverable

## Performance estimates (300 students)

| Item | Estimate |
|------|----------|
| Daily observed commits (active cohort ~60%) | ~180 students × ~4 commits = ~720/day |
| `student_daily_activity` rows/year | 300 × 365 = 109,500 |
| `commits` rows (90-day initial import) | ~300 × 4 × 90 = ~108,000 |
| Webhook deliveries/day (commits + PRs + issues) | ~1,000–2,000 |
| Index storage (estimated) | ~50–100MB per year |

Verify current Supabase plan quotas at deployment time. Free tier may not sustain this workload at full activity.
