import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: "https://patcher.ericijeoma7767.workers.dev",
});

export const { signIn, signUp, signOut, useSession } = authClient;
