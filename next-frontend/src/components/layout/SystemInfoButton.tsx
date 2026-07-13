'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FRONTEND_APP_VERSION,
  healthService,
  type AiHealthStatus,
  type LivenessStatus,
  type ReadinessStatus,
} from '@/services/health-service';

interface SystemInfoButtonProps {
  buttonClassName: string;
  iconClassName?: string;
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Unavailable';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function getDependencyLabel(
  dependency?: { ok?: boolean; degraded?: boolean } | null,
) {
  if (!dependency) return 'Unavailable';
  if (dependency.degraded) return 'Degraded';
  return dependency.ok ? 'Operational' : 'Unavailable';
}

function getBackendLabel(liveness: LivenessStatus | null) {
  if (!liveness) return 'Unavailable';
  return liveness.status === 'ok' ? 'Operational' : liveness.status;
}

export function SystemInfoButton({
  buttonClassName,
  iconClassName = 'h-5 w-5',
}: SystemInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveness, setLiveness] = useState<LivenessStatus | null>(null);
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    void Promise.allSettled([
      healthService.getLiveness(),
      healthService.getReadiness(),
      healthService.getAiHealth(),
    ])
      .then(([livenessResult, readinessResult, aiHealthResult]) => {
        if (ignore) return;

        setLiveness(
          livenessResult.status === 'fulfilled' ? livenessResult.value : null,
        );
        setReadiness(
          readinessResult.status === 'fulfilled' ? readinessResult.value : null,
        );
        setAiHealth(
          aiHealthResult.status === 'fulfilled' ? aiHealthResult.value : null,
        );
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [open]);

  const backendVersion =
    liveness?.service?.version ?? readiness?.service?.version ?? 'Unavailable';
  const aiVersion =
    aiHealth?.service?.version ??
    readiness?.dependencies.aiService.version ??
    'Unavailable';
  const aiModel =
    aiHealth?.configuredTextModel ??
    aiHealth?.configuredModel ??
    'Unavailable';
  const aiProvider =
    aiHealth?.runtimeProvider ??
    readiness?.dependencies.aiService.runtimeProvider ??
    'Unavailable';
  const lastChecked =
    aiHealth?.timestamp ?? liveness?.timestamp ?? readiness?.timestamp ?? null;

  const handleOpen = () => {
    setLoading(true);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={handleOpen}
        aria-label="Open system info"
        title="Open system info"
      >
        <Info className={iconClassName} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-900">
              System information
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Live version and readiness details for the current frontend, backend, and AI services.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            {loading ? (
              <p className="text-sm font-medium text-slate-500">
                Loading live service details...
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Frontend
                </p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {FRONTEND_APP_VERSION}
                </p>
                <p className="mt-1 text-sm text-slate-500">Build version bundled in this web app.</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Backend
                </p>
                <p className="mt-2 text-lg font-black text-slate-900">{backendVersion}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {getBackendLabel(liveness)} • checked {formatTimestamp(liveness?.timestamp ?? readiness?.timestamp)}
                </p>
              </section>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  AI service
                </p>
                <p className="mt-2 text-base font-black text-slate-900">{aiVersion}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {getDependencyLabel(readiness?.dependencies.aiService)} via {aiProvider}
                </p>
                <p className="mt-1 text-xs text-slate-500">Model: {aiModel}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Database
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {getDependencyLabel(readiness?.dependencies.database)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {readiness?.dependencies.database.message ?? 'Primary data store reachable.'}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Redis
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {getDependencyLabel(readiness?.dependencies.redis)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {readiness?.dependencies.redis.message ?? 'Queue and cache layer reachable.'}
                </p>
              </section>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Last checked: <span className="font-semibold text-slate-700">{formatTimestamp(lastChecked)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
