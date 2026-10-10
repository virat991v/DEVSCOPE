/**
 * Auth context — the Supabase session is authentication; the profile is
 * authorization data. They intentionally have separate states so a profile
 * provisioning failure can never turn a valid session into a login redirect.
 */
import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types'
import { DEMO_PERSONAS } from '@/lib/demo-data'
import { getDemoPersona } from '@/services'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True until the session and, if present, its profile have been resolved. */
  loading: boolean
  /** A profile problem is not an authentication problem. */
  profileError: string | null
  isDemo: boolean
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileError: null,
  isDemo: false,
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

type DbError = { message: string; code?: string | null }

function describeProfileError(error: DbError | null): string {
  if (!error) return 'Your account profile could not be provisioned.'
  return `Your account profile could not be provisioned: ${error.message}`
}

/** Parse the profile row returned by Supabase into the app’s public shape. */
function parseProfileRow(row: unknown): Profile {
  const r = row as {
    id: string; institution_id: string; display_name: string; email: string;
    avatar_initials: string; roll_number: string | null; github_username: string | null;
    role_assignments?: Array<{ role: string }>;
    github_accounts?: Array<{ connection_state: string; last_sync_at: string | null }>;
  }
  const role = r.role_assignments?.[0]?.role ?? 'student'
  const github = r.github_accounts?.[0]

  return {
    id: r.id,
    institutionId: r.institution_id,
    displayName: r.display_name,
    email: r.email,
    role: role as Profile['role'],
    avatarInitials: r.avatar_initials,
    rollNumber: r.roll_number ?? undefined,
    githubUsername: r.github_username ?? undefined,
    githubConnectionState: (github?.connection_state ?? 'not_connected') as Profile['githubConnectionState'],
    lastSyncAt: github?.last_sync_at ?? undefined,
  }
}

async function readProfile(userId: string): Promise<{
  profile: Profile | null
  error: DbError | null
  needsRole: boolean
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, github_accounts(connection_state, last_sync_at)')
    .eq('id', userId)
    .maybeSingle()

  if (error) return { profile: null, error, needsRole: false }
  if (!data) return { profile: null, error: null, needsRole: true }

  // This mirrors public.auth_role(): only active assignments count, and the
  // most recently assigned role wins. A nested relation has no deterministic
  // ordering, which could otherwise redirect a user with role history to an
  // obsolete dashboard.
  const { data: role, error: roleError } = await supabase
    .from('role_assignments')
    .select('role')
    .eq('profile_id', userId)
    .is('revoked_at', null)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (roleError) return { profile: null, error: roleError, needsRole: false }

  const profileRow = data as unknown as Record<string, unknown>
  return {
    profile: parseProfileRow({ ...profileRow, role_assignments: role ? [role] : [] }),
    error: null,
    needsRole: !role,
  }
}

/**
 * Read a profile and recover a genuinely missing one through the database.
 *
 * The recovery RPC is SECURITY DEFINER and always assigns a new profile the
 * student role. It therefore cannot overwrite a faculty/admin assignment or
 * turn client-controlled auth metadata into a privileged role.
 */
async function fetchOrRecoverProfile(user: User): Promise<{ profile: Profile | null; error: string | null }> {
  const existing = await readProfile(user.id)
  if (existing.profile && !existing.needsRole) return { profile: existing.profile, error: null }
  if (existing.error) return { profile: null, error: describeProfileError(existing.error) }

  const { error: recoveryError } = await supabase.rpc('ensure_my_profile')
  if (recoveryError) return { profile: null, error: describeProfileError(recoveryError) }

  const recovered = await readProfile(user.id)
  if (recovered.profile) return { profile: recovered.profile, error: null }

  return { profile: null, error: describeProfileError(recovered.error) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    profileError: null,
    isDemo: !isSupabaseConfigured,
  })
  const requestVersion = useRef(0)

  useEffect(() => {
    let active = true

    if (!isSupabaseConfigured) {
      const persona = getDemoPersona()
      setState({
        session: null,
        user: null,
        profile: DEMO_PERSONAS[persona],
        loading: false,
        profileError: null,
        isDemo: true,
      })
      return () => { active = false }
    }

    const applySession = async (session: Session | null) => {
      const version = ++requestVersion.current

      if (!session?.user) {
        if (active && version === requestVersion.current) {
          setState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            profileError: null,
            isDemo: false,
          })
        }
        return
      }

      // From this point on the user is authenticated. Do not discard that
      // fact while the authorization profile is being loaded or recovered.
      setState(previous => ({
        session,
        user: session.user,
        profile: previous.user?.id === session.user.id ? previous.profile : null,
        loading: true,
        profileError: null,
        isDemo: false,
      }))

      const result = await fetchOrRecoverProfile(session.user)
      if (!active || version !== requestVersion.current) return

      setState({
        session,
        user: session.user,
        profile: result.profile,
        loading: false,
        profileError: result.error,
        isDemo: false,
      })
    }

    // Subscribe before reading storage. This receives the eventual SIGNED_IN
    // event for PKCE callbacks even when getSession() is initially null.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'SIGNED_OUT') {
        void applySession(null)
        return
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        setState(previous => previous.user?.id === session.user.id
          ? { ...previous, session }
          : previous)
        return
      }

      if (session) void applySession(session)
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void applySession(session)
    })

    return () => {
      active = false
      requestVersion.current += 1
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

/** Sign out and let the auth-state subscription clear the context. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
