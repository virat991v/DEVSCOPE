/**
 * Sign In page — professional dark split-layout.
 * Left panel: branding + value proposition.
 * Right panel: login form.
 * Matches the Figma design system colours and typography exactly.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, GitBranch, Flame, BarChart2, Shield } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/app/AuthContext'
import { roleHome } from '@/app/RouteGuards'
import { cn } from '@/lib/utils'
import { GoogleAuthButton } from '@/components/ui/GoogleAuthButton'
import { GitHubAuthButton } from '@/components/ui/GitHubAuthButton'

// Feature list shown in the left panel
const FEATURES = [
  {
    icon: GitBranch,
    title: 'GitHub activity tracking',
    desc: 'Monitor eligible commits, PRs and issues per student in real time.',
  },
  {
    icon: Flame,
    title: 'Streak & milestone system',
    desc: 'Track consecutive qualified days and reward consistent development habits.',
  },
  {
    icon: BarChart2,
    title: 'Academic evidence review',
    desc: 'Rubric-linked submissions with structured faculty review workflows.',
  },
  {
    icon: Shield,
    title: 'Invitation-only access',
    desc: 'Secure institution-scoped access. Every user is vetted before entry.',
  },
]

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [signedIn, setSignedIn]   = useState(false)

  // Once signInWithPassword succeeds, wait for AuthContext to set the profile,
  // then navigate. This avoids the race where we navigate before the context
  // updates, causing RequireAuth to redirect back to /login.
  useEffect(() => {
    if (signedIn && profile) {
      navigate(from ?? roleHome(profile.role), { replace: true })
    }
  }, [signedIn, profile, navigate, from])

  // Also track component unmount to prevent setState after unmount
  const unmounted = useRef(false)
  useEffect(() => { return () => { unmounted.current = true } }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) {
      if (!unmounted.current) { setError(authErr.message); setLoading(false) }
      return
    }

    // signInWithPassword can "succeed" with no session if email is unconfirmed
    if (!data.session || !data.user) {
      if (!unmounted.current) {
        setError('Sign in succeeded but no session was created. Check that your email is confirmed.')
        setLoading(false)
      }
      return
    }

    // Session created. Mark as signed in — the useEffect above will navigate
    // once AuthContext's onAuthStateChange fires and profile is set.
    if (!unmounted.current) setSignedIn(true)
    // Keep loading spinner active while we wait for the profile
  }

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* ── Left panel — branding (hidden on small screens) ── */}
      <div
        className="hidden lg:flex lg:w-[520px] xl:w-[600px] shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #181818 0%, #111111 40%, #0a1f20 100%)' }}
      >
        {/* Decorative teal glow */}
        <div
          className="absolute bottom-0 left-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(13,115,119,0.18) 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: '#0D7377', color: '#ffffff' }}
            >
              DS
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">DevScope</p>
              <p className="text-[11px] text-text-muted">Student Development Platform</p>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary leading-snug">
              Evidence-first<br />
              academic development
            </h1>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed">
              Give faculty the GitHub activity data they need to fairly assess
              student progress — without proxy metrics.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {FEATURES.map(f => (
              <li key={f.title} className="flex items-start gap-3">
                <div
                  className="shrink-0 size-8 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ background: '#173D3E', border: '1px solid #174A4C' }}
                >
                  <f.icon size={15} style={{ color: '#14FFEC' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{f.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-text-muted">
            © 2026 Apex Institute of Technology · DevScope v1.0
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-7">

          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div
              className="size-8 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ background: '#0D7377', color: '#ffffff' }}
            >
              DS
            </div>
            <span className="text-sm font-semibold text-text-primary">DevScope</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-text-primary">Welcome back</h2>
            <p className="text-sm text-text-muted">Sign in to your institution account</p>
          </div>

          {/* Demo notice */}
          {!isSupabaseConfigured && (
            <div
              className="rounded-xl px-4 py-4 space-y-2"
              style={{ background: '#173D3E', border: '1px solid #174A4C' }}
            >
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-primary-bright animate-pulse" />
                <p className="text-sm font-medium text-text-primary">Demo mode active</p>
              </div>
              <p className="text-xs text-text-secondary">
                Supabase credentials not configured. The app runs with 300 demo students
                and full fixture data — no sign-in required.
              </p>
              <button
                onClick={() => navigate('/overview')}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary-bright hover:underline"
              >
                Continue as demo faculty →
              </button>
            </div>
          )}

          {/* Social authentication */}
          {isSupabaseConfigured && (
            <div className="space-y-3">
              <GoogleAuthButton
                label="Continue with Google"
                onStart={() => setError(null)}
              />
              <GitHubAuthButton
                label="Continue with GitHub"
                onStart={() => setError(null)}
              />
            </div>
          )}

          {/* OR divider */}
          {isSupabaseConfigured && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Auth form */}
          {isSupabaseConfigured && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg px-3 py-2.5 text-sm text-danger"
                  style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)' }}
                >
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-text-secondary">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={cn(
                    'w-full h-10 px-3.5 rounded-lg text-sm text-text-primary',
                    'bg-surface border border-border',
                    'placeholder:text-text-muted',
                    'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30',
                    'transition-colors',
                  )}
                  placeholder="you@institution.edu"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-text-secondary">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary-bright hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={cn(
                      'w-full h-10 px-3.5 pr-10 rounded-lg text-sm text-text-primary',
                      'bg-surface border border-border',
                      'placeholder:text-text-muted',
                      'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30',
                      'transition-colors',
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full h-10 rounded-lg text-sm font-medium',
                  'text-white flex items-center justify-center gap-2',
                  'transition-colors disabled:opacity-50 disabled:pointer-events-none',
                )}
                style={{ background: '#0D7377', border: '1px solid rgba(13,115,119,0.6)' }}
                onMouseEnter={e => !loading && ((e.target as HTMLButtonElement).style.background = '#109095')}
                onMouseLeave={e => !loading && ((e.target as HTMLButtonElement).style.background = '#0D7377')}
              >
                {loading
                  ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><LogIn size={15} /> Sign in</>
                }
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-border text-center space-y-1">
            <p className="text-xs text-text-muted">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-bright hover:underline">Sign up</Link>
            </p>
            <p className="text-xs text-text-muted">
              <Link to="/" className="hover:text-text-secondary transition-colors">← Back to homepage</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
