"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, LockKeyhole } from "lucide-react";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";

const gradeMethodLabels = {
  legacy_transmutation: "Legacy transmutation",
  adjusted_2026: "Adjusted school-year policy",
  zero_based: "Zero-based grading",
} as const;

export default function AssessmentsAndGradingSettingsPage() {
  const { current, loading, error, refresh } = useAcademicStateCurrent();
  const activePeriod =
    current?.periods.find((period) => period.key === current.quarter)?.label ??
    current?.quarter;

  return (
    <AcademicStateView
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
    >
      {current ? (
        <>
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-semibold text-emerald-950">
                  Assessment testing is available for {activePeriod}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900">
                  Teachers can prepare assessments for active current-year
                  classes. Publishing and new student attempts require the
                  assessment to use {activePeriod} and the class to remain
                  active.
                </p>
              </div>
            </div>
          </section>

          <AdminSectionCard
            title="Test an assessment safely"
            description="Use a new assessment in the active period instead of changing the school-wide calendar just for testing."
            action={
              <SettingHelp label="Assessment readiness">
                Readiness is checked per class and assessment. An active school
                year is necessary, but the class must also be active and the
                assessment period must match the active grading period before
                release or a new attempt.
              </SettingHelp>
            }
            density="compact"
          >
            <div className="space-y-3">
              {[
                [
                  "Use a teacher account",
                  "Sign in with a teacher account assigned to an active class that has enrolled learners.",
                ],
                [
                  "Create in the active period",
                  `Open the class Assignments area and keep “Active period (server default)” so the assessment uses ${activePeriod}.`,
                ],
                [
                  "Publish, then test as a learner",
                  "Add questions and settings, publish the assessment, then open it from an enrolled student account.",
                ],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md border border-[var(--admin-outline)] p-4"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--admin-accent)] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-[var(--admin-text-strong)]">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--admin-text-muted)]">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/admin/classes"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--admin-accent-strong)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              Review active classes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </AdminSectionCard>

          <AdminSectionCard
            title="What the active period controls"
            description="These rules are enforced by the backend for web and mobile clients."
            density="compact"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-[var(--admin-outline)] p-4">
                <ClipboardCheck
                  className="h-5 w-5 text-[var(--admin-accent-strong)]"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-medium text-[var(--admin-text-strong)]">
                  Prepare
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--admin-text-muted)]">
                  Teachers may prepare drafts for active current-year classes,
                  including future-period planning when policy permits it.
                </p>
              </div>
              <div className="rounded-md border border-[var(--admin-outline)] p-4">
                <LockKeyhole
                  className="h-5 w-5 text-[var(--admin-accent-strong)]"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-medium text-[var(--admin-text-strong)]">
                  Publish and start
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--admin-text-muted)]">
                  The assessment period must match {activePeriod}. Existing
                  attempts may continue according to their recorded state.
                </p>
              </div>
              <div className="rounded-md border border-[var(--admin-outline)] p-4">
                <CheckCircle2
                  className="h-5 w-5 text-[var(--admin-accent-strong)]"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-medium text-[var(--admin-text-strong)]">
                  Grade earlier work
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--admin-text-muted)]">
                  Earlier-period work remains auditable and can be completed
                  without pretending that period is currently active.
                </p>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Grading policy"
            description={`Policy for academic year ${current.schoolYear.replace("-", "–")}. Period names come from the server.`}
            action={
              <SettingHelp label="Grading policy">
                The policy defines the period labels, passing grade, annual
                rounding, and exam components. Historical years may use a
                different policy and must keep their original evidence.
              </SettingHelp>
            }
            density="compact"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-[var(--admin-text-muted)]">
                  Grading method
                </dt>
                <dd className="mt-1 font-medium text-[var(--admin-text-strong)]">
                  {gradeMethodLabels[current.policy.gradeMethod]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--admin-text-muted)]">
                  Passing grade
                </dt>
                <dd className="mt-1 font-medium text-[var(--admin-text-strong)]">
                  {current.policy.passingGrade}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-[var(--admin-text-muted)]">
                  Required periods
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {current.policy.periods.map((period) => (
                    <span
                      key={period.key}
                      className="rounded-md border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--admin-text-strong)]"
                    >
                      {period.label}
                    </span>
                  ))}
                </dd>
              </div>
              {current.policy.examComponents.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-[var(--admin-text-muted)]">
                    Exam components
                  </dt>
                  <dd className="mt-2 text-sm text-[var(--admin-text-strong)]">
                    {current.policy.examComponents
                      .map((component) => `${component.key} ${component.weight}%`)
                      .join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </AdminSectionCard>
        </>
      ) : null}
    </AcademicStateView>
  );
}
