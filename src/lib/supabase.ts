/**
 * Supabase client singleton.
 * Reads credentials from Vite env vars (browser-safe anon key only).
 * Service-role key is NEVER referenced here — that stays server-side.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[DevScope] Supabase credentials not configured. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. ' +
    'Running in demo mode.',
  )
}

export const supabase = createClient<Database>(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnon ?? 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: true,  // let Supabase auto-exchange the PKCE code on /auth/callback
      flowType:          'pkce', // required: generates + stores code_verifier in signInWithOAuth
    },
  },
)

/** True if real credentials are configured */
export const isSupabaseConfigured = !!supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co'
