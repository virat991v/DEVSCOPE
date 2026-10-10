/**
 * NotificationsPage — in-app notification list.
 * Shows all notifications for the current user, grouped by read/unread.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Info, AlertTriangle, GitPullRequest, BookOpen } from 'lucide-react'
import { service } from '@/services'
import { useAuth } from '@/app/AuthContext'
import { cn, relativeDate } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_ICON: Record<string, React.ReactNode> = {
  assignment_due:    <BookOpen className="size-4 text-warning" />,
  submission_graded: <CheckCheck className="size-4 text-success" />,
  pr_merged:         <GitPullRequest className="size-4 text-primary-bright" />,
  streak_broken:     <AlertTriangle className="size-4 text-danger" />,
  milestone_reached: <CheckCheck className="size-4 text-secondary" />,
  info:              <Info className="size-4 text-text-muted" />,
}

function NotificationRow({ n }: { n: Notification }) {
  const icon = TYPE_ICON[n.type] ?? TYPE_ICON['info']

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors',
        !n.read && 'bg-surface',
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', n.read ? 'text-text-secondary' : 'text-text-normal')}>
          {n.message}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{relativeDate(n.createdAt)}</p>
      </div>
      {!n.read && (
        <div className="mt-1.5 size-2 rounded-full bg-primary-bright shrink-0" />
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => service.getNotifications(profile?.id ?? ''),
    enabled: !!profile?.id,
  })

  const markAllRead = useMutation({
    mutationFn: () => service.markAllNotificationsRead(profile?.id ?? ''),
    onMutate: async () => {
      // Optimistic update — mark all read locally immediately
      await qc.cancelQueries({ queryKey: ['notifications', profile?.id] })
      qc.setQueryData<Notification[]>(['notifications', profile?.id], old =>
        (old ?? []).map(n => ({ ...n, read: true }))
      )
    },
    onError: () => {
      // Rollback by refetching
      qc.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    },
  })

  const unread = notifications.filter(n => !n.read)
  const read   = notifications.filter(n => n.read)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-text-secondary" />
          <h1 className="text-xl font-semibold text-text-primary">Notifications</h1>
          {unread.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-xs font-medium">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm text-primary-bright hover:text-primary transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-surface animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="size-10 text-text-disabled mb-3" />
          <p className="text-text-secondary font-medium">You're all caught up</p>
          <p className="text-text-muted text-sm mt-1">No notifications yet.</p>
        </div>
      )}

      {/* Unread */}
      {unread.length > 0 && (
        <div className="mb-6 rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-surface-raised border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              New
            </span>
          </div>
          {unread.map(n => <NotificationRow key={n.id} n={n} />)}
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden opacity-75">
          <div className="px-4 py-2 bg-surface-raised border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Earlier
            </span>
          </div>
          {read.map(n => <NotificationRow key={n.id} n={n} />)}
        </div>
      )}
    </div>
  )
}
