/**
 * Invite acceptance page.
 * Linked from the invitation email. Validates token server-side,
 * then lets the invitee set a password and complete their profile.
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Step = 'validating' | 'form' | 'error' | 'done'

export function AcceptInvitePage() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const token     = params.get('token') ?? ''

  const [step, setStep]         = useState<Step>('validating')
  const [invitation, setInvitation] = useState<{ email: string; role: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('No invitation token provided.'); return }
    supabase
      .from('invitations')
      .select('email, role, expires_at, accepted_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStep('error'); setErrorMsg('Invalid or expired invitation link.'); return }
        const row = data as unknown as { email: string; role: string; expires_at: string; accepted_at: string | null }
        if (row.accepted_at) { setStep('error'); setErrorMsg('This invitation has already been used.'); return }
        if (new Date(row.expires_at) < new Date()) { setStep('error'); setErrorMsg('This invitation has expired. Ask your admin to resend it.'); return }
        setInvitation({ email: row.email, role: row.role })
        setStep('form')
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation) return
    setLoading(true)

    // 1. Create Supabase auth user
    const { data: { user }, error: signUpErr } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { display_name: name } },
    })

    if (signUpErr || !user) {
      setErrorMsg(signUpErr?.message ?? 'Sign-up failed.')
      setLoading(false)
      return
    }

    // 2. Mark invitation accepted (server validates token in RLS / Edge Function in production)
    // Cast through unknown to avoid TS2345 from the generated never type
    await (supabase.from('invitations') as unknown as { update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<void> } })
      .update({ accepted_at: new Date().toISOString() }).eq('token', token)

    setLoading(false)
    setStep('done')
    setTimeout(() => navigate('/overview'), 2000)
  }

  if (step === 'validating') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-[360px] space-y-6">
        <div className="text-center space-y-2">
          <div className="size-10 rounded-[var(--radius-control)] bg-primary flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">DS</span>
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Accept invitation</h1>
          {invitation && (
            <p className="text-sm text-text-muted">
              You've been invited as <span className="text-text-secondary font-medium capitalize">{invitation.role}</span> — {invitation.email}
            </p>
          )}
        </div>

        {step === 'error' && (
          <div className="bg-danger/10 border border-danger/25 rounded-[var(--radius-control)] px-4 py-3 flex items-start gap-2">
            <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{errorMsg}</p>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-success/10 border border-success/25 rounded-[var(--radius-control)] px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-success shrink-0" />
            <p className="text-sm text-success">Account created! Redirecting…</p>
          </div>
        )}

        {step === 'form' && invitation && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="fullname" className="text-xs text-text-secondary font-medium">Full name</label>
              <input
                id="fullname" type="text" required autoComplete="name"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full h-9 px-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="new-password" className="text-xs text-text-secondary font-medium">Create password</label>
              <input
                id="new-password" type="password" required autoComplete="new-password"
                minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-9 px-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                placeholder="Minimum 8 characters"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs text-danger">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-9 bg-success-strong text-white text-sm font-medium rounded-[var(--radius-control)]',
                'border border-success-strong/80 hover:bg-success transition-colors',
                'disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
              )}
            >
              {loading
                ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
