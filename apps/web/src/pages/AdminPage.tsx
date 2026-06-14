import { useState, useEffect } from 'react';
import { useSession } from '../lib/auth';
import { BarChart, Users, Scan, Check, AlertTriangle, X } from 'lucide-react';

export default function AdminPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!session?.session?.token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/v1/admin/stats`, {
          headers: {
        'Authorization': `Bearer ${session.session?.token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch admin stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, [session]);

  const renderUserPlansChart = () => {
    if (!stats?.user_plans || stats.user_plans.length === 0) {
      return <p className="text-gray-500">No user data available</p>;
    }

    const totalUsers = stats.user_plans.reduce((sum: number, plan: any) => sum + plan.count, 0);

    return (
      <div className="space-y-4">
        {stats.user_plans.map((plan: any) => {
          const percentage = Math.round((plan.count / totalUsers) * 100);
          return (
            <div key={plan.plan} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3" style={{
                  backgroundColor:
                    plan.plan === 'free' ? '#60a5fa' :
                    plan.plan === 'developer' ? '#34d399' :
                    plan.plan === 'team' ? '#fbbf24' : '#f87171'
                }}></div>
                <span className="capitalize">{plan.plan}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">{plan.count}</span>
                <span className="text-gray-500 text-sm">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderScanStatusesChart = () => {
    if (!stats?.scan_statuses || stats.scan_statuses.length === 0) {
      return <p className="text-gray-500">No scan data available</p>;
    }

    return (
      <div className="space-y-3">
        {stats.scan_statuses.map((status: any) => (
          <div key={status.status} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                status.status === 'critical' ? 'bg-red-500' :
                status.status === 'high' ? 'bg-orange-500' :
                status.status === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="capitalize">{status.status}</span>
            </div>
            <span className="font-medium">{status.count}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
              <h3 className="text-lg font-semibold text-red-700">Access Denied</h3>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            View Stripe Dashboard
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="font-semibold text-gray-700">Total Users</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats?.user_plans?.reduce((sum: number, plan: any) => sum + plan.count, 0) || 0}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <Scan className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="font-semibold text-gray-700">Scans Today</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats?.scans_today || 0}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <Check className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="font-semibold text-gray-700">Total Scans</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats?.scan_statuses?.reduce((sum: number, status: any) => sum + status.count, 0) || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">User Distribution by Plan</h2>
              <BarChart className="w-5 h-5 text-gray-400" />
            </div>
            {renderUserPlansChart()}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Scan Results by Severity</h2>
              <BarChart className="w-5 h-5 text-gray-400" />
            </div>
            {renderScanStatusesChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
