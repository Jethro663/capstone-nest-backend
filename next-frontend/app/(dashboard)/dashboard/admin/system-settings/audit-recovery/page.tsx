"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { AcademicRecoveryPanel } from "@/components/admin/AcademicRecoveryPanel";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { academicStateService } from "@/services/academic-state-service";
import type { AcademicReadiness } from "@/types/academic-grading";

export default function AuditRecoverySettingsPage() {
  const { current, loading, error, refresh } = useAcademicStateCurrent();
  const [readiness, setReadiness] = useState<AcademicReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const response = await academicStateService.getReadiness();
      setReadiness(response.data);
    } catch (requestError) {
      setReadiness(null);
      setReadinessError(
        getApiErrorMessage(
          requestError,
          "Academic readiness could not be loaded for recovery tools.",
        ),
      );
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (current) void loadReadiness();
  }, [current, loadReadiness]);

  return (
    <AcademicStateView
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
    >
      {current ? (
        <>
          <section className="rounded-lg border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 h-6 w-6 shrink-0 text-red-700"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-xl font-semibold text-red-950">
                    Audit & recovery
                  </h2>
                  <p className="mt-1 text-sm font-medium text-red-900">
                    School year {current.schoolYear.replace("-", "–")}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900">
                    Advanced operations can change official academic evidence.
                    Start with the read-only audit, identify the exact record,
                    and use a repair only with supporting evidence and an audit
                    reason.
                  </p>
                </div>
              </div>
              <SettingHelp label="Audit and recovery">
                Audit findings describe evidence that needs review; they do not
                mean every assessment is unavailable. Recovery actions are
                restricted, password-protected operations intended for a known
                record-level defect.
              </SettingHelp>
            </div>
          </section>

          {readinessLoading ? (
            <div
              role="status"
              className="rounded-lg border border-[var(--admin-outline)] bg-white p-5 text-sm text-[var(--admin-text-muted)]"
            >
              Loading class readiness for recovery tools…
            </div>
          ) : null}

          {readinessError ? (
            <div
              role="alert"
              aria-label={readinessError}
              className="rounded-lg border border-amber-200 bg-amber-50 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-amber-950">
                    Recovery context unavailable
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    {readinessError} The current academic state above remains
                    unchanged.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    aria-label="Retry readiness"
                    onClick={() => void loadReadiness()}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Retry readiness
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {readiness ? (
            <AcademicRecoveryPanel
              schoolYear={current.schoolYear}
              classes={readiness.classReadiness}
              onChanged={async () => {
                await Promise.all([refresh(), loadReadiness()]);
              }}
            />
          ) : null}
        </>
      ) : null}
    </AcademicStateView>
  );
}
