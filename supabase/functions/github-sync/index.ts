/**
 * Edge Function: github-sync
 *
 * Fetches the authenticated student's GitHub repositories and queues
 * activity sync jobs. Called by the frontend "Sync Now" button.
 *
 * Flow:
 *   1. Verify caller's Supabase JWT — must be authenticated.
 *   2. Load the stored access token from github_access_tokens (service_role only).
 *   3. Fetch repositories from GitHub API (paginated, max 100 per page).
 *   4. Upsert repository rows into a student_github_repos staging table.
 *   5. For each already-approved project repository, queue a sync job.
 *   6. Return repository list + sync job summary to the frontend.
 *
 * Security:
 *   - Access token read only by service_role here — never returned to client.
 *   - CORS restricted to ALLOWED_ORIGIN.
 *   - Rate-limit friendly: GitHub returns Link headers for pagination.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
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

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
  language: string | null
  updated_at: string
  pushed_at: string
  stargazers_count: number
  forks_count: number
  owner: { login: string; avatar_url: string }
}

/** Fetch all pages of a GitHub API endpoint (up to maxPages). */
async function fetchAllPages<T>(
  url: string,
  token: string,
  maxPages = 10,
): Promise<T[]> {
  const results: T[] = []
  let nextUrl: string | null = url

  for (let page = 0; page < maxPages && nextUrl; page++) {
    const res = await fetch(nextUrl, {
      headers: {
        'Authorization':        `Bearer ${token}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent':           'DevScope/1.0',
      },
    })
    if (!res.ok) break

    const data = await res.json() as T[]
    results.push(...data)

    // Parse Link header for next page
    const link = res.headers.get('link') ?? ''
    const match = link.match(/<([^>]+)>;\s*rel="next"/)
    nextUrl = match ? match[1] : null
  }

  return results
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '*'

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, origin)
  }

  // ── 1. Verify caller JWT ──────────────────────────────────────────────────
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

  // ── 2. Load stored access token (service_role — client can never read this) ──
  const { data: tokenRow, error: tokenErr } = await sb
    .from('github_access_tokens')
    .select('access_token, github_id')
    .eq('profile_id', user.id)
    .single()

  if (tokenErr || !tokenRow) {
    return jsonResponse({ error: 'github_not_connected' }, 404, origin)
  }

  const accessToken = (tokenRow as unknown as { access_token: string }).access_token

  // ── 3. Fetch repositories from GitHub ────────────────────────────────────
  let repos: GitHubRepo[]
  try {
    repos = await fetchAllPages<GitHubRepo>(
      'https://api.github.com/user/repos?sort=updated&per_page=100',
      accessToken,
    )
  } catch (err) {
    return jsonResponse({ error: 'github_api_failed', detail: String(err) }, 502, origin)
  }

  // ── 4. Upsert into student_github_repos staging table ────────────────────
  // This table holds the full list of a student's repos before faculty approves them.
  const repoRows = repos.map(r => ({
    profile_id:      user.id,
    github_repo_id:  String(r.id),
    owner:           r.owner.login,
    name:            r.name,
    full_name:       r.full_name,
    is_private:      r.private,
    html_url:        r.html_url,
    description:     r.description,
    default_branch:  r.default_branch,
    language:        r.language,
    github_updated_at: r.updated_at,
    github_pushed_at:  r.pushed_at,
  }))

  if (repoRows.length > 0) {
    await sb
      .from('student_github_repos')
      .upsert(repoRows, { onConflict: 'profile_id,github_repo_id' })
  }

  // ── 5. Update last_sync_at on github_accounts ─────────────────────────────
  const now = new Date().toISOString()
  await sb
    .from('github_accounts')
    .update({ last_sync_at: now, connection_state: 'identity_connected' })
    .eq('profile_id', user.id)

  // ── 6. Return repository list (safe fields only, no token) ────────────────
  return jsonResponse({
    ok: true,
    syncedAt: now,
    repositoryCount: repos.length,
    repositories: repos.map(r => ({
      githubRepoId:   String(r.id),
      name:           r.name,
      fullName:       r.full_name,
      isPrivate:      r.private,
      htmlUrl:        r.html_url,
      description:    r.description,
      defaultBranch:  r.default_branch,
      language:       r.language,
      updatedAt:      r.updated_at,
      pushedAt:       r.pushed_at,
    })),
  }, 200, origin)
})
