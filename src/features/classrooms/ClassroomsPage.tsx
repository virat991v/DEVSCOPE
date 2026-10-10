import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList, Copy, DoorOpen, Megaphone, Users } from 'lucide-react'
import { useAuth } from '@/app/AuthContext'
import { service } from '@/services'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  createClassroom,
  createClassroomAssignment,
  getClassroom,
  joinClassroom,
  listAcademicCourses,
  listClassroomAnnouncements,
  listClassroomAssignments,
  listMyClassrooms,
  publishClassroomAnnouncement,
  useClassroomRealtime,
  type EnrollmentMode,
} from '@/features/classrooms/classroom-service'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function LiveDataRequired() {
  return (
    <Card className="max-w-xl">
      <CardContent className="py-10 text-center space-y-3">
        <BookOpen size={28} className="mx-auto text-text-muted" />
        <h1 className="text-lg font-semibold text-text-primary">Classrooms require Supabase</h1>
        <p className="text-sm text-text-muted">
          This area intentionally has no demo data. Configure Supabase and apply migration 018 before creating or joining a classroom.
        </p>
      </CardContent>
    </Card>
  )
}

function ClassroomCard({ classroom, role }: { classroom: Awaited<ReturnType<typeof listMyClassrooms>>[number]; role: 'faculty' | 'student' }) {
  const teachers = classroom.faculty.map(faculty => faculty.displayName).join(', ') || 'Faculty member'
  return (
    <Link
      to={`/classrooms/${classroom.id}`}
      className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">{classroom.name}</p>
          <p className="mt-1 text-xs text-text-muted">{classroom.course ? `${classroom.course.code} · ${classroom.course.name}` : 'Course'} · {classroom.batchLabel}</p>
        </div>
        <Badge variant={classroom.enrollmentMode === 'join_code' ? 'success' : 'default'}>
          {classroom.enrollmentMode === 'join_code' ? 'Join code' : classroom.enrollmentMode.replace('_', ' ')}
        </Badge>
      </div>
      {classroom.description && <p className="mt-4 line-clamp-2 text-sm text-text-secondary">{classroom.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-text-muted">
        <span className="truncate">{teachers}</span>
        {role === 'faculty' && <span className="shrink-0">{classroom.activeMemberCount} student{classroom.activeMemberCount === 1 ? '' : 's'}</span>}
      </div>
    </Link>
  )
}

function FacultyClassroomCreator() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>('join_code')
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['academic-courses'],
    queryFn: listAcademicCourses,
  })
  const { data: allBatches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['faculty-batches', profile?.id],
    queryFn: () => service.getBatches(),
    enabled: Boolean(profile?.id),
  })
  const batches = allBatches.filter(batch => batch.facultyIds.includes(profile?.id ?? ''))
  const mutation = useMutation({
    mutationFn: () => createClassroom({ name, description, courseId, batchId, enrollmentMode }),
    onSuccess: classroomId => navigate(`/classrooms/${classroomId}`),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !courseId || !batchId) return
    mutation.mutate()
  }

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-text-primary">Create a classroom</h2></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-medium text-text-secondary">Classroom name</span>
            <input value={name} onChange={event => setName(event.target.value)} required maxLength={160} placeholder="e.g. Web Engineering · Section B" className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-text-secondary">Course</span>
            <select value={courseId} onChange={event => setCourseId(event.target.value)} required disabled={coursesLoading} className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60 disabled:opacity-60">
              <option value="">Select a course</option>
              {courses.map(course => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-text-secondary">Assigned batch</span>
            <select value={batchId} onChange={event => setBatchId(event.target.value)} required disabled={batchesLoading} className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60 disabled:opacity-60">
              <option value="">Select an assigned batch</option>
              {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-text-secondary">Enrollment</span>
            <select value={enrollmentMode} onChange={event => setEnrollmentMode(event.target.value as EnrollmentMode)} className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60">
              <option value="join_code">Join with code</option>
              <option value="approval">Request approval</option>
              <option value="faculty_managed">Faculty enrollment only</option>
            </select>
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-medium text-text-secondary">Description</span>
            <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={10000} rows={3} placeholder="What students will learn and how this classroom will work." className="w-full resize-y rounded border border-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-primary/60" />
          </label>
          {mutation.error && <p role="alert" className="md:col-span-2 text-xs text-danger">{errorMessage(mutation.error, 'Unable to create classroom.')}</p>}
          {batches.length === 0 && !batchesLoading && <p className="md:col-span-2 text-xs text-warning">An administrator must assign you to a batch before you can create a classroom.</p>}
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" loading={mutation.isPending} disabled={!courses.length || !batches.length}>Create classroom</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function StudentClassroomJoiner() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [joinCode, setJoinCode] = useState('')
  const mutation = useMutation({
    mutationFn: () => joinClassroom(joinCode),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      if (result.status === 'active') navigate(`/classrooms/${result.classroomId}`)
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (joinCode.trim()) mutation.mutate()
  }

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-text-primary">Join a classroom</h2></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 space-y-1.5">
            <span className="text-xs font-medium text-text-secondary">Classroom code</span>
            <input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} required maxLength={10} placeholder="10-character code" className="h-9 w-full rounded border border-border bg-canvas px-3 font-mono text-sm uppercase tracking-[0.18em] text-text-primary outline-none focus:border-primary/60" />
          </label>
          <Button type="submit" loading={mutation.isPending}><DoorOpen size={14} />Join classroom</Button>
        </form>
        {mutation.error && <p role="alert" className="mt-3 text-xs text-danger">{errorMessage(mutation.error, 'Unable to join classroom.')}</p>}
        {mutation.data?.status === 'pending' && <p className="mt-3 text-xs text-warning">Your request is waiting for faculty approval.</p>}
      </CardContent>
    </Card>
  )
}

export function ClassroomsPage() {
  const { profile, isDemo } = useAuth()
  useClassroomRealtime(undefined, profile?.id)
  const { data: classrooms = [], isLoading, error } = useQuery({
    queryKey: ['classrooms'],
    queryFn: listMyClassrooms,
    enabled: Boolean(profile?.id) && isSupabaseConfigured && !isDemo,
  })

  if (!isSupabaseConfigured || isDemo || !profile) return <LiveDataRequired />

  const role: 'faculty' | 'student' = profile.role === 'faculty' ? 'faculty' : 'student'
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{role === 'faculty' ? 'My Classrooms' : 'My Classes'}</h1>
          <p className="mt-1 text-sm text-text-muted">{role === 'faculty' ? 'Create a class, publish work, and see the students who joined.' : 'Join your faculty classroom and receive announcements and assignments here.'}</p>
        </div>
      </div>

      {role === 'faculty' ? <FacultyClassroomCreator /> : <StudentClassroomJoiner />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">{role === 'faculty' ? 'Classrooms you teach' : 'Enrolled classrooms'}</h2>
        {isLoading ? <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div> : null}
        {error ? <Card><CardContent className="py-8 text-center text-sm text-danger">{errorMessage(error, 'Unable to load classrooms.')}</CardContent></Card> : null}
        {!isLoading && !error && classrooms.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><BookOpen size={26} className="mx-auto mb-3 text-text-muted" /><p className="text-sm text-text-secondary">{role === 'faculty' ? 'Create your first classroom to start working with students.' : 'Join a classroom with the code provided by your faculty member.'}</p></CardContent></Card>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map(classroom => <ClassroomCard key={classroom.id} classroom={classroom} role={role} />)}
        </div>
      </section>
    </div>
  )
}

function AnnouncementComposer({ classroomId }: { classroomId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const mutation = useMutation({
    mutationFn: () => publishClassroomAnnouncement(classroomId, title, body),
    onSuccess: () => {
      setTitle('')
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['classroom', classroomId, 'announcements'] })
    },
  })
  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-text-primary">Post to the classroom stream</h2></CardHeader>
      <CardContent>
        <form onSubmit={event => { event.preventDefault(); mutation.mutate() }} className="space-y-3">
          <input value={title} onChange={event => setTitle(event.target.value)} required maxLength={180} placeholder="Announcement title" className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60" />
          <textarea value={body} onChange={event => setBody(event.target.value)} required maxLength={10000} rows={4} placeholder="Write an update, reminder, or instruction for enrolled students." className="w-full resize-y rounded border border-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-primary/60" />
          {mutation.error && <p role="alert" className="text-xs text-danger">{errorMessage(mutation.error, 'Unable to publish announcement.')}</p>}
          <div className="flex justify-end"><Button type="submit" loading={mutation.isPending}><Megaphone size={14} />Publish to students</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}

function AssignmentComposer({ classroomId }: { classroomId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const mutation = useMutation({
    mutationFn: () => createClassroomAssignment(classroomId, title, description, new Date(deadline).toISOString()),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setDeadline('')
      void queryClient.invalidateQueries({ queryKey: ['classroom', classroomId, 'assignments'] })
    },
  })
  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-text-primary">Publish an assignment</h2></CardHeader>
      <CardContent>
        <form onSubmit={event => { event.preventDefault(); mutation.mutate() }} className="grid gap-3 md:grid-cols-2">
          <input value={title} onChange={event => setTitle(event.target.value)} required maxLength={180} placeholder="Assignment title" className="h-9 rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60 md:col-span-2" />
          <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={10000} rows={3} placeholder="Instructions and required evidence." className="resize-y rounded border border-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-primary/60 md:col-span-2" />
          <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Due date and time</span><input value={deadline} onChange={event => setDeadline(event.target.value)} required type="datetime-local" className="h-9 w-full rounded border border-border bg-canvas px-3 text-sm text-text-primary outline-none focus:border-primary/60" /></label>
          <div className="flex items-end justify-end"><Button type="submit" loading={mutation.isPending}><ClipboardList size={14} />Publish assignment</Button></div>
          {mutation.error && <p role="alert" className="text-xs text-danger md:col-span-2">{errorMessage(mutation.error, 'Unable to publish assignment.')}</p>}
        </form>
      </CardContent>
    </Card>
  )
}

export function ClassroomDetailPage() {
  const { classroomId } = useParams()
  const { profile, isDemo } = useAuth()
  const id = classroomId ?? ''
  useClassroomRealtime(id || undefined, profile?.id)
  const classroomQuery = useQuery({ queryKey: ['classroom', id], queryFn: () => getClassroom(id), enabled: Boolean(id) && !isDemo && isSupabaseConfigured })
  const streamQuery = useQuery({ queryKey: ['classroom', id, 'announcements'], queryFn: () => listClassroomAnnouncements(id), enabled: Boolean(id) && !isDemo && isSupabaseConfigured })
  const assignmentsQuery = useQuery({ queryKey: ['classroom', id, 'assignments'], queryFn: () => listClassroomAssignments(id), enabled: Boolean(id) && !isDemo && isSupabaseConfigured })

  if (!isSupabaseConfigured || isDemo || !profile) return <LiveDataRequired />
  if (classroomQuery.isLoading) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-56" /></div>
  if (classroomQuery.error) return <Card><CardContent className="py-10 text-center text-sm text-danger">{errorMessage(classroomQuery.error, 'Unable to load classroom.')}</CardContent></Card>
  if (!classroomQuery.data) return <Card><CardContent className="py-10 text-center text-sm text-text-secondary">This classroom was not found or you are not authorized to access it.</CardContent></Card>

  const classroom = classroomQuery.data
  const isFaculty = profile.role === 'faculty' || profile.role === 'admin'
  const activeStudents = classroom.members.filter(member => member.status === 'active')

  async function copyJoinCode() {
    await navigator.clipboard.writeText(classroom.joinCode)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/classrooms" className="text-sm text-primary-bright hover:underline">← All classrooms</Link>
      <section className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 to-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-primary-bright">{classroom.course ? `${classroom.course.code} · ${classroom.course.name}` : classroom.batchLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold text-text-primary">{classroom.name}</h1>
            {classroom.description && <p className="mt-2 max-w-2xl text-sm text-text-secondary">{classroom.description}</p>}
            <p className="mt-3 text-xs text-text-muted">Faculty: {classroom.faculty.map(faculty => faculty.displayName).join(', ')}</p>
          </div>
          {isFaculty && (
            <div className="rounded-lg border border-border bg-canvas/80 px-3 py-2 text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Student join code</p>
              <div className="mt-1 flex items-center gap-2"><code className="font-mono text-sm tracking-[0.18em] text-text-primary">{classroom.joinCode}</code><button type="button" onClick={() => void copyJoinCode()} className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-primary" aria-label="Copy classroom join code"><Copy size={14} /></button></div>
            </div>
          )}
        </div>
      </section>

      {isFaculty && <div className="grid gap-5 xl:grid-cols-2"><AnnouncementComposer classroomId={id} /><AssignmentComposer classroomId={id} /></div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><Megaphone size={15} className="text-primary-bright" /><h2 className="text-sm font-semibold text-text-primary">Classroom stream</h2></div></CardHeader>
            <CardContent className="space-y-4">
              {streamQuery.isLoading && <Skeleton className="h-24" />}
              {!streamQuery.isLoading && !streamQuery.data?.length && <p className="py-6 text-center text-sm text-text-muted">No announcements yet.</p>}
              {streamQuery.data?.map(post => <article key={post.id} className="border-b border-border pb-4 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-text-primary">{post.title}</h3><time className="shrink-0 text-xs text-text-muted" dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-text-muted">{post.authorDisplayName}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{post.body}</p></article>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><ClipboardList size={15} className="text-primary-bright" /><h2 className="text-sm font-semibold text-text-primary">Classwork</h2></div></CardHeader>
            <CardContent className="space-y-3">
              {assignmentsQuery.isLoading && <Skeleton className="h-20" />}
              {!assignmentsQuery.isLoading && !assignmentsQuery.data?.length && <p className="py-6 text-center text-sm text-text-muted">No classroom assignments yet.</p>}
              {assignmentsQuery.data?.map(assignment => <div key={assignment.id} className="rounded-lg border border-border bg-canvas/40 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-text-primary">{assignment.title}</p>{assignment.description && <p className="mt-1 text-sm text-text-secondary">{assignment.description}</p>}</div><Badge variant={assignment.state === 'published' ? 'success' : 'default'}>{assignment.state}</Badge></div><p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted"><CalendarClock size={12} />Due {new Date(assignment.deadline).toLocaleString()}</p></div>)}
            </CardContent>
          </Card>
        </section>
        <aside>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><Users size={15} className="text-primary-bright" /><h2 className="text-sm font-semibold text-text-primary">People</h2></div></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-text-muted">{isFaculty ? `${activeStudents.length} active student${activeStudents.length === 1 ? '' : 's'}` : 'Your membership is active.'}</p>
              {isFaculty ? activeStudents.length ? activeStudents.map(member => <div key={member.id} className="flex items-center gap-2"><div className="flex size-7 items-center justify-center rounded-full bg-primary-dim text-[10px] font-semibold text-primary-bright">{member.avatarInitials || 'S'}</div><div className="min-w-0"><p className="truncate text-sm text-text-primary">{member.displayName || 'Student'}</p><p className="text-xs text-text-muted">{member.rollNumber || 'No roll number'}</p></div></div>) : <p className="py-4 text-sm text-text-muted">No students have joined yet.</p> : <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 size={15} />You are enrolled in this classroom.</div>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
