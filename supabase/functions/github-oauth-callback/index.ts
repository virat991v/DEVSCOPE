/**
 * Edge Function: github-oauth-callback
 *
 * Handles the GitHub OAuth callback (server-side token exchange).
 * The frontend GitHubCallbackPage POSTs { code, state } here — the code
 * never hits the browser directly, the client secret never leaves this function.
 *
 * Flow:
 *   1. Validate + consume the one-time state token (prevents CSRF / replay).
 *   2. Exchange the authorization code for a GitHub user access token.
 *   3. Fetch the verified GitHub user identity.
 *   4. Enforce uniqueness: one GitHub account per student per institution.
 *   5. Store the access token securely in github_access_tokens (RLS blocks client reads).
 *   6. Upsert the public github_accounts row (no token, just identity + state).
 *   7. Return { ok: true, githubLogin, nextStep } to the frontend.
 *
 * Security:
 *   - GITHUB_CLIENT_SECRET is a Supabase secret — never in VITE_ vars or browser.
 *   - Access token is stored in github_access_tokens which has deny-all RLS.
 *   - The frontend receives only githubLogin (display attribute), never the token.
 *   - CORS restricted to ALLOWED_ORIGIN.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLIENT_ID        = Deno.env.get('GITHUB_CLIENT_ID')!
const CLIENT_SECRET    = Deno.env.get('GITHUB_CLIENT_SECRET')!  // NEVER exposed to browser
const ALLOWED_ORIGIN   = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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

  // ── Parse body ────────────────────────────────────────────────────────────
  let code: string, state: string
  try {
    const body = await req.json()
    code  = body.code
    state = body.state
    if (!code || !state) throw new Error('missing fields')
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400, origin)
  }

  // ── 1. Validate + consume state token (prevents CSRF and replay) ──────────
  const { data: profileId, error: stateErr } = await sb.rpc('consume_github_oauth_state', {
    p_state_token: state,
  })
  if (stateErr || !profileId) {
    return jsonResponse({
      error: 'invalid_state',
      detail: 'State token invalid, expired, or already used.',
    }, 400, origin)
  }

  // ── 2. Exchange code for GitHub user access token ─────────────────────────
  // GITHUB_CLIENT_SECRET is a Supabase secret — it never leaves this server function.
  let accessToken: string, tokenScope: string
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    })
    if (!tokenRes.ok) throw new Error(`token exchange HTTP ${tokenRes.status}`)
    const tokenBody = await tokenRes.json()
    if (tokenBody.error) throw new Error(tokenBody.error_description ?? tokenBody.error)
    accessToken = tokenBody.access_token
    tokenScope  = tokenBody.scope ?? ''
  } catch (err) {
    return jsonResponse({ error: 'token_exchange_failed', detail: String(err) }, 502, origin)
  }

  // ── 3. Fetch verified GitHub user identity ────────────────────────────────
  let githubId: string, githubLogin: string, githubAvatarUrl: string, githubHtmlUrl: string
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization':        `Bearer ${accessToken}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent':           'DevScope/1.0',
      },
    })
    if (!userRes.ok) throw new Error(`GitHub /user HTTP ${userRes.status}`)
    const user  = await userRes.json()
    githubId     = String(user.id)   // text to avoid JS int precision loss
    githubLogin  = user.login
    githubAvatarUrl = user.avatar_url ?? ''
    githubHtmlUrl   = user.html_url ?? `https://github.com/${user.login}`
  } catch (err) {
    return jsonResponse({ error: 'github_user_fetch_failed', detail: String(err) }, 502, origin)
  }

  // ── 4. Fetch profile + institution_id ─────────────────────────────────────
  // Profiles.id = auth.uid() in this schema — no separate auth_user_id column.
  const { data: profileRow, error: profileErr } = await sb
    .from('profiles')
    .select('id, institution_id')
    .eq('id', profileId as string)
    .single()

  if (profileErr || !profileRow) {
    return jsonResponse({ error: 'profile_not_found' }, 404, origin)
  }

  const institutionId = (profileRow as unknown as { id: string; institution_id: string }).institution_id
  if (!institutionId) {
    return jsonResponse({ error: 'no_institution' }, 422, origin)
  }

  // ── 5. Enforce uniqueness: one GitHub identity per institution ────────────
  const { data: existingOther } = await sb
    .from('github_accounts')
    .select('id, profile_id')
    .eq('institution_id', institutionId)
    .eq('github_id', githubId)
    .neq('profile_id', profileId as string)
    .maybeSingle()

  if (existingOther) {
    return jsonResponse({
      error: 'github_account_already_linked',
      detail: 'This GitHub account is already linked to another student in your institution.',
    }, 409, origin)
  }

  // ── 6. Store access token securely (RLS blocks all client reads) ──────────
  const { error: tokenErr } = await sb
    .from('github_access_tokens')
    .upsert({
      profile_id:     profileId,
      institution_id: institutionId,
      github_id:      githubId,
      access_token:   accessToken,
      token_scope:    tokenScope,
      rotated_at:     new Date().toISOString(),
    }, { onConflict: 'profile_id,institution_id' })

  if (tokenErr) {
    return jsonResponse({ error: 'token_storage_failed', detail: tokenErr.message }, 500, origin)
  }

  // ── 7. Upsert public github_accounts row (identity only, no token) ────────
  const { error: upsertErr } = await sb
    .from('github_accounts')
    .upsert({
      profile_id:       profileId,
      institution_id:   institutionId,
      github_id:        githubId,
      github_login:     githubLogin,
      connection_state: 'identity_connected',
      connected_at:     new Date().toISOString(),
      disconnected_at:  null,
    }, { onConflict: 'institution_id,profile_id' })

  if (upsertErr) {
    return jsonResponse({ error: 'db_upsert_failed', detail: upsertErr.message }, 500, origin)
  }

  // ── 8. Update github_username on profile for quick display ───────────────
  await sb
    .from('profiles')
    .update({ github_username: githubLogin })
    .eq('id', profileId as string)

  return jsonResponse({
    ok: true,
    githubLogin,
    githubAvatarUrl,
    githubHtmlUrl,
    nextStep: 'select_repositories',
  }, 200, origin)
})
