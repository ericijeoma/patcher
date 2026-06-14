export function generateApiKey(): { raw: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  const raw = `hxs_live_${hex}`;
  return { raw, prefix: raw.slice(0, 16) };
}

export async function hashKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

export async function validateApiKey(
  raw: string,
  db: D1Database,
  ctx: ExecutionContext // Added to prevent blocking thread execution
): Promise<{ valid: boolean; userId?: string }> {
  const hash = await hashKey(raw);
  const row = await db.prepare(
    'SELECT user_id FROM api_keys WHERE key_hash = ?'
  ).bind(hash).first<{ user_id: string }>();

  if (!row) return { valid: false };

  // Pushed to background execution context to keep edge latency near zero
  ctx.waitUntil(
    db.prepare('UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?')
      .bind(hash).run()
  );

  return { valid: true, userId: row.user_id };
}
