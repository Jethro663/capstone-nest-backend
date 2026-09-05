"use client";

import { GraduationCap } from "lucide-react";
import { AcademicBackSubjectsPanel } from "@/components/admin/AcademicBackSubjectsPanel";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";

export default function LearnerCompletionSettingsPage() {
  const { current, loading, error, refresh } = useAcademicStateCurrent();

  return (
    <AcademicStateView
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
    >
      {current ? (
        <>
          <section className="rounded-lg border border-[var(--admin-outline)] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--admin-text-strong)]">
                    Learner completion
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
                    Manage back-subject evidence and Grade 10 completion
                    decisions here, separate from the school-wide calendar and
                    recovery tools.
                  </p>
                </div>
              </div>
              <SettingHelp label="Learner completion">
                Schedule a back subject only against the correct school-year
                policy. Clear or complete a case only when the supporting grade,
                reason, and source reference are available for audit.
              </SettingHelp>
            </div>
          </section>

          <AcademicBackSubjectsPanel
            current={current}
            onChanged={refresh}
          />
        </>
      ) : null}
    </AcademicStateView>
  );
}
