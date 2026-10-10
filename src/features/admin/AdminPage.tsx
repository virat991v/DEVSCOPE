/**
 * AdminPage — institution administration hub.
 * Phase 2 scope: invitation management, batch overview, user roster.
 * GitHub/integration management added in Phase 3.
 */
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Users, BookOpen, Mail, Shield, Copy, CheckCheck,
  UserPlus, Building2, AlertCircle,
} from 'lucide-react'
import { service } from '@/services'
import { DEMO_BATCHES, DEMO_STUDENTS } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

// ─── Stat card ────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex items-start gap-3">
      <div className="mt-0.5 text-text-muted">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        <p className="text-sm text-text-secondary mt-1">{label}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Invitation row ───────────────────────────────────────

interface Invite {
  id: string
  email: string
  role: 'faculty' | 'student' | 'admin'
  status: 'pending' | 'accepted' | 'expired'
  createdAt: string
  token: string
}

const DEMO_INVITES: Invite[] = [
  {
    id: 'inv-1', email: 'rajiv.sharma@apexinstitute.edu', role: 'faculty',
    status: 'pending', createdAt: '2025-01-10', token: 'tok_abc123',
  },
  {
    id: 'inv-2', email: 'priya.mehta@student.apexinstitute.edu', role: 'student',
    status: 'accepted', createdAt: '2025-01-08', token: 'tok_def456',
  },
  {
    id: 'inv-3', email: 'admin2@apexinstitute.edu', role: 'admin',
    status: 'expired', createdAt: '2024-12-20', token: 'tok_ghi789',
  },
]

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/20',
  accepted: 'bg-success/10 text-success border-success/20',
  expired:  'bg-surface-raised text-text-muted border-border',
}

const ROLE_STYLE: Record<string, string> = {
  faculty: 'bg-primary/10 text-primary-bright border-primary/20',
  student: 'bg-secondary/10 text-secondary border-secondary/20',
  admin:   'bg-danger/10 text-danger border-danger/20',
}

function InviteRow({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const link = `${window.location.origin}/accept-invite?token=${invite.token}`
    void navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
      <td className="px-4 py-3 text-sm text-text-normal">{invite.email}</td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize',
          ROLE_STYLE[invite.role],
        )}>
          {invite.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize',
          STATUS_STYLE[invite.status],
        )}>
          {invite.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{invite.createdAt}</td>
      <td className="px-4 py-3 text-right">
        {invite.status === 'pending' && (
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1 text-xs text-primary-bright hover:text-primary transition-colors"
          >
            {copied
              ? <><CheckCheck className="size-3.5" /> Copied</>
              : <><Copy className="size-3.5" /> Copy link</>
            }
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── New invite form ──────────────────────────────────────

function InviteForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState<'faculty' | 'student'>('student')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => service.createInvite(email, role),
    onSuccess: (link) => setInviteLink(link),
  })

  function copyLink() {
    if (!inviteLink) return
    void navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-lg border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">Send invitation</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">×</button>
        </div>

        {inviteLink ? (
          /* ── Success: show generated link ── */
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-secondary">Invitation link generated. Copy and share it with the user.</p>
            <div className="flex items-center gap-2 p-2 bg-canvas rounded border border-border">
              <p className="flex-1 text-xs font-mono text-text-muted truncate">{inviteLink}</p>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1 text-xs text-primary-bright hover:text-primary transition-colors"
              >
                {copied ? <><CheckCheck size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-md border border-border text-text-secondary text-sm hover:bg-surface-hover transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@institution.edu"
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-canvas text-text-normal text-sm placeholder:text-text-disabled focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'faculty' | 'student')}
                className="w-full px-3 py-2 rounded-md border border-border bg-canvas text-text-normal text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            {createMutation.isError && (
              <div className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} />
                {(createMutation.error as Error).message}
              </div>
            )}
            <p className="text-xs text-text-muted">
              A 7-day invitation link will be generated. Share it with the user directly.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending || !email.trim()}
                className="flex-1 py-2 rounded-md bg-success-strong hover:bg-success text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending
                  ? <span className="inline-block size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Generate link'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-border text-text-secondary text-sm hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────

export function AdminPage() {
  const [showInviteForm, setShowInviteForm] = useState(false)

  const { data: batches = DEMO_BATCHES } = useQuery({
    queryKey: ['batches'],
    queryFn: () => service.getBatches(),
  })

  const totalStudents = DEMO_STUDENTS.length
  const activeBatches = batches.filter(b => b.isActive).length

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="size-6 text-text-secondary" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Administration</h1>
            <p className="text-sm text-text-muted">Apex Institute · Institution management</p>
          </div>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-success-strong hover:bg-success text-white text-sm font-medium transition-colors"
        >
          <UserPlus className="size-4" />
          Invite user
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="size-5" />}    label="Total students"  value={totalStudents} sub="across all batches" />
        <StatCard icon={<BookOpen className="size-5" />} label="Active batches"  value={activeBatches} sub={`of ${batches.length} total`} />
        <StatCard icon={<Mail className="size-5" />}     label="Pending invites" value={DEMO_INVITES.filter(i => i.status === 'pending').length} />
        <StatCard icon={<Shield className="size-5" />}   label="Admin accounts"  value={1} sub="institution-level" />
      </div>

      {/* Invitations table */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">Invitations</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-raised border-b border-border">
              <tr>
                {['Email', 'Role', 'Status', 'Invited', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_INVITES.map(inv => <InviteRow key={inv.id} invite={inv} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batches overview */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">Batches</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-raised border-b border-border">
              <tr>
                {['Name', 'Program', 'Semester', 'Students', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-text-normal">{b.label}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{b.program}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">Sem {b.currentSemester}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{b.studentCount}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                      b.isActive
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-surface-raised text-text-muted border-border',
                    )}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInviteForm && <InviteForm onClose={() => setShowInviteForm(false)} />}
    </div>
  )
}
