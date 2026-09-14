"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAdminMaintenance } from "@/providers/AdminMaintenanceProvider";

export function AdminMaintenanceBanner() {
  const { status } = useAdminMaintenance();
  if (!status?.active) return null;

  const timing =
    status.mode !== "manual" && status.expiresAt
      ? `This legacy timed session remains on until ${new Date(
          status.expiresAt,
        ).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}.`
      : "It remains ON until you turn it OFF, sign out, or change the account password.";

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Wrench
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <p className="text-sm leading-5">
          <span className="font-semibold">Maintenance Access is ON.</span>{" "}
          {timing} Finalized academic evidence and audit history stay
          protected.
        </p>
      </div>
      <Link
        href="/dashboard/admin/system-settings/maintenance-access"
        className="shrink-0 text-sm font-semibold text-amber-900 underline decoration-amber-400 underline-offset-4"
      >
        Manage access
      </Link>
    </div>
  );
}
