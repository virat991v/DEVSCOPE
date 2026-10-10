import { useState, useRef, useEffect } from 'react'
import { Bell, Search, ChevronDown, LogOut, User, LayoutDashboard, FolderOpen, ClipboardList, Activity, BookOpen, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { signOut } from '@/app/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types'

interface TopBarProps {
  profile: Profile
  breadcrumbs?: { label: string; to?: string }[]
  unreadCount?: number
  onSearchClick?: () => void
}

export function TopBar({ profile, breadcrumbs, unreadCount = 0, onSearchClick }: TopBarProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const destinations = [
    { label: profile.role === 'student' ? 'My Workspace' : profile.role === 'faculty' ? 'Faculty Dashboard' : 'Administration', to: profile.role === 'student' ? '/student/dashboard' : profile.role === 'faculty' ? '/faculty/dashboard' : '/admin/dashboard', icon: LayoutDashboard },
    { label: profile.role === 'student' ? 'My Classes' : 'Classrooms', to: '/classrooms', icon: BookOpen },
    { label: 'Projects', to: '/projects', icon: FolderOpen },
    { label: 'Assignments', to: '/assignments', icon: ClipboardList },
    { label: 'Activity', to: '/activity', icon: Activity },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Settings', to: '/settings', icon: User },
  ]
  const matchingDestinations = destinations.filter(destination =>
    destination.label.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    setMenuOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  function openSearch() {
    if (onSearchClick) {
      onSearchClick()
      return
    }
    setSearchOpen(true)
  }

  function goToDestination(destination: { to: string }) {
    setSearchOpen(false)
    setSearchTerm('')
    navigate(destination.to)
  }

  return (
    <>
      <header
        className="h-14 bg-canvas-subtle border-b border-border flex items-center gap-4 px-4 shrink-0"
        role="banner"
      >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <ol className="flex items-center gap-1.5 text-sm" role="list">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-text-muted">/</span>}
                <span className={cn(
                  i === breadcrumbs.length - 1
                    ? 'text-text-primary font-medium'
                    : 'text-text-muted hover:text-text-primary transition-colors',
                )}>
                  {crumb.label}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </nav>

      {/* Search */}
      <button
        type="button"
        onClick={openSearch}
        className="hidden md:flex items-center gap-2 h-8 px-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
        aria-label="Search (Ctrl+K)"
      >
        <Search size={14} />
        <span>Search…</span>
        <kbd className="ml-1 text-[10px] bg-surface-raised px-1.5 py-0.5 rounded text-text-muted font-mono border border-border">⌘K</kbd>
      </button>

      {/* Notifications */}
      <button
        type="button"
        onClick={() => navigate('/notifications')}
        className="relative size-8 flex items-center justify-center rounded-[var(--radius-control)] text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 text-[10px] bg-primary text-white rounded-full flex items-center justify-center px-1 font-medium"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Account dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1 hover:bg-surface-raised transition-colors"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <Avatar initials={profile.avatarInitials} size="sm" />
          <span className="hidden sm:block text-sm text-text-secondary max-w-[120px] truncate">
            {profile.displayName}
          </span>
          <ChevronDown
            size={14}
            className={cn('text-text-muted transition-transform duration-150', menuOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface-raised border border-border rounded-[var(--radius-panel)] shadow-xl z-50 py-1">
            {/* Identity */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-text-primary truncate">{profile.displayName}</p>
              <p className="text-[11px] text-text-muted truncate">{profile.email}</p>
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary-bright capitalize">
                {profile.role}
              </span>
            </div>

            <button
              onClick={() => { setMenuOpen(false); navigate('/settings') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              <User size={14} />
              Settings
            </button>

            {/* Sign-out only available in real auth mode */}
            {isSupabaseConfigured && (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50 border-t border-border mt-1"
              >
                <LogOut size={14} />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            )}
          </div>
        )}
      </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[14vh]" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-navigation-title"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search size={16} className="text-text-muted shrink-0" />
              <input
                autoFocus
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Jump to a section…"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                aria-label="Search sections"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label="Close search">
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              <h2 id="quick-navigation-title" className="px-2 pb-1 text-xs font-medium text-text-muted">Quick navigation</h2>
              {matchingDestinations.length > 0 ? matchingDestinations.map(destination => {
                const Icon = destination.icon
                return (
                  <button
                    key={destination.to}
                    type="button"
                    onClick={() => goToDestination(destination)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  >
                    <Icon size={16} className="text-primary-bright" />
                    {destination.label}
                  </button>
                )
              }) : <p className="px-2 py-5 text-sm text-text-muted">No matching section.</p>}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
