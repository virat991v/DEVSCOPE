/**
 * Route guards — protect pages by auth state and role.
 * Unauthorized access via direct URL is blocked here AND at RLS level.
 *
 * Key rule: NEVER redirect while loading=true. Wait for auth to resolve first.
 *
 * Important: RequireGuest is NOT used on "/" — the landing page is always public.
 * RequireGuest is only used on /login, /signup, /accept-invite — places where
 * an already-authenticated user should be redirected to their dashboard.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import type { Role } from '@/types'

interface RequireAuthProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

/** Full-screen spinner shown while auth state is being determined */
function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    </div>
  )
}

/** Home path for a given role */
export function roleHome(role: Role): string {
  if (role === 'student') return '/student/dashboard'
  if (role === 'faculty') return '/faculty/dashboard'
  return '/admin/dashboard'
}

/**
 * A signed-in user without an authorization profile must not be treated as a
 * guest. Rendering this state prevents the historical profile-error → login
 * redirect loop and gives the administrator a useful failure signal.
 */
function ProfileUnavailableScreen({ message }: { message: string | null }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-canvas px-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-semibold text-text-primary">Account setup needs attention</h1>
        <p className="text-sm text-text-muted">
          {message ?? 'Your sign-in succeeded, but your institution profile is still being set up.'}
        </p>
        <p className="text-xs text-text-muted">Please contact your institution administrator if this persists.</p>
      </div>
    </div>
  )
}

// ─── RequireAuth ──────────────────────────────────────────
// Use on all protected routes. Redirects unauthenticated users
// to /login, preserving their intended destination in state.

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { session, user, profile, profileError, loading, isDemo } = useAuth()
  const location = useLocation()

  // Wait — do NOT make routing decisions while auth is still loading
  if (loading) return <AuthLoadingScreen />

  // Demo mode always has a profile; let it through
  if (isDemo && profile) {
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to={roleHome(profile.role)} replace />
    }
    return <>{children}</>
  }

  // Authentication is based on Supabase session/user, not on profile loading.
  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // A profile error is an authorization/provisioning concern, never a reason
  // to erase a valid authentication state or redirect the user to /login.
  if (!profile) return <ProfileUnavailableScreen message={profileError} />

  // Wrong role — redirect to their own home
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />
  }

  return <>{children}</>
}

// ─── RequireGuest ─────────────────────────────────────────
// Use on auth-only pages: /login, /signup, /accept-invite.
// Authenticated users are sent to their dashboard.
// NOTE: Do NOT use this guard on "/" — the landing page must always be accessible.

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const { session, user, profile, profileError, loading, isDemo } = useAuth()

  // Show spinner while loading — returning null causes a blank flash
  if (loading) return <AuthLoadingScreen />

  // Demo mode: users visiting /login or /signup get redirected into the app
  if (isDemo && profile) {
    return <Navigate to={roleHome(profile.role)} replace />
  }

  // Real authenticated user — redirect to their home
  if (profile) {
    return <Navigate to={roleHome(profile.role)} replace />
  }

  // Do not render the sign-in form over an active session whose profile could
  // not be provisioned. That is what previously produced the redirect loop.
  if (session && user) return <ProfileUnavailableScreen message={profileError} />

  return <>{children}</>
}
