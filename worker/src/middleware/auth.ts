import { Context, Next } from 'hono';
import { validateApiKey } from '../lib/keys';
import { createAuth } from '../lib/auth';
import { Env, Variables } from '../index';
import { validateLicenseToken } from '../lib/license';

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  // License token path (hxs_lic_...) - Ed25519 signed offline tokens
  if (token.startsWith('hxs_lic_')) {
    const result = await validateLicenseToken(token, c.env);
    if (!result.valid) {
      return c.json({ error: 'Invalid license token' }, 401);
    }
    c.set('userId', result.customerId || 'license_user');
    c.set('authMethod', 'license_token');
    if (result.features) {
      c.set('licenseFeatures', result.features);
    }
    return next();
  }

  // API key path (hxs_live_...)
  if (token.startsWith('hxs_live_')) {
    const result = await validateApiKey(token, c.env.DB, c.executionCtx);
    if (!result.valid || !result.userId) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    c.set('userId', result.userId);
    c.set('authMethod', 'api_key');
    return next();
  }

  // Session token path (from Better Auth)
  // Better Auth sessions are validated via the auth instance
  if (!token.startsWith('hxs_live_') && !token.startsWith('hxs_lic_')) {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!session?.user) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    // User validation check complete. No redundant database writes needed.
    c.set('userId', session.user.id);
    c.set('authMethod', 'session');
    return next();
  }
}
