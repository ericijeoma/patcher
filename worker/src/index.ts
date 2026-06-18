import { Context,Next, Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { quotaMiddleware } from './middleware/quota';
import {rateLimitMiddleware} from './middleware/rate-limit';
import { generateApiKey, hashKey } from './lib/keys';
import { createAuth } from './lib/auth';
import { runTriage, generateShareId } from './lib/triage';
import { renderReportPage } from './lib/template';


export interface Env {
  DEVSTRAL_API_KEY: string;
  ASSETS: Fetcher;
  DB: D1Database;
  AUTH_KV: KVNamespace;         // Required for Better Auth session caching
  BETTER_AUTH_SECRET: string;   // Required for Better Auth
  GITHUB_CLIENT_ID: string;     // Required for Better Auth
  GITHUB_CLIENT_SECRET: string; // Required for Better Auth
  APP_URL: string;              // Required for Stripe redirects and Auth
  ADMIN_USER_ID: string;
  BETTER_AUTH_API_KEY: string;
  PAYSTACK_PUBLIC_URL: string;
  RATE_LIMITER: any;
}

// 🛡️ UNIFIED AUTH MIDDLEWARE: Supports both CLI API Keys and Web Sessions
const unifiedAuthMiddleware = async (
  c: Context<{ Bindings: Env; Variables: any }>, 
  next: Next
) => {
  const authHeader = c.req.header('Authorization');
  
  // 1. Check for a CLI API Key first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.replace('Bearer ', '').trim();
    
    // Hash the incoming key to match your database storage security
    const keyHash = await hashKey(rawKey); 
    
    const record = await c.env.DB.prepare(
      'SELECT user_id FROM api_keys WHERE key_hash = ?'
    ).bind(keyHash).first<{ user_id: string }>();

    if (record) {
      // Valid API Key found! Set the user ID for the quota middleware and database logger
      c.set('userId', record.user_id);
      // Explicitly set the authMethod so downstream middlewares know how this request was authenticated
      c.set('authMethod', 'api_key');
      
      // Update last_used_at (fire and forget)
      c.executionCtx.waitUntil(
        c.env.DB.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ?')
        .bind(keyHash).run()
      );
      
      return next();
    }
  }

  // 2. Fallback to Better Auth (for Web Dashboard users)
  return authMiddleware(c, next);
};

const PLAN_LIMITS: Record<string, number | null> = {
  free:       10,    // per day — user's explicit decision
  developer:  null,  // unlimited
  team:       null,  // unlimited
  enterprise: null,  // unlimited
};

export type Variables = {
  userId: string;
  authMethod: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS preflight
app.options('*', (c) => {
  return new Response(null, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Filename',
    } 
  });
});

// Public route - download WASM engine (no auth required)
app.get('/v1/engine', async (c) => {
  const assetUrl = new URL('/engine.wasm', c.req.url).toString();
  const assetResponse = await c.env.ASSETS.fetch(new Request(assetUrl));
  if (!assetResponse.ok) {
    return c.json({ error: 'WASM engine not found.' }, 404);
  }
  return new Response(assetResponse.body, {
    headers: {
      'Content-Type': 'application/wasm',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// Public route - download WASM JS bindings (no auth required)
app.get('/v1/engine.js', async (c) => {
  const assetUrl = new URL('/engine.js', c.req.url).toString();
  const assetResponse = await c.env.ASSETS.fetch(new Request(assetUrl));
  if (!assetResponse.ok) {
    return c.json({ error: 'WASM JS bindings not found.' }, 404);
  }
  return new Response(assetResponse.body, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// Protected route - triage analysis (requires auth and quota)
app.post('/v1/analyze/triage', unifiedAuthMiddleware, rateLimitMiddleware, quotaMiddleware, async (c) => {
  try {
    const contentType = c.req.header('Content-Type') ?? '';
    if (!contentType.includes('application/json')) {
      return c.json({ error: 'Content-Type must be application/json.' }, 415);
    }

    const telemetryJsonString = await c.req.text();
    let telemetryPayload: any;
    
    try { 
      telemetryPayload = JSON.parse(telemetryJsonString); 
    } catch {
      return c.json({ error: 'Invalid JSON.' }, 400);
    }

    // Execute the Hybrid Orchestrator
    const { report, tokens_used, cached } = await runTriage(telemetryPayload, c.env);
    
    const userId = c.get('userId') as string;
    const filename = c.req.header('X-Filename') ?? 'unknown';
    const shareId = generateShareId();
    const isPublic = 1; // Set to 1 for the MVP so the CLI link works instantly

    // Log the scan to the database
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        'INSERT INTO scans (id, user_id, filename, status, tokens_used, share_id, report_json, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        userId,
        filename,
        report.risk_level, 
        tokens_used,
        shareId,
        JSON.stringify(report),
        isPublic
      ).run()
    );

    // Calculate the base URL dynamically for the CLI output
    const baseUrl = c.env.APP_URL || new URL(c.req.url).origin;
    const shareUrl = `${baseUrl}/v1/report/${shareId}`;

    // Return the report, the cache headers, and the new share_url
    return new Response(JSON.stringify({ cached, shareUrl, share_id: shareId, ...report }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': cached ? 'HIT' : 'MISS',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});


// Public route - Shareable Report Viewer (Content Negotiation)
app.get('/v1/report/:shareId', async (c) => {
  const shareId = c.req.param('shareId');

  const row = await c.env.DB.prepare(`
    SELECT report_json, filename, created_at 
    FROM scans 
    WHERE share_id = ? AND is_public = 1
  `).bind(shareId).first<{ report_json: string; filename: string; created_at: number }>();

  if (!row) {
    return c.text('Report not found or is private.', 404);
  }

  const report = JSON.parse(row.report_json);
  const acceptHeader = c.req.header('Accept') ?? '';

  // Content Negotiation: If a browser or Slack bot asks for HTML, render the page.
  if (acceptHeader.includes('text/html')) {
    const html = renderReportPage(report, row.filename, shareId);
    return c.html(html, 200, { 'X-Robots-Tag': 'noindex, nofollow' });
  }

  // Otherwise, return raw JSON for API consumers and the CLI.
  return c.json({
    filename: row.filename,
    created_at: row.created_at,
    report: report
  });
});

// API Key Management Routes
app.post('/v1/keys', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const { name = 'Default key' } = await c.req.json<{ name?: string }>();

  const { raw, prefix } = generateApiKey();
  const keyHash = await hashKey(raw);

  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    keyHash,
    prefix,
    name
  ).run();

  // This is the only time the raw key is returned. It is not stored. Cannot be recovered.
  return c.json({
    key: raw,
    prefix,
    name,
    created_at: new Date().toISOString()
  });
});

app.get('/v1/keys', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const { results } = await c.env.DB.prepare(`
    SELECT id, key_prefix as prefix, name, created_at, last_used_at
    FROM api_keys
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(userId).all();

  return c.json(results);
});

app.delete('/v1/keys/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const keyId = c.req.param('id');

  const { success } = await c.env.DB.prepare(`
    DELETE FROM api_keys
    WHERE id = ? AND user_id = ?
  `).bind(keyId, userId).run();

  if (!success) {
    return c.json({ error: 'Key not found or not owned by user' }, 404);
  }

  return c.json({ success: true });
});

app.get('/v1/usage', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  // Get user plan
  const user = await c.env.DB.prepare(`
    SELECT plan FROM user WHERE id = ?
  `).bind(userId).first<{ plan: string }>();

  const plan = user?.plan ?? 'free';

  // Get today's scan count
  const today = new Date().toISOString().slice(0, 10);
  const quota = await c.env.DB.prepare(`
    SELECT count FROM scan_quota WHERE user_id = ? AND date = ?
  `).bind(userId, today).first<{ count: number }>();
  
  
  const scansToday = quota?.count ?? 0;

  // Get total scans
  const totalResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM scans WHERE user_id = ?
  `).bind(userId).first<{ total: number }>();

  const scansTotal = totalResult?.total ?? 0;

  return c.json({
    plan,
    scans_today: scansToday,
    daily_limit: PLAN_LIMITS[plan],
    scans_total: scansTotal,
  });
});

// Better Auth routes
app.all('/api/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Stripe Checkout
app.post('/v1/stripe/create-checkout', authMiddleware, async (c) => {
  const stripe = c.env.PAYSTACK_PUBLIC_URL
  const { plan } = await c.req.json<{ plan: 'developer' | 'team' | 'enterprise' }>();

  const priceIds = {
    developer: c.env.PAYSTACK_PUBLIC_URL,
    team: c.env.PAYSTACK_PUBLIC_URL,
    enterprise: c.env.PAYSTACK_PUBLIC_URL,
  };

  const session = ({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceIds[plan], quantity: 1 }],
    success_url: `${c.env.APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${c.env.APP_URL}/pricing`,
    client_reference_id: c.get('userId'),
    metadata: { user_id: c.get('userId'), plan },
  });

  return c.json({ url: session });
});

// Stripe Webhook
app.post('/v1/stripe/webhook', async (c) => {
  const stripe = c.env.PAYSTACK_PUBLIC_URL;
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!sig) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  let event;

  try {
    event = (c.env.PAYSTACK_PUBLIC_URL);
  } catch (err) {
    return c.json({ error: 'Invalid stripe signature' }, 400);
  }

  // Handle events
  switch (event) {
    case 'checkout.session.completed': {
      const session = event;
      await c.env.DB.prepare(`
        UPDATE user SET
          plan = ?,
          stripe_customer_id = ?,
          stripe_subscription_id = ?
        WHERE id = ?
      `).bind(
        session
      ).run();
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event;
      if (subscription) {
        await c.env.DB.prepare(`
          UPDATE user SET plan = ?
          WHERE stripe_customer_id = ?
        `).bind(
          subscription
        ).run();
      } else if (subscription) {
        console.log('Subscription past due for customer:', subscription);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event;
      await c.env.DB.prepare(`
        UPDATE user SET plan = 'free'
        WHERE stripe_customer_id = ?
      `).bind(subscription).run();
      break;
    }

    default:
      console.log(`Unhandled event type: ${event}`);
  }

  return c.json({ received: true });
});

// Admin Stats
app.get('/v1/admin/stats', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  // Check if user is admin
  if (userId !== c.env.ADMIN_USER_ID) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  // Get user breakdown by plan
  const { results: userPlans } = await c.env.DB.prepare(`
    SELECT plan, COUNT(*) as count FROM user GROUP BY plan
  `).all();

  // Get scans today
 // Get scans today
  const today = new Date().toISOString().slice(0, 10);
  const scansQuery = await c.env.DB.prepare(`
    SELECT COUNT(*) as total_scans FROM scans
    WHERE date(created_at, 'unixepoch') = date('now')
  `).first<{ total_scans: number }>();
  
  const total_scans = scansQuery?.total_scans ?? 0;

  // Get scans by status
  const { results: scanStatuses } = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM scans GROUP BY status
  `).all();

  return c.json({
    user_plans: userPlans,
    scans_today: total_scans || 0,
    scan_statuses: scanStatuses,
  });
});

// Fallback route
app.all('*', (c) => {
  return c.json({ service: 'hexis', status: 'active' });
});

export default app;
