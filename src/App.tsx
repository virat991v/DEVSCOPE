import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/shared/AppShell'
import { DemoSwitcher } from '@/components/shared/DemoSwitcher'
import { AuthProvider, useAuth } from '@/app/AuthContext'
import { RequireAuth, RequireGuest } from '@/app/RouteGuards'

// ─── Public pages (small — keep eager) ───────────────────
import { LandingPage }       from '@/features/landing/LandingPage'
import { SignInPage }        from '@/features/auth/SignInPage'
import { SignUpPage }        from '@/features/auth/SignUpPage'
import { AcceptInvitePage }  from '@/features/auth/AcceptInvitePage'
import { ForgotPasswordPage }  from '@/features/auth/ForgotPasswordPage'
import { AuthCallbackPage }    from '@/features/auth/AuthCallbackPage'
import { GitHubCallbackPage }  from '@/features/github/GitHubCallbackPage'

// ─── Protected pages — lazy-loaded ────────────────────────
const RepoSelectionPage       = lazy(() => import('@/features/github/RepoSelectionPage').then(m => ({ default: m.RepoSelectionPage })))
const FacultyOverview         = lazy(() => import('@/features/faculty/FacultyOverview').then(m => ({ default: m.FacultyOverview })))
const StudentProfile          = lazy(() => import('@/features/students/StudentProfile').then(m => ({ default: m.StudentProfile })))
const StudentWorkspace        = lazy(() => import('@/features/students/StudentWorkspace').then(m => ({ default: m.StudentWorkspace })))
const StudentDirectoryPage    = lazy(() => import('@/features/students/StudentDirectoryPage').then(m => ({ default: m.StudentDirectoryPage })))
const BatchesPage             = lazy(() => import('@/features/batches/BatchesPage').then(m => ({ default: m.BatchesPage })))
const AssignmentsPage         = lazy(() => import('@/features/assignments/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })))
const AssignmentDetailPage    = lazy(() => import('@/features/assignments/AssignmentDetailPage').then(m => ({ default: m.AssignmentDetailPage })))
const StudentAssignmentsPage  = lazy(() => import('@/features/assignments/StudentAssignmentsPage').then(m => ({ default: m.StudentAssignmentsPage })))
const SettingsPage            = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const NotificationsPage       = lazy(() => import('@/features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const AdminPage               = lazy(() => import('@/features/admin/AdminPage').then(m => ({ default: m.AdminPage })))
const IntegrationHealthPage   = lazy(() => import('@/features/github/IntegrationHealthPage').then(m => ({ default: m.IntegrationHealthPage })))
const ProjectsPage            = lazy(() => import('@/features/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ClassroomsPage          = lazy(() => import('@/features/classrooms/ClassroomsPage').then(m => ({ default: m.ClassroomsPage })))
const ClassroomDetailPage     = lazy(() => import('@/features/classrooms/ClassroomsPage').then(m => ({ default: m.ClassroomDetailPage })))

import { DEMO_PERSONAS, type DemoPersona } from '@/lib/demo-data'
import { setDemoPersona } from '@/services'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// ─── Placeholder ──────────────────────────────────────────

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <span className="size-5 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
      <p className="text-lg font-medium text-text-secondary">{title}</p>
      <p className="text-sm text-text-muted mt-2">This section will be implemented in a later phase.</p>
    </div>
  )
}

// ─── Role-aware routing ───────────────────────────────────

function FacultyRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/faculty/dashboard"            element={<FacultyOverview />} />
        <Route path="/overview"                   element={<FacultyOverview />} />
        <Route path="/students"                   element={<StudentDirectoryPage />} />
        <Route path="/students/:studentId"        element={<StudentProfile />} />
        <Route path="/batches"                    element={<BatchesPage />} />
        <Route path="/classrooms"                 element={<ClassroomsPage />} />
        <Route path="/classrooms/:classroomId"    element={<ClassroomDetailPage />} />
        <Route path="/assignments"                element={<AssignmentsPage />} />
        <Route path="/assignments/new"            element={<AssignmentsPage />} />
        <Route path="/assignments/:assignmentId"  element={<AssignmentDetailPage />} />
        <Route path="/projects"                   element={<ProjectsPage role="faculty" />} />
        <Route path="/activity"                   element={<PlaceholderPage title="Activity Explorer" />} />
        <Route path="/analytics"                  element={<PlaceholderPage title="Analytics" />} />
        <Route path="/notifications"              element={<NotificationsPage />} />
        <Route path="/settings"                   element={<SettingsPage />} />
        <Route path="*"                           element={<Navigate to="/faculty/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

function StudentRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/student/dashboard" element={<StudentWorkspace />} />
        <Route path="/workspace"     element={<StudentWorkspace />} />
        <Route path="/classrooms"    element={<ClassroomsPage />} />
        <Route path="/classrooms/:classroomId" element={<ClassroomDetailPage />} />
        <Route path="/assignments"   element={<StudentAssignmentsPage />} />
        <Route path="/projects"      element={<ProjectsPage role="student" />} />
        <Route path="/activity"      element={<PlaceholderPage title="Activity" />} />
        <Route path="/progress"      element={<PlaceholderPage title="Progress" />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="*"              element={<Navigate to="/student/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/admin/dashboard" element={<AdminPage />} />
        <Route path="/admin"         element={<AdminPage />} />
        <Route path="/batches"       element={<BatchesPage />} />
        <Route path="/students"      element={<StudentDirectoryPage />} />
        <Route path="/integrations"  element={<IntegrationHealthPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="*"              element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

// ─── Authenticated shell ──────────────────────────────────

function AuthenticatedApp() {
  const { profile, isDemo } = useAuth()
  const navigate = useNavigate()
  const [persona, setPersona] = useState<DemoPersona>('faculty')

  function handlePersonaChange(p: DemoPersona) {
    setPersona(p)
    setDemoPersona(p)
    queryClient.clear()
    if (p === 'faculty') navigate('/faculty/dashboard')
    else if (p === 'student') navigate('/student/dashboard')
    else navigate('/admin/dashboard')
  }

  const activeProfile = isDemo ? DEMO_PERSONAS[persona] : profile!
  const activeRole = activeProfile.role

  const breadcrumbs = {
    faculty: [{ label: 'DevScope' }, { label: 'SE-E-B' }, { label: 'Overview' }],
    student: [{ label: 'DevScope' }, { label: 'My Workspace' }],
    admin:   [{ label: 'DevScope' }, { label: 'Administration' }],
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppShell
        profile={activeProfile}
        breadcrumbs={breadcrumbs[activeRole as keyof typeof breadcrumbs] ?? [{ label: 'DevScope' }]}
        unreadCount={activeRole === 'faculty' ? 2 : activeRole === 'student' ? 1 : 0}
        currentBatchLabel={activeRole === 'faculty' ? 'SE-E-B · Sem IV' : undefined}
      >
        {activeRole === 'faculty' && <FacultyRoutes />}
        {activeRole === 'student' && <StudentRoutes />}
        {activeRole === 'admin'   && <AdminRoutes />}
      </AppShell>
      {isDemo && <DemoSwitcher current={persona} onChange={handlePersonaChange} />}
    </>
  )
}

// ─── Root router ──────────────────────────────────────────
//
// Route strategy:
//   /               → Public landing page (ALWAYS — no redirect for unauthenticated users)
//   /login          → Sign-in (RequireGuest: redirects authenticated users to their dashboard)
//   /sign-in        → Alias for /login (backward compat)
//   /signup         → Sign-up (RequireGuest)
//   /accept-invite  → Invite flow (RequireGuest)
//   /forgot-password → Password reset request (public)
//   /github-callback → OAuth callback (public)
//   /*              → Protected app routes (RequireAuth)

function AppRoot() {
  return (
    <Routes>
      {/* ── Root: always the public landing page ── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Public auth pages — redirect authenticated users to their dashboard ── */}
      <Route path="/login" element={
        <RequireGuest>
          <SignInPage />
        </RequireGuest>
      } />
      {/* /sign-in backward-compat alias */}
      <Route path="/sign-in" element={
        <RequireGuest>
          <SignInPage />
        </RequireGuest>
      } />
      <Route path="/signup" element={
        <RequireGuest>
          <SignUpPage />
        </RequireGuest>
      } />
      <Route path="/accept-invite" element={
        <RequireGuest>
          <AcceptInvitePage />
        </RequireGuest>
      } />

      {/* Fully public — no guard needed */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* OAuth callback — Supabase redirects here after Google/GitHub OAuth */}
      <Route path="/auth/callback"   element={<AuthCallbackPage />} />
      <Route path="/github-callback" element={<GitHubCallbackPage />} />
      {/* Repo selection after GitHub OAuth — requires auth but no AppShell */}
      <Route path="/github/select-repos" element={
        <RequireAuth>
          <Suspense fallback={<div />}>
            <RepoSelectionPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* ── All protected app routes ── */}
      <Route path="/*" element={
        <RequireAuth>
          <AuthenticatedApp />
        </RequireAuth>
      } />
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </QueryClientProvider>
  )
}
