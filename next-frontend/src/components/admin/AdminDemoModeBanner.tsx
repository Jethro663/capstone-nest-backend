"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useAdminDemoMode } from "@/providers/AdminDemoModeProvider";

export function AdminDemoModeBanner() {
  const { status } = useAdminDemoMode();
  if (!status?.active || !status.expiresAt) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <FlaskConical
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <p className="text-sm leading-5">
          <span className="font-semibold">Demo mode is active.</span> Workflow
          rules are relaxed until{" "}
          {new Date(status.expiresAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          ; permanent safeguards remain on.
        </p>
      </div>
      <Link
        href="/dashboard/admin/system-settings/demo-mode"
        className="shrink-0 text-sm font-semibold text-amber-900 underline decoration-amber-400 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
      >
        Manage Demo mode
      </Link>
    </div>
  );
}
