import { Context, Next } from 'hono';
import { Env, Variables } from '../index';

const PLAN_LIMITS: Record<string, number | null> = {
  free:       10,    // per day — user's explicit decision
  developer:  null,  // unlimited
  team:       null,  // unlimited
  enterprise: null,  // unlimited
};

export async function quotaMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const userId = c.get('userId') as string;
  const db = c.env.DB as D1Database;

  const user = await db.prepare(
    'SELECT plan FROM users WHERE id = ?'
  ).bind(userId).first<{ plan: string }>();

  const plan = user?.plan ?? 'free';
  const limit = PLAN_LIMITS[plan];

  // null limit = unlimited, skip quota check
  if (limit === null) return next();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const quota = await db.prepare(
    'SELECT count FROM scan_quota WHERE user_id = ? AND date = ?'
  ).bind(userId, today).first<{ count: number }>();

  const currentCount = quota?.count ?? 0;

  if (currentCount >= limit) {
    return c.json({
      error: 'daily_quota_exceeded',
      limit,
      used: currentCount,
      resets_at: `${today}T23:59:59Z`,
      upgrade_url: 'https://hexis.dev/pricing'
    }, 429);
  }

  // Increment after successful response using waitUntil
  c.executionCtx.waitUntil(
    db.prepare(`
      INSERT INTO scan_quota (user_id, date, count)
      VALUES (?, ?, 1)
      ON CONFLICT (user_id, date) DO UPDATE SET count = count + 1
    `).bind(userId, today).run()
  );

  return next();
}
