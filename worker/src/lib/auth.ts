import { betterAuth } from 'better-auth/minimal';
import { dash } from '@better-auth/infra';
import type { Env } from '../index'; // Imports the Env interface to fix the type error

export function createAuth(env: Env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    database: env.DB,           // D1 binding — native support
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },
    // KV Cache natively implemented via secondaryStorage
    secondaryStorage: {
      get: async (key) => await env.AUTH_KV.get(key),
      set: async (key, value, ttl) => {
        // Only set TTL if it's strictly greater than Cloudflare's 60-second minimum
        if (ttl && ttl >= 60) {
          await env.AUTH_KV.put(key, value, { expirationTtl: ttl });
        } else {
          await env.AUTH_KV.put(key, value);
        }
      },
      delete: async (key) => await env.AUTH_KV.delete(key)
    },
    plugins: [
      dash({ 
                // Explicitly tell the plugin where the API key is!
                apiKey: env.BETTER_AUTH_API_KEY 
            })
    ]
  });
}
