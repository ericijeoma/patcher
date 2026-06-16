import { Context,Next, Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { quotaMiddleware } from './middleware/quota';
import { generateApiKey, hashKey } from './lib/keys';
import { createAuth } from './lib/auth';
import Stripe from 'stripe';
import { BinaryTelemetryPayload } from '../../shared/telemetry';


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

async function triageWithDevstral(telemetryJsonString: string, apiKey: string): Promise<Response> {
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'DEVSTRAL_API_KEY is not configured on this Worker.' }),
      { status: 500, headers: corsJsonHeaders() }
    );
  }

  const devstralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'devstral-medium-latest',
      messages: [
        {
          role: 'system',
          content: `You are an elite Security AI Orchestrator.
Analyze the following WASM structural telemetry JSON from a target binary.
Identify structural failure mechanisms and output strict, actionable remediation strategies.
Do NOT output exploit payloads.
Return the analysis strictly as a JSON object containing:
'status', 'root_cause_mechanism', and 'mitigation_strategy'.`,
        },
        {
          role: 'user',
          content: telemetryJsonString,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const triageResult = await devstralResponse.json();
  return new Response(JSON.stringify(triageResult), { headers: corsJsonHeaders() });
}

function corsJsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

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
  return new Response(null, { headers: corsJsonHeaders() });
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
app.post('/v1/analyze/triage', unifiedAuthMiddleware, quotaMiddleware, async (c) => {
  try {
    const contentType = c.req.header('Content-Type') ?? '';
    if (!contentType.includes('application/json')) {
      return c.json({ error: 'Content-Type must be application/json.' }, 415);
    }

    const telemetryJsonString = await c.req.text();
    try { JSON.parse(telemetryJsonString); } catch {
      return c.json({ error: 'Invalid JSON.' }, 400);
    }

    // Type-safe casting of telemetry payload
    const telemetryPayload: BinaryTelemetryPayload = JSON.parse(telemetryJsonString);

    const resultResponse = await triageWithDevstral(telemetryJsonString, c.env.DEVSTRAL_API_KEY);
    const result = (await resultResponse.json()) as {
                        id: string;
                        choices: { message: { content: string } }[];
                        usage?: { completion_tokens: number };
                      };

    // Add scan logging after successful triage
    const userId = c.get('userId') as string;
    const inner = JSON.parse(result.choices[0].message.content);

    // Log scan to scans table (fire and forget)
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        'INSERT INTO scans (id, user_id, filename, status, tokens_used) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        result.id,
        userId,
        c.req.header('X-Filename') ?? 'unknown',
        inner.status,
        result.usage?.completion_tokens ?? 0
      ).run()
    );

    return c.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
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
  const stripe = new Stripe(c.env.PAYSTACK_PUBLIC_URL);
  const { plan } = await c.req.json<{ plan: 'developer' | 'team' | 'enterprise' }>();

  const priceIds = {
    developer: c.env.PAYSTACK_PUBLIC_URL,
    team: c.env.PAYSTACK_PUBLIC_URL,
    enterprise: c.env.PAYSTACK_PUBLIC_URL,
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceIds[plan], quantity: 1 }],
    success_url: `${c.env.APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${c.env.APP_URL}/pricing`,
    client_reference_id: c.get('userId'),
    metadata: { user_id: c.get('userId'), plan },
  });

  return c.json({ url: session.url });
});

// Stripe Webhook
app.post('/v1/stripe/webhook', async (c) => {
  const stripe = new Stripe(c.env.PAYSTACK_PUBLIC_URL);
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!sig) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, c.env.PAYSTACK_PUBLIC_URL);
  } catch (err) {
    return c.json({ error: 'Invalid stripe signature' }, 400);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await c.env.DB.prepare(`
        UPDATE user SET
          plan = ?,
          stripe_customer_id = ?,
          stripe_subscription_id = ?
        WHERE id = ?
      `).bind(
        session.metadata?.plan,
        session.customer,
        session.subscription,
        session.metadata?.user_id
      ).run();
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.status === 'active') {
        await c.env.DB.prepare(`
          UPDATE user SET plan = ?
          WHERE stripe_customer_id = ?
        `).bind(
          subscription.metadata?.plan,
          subscription.customer
        ).run();
      } else if (subscription.status === 'past_due') {
        console.log('Subscription past due for customer:', subscription.customer);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await c.env.DB.prepare(`
        UPDATE user SET plan = 'free'
        WHERE stripe_customer_id = ?
      `).bind(subscription.customer).run();
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
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
