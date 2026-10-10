/**
 * GitHubCallbackPage
 *
 * Handles the GitHub OAuth callback redirect.
 * URL: /github-callback?code=xxx&state=yyy
 *
 * The page reads code + state from the query string, sends them to the
 * server-side Edge Function, then navigates the user to the next step.
 * Never exposes the code or state in logs or error messages.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { handleGitHubCallback } from '@/services/github'

type Phase = 'loading' | 'success' | 'error'

export function GitHubCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [phase, setPhase]   = useState<Phase>('loading')
  const [detail, setDetail] = useState('')
  const [login, setLogin]   = useState('')

  useEffect(() => {
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setDetail(searchParams.get('error_description') ?? 'GitHub OAuth was cancelled or denied.')
      setPhase('error')
      return
    }

    if (!code || !state) {
      setDetail('Missing code or state parameter in callback URL.')
      setPhase('error')
      return
    }

    handleGitHubCallback(code, state).then(result => {
      if (!result.ok) {
        setDetail(result.error === 'invalid_state'
          ? 'The authorization link expired or was already used. Please try again.'
          : result.error === 'github_account_already_linked'
            ? 'This GitHub account is already linked to another student in your institution.'
            : 'Something went wrong. Please try connecting again.')
        setPhase('error')
        return
      }
      setLogin(result.githubLogin)
      setPhase('success')
      const dest = result.nextStep === 'select_repositories'
        ? '/github/select-repos'
        : '/settings'
      setTimeout(() => navigate(dest, { replace: true }), 2000)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center space-y-4">
        {phase === 'loading' && (
          <>
            <Loader size={32} className="mx-auto animate-spin text-primary" />
            <p className="text-text-primary font-medium">Connecting your GitHub account…</p>
            <p className="text-sm text-text-muted">Verifying identity with GitHub.</p>
          </>
        )}
        {phase === 'success' && (
          <>
            <CheckCircle size={32} className="mx-auto text-success" />
            <p className="text-text-primary font-medium">GitHub connected</p>
            <p className="text-sm text-text-muted">
              Linked as <span className="font-mono text-text-primary">@{login}</span>.
              Redirecting to settings…
            </p>
          </>
        )}
        {phase === 'error' && (
          <>
            <XCircle size={32} className="mx-auto text-danger" />
            <p className="text-text-primary font-medium">Connection failed</p>
            <p className="text-sm text-text-muted">{detail}</p>
            <button
              onClick={() => navigate('/settings', { replace: true })}
              className="mt-2 h-8 px-4 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  )
}
