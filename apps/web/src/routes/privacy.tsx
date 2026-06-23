import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import PrivacyPage from '../pages/PrivacyPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
})
