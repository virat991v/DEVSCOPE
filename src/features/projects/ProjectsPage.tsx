/**
 * Projects Page — /projects
 * Faculty view: list of all projects in the selected batch.
 * Student view: their own assigned project.
 */
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Users, User, GitBranch, Calendar } from 'lucide-react'
import { cn, relativeDate } from '@/lib/utils'
import { service } from '@/services'
import { DEMO_BATCHES } from '@/lib/demo-data'
import { Badge } from '@/components/ui/Badge'
import { SkeletonText } from '@/components/ui/Skeleton'
import { useAuth } from '@/app/AuthContext'
import type { Project } from '@/types'

// ─── Project card ─────────────────────────────────────────

interface ProjectCardProps {
  project: Project
}

function ProjectCard({ project }: ProjectCardProps) {
  const typeLabel = project.type === 'team' ? 'Team' : 'Individual'
  const typeVariant = project.type === 'team' ? 'info' : 'default'

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-border-subtle transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 size-9 rounded-lg bg-canvas border border-border flex items-center justify-center">
            <FolderOpen size={16} className="text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{project.title}</p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{project.description || 'No description'}</p>
          </div>
        </div>
        <Badge variant={typeVariant} size="sm">
          {project.type === 'team'
            ? <><Users size={10} className="inline mr-1" />{typeLabel}</>
            : <><User size={10} className="inline mr-1" />{typeLabel}</>
          }
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted pt-1 border-t border-border">
        <span className="flex items-center gap-1.5">
          <Users size={11} />
          {project.memberIds.length} {project.memberIds.length === 1 ? 'member' : 'members'}
        </span>
        <span className="flex items-center gap-1.5">
          <GitBranch size={11} />
          {project.repositoryIds.length} {project.repositoryIds.length === 1 ? 'repo' : 'repos'}
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <Calendar size={11} />
          {relativeDate(project.createdAt)}
        </span>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="shrink-0 size-9 rounded-lg bg-canvas border border-border" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="w-40" />
          <SkeletonText className="w-56" />
        </div>
      </div>
      <div className="flex gap-4 pt-1 border-t border-border">
        <SkeletonText className="w-20" />
        <SkeletonText className="w-20" />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────

function EmptyProjects({ role }: { role: 'faculty' | 'student' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-3">
      <div className="size-14 rounded-full bg-surface border border-border flex items-center justify-center">
        <FolderOpen size={24} className="text-text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">No projects yet</p>
        <p className="text-xs text-text-muted mt-1">
          {role === 'faculty'
            ? 'Projects will appear here once students have been assigned to them.'
            : 'You haven\'t been assigned to a project yet. Contact your faculty.'}
        </p>
      </div>
    </div>
  )
}

// ─── Faculty projects view ────────────────────────────────

function FacultyProjectsView() {
  const batchId = DEMO_BATCHES[0]?.id ?? ''

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', batchId],
    queryFn: () => service.getProjects(batchId),
    enabled: !!batchId,
  })

  const total = projects?.length ?? 0
  const teamCount = projects?.filter(p => p.type === 'team').length ?? 0
  const individualCount = projects?.filter(p => p.type === 'individual').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isLoading ? 'Loading…' : `${total} project${total !== 1 ? 's' : ''} · ${teamCount} team · ${individualCount} individual`}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total', value: total },
          { label: 'Team', value: teamCount },
          { label: 'Individual', value: individualCount },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-0.5">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{isLoading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : !projects?.length ? (
        <EmptyProjects role="faculty" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── Student projects view ────────────────────────────────

function StudentProjectView() {
  const { profile } = useAuth()
  const studentId = profile?.id ?? ''

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', 'student', studentId],
    queryFn: () => service.getProjects(studentId),
    enabled: !!studentId,
  })

  const myProject = projects?.[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">My Project</h1>
        <p className="text-sm text-text-muted mt-0.5">Your assigned project for this semester</p>
      </div>

      {isLoading ? (
        <ProjectCardSkeleton />
      ) : !myProject ? (
        <EmptyProjects role="student" />
      ) : (
        <div className="max-w-xl">
          <ProjectCard project={myProject} />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

interface ProjectsPageProps {
  role: 'faculty' | 'student'
}

export function ProjectsPage({ role }: ProjectsPageProps) {
  return (
    <div className={cn('p-6')}>
      {role === 'faculty' ? <FacultyProjectsView /> : <StudentProjectView />}
    </div>
  )
}
