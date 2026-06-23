import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import TermsPage from '../pages/TermsPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
})
