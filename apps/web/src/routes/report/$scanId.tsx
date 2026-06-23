import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import ReportPage from '../../pages/ReportPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/report/$scanId',
  component: ReportPage,
})
