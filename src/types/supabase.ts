/**
 * Supabase database types for DevAtlas.
 * Generated from schema. Regenerate after schema changes:
 *   supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/supabase.ts
 *
 * This file reflects the schema defined in supabase/migrations/*.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: { id: string; name: string; slug: string; timezone: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; timezone?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['institutions']['Insert']>
      }
      profiles: {
        Row: { id: string; institution_id: string; display_name: string; email: string; avatar_initials: string; roll_number: string | null; github_username: string | null; created_at: string; updated_at: string }
        Insert: { id: string; institution_id: string; display_name: string; email: string; avatar_initials?: string; roll_number?: string | null; github_username?: string | null }
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>>
      }
      role_assignments: {
        Row: { id: string; profile_id: string; institution_id: string; role: Database['public']['Enums']['user_role']; assigned_by: string | null; assigned_at: string; revoked_at: string | null }
        Insert: { id?: string; profile_id: string; institution_id: string; role: Database['public']['Enums']['user_role']; assigned_by?: string | null; assigned_at?: string; revoked_at?: string | null }
        Update: Partial<Database['public']['Tables']['role_assignments']['Insert']>
      }
      invitations: {
        Row: { id: string; institution_id: string; email: string; role: Database['public']['Enums']['user_role']; token: string; invited_by: string | null; accepted_at: string | null; expires_at: string; created_at: string }
        Insert: { id?: string; institution_id: string; email: string; role: Database['public']['Enums']['user_role']; token?: string; invited_by?: string | null; accepted_at?: string | null; expires_at?: string }
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
      }
      academic_batches: {
        Row: { id: string; institution_id: string; division_id: string; label: string; section: string; created_at: string; updated_at: string }
        Insert: { id?: string; institution_id: string; division_id: string; label: string; section: string }
        Update: Partial<Database['public']['Tables']['academic_batches']['Insert']>
      }
      academic_courses: {
        Row: { id: string; institution_id: string; code: string; name: string; credits: number | null; created_at: string }
        Insert: { id?: string; institution_id: string; code: string; name: string; credits?: number | null }
        Update: Partial<Database['public']['Tables']['academic_courses']['Insert']>
      }
      batch_memberships: {
        Row: { id: string; batch_id: string; profile_id: string; roll_number: string; enrollment_start: string; enrollment_end: string | null; is_active: boolean; created_at: string }
        Insert: { id?: string; batch_id: string; profile_id: string; roll_number: string; enrollment_start?: string; enrollment_end?: string | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['batch_memberships']['Insert']>
      }
      faculty_batch_assignments: {
        Row: { id: string; batch_id: string; faculty_id: string; assigned_at: string; revoked_at: string | null }
        Insert: { id?: string; batch_id: string; faculty_id: string; revoked_at?: string | null }
        Update: Partial<Database['public']['Tables']['faculty_batch_assignments']['Insert']>
      }
      classrooms: {
        Row: { id: string; institution_id: string; course_id: string; batch_id: string; name: string; description: string; join_code: string; enrollment_mode: Database['public']['Enums']['classroom_enrollment_mode']; is_archived: boolean; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; institution_id: string; course_id: string; batch_id: string; name: string; description?: string; join_code: string; enrollment_mode?: Database['public']['Enums']['classroom_enrollment_mode']; is_archived?: boolean; created_by: string }
        Update: Partial<Omit<Database['public']['Tables']['classrooms']['Insert'], 'id' | 'institution_id' | 'created_by'>>
      }
      classroom_faculty: {
        Row: { classroom_id: string; faculty_id: string; faculty_display_name: string; is_primary: boolean; assigned_at: string; revoked_at: string | null }
        Insert: { classroom_id: string; faculty_id: string; faculty_display_name?: string; is_primary?: boolean; revoked_at?: string | null }
        Update: Partial<Omit<Database['public']['Tables']['classroom_faculty']['Insert'], 'classroom_id' | 'faculty_id'>>
      }
      classroom_memberships: {
        Row: { classroom_id: string; profile_id: string; status: Database['public']['Enums']['classroom_membership_status']; joined_at: string; left_at: string | null; created_at: string; updated_at: string }
        Insert: { classroom_id: string; profile_id: string; status?: Database['public']['Enums']['classroom_membership_status']; joined_at?: string; left_at?: string | null }
        Update: Partial<Omit<Database['public']['Tables']['classroom_memberships']['Insert'], 'classroom_id' | 'profile_id'>>
      }
      announcements: {
        Row: { id: string; classroom_id: string; author_id: string; author_display_name: string; title: string; body: string; published_at: string; created_at: string; updated_at: string }
        Insert: { id?: string; classroom_id: string; author_id: string; author_display_name: string; title: string; body: string; published_at?: string }
        Update: Partial<Omit<Database['public']['Tables']['announcements']['Insert'], 'id' | 'classroom_id' | 'author_id'>>
      }
      projects: {
        Row: { id: string; institution_id: string; batch_id: string; title: string; description: string; type: Database['public']['Enums']['project_type']; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; institution_id: string; batch_id: string; title: string; description?: string; type?: Database['public']['Enums']['project_type']; created_by?: string | null }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      assignments: {
        Row: { id: string; batch_id: string; classroom_id: string | null; created_by: string; title: string; description: string; state: Database['public']['Enums']['assignment_state']; mode: Database['public']['Enums']['assignment_mode']; deadline: string; timezone: string; late_policy: string | null; published_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; batch_id: string; classroom_id?: string | null; created_by: string; title: string; description?: string; state?: Database['public']['Enums']['assignment_state']; mode?: Database['public']['Enums']['assignment_mode']; deadline: string; timezone?: string; late_policy?: string | null; published_at?: string | null }
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>
      }
      rubric_criteria: {
        Row: { id: string; assignment_id: string; label: string; description: string; max_points: number; sort_order: number; created_at: string }
        Insert: { id?: string; assignment_id: string; label: string; description?: string; max_points?: number; sort_order?: number }
        Update: Partial<Database['public']['Tables']['rubric_criteria']['Insert']>
      }
      submissions: {
        Row: { id: string; assignment_id: string; profile_id: string; state: Database['public']['Enums']['submission_state']; repository_id: string | null; commit_sha: string | null; pr_url: string | null; summary: string | null; demo_url: string | null; reflection: string | null; submitted_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; assignment_id: string; profile_id: string; state?: Database['public']['Enums']['submission_state']; repository_id?: string | null; commit_sha?: string | null; pr_url?: string | null; summary?: string | null; demo_url?: string | null; reflection?: string | null; submitted_at?: string | null }
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
      evaluations: {
        Row: { id: string; submission_id: string; faculty_id: string; is_draft: boolean; feedback: string; published_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; submission_id: string; faculty_id: string; is_draft?: boolean; feedback?: string; published_at?: string | null }
        Update: Partial<Database['public']['Tables']['evaluations']['Insert']>
      }
      criterion_results: {
        Row: { id: string; evaluation_id: string; criterion_id: string; score: number; comment: string | null }
        Insert: { id?: string; evaluation_id: string; criterion_id: string; score?: number; comment?: string | null }
        Update: Partial<Database['public']['Tables']['criterion_results']['Insert']>
      }
      faculty_notes: {
        Row: { id: string; faculty_id: string; student_id: string; institution_id: string; content: string; updated_at: string }
        Insert: { id?: string; faculty_id: string; student_id: string; institution_id: string; content?: string }
        Update: Partial<Database['public']['Tables']['faculty_notes']['Insert']>
      }
      github_accounts: {
        Row: { id: string; profile_id: string; institution_id: string; github_id: string; github_login: string; connection_state: Database['public']['Enums']['github_connection_state']; connected_at: string | null; disconnected_at: string | null; last_sync_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; profile_id: string; institution_id: string; github_id: string; github_login: string; connection_state?: Database['public']['Enums']['github_connection_state'] }
        Update: Partial<Database['public']['Tables']['github_accounts']['Insert']>
      }
      repositories: {
        Row: { id: string; project_id: string; installation_id: string | null; github_repo_id: string; owner: string; name: string; full_name: string; is_private: boolean; approval_state: Database['public']['Enums']['repo_approval_state']; approved_by: string | null; approved_at: string | null; decline_reason: string | null; last_sync_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; project_id: string; installation_id?: string | null; github_repo_id: string; owner: string; name: string; full_name: string; is_private?: boolean; approval_state?: Database['public']['Enums']['repo_approval_state'] }
        Update: Partial<Database['public']['Tables']['repositories']['Insert']>
      }
      student_daily_activity: {
        Row: { id: string; profile_id: string; institution_id: string; reporting_date: string; commit_count: number; pr_count: number; issue_count: number; qualifies_streak: boolean; coverage_state: Database['public']['Enums']['coverage_state']; policy_version_id: string | null; computed_at: string }
        Insert: { id?: string; profile_id: string; institution_id: string; reporting_date: string; commit_count?: number; pr_count?: number; issue_count?: number; qualifies_streak?: boolean; coverage_state?: Database['public']['Enums']['coverage_state']; policy_version_id?: string | null }
        Update: Partial<Database['public']['Tables']['student_daily_activity']['Insert']>
      }
      student_streaks: {
        Row: { id: string; profile_id: string; institution_id: string; current_streak: number; longest_streak: number; last_qualifying_date: string | null; policy_version_id: string | null; updated_at: string }
        Insert: { id?: string; profile_id: string; institution_id: string; current_streak?: number; longest_streak?: number; last_qualifying_date?: string | null }
        Update: Partial<Database['public']['Tables']['student_streaks']['Insert']>
      }
      milestone_definitions: {
        Row: { id: string; institution_id: string; threshold: number; label: string; sort_order: number }
        Insert: { id?: string; institution_id: string; threshold: number; label: string; sort_order?: number }
        Update: Partial<Database['public']['Tables']['milestone_definitions']['Insert']>
      }
      milestone_awards: {
        Row: { id: string; profile_id: string; milestone_id: string; awarded_at: string }
        Insert: { id?: string; profile_id: string; milestone_id: string; awarded_at?: string }
        Update: Partial<Database['public']['Tables']['milestone_awards']['Insert']>
      }
      notifications: {
        Row: { id: string; profile_id: string; institution_id: string; title: string; body: string; link_path: string | null; is_read: boolean; created_at: string }
        Insert: { id?: string; profile_id: string; institution_id: string; title: string; body: string; link_path?: string | null; is_read?: boolean }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      sync_jobs: {
        Row: { id: string; institution_id: string; job_type: string; payload: Json; state: Database['public']['Enums']['sync_job_state']; claimed_at: string | null; lease_expires_at: string | null; completed_at: string | null; retry_count: number; max_retries: number; next_retry_at: string | null; error_message: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; institution_id: string; job_type: string; payload?: Json; state?: Database['public']['Enums']['sync_job_state']; max_retries?: number }
        Update: Partial<Database['public']['Tables']['sync_jobs']['Insert']>
      }
      audit_logs: {
        Row: { id: number; institution_id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; created_at: string }
        Insert: { institution_id: string; actor_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json }
        Update: never   // immutable
      }
    }
    Functions: {
      /** Ensures the authenticated user has a profile and a default role. */
      ensure_my_profile: { Args: Record<string, never>; Returns: undefined }
      create_classroom: { Args: { p_name: string; p_course_id: string; p_batch_id: string; p_description?: string; p_enrollment_mode?: Database['public']['Enums']['classroom_enrollment_mode'] }; Returns: string }
      join_classroom: { Args: { p_join_code: string }; Returns: Json }
      publish_classroom_announcement: { Args: { p_classroom_id: string; p_title: string; p_body: string }; Returns: string }
      create_classroom_assignment: { Args: { p_classroom_id: string; p_title: string; p_description: string; p_deadline: string }; Returns: string }
    }
    Enums: {
      user_role: 'student' | 'faculty' | 'admin'
      project_type: 'individual' | 'team'
      assignment_state: 'draft' | 'published' | 'closed'
      assignment_mode: 'individual' | 'team'
      classroom_enrollment_mode: 'join_code' | 'approval' | 'faculty_managed'
      classroom_membership_status: 'active' | 'pending' | 'left' | 'removed'
      submission_state: 'not_started' | 'draft' | 'submitted' | 'needs_revision' | 'reviewed'
      github_connection_state: 'not_connected' | 'authorization_pending' | 'identity_connected' | 'installation_pending' | 'repository_selection_pending' | 'initial_sync' | 'healthy' | 'degraded' | 'disconnected'
      repo_approval_state: 'proposed' | 'approved' | 'declined' | 'disconnected' | 'archived'
      coverage_state: 'healthy' | 'pending_import' | 'stale' | 'disconnected' | 'unavailable'
      sync_job_state: 'pending' | 'claimed' | 'processing' | 'done' | 'failed' | 'dead_letter'
      webhook_processing_state: 'received' | 'processing' | 'processed' | 'failed' | 'dead_letter' | 'ignored'
    }
  }
}
