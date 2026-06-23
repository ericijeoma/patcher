import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import SignUpPage from '../pages/SignUpPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
})
