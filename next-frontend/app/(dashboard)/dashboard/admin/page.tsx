'use client';

import { useEffect, useState, useCallback } from 'react';
import { dashboardService, type AdminDashboardStats } from '@/services/dashboard-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setInterval] = useState(30000);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await dashboardService.getAdminStats();
      setStats(res.data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData, interval, autoRefresh);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const totalUsers = (stats?.totalStudents ?? 0) + (stats?.totalTeachers ?? 0) + (stats?.totalAdmins ?? 0);
  const teacherPct = totalUsers > 0 ? ((stats?.totalTeachers ?? 0) / totalUsers * 100).toFixed(1) : '0';
  const studentPct = totalUsers > 0 ? ((stats?.totalStudents ?? 0) / totalUsers * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Teachers</p>
            <p className="text-3xl font-bold text-green-600">{stats?.totalTeachers ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{teacherPct}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Students</p>
            <p className="text-3xl font-bold text-purple-600">{stats?.totalStudents ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{studentPct}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Classes</p>
            <p className="text-3xl font-bold text-orange-600">{stats?.activeClasses ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Running classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sections</p>
            <p className="text-3xl font-bold text-red-600">{stats?.totalSections ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All sections</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span>API Status: Connected</span>
              </div>
              <div className="text-muted-foreground">
                Last Sync: {lastUpdated?.toLocaleString() ?? 'Never'}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'}
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Force Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
