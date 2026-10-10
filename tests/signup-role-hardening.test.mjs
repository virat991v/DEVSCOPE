import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const migrationUrl = new URL('../supabase/migrations/017_harden_signup_role_assignment.sql', import.meta.url)

async function migrationSource() {
  return readFile(fileURLToPath(migrationUrl), 'utf8')
}

test('signup trigger assigns only the unprivileged student role', async () => {
  const sql = await migrationSource()

  assert.match(
    sql,
    /values\s*\(new\.id,\s*_institution_id,\s*'student'::public\.user_role\)/i,
  )
  assert.doesNotMatch(sql, /raw_user_meta_data\s*->>\s*'role'/i)
  assert.doesNotMatch(sql, /\b_role\s*:=/i)
})

test('signup trigger remains idempotent and is not directly executable by clients', async () => {
  const sql = await migrationSource()

  assert.match(sql, /on conflict\s*\(profile_id,\s*institution_id,\s*role\)\s*do nothing/i)
  assert.match(sql, /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated/i)
})
