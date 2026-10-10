/**
 * Settings page — student and faculty views.
 * Profile, GitHub connection state, notification preferences,
 * data visibility explanation.
 */
import { useState } from 'react'
import { User, GitBranch, Bell, Shield, Save, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'
import { service } from '@/services'
import { GitHubConnectionPanel } from '@/features/github/GitHubConnectionPanel'

type SettingsTab = 'profile' | 'github' | 'notifications' | 'privacy'

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === 'profile' || value === 'github' || value === 'notifications' || value === 'privacy'
}

export function SettingsPage() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: SettingsTab = isSettingsTab(requestedTab) ? requestedTab : 'profile'
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  function selectTab(nextTab: SettingsTab) {
    setSearchParams(nextTab === 'profile' ? {} : { tab: nextTab }, { replace: true })
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'github',        label: 'GitHub',        icon: GitBranch },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy',       label: 'Data & Privacy', icon: Shield },
  ]

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !isSupabaseConfigured) return
    setSaving(true)
    try {
      await service.updateProfile(profile.id, { displayName })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('[Settings] profile save failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-[760px]">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-5 flex-col sm:flex-row">
        {/* Tab list */}
        <nav className="sm:w-44 shrink-0" aria-label="Settings sections">
          <ul className="space-y-0.5">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <li key={t.id}>
                  <button
                    onClick={() => selectTab(t.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-control)] text-sm transition-colors',
                      tab === t.id
                        ? 'bg-primary/10 text-primary-bright font-medium'
                        : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
                    )}
                    aria-current={tab === t.id ? 'page' : undefined}
                  >
                    <Icon size={15} className="shrink-0" />
                    {t.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-text-primary">Profile</h2></CardHeader>
              <CardContent>
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="display-name" className="text-xs font-medium text-text-secondary">Display name</label>
                    <input
                      id="display-name" type="text"
                      value={displayName} onChange={e => setDisplayName(e.target.value)}
                      className="w-full h-8 px-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-text-secondary">Email</p>
                    <p className="text-sm text-text-muted">{profile?.email}</p>
                    <p className="text-[11px] text-text-disabled">Email address is managed by your institution admin.</p>
                  </div>
                  {profile?.rollNumber && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-text-secondary">Roll number</p>
                      <p className="text-sm font-mono text-text-muted">{profile.rollNumber}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !isSupabaseConfigured}
                      className="flex items-center gap-1.5 h-8 px-4 bg-success-strong text-white text-sm font-medium rounded-[var(--radius-control)] border border-success-strong/80 hover:bg-success transition-colors disabled:opacity-50"
                    >
                      {saving ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={13} /> Save</>}
                    </button>
                    {saved && <p className="text-xs text-success">Saved</p>}
                    {!isSupabaseConfigured && <p className="text-xs text-text-muted">Profile editing requires Supabase credentials.</p>}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {tab === 'github' && (
            <GitHubConnectionPanel
              profileId={profile?.id ?? ''}
              connectionState={profile?.githubConnectionState ?? 'not_connected'}
              githubLogin={profile?.githubUsername}
              githubAppUrl={import.meta.env.VITE_GITHUB_APP_URL as string | undefined}
              isDemo={!isSupabaseConfigured}
            />
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-text-primary">Notifications</h2></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: 'deadline',   label: 'Approaching deadlines',     desc: 'Reminders 48 hours and 24 hours before an assignment is due.' },
                  { id: 'feedback',   label: 'Published feedback',        desc: 'When a faculty member publishes your evaluation.' },
                  { id: 'revision',   label: 'Revision requests',         desc: 'When faculty requests a revision on your submission.' },
                  { id: 'milestones', label: 'Streak milestones',         desc: 'When you reach a consistency milestone.' },
                  { id: 'github',     label: 'GitHub connection issues',  desc: 'When your GitHub connection is degraded or disconnected.' },
                ].map(pref => (
                  <label key={pref.id} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-0.5 rounded border-border bg-canvas checked:accent-primary"
                    />
                    <div>
                      <p className="text-sm text-text-primary group-hover:text-text-primary">{pref.label}</p>
                      <p className="text-xs text-text-muted">{pref.desc}</p>
                    </div>
                  </label>
                ))}
                <p className="text-[11px] text-text-disabled pt-2">Notification preferences stored locally until Supabase is configured.</p>
              </CardContent>
            </Card>
          )}

          {tab === 'privacy' && (
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-text-primary">Data & Privacy</h2></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 text-sm text-text-secondary bg-primary/5 border border-primary/20 rounded-[var(--radius-control)] p-3">
                  <AlertCircle size={14} className="text-primary-bright shrink-0 mt-0.5" />
                  <p>Your activity data is only visible to you and faculty assigned to your batch. Data is never shared with unrelated parties or used for automated grading.</p>
                </div>

                {[
                  { label: 'Activity heatmap', who: 'You + assigned faculty', note: 'Approved repositories only' },
                  { label: 'Streak & milestones', who: 'You + assigned faculty', note: 'Based on qualifying commit days' },
                  { label: 'Submissions & feedback', who: 'You + assigned faculty', note: 'Evaluations visible only after faculty publishes' },
                  { label: 'Faculty notes', who: 'Faculty only', note: 'Never visible to you' },
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-text-secondary">{item.label}</p>
                      <p className="text-[11px] text-text-muted">{item.note}</p>
                    </div>
                    <Badge variant="default">{item.who}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
