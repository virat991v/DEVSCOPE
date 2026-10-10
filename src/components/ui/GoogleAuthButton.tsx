/**
 * GoogleAuthButton
 * Calls supabase.auth.signInWithOAuth({ provider: 'google' }).
 * Works for both sign-in and sign-up — Google handles both cases
 * transparently (new Google user → creates account; existing → signs in).
 *
 * The `redirectTo` must be listed under Supabase → Auth → URL Configuration
 * → Redirect URLs.  We use /auth/callback which then lets AuthContext
 * pick up the session via onAuthStateChange.
 */
import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface GoogleAuthButtonProps {
  /** Label shown on the button, e.g. "Continue with Google" */
  label?: string
  /** Extra Tailwind classes */
  className?: string
  /** Called when the OAuth redirect is about to happen (for parent to clear errors, etc.) */
  onStart?: () => void
}

// Google "G" logo as an inline SVG — no external dependency
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function GoogleAuthButton({ label = 'Continue with Google', className, onStart }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Google sign-in unavailable in demo mode.')
      return
    }

    setError(null)
    setLoading(true)
    onStart?.()

    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After Google redirects back, Supabase exchanges the code and then
        // redirects to this URL.  AuthCallbackPage reads the session.
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          // Force account picker — prevents silent re-use of a cached Google session
          prompt: 'select_account',
        },
        // Keep configuration errors on this screen rather than navigating to
        // Supabase's JSON error response.
        skipBrowserRedirect: true,
      },
    })

    if (oauthErr) {
      setError(
        oauthErr.message.includes('provider is not enabled')
          ? 'Google sign-in has not been enabled in Supabase yet. Ask an administrator to configure the Google Auth provider.'
          : oauthErr.message,
      )
      setLoading(false)
      return
    }

    if (!data?.url) {
      setError('Google sign-in could not be started. Please try again.')
      setLoading(false)
      return
    }

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
          'bg-surface border border-border',
          'text-text-primary hover:bg-surface-raised hover:border-border-strong',
          'transition-colors disabled:opacity-50 disabled:pointer-events-none',
          className,
        )}
      >
        {loading ? (
          <span className="size-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
        ) : (
          <GoogleLogo size={17} />
        )}
        {label}
      </button>

      {error && (
        <p role="alert" className="text-[11px] text-danger text-center">{error}</p>
      )}
    </div>
  )
}
