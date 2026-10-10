/**
 * OAuth callback — intentionally public.
 *
 * Supabase exchanges the PKCE code while its client initializes. AuthProvider
 * observes SIGNED_IN / INITIAL_SESSION, restores the session, and provisions
 * the profile before this page routes to a role dashboard. Keeping that work
 * in one owner avoids a callback/profile-loading race.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { roleHome } from '@/app/RouteGuards'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { session, profile, profileError, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!loading && session && profile) {
      navigate(roleHome(profile.role), { replace: true })
    }
  }, [loading, navigate, profile, session])

  // In a PKCE callback Supabase may briefly report an INITIAL_SESSION with
  // null while it exchanges the code. Keep the callback on its loader until
  // the eventual SIGNED_IN event arrives instead of showing the login error
  // too early.
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 12_000)
    return () => window.clearTimeout(timer)
  }, [])

  if (timedOut && !loading && !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-text-primary font-medium">Sign in could not be completed</p>
          <p className="text-sm text-text-muted">No authenticated Supabase session was returned.</p>
          <Link to="/login" className="inline-flex px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (!loading && session && !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-text-primary font-medium">Account setup needs attention</p>
          <p className="text-sm text-text-muted">
            {profileError ?? 'Your sign-in succeeded, but your profile could not be prepared.'}
          </p>
          <Link to="/" className="inline-flex px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Completing sign in…</p>
      </div>
    </div>
  )
}
