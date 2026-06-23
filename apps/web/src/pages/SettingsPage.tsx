import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../lib/auth'
import { Key, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

// Mock API calls - replace with actual API calls
const fetchUsage = async () => {
  // Mock data
  return {
    scans_today: 5,
    daily_limit: 100,
    api_keys: [
      {
        id: 'key1',
        name: 'CLI Key',
        last_used_at: '2023-06-20T10:30:00Z',
        created_at: '2023-06-01T08:15:00Z'
      },
      {
        id: 'key2',
        name: 'Production Key',
        last_used_at: '2023-06-19T14:45:00Z',
        created_at: '2023-05-15T09:20:00Z'
      }
    ]
  }
}

const createApiKey = async (name: string) => {
  // Mock API call
  return {
    id: `key${Math.random().toString(36).substr(2, 9)}`,
    name,
    key: `sk_${Math.random().toString(36).substr(2, 24)}`,
    created_at: new Date().toISOString()
  }
}

const revokeApiKey = async (keyId: string) => {
  // Mock API call
  return { success: true }
}

const deleteScanHistory = async () => {
  // Mock API call
  return { success: true }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [newKeyName, setNewKeyName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState(false)

  const { data: usageData, isLoading: isUsageLoading, error: usageError } = useQuery({
    queryKey: ['usage'],
    queryFn: fetchUsage
  })

  const createKeyMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      setNewKeyName('')
    }
  })

  const revokeKeyMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    }
  })

  const deleteHistoryMutation = useMutation({
    mutationFn: deleteScanHistory,
    onSuccess: () => {
      setDeleteSuccess(true)
      setShowDeleteConfirm(false)
    }
  })

  const handleCreateKey = () => {
    if (newKeyName.trim()) {
      createKeyMutation.mutate(newKeyName.trim())
    }
  }

  const handleRevokeKey = (keyId: string) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      revokeKeyMutation.mutate(keyId)
    }
  }

  const handleDeleteHistory = () => {
    if (window.confirm('Are you sure you want to delete ALL your scan history? This cannot be undone.')) {
      deleteHistoryMutation.mutate()
    }
  }

  if (isUsageLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (usageError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Failed to load usage data</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {deleteSuccess && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-400">Scan history deleted successfully</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Usage Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Usage Statistics</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Scans Today</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {usageData?.scans_today ?? 0} / {usageData?.daily_limit ?? 100}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min((usageData?.scans_today ?? 0) / (usageData?.daily_limit ?? 100), 1) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Keys</h2>
          </div>

          <div className="space-y-4 mb-6">
            {usageData?.api_keys?.map((key) => (
              <div key={key.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{key.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {new Date(key.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    disabled={revokeKeyMutation.isPending}
                  >
                    {revokeKeyMutation.isPending ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Create New API Key</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key name (e.g., CLI, Production)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || createKeyMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createKeyMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>

        <div className="space-y-4">
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Delete Scan History</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Permanently delete all your scan history and analysis results. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteHistory}
                disabled={deleteHistoryMutation.isPending}
                className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                {deleteHistoryMutation.isPending ? 'Deleting...' : 'Delete History'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
