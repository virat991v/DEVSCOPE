import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type EnrollmentMode = 'join_code' | 'approval' | 'faculty_managed'
export type MembershipStatus = 'active' | 'pending' | 'left' | 'removed'

export interface ClassroomSummary {
  id: string
  name: string
  description: string
  joinCode: string
  enrollmentMode: EnrollmentMode
  course: { code: string; name: string } | null
  batchLabel: string
  faculty: Array<{ id: string; displayName: string; primary: boolean }>
  activeMemberCount: number
}

export interface ClassroomMember {
  id: string
  status: MembershipStatus
  joinedAt: string
  displayName?: string
  rollNumber?: string
  avatarInitials?: string
}

export interface ClassroomDetail extends ClassroomSummary {
  members: ClassroomMember[]
}

export interface ClassroomAnnouncement {
  id: string
  title: string
  body: string
  authorDisplayName: string
  publishedAt: string
}

export interface ClassroomAssignment {
  id: string
  title: string
  description: string
  deadline: string
  state: 'draft' | 'published' | 'closed'
  publishedAt?: string
}

export interface AcademicCourseOption {
  id: string
  code: string
  name: string
}

type ClassroomRow = {
  id: string
  name: string
  description: string
  join_code: string
  enrollment_mode: EnrollmentMode
  academic_courses: { code: string; name: string } | null
  academic_batches: { label: string } | null
  classroom_faculty: Array<{ faculty_id: string; faculty_display_name: string; is_primary: boolean }>
  classroom_memberships: Array<{ profile_id: string; status: MembershipStatus }>
}

type ClassroomRpcClient = {
  rpc: (functionName: string, arguments_: Record<string, unknown>) => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

const classroomRpc = supabase as unknown as ClassroomRpcClient

function describeError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message || `${context} failed. Please try again.`)
}

function mapClassroom(row: ClassroomRow): ClassroomSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    joinCode: row.join_code,
    enrollmentMode: row.enrollment_mode,
    course: row.academic_courses,
    batchLabel: row.academic_batches?.label ?? 'Unknown batch',
    faculty: (row.classroom_faculty ?? []).map(faculty => ({
      id: faculty.faculty_id,
      displayName: faculty.faculty_display_name || 'Faculty member',
      primary: faculty.is_primary,
    })),
    activeMemberCount: (row.classroom_memberships ?? []).filter(member => member.status === 'active').length,
  }
}

export async function listMyClassrooms(): Promise<ClassroomSummary[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select(`
      id, name, description, join_code, enrollment_mode,
      academic_courses(code, name),
      academic_batches(label),
      classroom_faculty(faculty_id, faculty_display_name, is_primary),
      classroom_memberships(profile_id, status)
    `)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) return describeError(error, 'Unable to load classrooms')
  return ((data ?? []) as unknown as ClassroomRow[]).map(mapClassroom)
}

export async function getClassroom(classroomId: string): Promise<ClassroomDetail | null> {
  const { data, error } = await supabase
    .from('classrooms')
    .select(`
      id, name, description, join_code, enrollment_mode,
      academic_courses(code, name),
      academic_batches(label),
      classroom_faculty(faculty_id, faculty_display_name, is_primary),
      classroom_memberships(profile_id, status, joined_at, profiles(display_name, roll_number, avatar_initials))
    `)
    .eq('id', classroomId)
    .maybeSingle()

  if (error) return describeError(error, 'Unable to load classroom')
  if (!data) return null

  const row = data as unknown as {
    id: string
    name: string
    description: string
    join_code: string
    enrollment_mode: EnrollmentMode
    academic_courses: { code: string; name: string } | null
    academic_batches: { label: string } | null
    classroom_faculty: Array<{ faculty_id: string; faculty_display_name: string; is_primary: boolean }>
    classroom_memberships: Array<{
      profile_id: string
      status: MembershipStatus
      joined_at: string
      profiles: { display_name: string; roll_number: string | null; avatar_initials: string } | null
    }>
  }
  return {
    ...mapClassroom(row as ClassroomRow),
    members: (row.classroom_memberships ?? []).map(member => ({
      id: member.profile_id,
      status: member.status,
      joinedAt: member.joined_at,
      displayName: member.profiles?.display_name,
      rollNumber: member.profiles?.roll_number ?? undefined,
      avatarInitials: member.profiles?.avatar_initials,
    })),
  }
}

export async function listClassroomAnnouncements(classroomId: string): Promise<ClassroomAnnouncement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, author_display_name, published_at')
    .eq('classroom_id', classroomId)
    .order('published_at', { ascending: false })

  if (error) return describeError(error, 'Unable to load classroom stream')
  return ((data ?? []) as Array<{
    id: string; title: string; body: string; author_display_name: string; published_at: string
  }>).map(announcement => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    authorDisplayName: announcement.author_display_name,
    publishedAt: announcement.published_at,
  }))
}

export async function listClassroomAssignments(classroomId: string): Promise<ClassroomAssignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, description, deadline, state, published_at')
    .eq('classroom_id', classroomId)
    .order('deadline', { ascending: true })

  if (error) return describeError(error, 'Unable to load classroom assignments')
  return ((data ?? []) as Array<{
    id: string; title: string; description: string; deadline: string; state: ClassroomAssignment['state']; published_at: string | null
  }>).map(assignment => ({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    deadline: assignment.deadline,
    state: assignment.state,
    publishedAt: assignment.published_at ?? undefined,
  }))
}

export async function listAcademicCourses(): Promise<AcademicCourseOption[]> {
  const { data, error } = await supabase
    .from('academic_courses')
    .select('id, code, name')
    .order('code')

  if (error) return describeError(error, 'Unable to load courses')
  return (data ?? []) as AcademicCourseOption[]
}

export async function createClassroom(input: {
  name: string
  courseId: string
  batchId: string
  description: string
  enrollmentMode: EnrollmentMode
}): Promise<string> {
  const { data, error } = await classroomRpc.rpc('create_classroom', {
    p_name: input.name,
    p_course_id: input.courseId,
    p_batch_id: input.batchId,
    p_description: input.description,
    p_enrollment_mode: input.enrollmentMode,
  })
  if (error || !data) return describeError(error, 'Unable to create classroom')
  return data as string
}

export async function joinClassroom(joinCode: string): Promise<{ classroomId: string; status: MembershipStatus; alreadyJoined: boolean }> {
  const { data, error } = await classroomRpc.rpc('join_classroom', { p_join_code: joinCode })
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return describeError(error, 'Unable to join classroom')
  const result = data as { classroom_id?: string; status?: MembershipStatus; already_joined?: boolean }
  if (!result.classroom_id || !result.status) throw new Error('The classroom join request returned an invalid response.')
  return { classroomId: result.classroom_id, status: result.status, alreadyJoined: Boolean(result.already_joined) }
}

export async function publishClassroomAnnouncement(classroomId: string, title: string, body: string): Promise<string> {
  const { data, error } = await classroomRpc.rpc('publish_classroom_announcement', {
    p_classroom_id: classroomId,
    p_title: title,
    p_body: body,
  })
  if (error || !data) return describeError(error, 'Unable to publish announcement')
  return data as string
}

export async function createClassroomAssignment(classroomId: string, title: string, description: string, deadline: string): Promise<string> {
  const { data, error } = await classroomRpc.rpc('create_classroom_assignment', {
    p_classroom_id: classroomId,
    p_title: title,
    p_description: description,
    p_deadline: deadline,
  })
  if (error || !data) return describeError(error, 'Unable to publish assignment')
  return data as string
}

/**
 * Database rows remain the source of truth. Realtime payloads only invalidate
 * the affected React Query caches, so reconnects recover through normal reads.
 */
export function useClassroomRealtime(classroomId: string | undefined, profileId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!classroomId && !profileId) return undefined

    const channel = supabase.channel(`classroom-live:${classroomId ?? 'none'}:${profileId ?? 'none'}`)
    if (classroomId) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `classroom_id=eq.${classroomId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['classroom', classroomId, 'announcements'] })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `classroom_id=eq.${classroomId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['classroom', classroomId, 'assignments'] })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_memberships', filter: `classroom_id=eq.${classroomId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['classroom', classroomId] })
          void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
        })
    }
    if (profileId) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', profileId] })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_memberships', filter: `profile_id=eq.${profileId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
        })
    }
    channel.subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [classroomId, profileId, queryClient])
}
