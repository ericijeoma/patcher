import { createRouter } from '@tanstack/react-router'
// 1. This import contains your entire automatic route tree (home, sign-in, settings, etc.)
import { routeTree } from './routeTree.gen'

// 2. Pass the imported tree directly into the router instance
export const router = createRouter({ routeTree })

// 3. Register the router instance for global type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
