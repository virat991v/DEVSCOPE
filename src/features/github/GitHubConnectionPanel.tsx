/**
 * GitHubConnectionPanel
 *
 * Shows the full GitHub connection state for a student (used in Settings → GitHub tab).
 * Covers all 9 connection states with actionable next steps.
 *
 * States:
 *  not_connected            → Connect button
 *  authorization_pending    → Waiting for GitHub…
 *  identity_connected       → OAuth account linked; review repositories
 *  installation_pending     → Waiting for GitHub App install
 *  repository_selection_pending → Select repositories
 *  initial_sync             → Importing history (90 days)
 *  healthy                  → All good, show account + last sync
 *  degraded                 → Problem, show detail + retry
 *  disconnected             → Reconnect
 */
import { useState } from 'react'
import { GitBranch, CheckCircle, AlertCircle, Clock, RefreshCw, XCircle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { beginGitHubOAuth, disconnectGitHub } from '@/services/github'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { GitHubConnectionState } from '@/types'

// Human-readable error messages for each error code returned by beginGitHubOAuth
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  demo_mode:              'GitHub connection is unavailable in demo mode.',
  not_authenticated:      'Your session has expired. Please sign in again.',
  network_error:          'Could not reach the server. Check your connection and try again.',
  state_creation_failed:  'Could not create a secure GitHub connection state. The OAuth-state database migration may be missing.',
  github_oauth_not_configured: 'GitHub OAuth server settings are incomplete. Contact your administrator.',
  profile_not_found:      'Your profile was not found. Contact your administrator.',
  no_institution:         'Your account is not linked to an institution.',
  missing_redirect_url:   'Server returned an invalid response. Please try again.',
  function_not_deployed:  'GitHub integration is not yet deployed. Contact your administrator.',
}

function oauthErrorMessage(error: string): string {
  return OAUTH_ERROR_MESSAGES[error]
    ?? (error.startsWith('http_') ? `Server error (${error}). Please try again or contact your administrator.` : 'Failed to start GitHub OAuth. Please try again.')
}

interface Props {
  profileId: string
  connectionState: GitHubConnectionState
  githubLogin?: string
  lastSyncAt?: string
  githubAppUrl?: string   // URL to install the GitHub App (set in env/config)
  isDemo?: boolean
  onStateChange?: (state: GitHubConnectionState) => void
}

const STATE_LABELS: Record<GitHubConnectionState, string> = {
  not_connected:               'Not connected',
  authorization_pending:       'Authorisation pending',
  identity_connected:          'Identity connected',
  installation_pending:        'App install pending',
  repository_selection_pending:'Repository selection',
  initial_sync:                'Initial sync',
  healthy:                     'Healthy',
  degraded:                    'Degraded',
  disconnected:                'Disconnected',
}

function stateBadgeVariant(state: GitHubConnectionState): 'success' | 'warning' | 'danger' | 'default' {
  if (state === 'healthy') return 'success'
  if (state === 'degraded') return 'warning'
  if (state === 'disconnected' || state === 'not_connected') return 'default'
  return 'warning'
}

export function GitHubConnectionPanel({
  profileId,
  connectionState,
  githubLogin,
  lastSyncAt,
  githubAppUrl,
  isDemo = false,
  onStateChange,
}: Props) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // OAuth is handled by the Supabase Edge Functions. A GitHub App install is
  // not required for this OAuth-token based integration.
  // isDemo is true in demo mode (no Supabase credentials).
  const githubConfigured = isSupabaseConfigured && !isDemo

  async function handleConnect() {
    if (!githubConfigured) {
      setError('GitHub integration is not configured on this deployment. Contact your administrator.')
      return
    }
    setLoading(true); setError(null)
    const result = await beginGitHubOAuth()
    if (!result.ok) {
      setError(oauthErrorMessage(result.error))
      setLoading(false)
    }
    // If ok, browser will redirect — no state reset needed
  }

  async function handleDisconnect() {
    if (isDemo) return
    if (!confirm('Disconnect your GitHub account? Future sync will stop. Existing academic records are retained.')) return
    setLoading(true); setError(null)
    const result = await disconnectGitHub(profileId)
    setLoading(false)
    if (!result.ok) { setError(result.error ?? 'Disconnect failed.'); return }
    onStateChange?.('disconnected')
  }

  const state = connectionState

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">GitHub Connection</h2>
          <Badge variant={stateBadgeVariant(state)}>
            {STATE_LABELS[state]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Data collection disclosure — always visible */}
        <div className="bg-surface-raised border border-border rounded-[var(--radius-control)] p-3 space-y-1.5">
          <p className="text-xs font-medium text-text-primary">What DevScope collects from GitHub</p>
          <ul className="text-xs text-text-muted space-y-1">
            <li className="flex gap-1.5"><span className="text-primary-bright">•</span>Commit metadata (SHA, timestamps, message excerpt — first 120 chars)</li>
            <li className="flex gap-1.5"><span className="text-primary-bright">•</span>Pull request and issue metadata</li>
            <li className="flex gap-1.5"><span className="text-primary-bright">•</span>Repository names and access state</li>
          </ul>
          <p className="text-xs text-text-disabled mt-1">
            DevScope never stores source code, full diffs, or file contents.
            Only repositories explicitly approved by faculty are tracked.
          </p>
        </div>

        {/* State-specific content */}
        {(state === 'not_connected' || state === 'disconnected') && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {state === 'disconnected'
                ? 'Your GitHub account was disconnected. Reconnect to resume activity tracking.'
                : 'Connect your GitHub account so your approved academic repositories can be tracked.'}
            </p>
            <button
              onClick={handleConnect}
              disabled={loading || !githubConfigured}
              className="flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] border border-primary/80 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading
                ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <GitBranch size={14} />}
              {loading ? 'Redirecting…' : 'Connect GitHub'}
            </button>
          </div>
        )}

        {state === 'authorization_pending' && (
          <StatusRow icon={<Clock size={14} className="text-warning" />}>
            Waiting for GitHub authorisation. If you started the flow, complete it in the opened tab.
            <button onClick={handleConnect} disabled={loading} className="ml-2 text-xs text-primary-bright underline-offset-2 hover:underline">
              Restart
            </button>
          </StatusRow>
        )}

        {state === 'identity_connected' && (
          <div className="space-y-3">
            <StatusRow icon={<CheckCircle size={14} className="text-success" />}>
              Identity verified as <span className="font-mono">@{githubLogin}</span>.
            </StatusRow>
            <p className="text-sm text-text-secondary">
              Repository access is authorised. Review and sync your repositories to submit the relevant ones for faculty approval.
            </p>
            <a
                href="/github/select-repos"
                className="inline-flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] border border-primary/80 hover:bg-primary-hover transition-colors"
              >
                <GitBranch size={14} />Review repositories
            </a>
          </div>
        )}

        {state === 'installation_pending' && (
          <StatusRow icon={<Clock size={14} className="text-warning" />}>
            Waiting for GitHub App installation confirmation.
            {githubAppUrl && (
              <a href={githubAppUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-primary-bright underline-offset-2 hover:underline inline-flex items-center gap-1">
                Install now <ExternalLink size={11} />
              </a>
            )}
          </StatusRow>
        )}

        {state === 'repository_selection_pending' && (
          <StatusRow icon={<AlertCircle size={14} className="text-warning" />}>
            Your app is installed but no repositories have been selected. Contact your faculty to approve repositories for your project.
          </StatusRow>
        )}

        {state === 'initial_sync' && (
          <StatusRow icon={<RefreshCw size={14} className="text-primary animate-spin" />}>
            Initial import in progress — importing up to 90 days of approved repository history.
            This may take a few minutes.
          </StatusRow>
        )}

        {state === 'healthy' && (
          <div className="space-y-2">
            <StatusRow icon={<CheckCircle size={14} className="text-success" />}>
              Connected as <span className="font-mono">@{githubLogin}</span>.
            </StatusRow>
            {lastSyncAt && (
              <p className="text-xs text-text-muted">
                Last sync: <time dateTime={lastSyncAt}>{new Date(lastSyncAt).toLocaleString()}</time>
              </p>
            )}
          </div>
        )}

        {state === 'degraded' && (
          <div className="space-y-2">
            <StatusRow icon={<AlertCircle size={14} className="text-warning" />}>
              Sync is degraded — some recent activity may be missing.
              {lastSyncAt && <span className="text-xs text-text-muted ml-1">(Last successful sync: {new Date(lastSyncAt).toLocaleString()})</span>}
            </StatusRow>
            <p className="text-xs text-text-muted">
              This may be caused by a suspended GitHub App installation or revoked permissions.
              Check your GitHub App settings.
            </p>
            {githubAppUrl && (
              <a href={githubAppUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-bright hover:underline underline-offset-2">
                Open GitHub App settings <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {/* Error feedback */}
        {error && (
          <p className="text-xs text-danger flex items-start gap-1.5">
            <XCircle size={13} className="shrink-0 mt-0.5" />{error}
          </p>
        )}

        {/* Disconnect — only show when connected */}
        {['identity_connected', 'installation_pending', 'repository_selection_pending', 'initial_sync', 'healthy', 'degraded'].includes(state) && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={handleDisconnect}
              disabled={loading || isDemo}
              className="text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-40"
            >
              Disconnect GitHub account
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-text-secondary">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
