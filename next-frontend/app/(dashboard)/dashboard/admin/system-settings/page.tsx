"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";

function displaySchoolYear(schoolYear: string) {
  return schoolYear.replace("-", "–");
}

export default function AdminSystemSettingsPage() {
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
          <section className="overflow-hidden rounded-lg border border-[var(--admin-outline)] bg-white">
            <div className="border-b border-[var(--admin-outline)] px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--admin-text-strong)]">
                    Academic calendar is configured
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--admin-text-muted)]">
                    Teachers can prepare work for active classes. Release and
                    new student attempts follow the active grading period.
                  </p>
                </div>
              </div>
            </div>

            <dl className="grid sm:grid-cols-2">
              <div className="border-b border-[var(--admin-outline)] p-5 sm:border-b-0 sm:border-r sm:p-6">
                <dt className="flex items-center gap-2 text-sm font-medium text-[var(--admin-text-muted)]">
                  Active school year
                  <SettingHelp label="Active school year">
                    This is the school year used by current classes, grading
                    records, and school-wide academic actions. Change it only
                    through the reviewed year-transition process.
                  </SettingHelp>
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-[var(--admin-text-strong)]">
                  {displaySchoolYear(current.schoolYear)}
                </dd>
              </div>
              <div className="p-5 sm:p-6">
                <dt className="flex items-center gap-2 text-sm font-medium text-[var(--admin-text-muted)]">
                  Active grading period
                  <SettingHelp label="Active grading period">
                    Only assessments in this period can be released or started
                    by new student attempts. Earlier work remains available for
                    review and grading under backend policy.
                  </SettingHelp>
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-[var(--admin-text-strong)]">
                  {activePeriod}
                </dd>
              </div>
            </dl>
          </section>

          <AdminSectionCard
            title="Current-period assessment rule"
            description="The calendar is active; assessment availability depends on period and class readiness."
            action={
              <SettingHelp label="Assessment readiness">
                Teachers may prepare assessments for active current-year
                classes. Release and new student attempts require the assessment
                period to match the active period and the class to remain active.
              </SettingHelp>
            }
            density="compact"
          >
            <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-4">
              <ClipboardCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-blue-950">
                  New student attempts must use {activePeriod}.
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  To test safely, use a teacher account, open an active class
                  with learners, create a new assessment, and keep the server’s
                  active-period default.
                </p>
                <Link
                  href="/dashboard/admin/system-settings/assessments-grading"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  Review assessment rules
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Choose what you need to do"
            description="Routine setup, year-end work, and recovery now have separate destinations."
            density="compact"
          >
            <div className="divide-y divide-[var(--admin-outline)] rounded-md border border-[var(--admin-outline)]">
              {[
                {
                  href: "/dashboard/admin/system-settings/academic-year",
                  icon: CalendarDays,
                  title: "Review or change the active period",
                  body: "Preview the impact before entering your password and activating a school-wide change.",
                },
                {
                  href: "/dashboard/admin/system-settings/year-transition",
                  icon: ShieldAlert,
                  title: "Prepare for the next school year",
                  body: "See readiness blockers and transition impact without mixing them into routine settings.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-[var(--admin-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
                >
                  <item.icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-accent-strong)]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[var(--admin-text-strong)]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[var(--admin-text-muted)]">
                      {item.body}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--admin-text-muted)]"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </AdminSectionCard>

          <details className="rounded-lg border border-[var(--admin-outline)] bg-white px-5 py-4 text-sm">
            <summary className="cursor-pointer font-medium text-[var(--admin-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]">
              Technical details
            </summary>
            <dl className="mt-4 grid gap-3 text-[var(--admin-text-muted)] sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--admin-text-strong)]">
                  Policy
                </dt>
                <dd>{current.policy.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--admin-text-strong)]">
                  State version
                </dt>
                <dd>{current.version}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-[var(--admin-text-strong)]">
                  Last updated
                </dt>
                <dd>{new Date(current.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </details>
        </>
      ) : null}
    </AcademicStateView>
  );
}
