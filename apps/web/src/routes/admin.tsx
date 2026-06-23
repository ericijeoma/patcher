import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    // We hit Better-Auth directly via fetch since React Hooks cannot run here
    const res = await fetch('/api/auth/get-session').catch(() => null)
    
    if (!res || !res.ok) {
      throw redirect({ to: '/sign-in' })
    }

    const data = await res.json().catch(() => null)
    
    if (!data?.session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: AdminPage
})

function AdminPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome to the secure administrative interface.</p>
    </div>
  )
}
