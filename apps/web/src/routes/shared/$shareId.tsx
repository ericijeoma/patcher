import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import SharedReportPage from '../../pages/SharedReportPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shared/$shareId',
  component: SharedReportPage,
})
