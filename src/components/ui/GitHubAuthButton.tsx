/** GitHub sign-in button backed by Supabase Auth's GitHub provider. */
import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface GitHubAuthButtonProps {
  label?: string
  className?: string
  onStart?: () => void
}

function GitHubLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 1.7a10.3 10.3 0 0 0-3.25 20.08c.52.1.7-.23.7-.5v-1.98c-2.86.62-3.46-1.22-3.46-1.22-.47-1.2-1.15-1.52-1.15-1.52-.94-.64.07-.63.07-.63 1.04.08 1.59 1.07 1.59 1.07.93 1.59 2.43 1.13 3.02.87.1-.67.36-1.13.66-1.39-2.28-.26-4.68-1.14-4.68-5.07 0-1.12.4-2.03 1.06-2.75-.11-.26-.46-1.31.1-2.72 0 0 .86-.28 2.83 1.05A9.8 9.8 0 0 1 12 6.65c.87 0 1.75.12 2.57.35 1.97-1.33 2.83-1.05 2.83-1.05.56 1.41.21 2.46.1 2.72.66.72 1.06 1.63 1.06 2.75 0 3.94-2.4 4.8-4.69 5.06.37.32.7.95.7 1.91v2.83c0 .28.19.61.71.5A10.3 10.3 0 0 0 12 1.7Z" />
    </svg>
  )
}

export function GitHubAuthButton({
  label = 'Continue with GitHub',
  className,
  onStart,
}: GitHubAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. GitHub sign-in is unavailable in demo mode.')
      return
    }

    setError(null)
    setLoading(true)
    onStart?.()

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Fetch the provider URL first so disabled-provider errors remain in
        // the app instead of replacing the page with a raw Supabase response.
        skipBrowserRedirect: true,
      },
    })

    if (oauthError) {
      setError(
        oauthError.message.includes('provider is not enabled')
          ? 'GitHub sign-in has not been enabled in Supabase yet. Ask an administrator to configure the GitHub Auth provider.'
          : oauthError.message,
      )
      setLoading(false)
      return
    }

    if (!data?.url) {
      setError('GitHub sign-in could not be started. Please try again.')
      setLoading(false)
      return
    }

    // Navigate only after the provider endpoint has successfully returned a URL.
    window.location.assign(data.url)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !isSupabaseConfigured}
        className={cn(
          'w-full h-10 rounded-lg text-sm font-medium',
          'flex items-center justify-center gap-2.5',
          'bg-surface border border-border text-text-primary',
          'hover:bg-surface-raised hover:border-border-strong transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none',
          className,
        )}
      >
        {loading
          ? <span className="size-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
          : <GitHubLogo size={17} />}
        {label}
      </button>

      {error && <p role="alert" className="text-[11px] text-danger text-center">{error}</p>}
    </div>
  )
}
