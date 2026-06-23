import React, { Suspense, useEffect } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import { useSession } from '../lib/auth'
import { ThemeProvider } from '../context/ThemeContext'
import Navbar from '../components/Navbar'

// ✅ Vite standard: Use import.meta.env.PROD instead of process.env
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import('@tanstack/react-router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    )

export const Route = createRootRoute({
  component: () => {
    const { data: session } = useSession()

    useEffect(() => {
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
        })
      } else {
        Sentry.setUser(null)
      }
    }, [session])

    return (
      <HelmetProvider>
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Outlet />
            </main>
          </div>
        </ThemeProvider>
        <Suspense fallback={null}>
          {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
        </Suspense>
      </HelmetProvider>
    )
  },
  notFoundComponent: () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <h1 className="text-6xl font-bold text-indigo-600">404</h1>
        <p className="mt-4 text-xl text-gray-700 dark:text-gray-300">Page not found</p>
        <a href="/" className="mt-6 px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Go back home
        </a>
      </div>
    )
  },
})
