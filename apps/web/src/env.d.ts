/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly HEXIS_WORKER_URL: string;
  readonly PAYSTACK_PUBLIC_KEY: string;
  readonly HEXIS_WEB_DSN: string;
  // Add other VITE_* variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
