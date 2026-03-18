'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/admin-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type HealthReadiness = Awaited<ReturnType<typeof adminService.getHealthReadiness>>;

function DependencyCard({
  title,
  ok,
  degraded,
  message,
}: {
  title: string;
  ok: boolean;
  degraded?: boolean;
  message?: string;
}) {
  const tone = ok ? (degraded ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium">{ok ? (degraded ? 'Degraded' : 'Healthy') : 'Unavailable'}</p>
        <p className="text-muted-foreground">{message || 'No issues reported.'}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDiagnosticsPage() {
  const [live, setLive] = useState<{ status: string; timestamp: string } | null>(null);
  const [readiness, setReadiness] = useState<HealthReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [liveRes, readinessRes] = await Promise.all([
        adminService.getHealthLive(),
        adminService.getHealthReadiness().catch((err) => err?.response?.data),
      ]);
      setLive(liveRes);
      setReadiness(readinessRes ?? null);
    } catch {
      setError('Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const dependencies = readiness?.data?.dependencies;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">System Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Live backend readiness checks for API, database, Redis, and AI services.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDiagnostics}>
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DependencyCard
          title="API Process"
          ok={live?.status === 'ok'}
          message={live?.timestamp ? `Live at ${new Date(live.timestamp).toLocaleString()}` : 'No live timestamp returned.'}
        />
        <DependencyCard
          title="Database"
          ok={Boolean(dependencies?.database?.ok)}
          message={dependencies?.database?.message}
        />
        <DependencyCard
          title="Redis"
          ok={Boolean(dependencies?.redis?.ok)}
          message={dependencies?.redis?.message}
        />
        <DependencyCard
          title="AI Service"
          ok={Boolean(dependencies?.aiService?.ok)}
          degraded={dependencies?.aiService?.degraded}
          message={dependencies?.aiService?.message}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Readiness Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Overall status:{' '}
            <span className={readiness?.data?.ready ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
              {readiness?.data?.ready ? 'Ready' : 'Not Ready'}
            </span>
          </p>
          <p className="text-muted-foreground">
            Last readiness check:{' '}
            {readiness?.data?.timestamp
              ? new Date(readiness.data.timestamp).toLocaleString()
              : 'Unavailable'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
