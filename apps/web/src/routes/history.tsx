import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import HistoryPage from '../pages/HistoryPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
})
