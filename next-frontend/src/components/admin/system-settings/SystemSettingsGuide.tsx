"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

const guidePages = [
  {
    title: "Read the active state",
    description:
      "Start on Overview. It tells you which school year and grading period control the rest of the system.",
    icon: CalendarDays,
    label: "Active state",
    value: "2026–2027 · Current period",
    steps: [
      ["Check", "Read the active school year before opening a class or report."],
      ["Confirm", "Match the active period with the school’s official calendar."],
      ["Follow", "Use the next-step links instead of scanning every advanced tool."],
    ],
  },
  {
    title: "Test an assessment safely",
    description:
      "Use the active period for a new test assessment. Existing assessments from another period stay protected.",
    icon: ClipboardCheck,
    label: "Assessment rule",
    value: "Prepare → publish → student attempt",
    steps: [
      ["Choose", "Sign in as a teacher assigned to an active class with learners."],
      ["Create", "Open Assignments and keep Active period as the server default."],
      ["Test", "Publish the new assessment, then open it from a student account."],
    ],
  },
  {
    title: "Preview a period change",
    description:
      "A preview is read-only. Activation still requires your password and may require an override reason.",
    icon: CheckCircle2,
    label: "Period preview",
    value: "Review impact before activation",
    steps: [
      ["Select", "Choose the period from the server-provided academic policy."],
      ["Preview", "Review open records, missing records, and unfinished attempts."],
      ["Activate", "Continue only when the preview matches the official calendar."],
    ],
  },
  {
    title: "Resolve blockers carefully",
    description:
      "Year-transition blockers and recovery actions are separate from everyday assessment setup.",
    icon: ShieldAlert,
    label: "Advanced operations",
    value: "Audit first · repair second",
    steps: [
      ["Review", "Open Year transition to see grouped readiness problems."],
      ["Assign", "Send class-record blockers to the responsible teachers."],
      ["Recover", "Use Audit & recovery only with evidence and a written reason."],
    ],
  },
] as const;

export function SystemSettingsGuide() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const current = guidePages[page];
  const Icon = current.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setPage(0);
      }}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setPage(0);
          setOpen(true);
        }}
        aria-label="System settings help"
        className="gap-2"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">How this works</span>
      </Button>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin guide: System settings</DialogTitle>
          <DialogDescription>
            Read one page at a time. Each page explains what to check before
            changing school-wide academic settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 border-y border-[var(--admin-outline)] py-3 text-sm">
          <span aria-live="polite" className="font-medium text-[var(--admin-text-strong)]">
            Page {page + 1} of {guidePages.length}
          </span>
          <div className="flex gap-2" aria-label="Guide pages">
            {guidePages.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setPage(index)}
                aria-label={`Open guide page ${index + 1}`}
                aria-current={index === page ? "step" : undefined}
                className={cn(
                  "h-2.5 w-2.5 rounded-full border border-[var(--admin-outline-strong)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]",
                  index === page
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]"
                    : "bg-white hover:border-[var(--admin-text-muted)]",
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-6 py-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
          <div className="rounded-lg border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-5">
            <div className="rounded-md border border-[var(--admin-outline)] bg-white">
              <div className="flex items-center gap-2 border-b border-[var(--admin-outline)] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <div className="space-y-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                    {current.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--admin-text-strong)]">
                    {current.value}
                  </p>
                </div>
                <div className="space-y-2" aria-hidden="true">
                  <span className="block h-2.5 w-full rounded bg-slate-200" />
                  <span className="block h-2.5 w-4/5 rounded bg-slate-200" />
                  <span className="block h-9 w-32 rounded-md bg-red-600" />
                </div>
              </div>
            </div>
          </div>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-accent-strong)]">
              Administrator guide
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-strong)]">
              {current.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              {current.description}
            </p>
            <div className="mt-5 space-y-3">
              {current.steps.map(([action, body], index) => (
                <div
                  key={`${action}-${body}`}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md border border-[var(--admin-outline)] bg-white p-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--admin-accent)] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <strong className="text-sm text-[var(--admin-text-strong)]">
                      {action}
                    </strong>
                    <p className="mt-0.5 text-sm leading-5 text-[var(--admin-text-muted)]">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            Previous page
          </Button>
          <div className="flex gap-2">
            {page < guidePages.length - 1 ? (
              <Button
                type="button"
                onClick={() =>
                  setPage((value) =>
                    Math.min(guidePages.length - 1, value + 1),
                  )
                }
              >
                Next page
              </Button>
            ) : null}
            <Button
              type="button"
              variant={page < guidePages.length - 1 ? "ghost" : "default"}
              onClick={() => setOpen(false)}
            >
              Close guide
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
