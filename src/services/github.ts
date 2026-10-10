/**
 * GitHub integration service — frontend side.
 *
 * All sensitive operations (token exchange, signature verification) run in
 * Supabase Edge Functions. This module only calls those functions and
 * updates local UI state.
 *
 * Never stores installation tokens or GitHub App secrets in the browser.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { GitHubConnectionState } from '@/types'

// ─── Types ────────────────────────────────────────────────

export interface GitHubAccountInfo {
  githubLogin: string
  githubId: string
  connectionState: GitHubConnectionState
  connectedAt?: string
  lastSyncAt?: string
}

export interface GitHubInstallationInfo {
  installationId: string
  accountLogin: string
  accountType: 'User' | 'Organization'
  isSuspended: boolean
  installedAt: string
}

export interface RepositoryProposal {
  id: string
  fullName: string
  isPrivate: boolean
  approvalState: 'proposed' | 'approved' | 'declined' | 'disconnected' | 'archived'
  approvedBy?: string
  approvedAt?: string
  declineReason?: string
  lastSyncAt?: string
  coverageState: 'healthy' | 'pending_import' | 'stale' | 'disconnected' | 'unavailable'
}

export interface SyncJobSummary {
  id: string
  jobType: string
  state: 'pending' | 'claimed' | 'processing' | 'done' | 'failed' | 'dead_letter'
  retryCount: number
  maxRetries: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

export interface GitHubRepoSummary {
  githubRepoId: string
  name: string
  fullName: string
  isPrivate: boolean
  htmlUrl: string
  description: string | null
  defaultBranch: string
  language: string | null
  updatedAt: string
  pushedAt: string
}

export interface SyncResult {
  ok: true
  syncedAt: string
  repositoryCount: number
  repositories: GitHubRepoSummary[]
}

export interface WebhookReceiptSummary {
  id: string
  deliveryId: string
  eventType: string
  action?: string
  processingState: string
  receivedAt: string
}

export interface IntegrationHealth {
  connectionState: GitHubConnectionState
  githubLogin?: string
  lastSyncAt?: string
  installations: GitHubInstallationInfo[]
  recentJobs: SyncJobSummary[]
  recentReceipts: WebhookReceiptSummary[]
  pendingJobCount: number
  failedJobCount: number
  deadLetterCount: number
}

// ─── OAuth flow ───────────────────────────────────────────

/**
 * Step 1: Begin GitHub OAuth.
 * Calls the github-start-oauth Edge Function to get a signed redirect URL.
 * Redirects the browser to GitHub; the callback is handled server-side.
 */
export async function beginGitHubOAuth(): Promise<{ ok: true } | { ok: false; error: string; detail?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const { data: { session }, error: sessErr } = await supabase.auth.getSession()
  if (sessErr || !session) return { ok: false, error: 'not_authenticated' }

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-start-oauth`
  let res: Response
  try {
    res = await fetch(fnUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type':  'application/json',
      },
    })
  } catch (err) {
    return { ok: false, error: 'network_error', detail: String(err) }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 404) return { ok: false, error: 'function_not_deployed' }
    return { ok: false, error: body.error ?? `http_${res.status}`, detail: body.detail }
  }

  const { url } = await res.json()
  if (!url) return { ok: false, error: 'missing_redirect_url' }

  // Redirect to GitHub OAuth — user will return to /github-callback
  window.location.href = url
  return { ok: true }
}

/**
 * Step 2: Handle the GitHub OAuth callback.
 * Called from the /github-callback route after GitHub redirects back.
 * Sends { code, state } to the server-side Edge Function.
 */
export async function handleGitHubCallback(
  code: string,
  state: string,
): Promise<{ ok: true; githubLogin: string; nextStep: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-oauth-callback`
  let res: Response
  try {
    res = await fetch(fnUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, state }),
    })
  } catch (err) {
    return { ok: false, error: `network_error: ${String(err)}` }
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: body.error ?? `http_${res.status}` }

  return { ok: true, githubLogin: body.githubLogin, nextStep: body.nextStep }
}

// ─── Account queries ──────────────────────────────────────

export async function getGitHubAccount(profileId: string): Promise<GitHubAccountInfo | null> {
  if (!isSupabaseConfigured) return null

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
        }
      }
    }
  }

  const { data } = await sb
    .from('github_accounts')
    .select('github_id, github_login, connection_state, connected_at, last_sync_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!data) return null

  return {
    githubLogin:     data.github_login as string,
    githubId:        data.github_id as string,
    connectionState: data.connection_state as GitHubConnectionState,
    connectedAt:     data.connected_at as string | undefined,
    lastSyncAt:      data.last_sync_at as string | undefined,
  }
}

export async function disconnectGitHub(profileId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  const { error } = await sb
    .from('github_accounts')
    .update({
      connection_state: 'disconnected',
      disconnected_at:  new Date().toISOString(),
    })
    .eq('profile_id', profileId)

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true }
}

// ─── Repository management ────────────────────────────────

export async function getProjectRepositories(projectId: string): Promise<RepositoryProposal[]> {
  if (!isSupabaseConfigured) return []

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (c: string, v: string) => {
          order: (c: string, o: object) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>
        }
      }
    }
  }

  const { data } = await sb
    .from('repositories')
    .select('id, full_name, is_private, approval_state, approved_by, approved_at, decline_reason, last_sync_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (!data) return []

  return data.map(r => ({
    id:            r.id as string,
    fullName:      r.full_name as string,
    isPrivate:     r.is_private as boolean,
    approvalState: r.approval_state as RepositoryProposal['approvalState'],
    approvedBy:    r.approved_by as string | undefined,
    approvedAt:    r.approved_at as string | undefined,
    declineReason: r.decline_reason as string | undefined,
    lastSyncAt:    r.last_sync_at as string | undefined,
    coverageState: r.last_sync_at ? 'healthy' : 'pending_import',
  })) as RepositoryProposal[]
}

export async function approveRepository(
  repoId: string,
  approverId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  const { error } = await sb
    .from('repositories')
    .update({ approval_state: 'approved', approved_by: approverId, approved_at: new Date().toISOString() })
    .eq('id', repoId)

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true }
}

export async function declineRepository(
  repoId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  const { error } = await sb
    .from('repositories')
    .update({ approval_state: 'declined', decline_reason: reason })
    .eq('id', repoId)

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true }
}

// ─── Integration health (admin) ───────────────────────────

export async function getIntegrationHealth(institutionId: string): Promise<IntegrationHealth | null> {
  if (!isSupabaseConfigured) return null

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (c: string, v: string) => {
          order?: (c: string, o: object) => {
            limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>
          }
          limit?: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>
          in?: (c: string, v: string[]) => Promise<{ data: Record<string, unknown>[] | null; count?: number | null }>
          maybeSingle?: () => Promise<{ data: Record<string, unknown> | null }>
        }
      }
    }
  }

  // Recent jobs
  const { data: jobs } = await (sb
    .from('sync_jobs')
    .select('id, job_type, state, retry_count, max_retries, error_message, created_at, completed_at')
    .eq('institution_id', institutionId) as unknown as {
      order: (c: string, o: object) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> }
    }).order('created_at', { ascending: false }).limit(20)

  // Recent webhook receipts
  const { data: receipts } = await (sb
    .from('webhook_receipts')
    .select('id, delivery_id, event_type, action, processing_state, received_at')
    .eq('institution_id', institutionId) as unknown as {
      order: (c: string, o: object) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> }
    }).order('received_at', { ascending: false }).limit(20)

  const recentJobs: SyncJobSummary[] = (jobs ?? []).map(j => ({
    id:           j.id as string,
    jobType:      j.job_type as string,
    state:        j.state as SyncJobSummary['state'],
    retryCount:   j.retry_count as number,
    maxRetries:   j.max_retries as number,
    errorMessage: j.error_message as string | undefined,
    createdAt:    j.created_at as string,
    completedAt:  j.completed_at as string | undefined,
  }))

  const recentReceipts: WebhookReceiptSummary[] = (receipts ?? []).map(r => ({
    id:              r.id as string,
    deliveryId:      r.delivery_id as string,
    eventType:       r.event_type as string,
    action:          r.action as string | undefined,
    processingState: r.processing_state as string,
    receivedAt:      r.received_at as string,
  }))

  return {
    connectionState: 'healthy',
    installations:   [],
    recentJobs,
    recentReceipts,
    pendingJobCount:    recentJobs.filter(j => j.state === 'pending').length,
    failedJobCount:     recentJobs.filter(j => j.state === 'failed').length,
    deadLetterCount:    recentJobs.filter(j => j.state === 'dead_letter').length,
  }
}

// ─── Sync & repo listing ─────────────────────────────────

/**
 * Trigger a GitHub repository sync for the current user.
 * Calls the github-sync Edge Function which reads the stored access token
 * server-side, fetches repos from GitHub API, and upserts into the staging
 * table. Returns the live list of repositories.
 */
export async function syncGitHub(): Promise<SyncResult | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'demo_mode' }

  const { data: { session }, error: sessErr } = await supabase.auth.getSession()
  if (sessErr || !session) return { ok: false, error: 'not_authenticated' }

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`
  let res: Response
  try {
    res = await fetch(fnUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type':  'application/json',
      },
    })
  } catch (err) {
    return { ok: false, error: `network_error: ${String(err)}` }
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: body.error ?? `http_${res.status}` }

  return body as SyncResult
}

/**
 * Read the current student's staged GitHub repositories from the DB.
 * These are the repos last synced, before/after faculty approval.
 */
export async function getMyGitHubRepos(): Promise<GitHubRepoSummary[]> {
  if (!isSupabaseConfigured) return []

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        order: (col: string, opts: object) => Promise<{ data: Record<string, unknown>[] | null }>
      }
    }
  }

  const { data } = await sb
    .from('student_github_repos')
    .select('github_repo_id, name, full_name, is_private, html_url, description, default_branch, language, github_updated_at, github_pushed_at')
    .order('github_pushed_at', { ascending: false })

  if (!data) return []

  return data.map(r => ({
    githubRepoId:  r.github_repo_id as string,
    name:          r.name as string,
    fullName:      r.full_name as string,
    isPrivate:     r.is_private as boolean,
    htmlUrl:       r.html_url as string,
    description:   r.description as string | null,
    defaultBranch: r.default_branch as string,
    language:      r.language as string | null,
    updatedAt:     r.github_updated_at as string,
    pushedAt:      r.github_pushed_at as string,
  }))
}
