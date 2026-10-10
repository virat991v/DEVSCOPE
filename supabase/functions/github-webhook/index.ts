/**
 * Edge Function: github-webhook
 *
 * Receives GitHub App webhook events.
 * Security contract:
 *   1. Verifies HMAC-SHA256 signature against the original raw request bytes
 *      (GitHub documents this requirement strictly).
 *   2. Deduplicates by X-GitHub-Delivery (stored in webhook_receipts.delivery_id).
 *   3. Responds within GitHub's 10-second window — all processing is async.
 *   4. Inserts a durable webhook_receipts row; does NOT process inline.
 *   5. Queues a sync_jobs row for the async worker.
 *
 * Supported events (others are acknowledged + ignored):
 *   push, pull_request, issues, installation, installation_repositories
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET    = Deno.env.get('GITHUB_WEBHOOK_SECRET')!  // Never in client bundle

const SUPPORTED_EVENTS = new Set(['push', 'pull_request', 'issues', 'installation', 'installation_repositories'])

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/** Verify HMAC-SHA256 signature from GitHub against the raw body bytes. */
async function verifySignature(secret: string, body: Uint8Array, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader?.startsWith('sha256=')) return false
  const expected = sigHeader.slice('sha256='.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, body)
  const actual = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Constant-time compare
  if (expected.length !== actual.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const deliveryId   = req.headers.get('x-github-delivery')
  const eventType    = req.headers.get('x-github-event')
  const sigHeader    = req.headers.get('x-hub-signature-256')

  if (!deliveryId || !eventType) {
    return new Response(JSON.stringify({ error: 'missing_headers' }), { status: 400 })
  }

  // Read raw bytes before parsing — signature must be over the original bytes
  const rawBytes = new Uint8Array(await req.arrayBuffer())

  // Verify signature
  const valid = await verifySignature(WEBHOOK_SECRET, rawBytes, sigHeader)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401 })
  }

  // Parse payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBytes))
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 })
  }

  const action         = payload.action as string | undefined
  const installationId = (payload.installation as Record<string, unknown>)?.id as number | undefined

  // Deduplicate: if this delivery_id already exists, acknowledge silently
  const { data: existing } = await sb
    .from('webhook_receipts')
    .select('id, processing_state')
    .eq('delivery_id', deliveryId)
    .maybeSingle()

  if (existing) {
    // Already received — safe to acknowledge without re-queuing
    return new Response(JSON.stringify({ ok: true, status: 'already_received' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  // Unsupported event — record as ignored, do not queue
  if (!SUPPORTED_EVENTS.has(eventType)) {
    await sb.from('webhook_receipts').insert({
      delivery_id:      deliveryId,
      installation_id:  installationId ? String(installationId) : null,
      event_type:       eventType,
      action:           action ?? null,
      payload_size:     rawBytes.byteLength,
      processing_state: 'ignored',
      processed_at:     new Date().toISOString(),
    })
    return new Response(JSON.stringify({ ok: true, status: 'ignored' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  // Insert durable receipt row (state=received)
  const { data: receipt, error: receiptErr } = await sb
    .from('webhook_receipts')
    .insert({
      delivery_id:      deliveryId,
      installation_id:  installationId ? String(installationId) : null,
      event_type:       eventType,
      action:           action ?? null,
      payload_size:     rawBytes.byteLength,
      processing_state: 'received',
    })
    .select('id')
    .single()

  if (receiptErr) {
    // Critical: if we can't store receipt we cannot guarantee idempotency
    console.error('[webhook] receipt insert failed:', receiptErr.message)
    return new Response(JSON.stringify({ error: 'receipt_insert_failed' }), { status: 500 })
  }

  // Determine institution_id from the installation
  let institutionId: string | null = null
  if (installationId) {
    const { data: inst } = await sb
      .from('github_installations')
      .select('institution_id')
      .eq('installation_id', String(installationId))
      .maybeSingle()
    institutionId = inst?.institution_id ?? null
  }

  // Queue async processing job (receipt_id embedded in payload for traceability)
  if (institutionId) {
    await sb.from('sync_jobs').insert({
      institution_id: institutionId,
      job_type:       `webhook_${eventType}`,
      payload: {
        receipt_id:   receipt.id,
        delivery_id:  deliveryId,
        event_type:   eventType,
        action:       action ?? null,
        installation_id: installationId ? String(installationId) : null,
        // Store minimal payload summary — not full payload (size/privacy)
        ref:          payload.ref ?? null,
        repository:   (payload.repository as Record<string, unknown>)?.full_name ?? null,
      },
    })
  }

  return new Response(JSON.stringify({ ok: true, status: 'queued', receipt_id: receipt.id }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })
})
