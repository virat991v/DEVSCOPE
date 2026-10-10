/**
 * LandingNavbar — smart auth-aware navigation for the public landing page.
 *
 * Guest:         Logo | nav links | Sign in (ghost) | Get Started (primary)
 * Authenticated: Logo | nav links | Dashboard (primary) | Avatar dropdown
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, LayoutDashboard, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/app/AuthContext'
import { signOut } from '@/app/AuthContext'
import { roleHome } from '@/app/RouteGuards'

const NAV_LINKS = [
  { label: 'Features',    href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Students', href: '#students' },
  { label: 'For Faculty',  href: '#faculty' },
]

export function LandingNavbar() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen]     = useState(false)      // mobile menu
  const [dropOpen, setDropOpen]     = useState(false)      // user dropdown
  const [signingOut, setSigningOut] = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Sticky shadow on scroll
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    if (dropOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropOpen])

  async function handleSignOut() {
    setSigningOut(true)
    setDropOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  const initials = profile?.avatarInitials ?? profile?.displayName?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 h-14 transition-all duration-200',
        scrolled
          ? 'bg-canvas-subtle/95 backdrop-blur border-b border-border shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-2">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">DS</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-text-primary leading-tight">DevScope</p>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors rounded-md hover:bg-surface-raised"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Spacer on desktop when no links */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Loading: show nothing to avoid flash */}
          {loading ? (
            <div className="w-20 h-8 rounded-lg bg-surface-raised animate-pulse" />
          ) : profile ? (
            /* ── Authenticated ── */
            <>
              <Link
                to={roleHome(profile.role)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
              >
                <LayoutDashboard size={13} />
                Dashboard
              </Link>

              {/* Avatar dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-raised transition-colors"
                  aria-haspopup="true"
                  aria-expanded={dropOpen}
                >
                  <div className="size-7 rounded-full bg-primary-dim border border-primary-dim-border flex items-center justify-center text-xs font-semibold text-primary-bright">
                    {initials}
                  </div>
                  <ChevronDown
                    size={13}
                    className={cn('text-text-muted transition-transform duration-150', dropOpen && 'rotate-180')}
                  />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-raised border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-border">
                      <p className="text-xs font-semibold text-text-primary truncate">{profile.displayName}</p>
                      <p className="text-[11px] text-text-muted truncate">{profile.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary-bright capitalize">
                        {profile.role}
                      </span>
                    </div>
                    <button
                      onClick={() => { setDropOpen(false); navigate(roleHome(profile.role)) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <LayoutDashboard size={13} />
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setDropOpen(false); navigate('/settings') }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <Settings size={13} />
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors border-t border-border mt-1 disabled:opacity-50"
                    >
                      <LogOut size={13} />
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Guest ── */
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg text-sm text-text-secondary border border-border hover:border-border-strong hover:text-text-primary transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden size-8 flex items-center justify-center rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors ml-1"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-14 inset-x-0 bg-canvas-subtle border-b border-border shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="border-t border-border my-2" />
            {profile ? (
              <button
                onClick={() => { setMenuOpen(false); navigate(roleHome(profile.role)) }}
                className="px-3 py-2 text-sm text-left text-text-primary font-medium hover:bg-surface-raised rounded-lg transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors">Sign in</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors text-center mt-1">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
