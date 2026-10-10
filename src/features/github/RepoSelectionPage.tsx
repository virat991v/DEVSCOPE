/**
 * RepoSelectionPage
 *
 * After GitHub OAuth succeeds the student is redirected here to:
 *   1. Trigger a sync (github-sync Edge Function fetches their repos).
 *   2. See all their repos and pick which ones to associate with their project.
 *   3. Confirm — a proposal is written and sent to faculty for approval.
 *
 * Route: /github/select-repos  (requires auth)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  GitBranch, Lock, Globe, RefreshCw, CheckSquare, Square, ArrowRight, Loader,
} from 'lucide-react'
import { syncGitHub, getMyGitHubRepos, type GitHubRepoSummary } from '@/services/github'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function RepoSelectionPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [syncDone, setSyncDone] = useState(false)

  // Auto-trigger sync on mount so the list is fresh from GitHub
  const { mutate: runSync, isPending: syncing } = useMutation({
    mutationFn: syncGitHub,
    onSuccess: () => setSyncDone(true),
    onError:   () => setSyncDone(true), // even on error show cached list
  })

  useEffect(() => {
    runSync()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Read repos from DB (refreshed after sync completes)
  const { data: repos = [], isLoading: reposLoading, refetch } = useQuery({
    queryKey: ['my-github-repos'],
    queryFn:  getMyGitHubRepos,
    enabled:  syncDone,
  })

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDone = () => {
    // For now: navigate to settings/workspace; faculty approval happens separately.
    // In a future phase, the selected IDs will be submitted as project proposals.
    navigate('/student/dashboard', { replace: true })
  }

  const loading = syncing || reposLoading

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <GitBranch size={28} className="mx-auto text-primary-bright" />
          <h1 className="text-xl font-semibold text-text-primary">Select repositories</h1>
          <p className="text-sm text-text-muted">
            Choose the repositories you want to associate with your academic work.
            Faculty will review and approve each one.
          </p>
        </div>

        {/* Sync status bar */}
        {syncing && (
          <div className="flex items-center gap-2 justify-center text-sm text-text-muted">
            <Loader size={14} className="animate-spin" />
            Fetching your repositories from GitHub…
          </div>
        )}

        {/* Repo list */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {repos.length > 0 ? `${repos.length} repositories found` : 'Repositories'}
            </span>
            {syncDone && (
              <button
                onClick={() => { setSyncDone(false); runSync(); refetch() }}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-text-muted text-sm gap-2">
                <Loader size={16} className="animate-spin" />
                Loading…
              </div>
            ) : repos.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                No repositories found. Make sure your GitHub account has at least one repository.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {repos.map(repo => (
                  <RepoRow
                    key={repo.githubRepoId}
                    repo={repo}
                    checked={selected.has(repo.githubRepoId)}
                    onToggle={() => toggle(repo.githubRepoId)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/dashboard', { replace: true })}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Skip for now
          </button>
          <Button
            variant="primary"
            onClick={handleDone}
            disabled={selected.size === 0 && repos.length > 0 && !loading}
            className="flex items-center gap-2"
          >
            {selected.size > 0
              ? `Submit ${selected.size} repo${selected.size !== 1 ? 's' : ''} for approval`
              : 'Continue'}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Row component ────────────────────────────────────────

function RepoRow({
  repo,
  checked,
  onToggle,
}: {
  repo: GitHubRepoSummary
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onToggle() }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-surface-hover focus:outline-none focus:bg-surface-hover',
        checked && 'bg-surface',
      )}
    >
      {/* Checkbox icon */}
      <span className={cn('mt-0.5 shrink-0', checked ? 'text-primary-bright' : 'text-text-muted')}>
        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary truncate">{repo.fullName}</span>
          {repo.isPrivate
            ? <Badge variant="warning" className="text-[10px] px-1.5 py-0 flex items-center gap-1"><Lock size={9} />Private</Badge>
            : <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1"><Globe size={9} />Public</Badge>
          }
          {repo.language && (
            <span className="text-[10px] text-text-muted font-mono">{repo.language}</span>
          )}
        </div>
        {repo.description && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{repo.description}</p>
        )}
      </div>
    </li>
  )
}
