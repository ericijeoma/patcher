import { betterAuth } from 'better-auth';
import type { Env } from '../index'; 

export function createAuth(env: Env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: "https://patcher.ericijeoma7767.workers.dev",
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
      storeSessionInDatabase: true,
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
    }
  });
}
