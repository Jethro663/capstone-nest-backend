"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { cn } from "@/utils/cn";
import { SystemSettingsGuide } from "./SystemSettingsGuide";

type SettingsItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const settingsSections: Array<{
  group: string;
  items: SettingsItem[];
}> = [
  {
    group: "Start here",
    items: [
      {
        label: "Overview",
        description: "Current state and next steps",
        href: "/dashboard/admin/system-settings",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    group: "Academic setup",
    items: [
      {
        label: "Academic year",
        description: "Active year and grading period",
        href: "/dashboard/admin/system-settings/academic-year",
        icon: CalendarRange,
      },
      {
        label: "Assessments & grading",
        description: "Current-period rules and policy",
        href: "/dashboard/admin/system-settings/assessments-grading",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    group: "School operations",
    items: [
      {
        label: "Year transition",
        description: "Readiness and next-year impact",
        href: "/dashboard/admin/system-settings/year-transition",
        icon: BookOpenCheck,
      },
      {
        label: "Learner completion",
        description: "Back subjects and Grade 10",
        href: "/dashboard/admin/system-settings/learner-completion",
        icon: GraduationCap,
      },
    ],
  },
  {
    group: "Advanced",
    items: [
      {
        label: "Audit & recovery",
        description: "Evidence-based repair tools",
        href: "/dashboard/admin/system-settings/audit-recovery",
        icon: ShieldAlert,
      },
    ],
  },
];

const flatSections = settingsSections.flatMap((section) => section.items);

export function SystemSettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AdminPageShell
      title="System settings"
      description="Set the academic calendar, understand assessment rules, and keep advanced recovery work separate."
      actions={<SystemSettingsGuide />}
    >
      <div className="lg:hidden">
        <label
          htmlFor="system-settings-section"
          className="mb-1.5 block text-sm font-medium text-[var(--admin-text-strong)]"
        >
          Settings section
        </label>
        <select
          id="system-settings-section"
          value={pathname}
          onChange={(event) => router.push(event.target.value)}
          className="h-11 w-full rounded-md border border-[var(--admin-outline-strong)] bg-white px-3 text-sm text-[var(--admin-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        >
          {flatSections.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <aside
          aria-label="System settings sections"
          className="sticky top-4 hidden rounded-lg border border-[var(--admin-outline)] bg-white p-3 lg:block"
        >
          {settingsSections.map((section, sectionIndex) => (
            <div
              key={section.group}
              className={cn(sectionIndex > 0 && "mt-4 border-t border-[var(--admin-outline)] pt-4")}
            >
              <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                {section.group}
              </p>
              <nav className="mt-1.5 space-y-1" aria-label={section.group}>
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex gap-3 rounded-md border border-transparent px-2.5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]",
                        active
                          ? "border-red-100 bg-red-50 text-red-800"
                          : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-soft)] hover:text-[var(--admin-text-strong)]",
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-current">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-[var(--admin-text-muted)]">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        <main className="min-w-0 space-y-5">{children}</main>
      </div>
    </AdminPageShell>
  );
}
