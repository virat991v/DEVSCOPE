/**
 * Edge Function: github-start-oauth
 *
 * Initiates the GitHub OAuth App flow for connecting a student's GitHub account.
 * Called by the authenticated frontend to get a signed redirect URL.
 *
 * Flow:
 *   1. Frontend POSTs with the user's Supabase JWT (Authorization: Bearer <jwt>).
 *   2. We verify the JWT via getUser().
 *   3. We look up the profile by auth.uid() (profiles.id = auth.uid()).
 *   4. We call create_github_oauth_state() — a SECURITY DEFINER RPC that generates
 *      a cryptographically random, expiring, one-time state token bound to this user.
 *   5. We return the GitHub authorization URL containing that state token.
 *
 * The client redirects the user to this URL. GitHub redirects to
 * GITHUB_OAUTH_CALLBACK_URL (must match the GitHub OAuth App settings exactly).
 *
 * Security:
 *   - GITHUB_APP_CLIENT_ID is safe to expose in the URL; it does not authorize anything alone.
 *   - GITHUB_APP_CLIENT_SECRET is NEVER used here — only in github-oauth-callback.
 *   - Service-role key used server-side only; never in browser bundle.
 *   - State token prevents CSRF.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
// GitHub OAuth App client ID (safe to use in URLs, not a secret)
const CLIENT_ID        = Deno.env.get('GITHUB_CLIENT_ID') ?? ''
// The callback URL registered in GitHub OAuth App settings (must match exactly)
const CALLBACK_URL     = Deno.env.get('GITHUB_OAUTH_CALLBACK_URL') ?? ''
const ALLOWED_ORIGIN   = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const sbService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN === '*' ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '*'

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, origin)
  }

  if (!CLIENT_ID || !CALLBACK_URL) {
    return jsonResponse({
      error: 'github_oauth_not_configured',
      detail: 'Set GITHUB_CLIENT_ID and GITHUB_OAUTH_CALLBACK_URL as Supabase Edge Function secrets.',
    }, 503, origin)
  }

  // ── 1. Verify caller's Supabase JWT ──────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401, origin)
  }
  const jwt = authHeader.slice('Bearer '.length)

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error: authErr } = await sbUser.auth.getUser()
  if (authErr || !user) {
    return jsonResponse({ error: 'invalid_token' }, 401, origin)
  }

  // ── 2. Fetch profile (profiles.id = auth.uid() in this schema) ───────────
  // The profiles table uses id = auth.uid() as the primary key directly.
  const { data: profile, error: profileErr } = await sbService
    .from('profiles')
    .select('id, institution_id')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return jsonResponse({ error: 'profile_not_found' }, 404, origin)
  }

  const institutionId = (profile as unknown as { id: string; institution_id: string }).institution_id
  if (!institutionId) {
    return jsonResponse({ error: 'no_institution' }, 422, origin)
  }

  const profileId = (profile as unknown as { id: string }).id

  // ── 3. Create one-time CSRF-safe state token ──────────────────────────────
  const { data: stateToken, error: stateErr } = await sbService.rpc('create_github_oauth_state', {
    p_profile_id:     profileId,
    p_institution_id: institutionId,
  })
  if (stateErr || !stateToken) {
    return jsonResponse({ error: 'state_creation_failed', detail: stateErr?.message }, 500, origin)
  }

  // ── 4. Build GitHub OAuth authorization URL ───────────────────────────────
  // Scopes: read:user for profile identity, repo for repository access.
  // We request 'repo' to cover private repositories; for public-only a later
  // institution policy can restrict which repos are approved.
  const params = new URLSearchParams({
    client_id:    CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    state:        stateToken as string,
    scope:        'read:user user:email repo',
  })
  const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

  return jsonResponse({ ok: true, url: githubUrl }, 200, origin)
})
