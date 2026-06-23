import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './index.css';
import './sentry'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred. Our team has been notified.</p>}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
