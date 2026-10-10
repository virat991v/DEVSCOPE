import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const migrationUrl = new URL('../supabase/migrations/018_classroom_core.sql', import.meta.url)

async function migrationSource() {
  return readFile(fileURLToPath(migrationUrl), 'utf8')
}

test('classroom migration models faculty, student, stream, and assignment relationships', async () => {
  const sql = await migrationSource()

  for (const table of ['classrooms', 'classroom_faculty', 'classroom_memberships', 'announcements']) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`, 'i'))
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
  }
  assert.match(sql, /add column if not exists classroom_id uuid references public\.classrooms/i)
})

test('classroom commands enforce membership and publish persistent notifications', async () => {
  const sql = await migrationSource()

  assert.match(sql, /create or replace function public\.join_classroom\(p_join_code text\)/i)
  assert.match(sql, /not public\.auth_student_in_batch\(v_classroom\.batch_id\)/i)
  assert.match(sql, /create or replace function public\.publish_classroom_announcement/i)
  assert.match(sql, /create or replace function public\.create_classroom_assignment/i)
  assert.match(sql, /insert into public\.notifications/i)
  assert.match(sql, /alter publication supabase_realtime add table public\.announcements/i)
})

test('classroom policies do not permit direct client-side writes', async () => {
  const sql = await migrationSource()

  assert.doesNotMatch(sql, /create policy "classrooms:[^"]*" on public\.classrooms\s*for\s+(insert|update|delete|all)/i)
  assert.doesNotMatch(sql, /create policy "announcements:[^"]*" on public\.announcements\s*for\s+(insert|update|delete|all)/i)
  assert.match(sql, /grant execute on function public\.create_classroom/i)
  assert.match(sql, /grant execute on function public\.join_classroom/i)
})
