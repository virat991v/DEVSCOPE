import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList,
  Activity, BarChart2, Bell, Settings, Shield,
  BookOpen, TrendingUp, ChevronLeft, ChevronRight,
  Zap, GitBranch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'
import { useState } from 'react'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',       to: '/overview',      icon: LayoutDashboard, roles: ['faculty'] },
  { label: 'Classrooms',     to: '/classrooms',    icon: Users,           roles: ['faculty'] },
  { label: 'Batches',        to: '/batches',       icon: BookOpen,        roles: ['faculty', 'admin'] },
  { label: 'Students',       to: '/students',      icon: Users,           roles: ['faculty', 'admin'] },
  { label: 'Projects',       to: '/projects',      icon: FolderOpen,      roles: ['faculty', 'admin'] },
  { label: 'Assignments',    to: '/assignments',   icon: ClipboardList,   roles: ['faculty', 'admin'] },
  { label: 'Activity',       to: '/activity',      icon: Activity,        roles: ['faculty', 'admin'] },
  { label: 'Analytics',      to: '/analytics',     icon: BarChart2,       roles: ['faculty', 'admin'] },
  // Student nav
  { label: 'My Workspace',   to: '/workspace',     icon: LayoutDashboard, roles: ['student'] },
  { label: 'My Classes',     to: '/classrooms',    icon: BookOpen,        roles: ['student'] },
  { label: 'Projects',       to: '/projects',      icon: FolderOpen,      roles: ['student'] },
  { label: 'Assignments',    to: '/assignments',   icon: ClipboardList,   roles: ['student'] },
  { label: 'Activity',       to: '/activity',      icon: GitBranch,       roles: ['student'] },
  { label: 'Progress',       to: '/progress',      icon: TrendingUp,      roles: ['student'] },
  // Shared
  { label: 'Notifications',  to: '/notifications', icon: Bell,            roles: ['faculty', 'student', 'admin'] },
  { label: 'Settings',       to: '/settings',      icon: Settings,        roles: ['faculty', 'student', 'admin'] },
  // Admin extras
  { label: 'Administration', to: '/admin',         icon: Shield,          roles: ['admin'] },
  { label: 'Integrations',   to: '/integrations',  icon: Zap,             roles: ['admin'] },
]

interface SidebarProps {
  role: Role
  currentBatchLabel?: string
}

export function Sidebar({ role, currentBatchLabel }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const items = NAV_ITEMS.filter(n => n.roles.includes(role))

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-canvas-subtle border-r border-border transition-all duration-[var(--t-drawer)] shrink-0',
        collapsed ? 'w-14' : 'w-[232px]',
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0',
        collapsed && 'justify-center px-2',
      )}>
        {/* DS logomark — teal square */}
        <div className="size-7 rounded-[var(--radius-control)] bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">DS</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary leading-tight truncate">DevScope</p>
            <p className="text-[11px] text-text-muted leading-tight truncate">
              {currentBatchLabel ?? 'Student Platform'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {items.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to))
          return (
            <NavLink
              key={`${item.to}-${item.roles[0]}`}
              to={item.to}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-control)] transition-colors text-sm',
                collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-9 px-2.5',
                isActive
                  ? 'bg-primary-dim text-primary-bright font-medium border-l-2 border-primary-bright'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
              )}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={16}
                className={cn('shrink-0', isActive ? 'text-primary-bright' : '')}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex items-center justify-center rounded-[var(--radius-control)] h-8 text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors w-full',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} className="mr-1" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
