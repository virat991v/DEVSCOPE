import { Sidebar } from '@/components/shared/Sidebar'
import { TopBar } from '@/components/shared/TopBar'
import type { Profile } from '@/types'

interface AppShellProps {
  profile: Profile
  breadcrumbs?: { label: string; to?: string }[]
  unreadCount?: number
  children: React.ReactNode
  currentBatchLabel?: string
}

export function AppShell({ profile, breadcrumbs, unreadCount, children, currentBatchLabel }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar role={profile.role} currentBatchLabel={currentBatchLabel} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar profile={profile} breadcrumbs={breadcrumbs} unreadCount={unreadCount} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
