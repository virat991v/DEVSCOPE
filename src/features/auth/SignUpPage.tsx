/**
 * Sign Up page — /signup
 * Creates a Supabase auth user with role metadata.
 * Passes full_name and role in options.data so the DB trigger
 * can auto-create the profiles row.
 *
 * Route is accessible without auth. Authenticated users are redirected
 * to their dashboard by RequireGuest.
 */
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, ArrowRight, GraduationCap, BookOpen } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/app/AuthContext'
import { roleHome } from '@/app/RouteGuards'
import { cn } from '@/lib/utils'
import { GoogleAuthButton } from '@/components/ui/GoogleAuthButton'

type Role = 'student' | 'faculty'

const ROLE_OPTIONS: { value: Role; label: string; icon: React.ElementType; desc: string }[] = [
  {
    value: 'student',
    icon: GraduationCap,
    label: 'Student',
    desc: 'Track your GitHub activity, projects and development progress.',
  },
  {
    value: 'faculty',
    icon: BookOpen,
    label: 'Faculty',
    desc: 'Review student evidence and manage batches and assignments.',
  },
]

function initials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'U'
}

export function SignUpPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { profile } = useAuth()

  const defaultRole = (params.get('role') === 'faculty' ? 'faculty' : 'student') as Role

  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [role, setRole]             = useState<Role>(defaultRole)
  const [agreed, setAgreed]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const unmounted = useRef(false)
  useEffect(() => { return () => { unmounted.current = true } }, [])

  // After signup with immediate session, wait for AuthContext profile before navigating
  useEffect(() => {
    if (pendingRedirect && profile) {
      navigate(roleHome(profile.role), { replace: true })
    }
  }, [pendingRedirect, profile, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!agreed) {
      setError('Please accept the Terms of Service to continue.')
      return
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Running in demo mode — sign-up is unavailable.')
      return
    }

    setLoading(true)

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          display_name: fullName.trim(),
          avatar_initials: initials(fullName),
          role,
        },
      },
    })

    setLoading(false)

    if (signUpErr) {
      setError(signUpErr.message)
      return
    }

    // If email confirmation is enabled, user won't be immediately logged in.
    // Show a success message. Otherwise wait for AuthContext to set profile.
    if (data.session) {
      // Session available — set flag and let useEffect navigate once profile loads
      if (!unmounted.current) setPendingRedirect(true)
      // Keep spinner active while waiting for profile
    } else {
      // Email confirmation required
      if (!unmounted.current) { setLoading(false); setSuccess(true) }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="w-full max-w-[420px] text-center space-y-4">
          <div className="size-12 rounded-full bg-success-bg border border-success-bright/20 flex items-center justify-center mx-auto">
            <CheckCircle2 size={22} className="text-success-bright" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We've sent a confirmation link to <span className="text-text-primary font-medium">{email}</span>.
            Click the link to activate your account, then sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
          >
            Go to Sign In
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* ── Left panel (decorative, desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[460px] xl:w-[520px] shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #181818 0%, #111111 40%, #0a1f20 100%)' }}
      >
        <div
          className="absolute bottom-0 left-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(13,115,119,0.18) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
        />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center font-bold text-sm bg-primary text-white">DS</div>
            <div>
              <p className="text-sm font-semibold text-text-primary">DevScope</p>
              <p className="text-[11px] text-text-muted">Student Development Platform</p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Start tracking your development journey.</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Connect your GitHub, join your institution, and build a verifiable record
            of your development activity.
          </p>
          <ul className="space-y-3 mt-4">
            {[
              'Free for students',
              'Connect GitHub in seconds',
              'Instant development streak tracking',
              'Evidence-linked rubric submissions',
            ].map(t => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-text-muted">© 2026 DevScope</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="size-8 rounded-lg flex items-center justify-center font-bold text-xs bg-primary text-white">DS</div>
            <Link to="/" className="text-sm font-semibold text-text-primary">DevScope</Link>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Create your account</h1>
            <p className="text-sm text-text-muted mt-1">Start tracking your development journey.</p>
          </div>

          {/* Demo-mode notice */}
          {!isSupabaseConfigured && (
            <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: '#38301B', border: '1px solid rgba(252,211,77,0.2)' }}>
              <p className="text-sm font-medium text-warning">Demo mode</p>
              <p className="text-xs text-text-secondary">Supabase is not configured. Registration is unavailable. Use the demo app directly.</p>
              <Link to="/" className="text-xs text-primary-bright hover:underline">Back to homepage →</Link>
            </div>
          )}

          {/* Google OAuth */}
          {isSupabaseConfigured && (
            <GoogleAuthButton
              label="Sign up with Google"
              onStart={() => setError(null)}
            />
          )}

          {/* OR divider */}
          {isSupabaseConfigured && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

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

            {/* Role selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors',
                      role === opt.value
                        ? 'border-primary bg-primary-dim'
                        : 'border-border bg-surface hover:border-border-strong',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <opt.icon size={14} className={cn(role === opt.value ? 'text-primary-bright' : 'text-text-muted')} />
                      <span className={cn('text-sm font-medium', role === opt.value ? 'text-primary-bright' : 'text-text-primary')}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {role === 'faculty' && (
                <p className="text-[11px] text-text-muted px-1">
                  Faculty accounts are linked to institution batches by an admin after signup.
                </p>
              )}
            </div>

            {/* Full name */}
            <div className="space-y-1.5">
              <label htmlFor="fullname" className="block text-xs font-medium text-text-secondary">Full name</label>
              <input
                id="fullname" type="text" required autoComplete="name"
                value={fullName} onChange={e => setFullName(e.target.value)}
                className={cn(
                  'w-full h-10 px-3.5 rounded-lg text-sm text-text-primary bg-surface border border-border',
                  'placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors',
                )}
                placeholder="Jane Smith"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="block text-xs font-medium text-text-secondary">Email address</label>
              <input
                id="signup-email" type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className={cn(
                  'w-full h-10 px-3.5 rounded-lg text-sm text-text-primary bg-surface border border-border',
                  'placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors',
                )}
                placeholder="you@institution.edu"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="block text-xs font-medium text-text-secondary">Password</label>
              <div className="relative">
                <input
                  id="signup-password" type={showPwd ? 'text' : 'password'} required autoComplete="new-password"
                  minLength={8}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={cn(
                    'w-full h-10 px-3.5 pr-10 rounded-lg text-sm text-text-primary bg-surface border border-border',
                    'placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors',
                  )}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-confirm" className="block text-xs font-medium text-text-secondary">Confirm password</label>
              <input
                id="signup-confirm" type="password" required autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className={cn(
                  'w-full h-10 px-3.5 rounded-lg text-sm text-text-primary bg-surface border border-border',
                  'placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors',
                  confirm.length > 0 && confirm !== password && 'border-danger/60 focus:border-danger focus:ring-danger/20',
                )}
                placeholder="Re-enter password"
              />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-[11px] text-danger">Passwords do not match</p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  'w-4 h-4 rounded border transition-colors flex items-center justify-center',
                  agreed ? 'bg-primary border-primary' : 'border-border group-hover:border-border-strong',
                )}>
                  {agreed && <CheckCircle2 size={11} className="text-white" />}
                </div>
              </div>
              <span className="text-xs text-text-muted leading-snug">
                I agree to the{' '}
                <a href="#" className="text-primary-bright hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary-bright hover:underline">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className={cn(
                'w-full h-10 rounded-lg text-sm font-medium text-white',
                'flex items-center justify-center gap-2',
                'bg-primary hover:bg-primary-hover transition-colors',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {loading
                ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>Create account <ArrowRight size={14} /></>
              }
            </button>
          </form>

          {/* Footer */}
          <div className="pt-2 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-bright hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
