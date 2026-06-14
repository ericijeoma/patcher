/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  // Add other VITE_* variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
