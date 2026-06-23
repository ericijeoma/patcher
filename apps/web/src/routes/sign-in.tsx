import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import SignInPage from '../pages/SignInPage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
})
