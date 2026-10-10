/**
 * RootRedirect — handles the `/` route.
 *
 * Behavior:
 *   loading     → show spinner (never redirect prematurely)
 *   authenticated → redirect to role home (overview / workspace / admin)
 *   unauthenticated → redirect to /sign-in
 *
 * This is the single source of truth for what happens at the app root.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { roleHome } from '@/app/RouteGuards'

export function RootRedirect() {
  const { profile, loading, isDemo } = useAuth()

  // Wait for auth to resolve before deciding where to go
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading…</p>
        </div>
      </div>
    )
  }

  // Demo mode or real authenticated user → go to their role's home
  if (profile) {
    return <Navigate to={roleHome(profile.role)} replace />
  }

  // Not authenticated → sign-in
  // isDemo without a profile should never happen, but guard anyway
  if (isDemo) {
    return <Navigate to="/overview" replace />
  }

  return <Navigate to="/sign-in" replace />
}
