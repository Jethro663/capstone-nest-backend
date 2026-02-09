
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import adminService from '@/services/adminService';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      setError(null);
      const response = await adminService.getDashboardStats();
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      const errorMessage = error?.message || 'Failed to load dashboard stats';
      setError(errorMessage);
      
      // Only show toast if not already loaded once
      if (!stats) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh effect
  useEffect(() => {
    // Fetch immediately on mount
    fetchStats();

    // Setup interval for auto-refresh
    if (isAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchStats();
      }, refreshInterval);
    }

    // Cleanup interval on unmount or when settings change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setLoading(true);
    fetchStats();
    toast.success('Dashboard updated');
  };

  // Format time since last update
  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={isAutoRefresh}
              onChange={(e) => setIsAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!isAutoRefresh}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated Status */}
      <div className="text-sm text-gray-500">
        Last updated: {formatTimeSince(lastUpdated)}
        {error && <span className="text-red-500 ml-4">Error: {error}</span>}
      </div>

      {/* Stats Grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats?.teachers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalUsers > 0 
                  ? `${Math.round((stats?.teachers / stats?.totalUsers) * 100)}% of users`
                  : 'No data'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats?.students || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalUsers > 0 
                  ? `${Math.round((stats?.students / stats?.totalUsers) * 100)}% of users`
                  : 'No data'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats?.activeSubjects || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Courses offered</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats?.activeClasses || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Running classes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
       

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">API Status</span>
              <span className="text-green-600 font-medium">✓ Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Last Sync</span>
              <span className="text-sm">{formatTimeSince(lastUpdated)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Auto-refresh</span>
              <span className="text-sm">{isAutoRefresh ? `Every ${refreshInterval / 1000}s` : 'Disabled'}</span>
            </div>
            <div className="pt-2 border-t">
              <button
                onClick={handleManualRefresh}
                className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-medium"
              >
                Force Refresh
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

