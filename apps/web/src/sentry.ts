import * as Sentry from '@sentry/react';

const RELEASE = 'hexis@1.0.0';

Sentry.init({
	dsn: import.meta.env.VITE_HEXIS_WEB_DSN,
	release: RELEASE,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: 1.0,
	tracePropagationTargets: [
		'https://patcher.ericijeoma7767.workers.dev',
		'http://127.0.0.1:3000',
		'http://localhost:3000',
	],
    
});
