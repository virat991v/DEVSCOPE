/**
 * Forgot Password page — /forgot-password
 * Sends a Supabase password reset email.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Password reset is unavailable in demo mode.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-[380px] space-y-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg flex items-center justify-center font-bold text-xs bg-primary text-white">DS</div>
          <Link to="/" className="text-sm font-semibold text-text-primary">DevScope</Link>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="size-12 rounded-full bg-success-bg border border-success-bright/20 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-success-bright" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Check your email</h1>
              <p className="text-sm text-text-muted mt-1">
                We've sent password reset instructions to{' '}
                <span className="text-text-primary font-medium">{email}</span>.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-bright hover:underline"
            >
              <ArrowLeft size={13} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-text-primary">Reset your password</h1>
              <p className="text-sm text-text-muted">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg px-3 py-2.5 text-sm text-danger"
                  style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)' }}
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-xs font-medium text-text-secondary">
                  Email address
                </label>
                <input
                  id="reset-email" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={cn(
                    'w-full h-10 px-3.5 rounded-lg text-sm text-text-primary bg-surface border border-border',
                    'placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors',
                  )}
                  placeholder="you@institution.edu"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading
                  ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Send reset link <ArrowRight size={14} /></>
                }
              </button>
            </form>

            <div className="pt-2 border-t border-border text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary">
                <ArrowLeft size={12} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
