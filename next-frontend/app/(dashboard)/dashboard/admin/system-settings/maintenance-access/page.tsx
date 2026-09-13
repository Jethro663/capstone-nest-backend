"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck, Wrench } from "lucide-react";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAdminMaintenance } from "@/providers/AdminMaintenanceProvider";
import type {
  AdminMaintenanceAcknowledgement,
  AdminMaintenanceRule,
} from "@/types/admin-maintenance";

const acknowledgementOptions: Array<{
  value: AdminMaintenanceAcknowledgement;
  label: string;
}> = [
  {
    value: "LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE",
    label:
      "I understand that live classes, sections, rosters, and account state can change.",
  },
  {
    value: "FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED",
    label:
      "I understand that finalized grades, submitted evidence, and audit history stay protected outside Full Reset.",
  },
];

function RuleList({ rules }: { rules: AdminMaintenanceRule[] }) {
  return (
    <ul className="divide-y divide-[var(--admin-outline)]">
      {rules.map((rule) => (
        <li key={rule.code} className="py-3 first:pt-0 last:pb-0">
          <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
            {rule.label}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-[var(--admin-text-muted)]">
            {rule.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function AdminMaintenanceAccessPage() {
  const { status, loading, error, mutating, open, close, refresh } =
    useAdminMaintenance();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<
    AdminMaintenanceAcknowledgement[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);

  if (loading && !status) {
    return (
      <div role="status" className="rounded-md border bg-white p-5 text-sm">
        Loading Maintenance Access status…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-md border border-red-200 bg-white p-5">
        <p role="alert" className="text-sm font-medium text-red-800">
          {error ?? "Maintenance Access status could not be loaded."}
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void refresh()}
        >
          Retry status
        </Button>
      </div>
    );
  }

  const ready =
    status.available &&
    !status.active &&
    reason.trim().length >= 10 &&
    reason.trim().length <= 240 &&
    password.length > 0 &&
    confirmation === "OPEN MAINTENANCE ACCESS" &&
    acknowledgementOptions.every((item) =>
      acknowledgements.includes(item.value),
    );

  const toggle = (value: AdminMaintenanceAcknowledgement) => {
    setAcknowledgements((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const submitOpen = async () => {
    if (!ready) return;
    setMessage(null);
    try {
      await open({
        currentPassword: password,
        confirmation: "OPEN MAINTENANCE ACCESS",
        reason: reason.trim(),
        acknowledgements: acknowledgementOptions.map((item) => item.value),
      });
      setMessage("Maintenance Access is active for 15 minutes.");
      setReason("");
      setConfirmation("");
      setAcknowledgements([]);
    } catch (requestError) {
      setMessage(
        getApiErrorMessage(
          requestError,
          "Maintenance Access could not be opened.",
        ),
      );
    } finally {
      setPassword("");
    }
  };

  const submitClose = async () => {
    setMessage(null);
    try {
      await close();
      setMessage(
        "Maintenance Access closed. Normal workflow checks are active.",
      );
    } catch (requestError) {
      setMessage(
        getApiErrorMessage(requestError, "Maintenance Access could not close."),
      );
    }
  };

  return (
    <div className="space-y-5">
      <section
        className={`rounded-lg border bg-white p-5 sm:p-6 ${
          status.active ? "border-amber-300" : "border-[var(--admin-outline)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-800">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--admin-text-muted)]">
              Administrator workspace
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text-strong)]">
              {status.active
                ? "Maintenance Access is active"
                : "Maintenance Access is closed"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
              {status.active && status.expiresAt
                ? `Routine admin actions can resolve approved workflow warnings until ${new Date(
                    status.expiresAt,
                  ).toLocaleString()}.`
                : "Open a short, actor-bound window for academic cleanup. Preview, audit, and permanent evidence protections remain on."}
            </p>
          </div>
        </div>
      </section>

      {!status.available ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Maintenance Access is disabled in this deployment.
        </section>
      ) : status.active ? (
        <AdminSectionCard
          title="Close Maintenance Access"
          description="Closing is immediate. It affects only your administrator session."
          density="compact"
        >
          <Button
            variant="outline"
            disabled={mutating}
            onClick={() => void submitClose()}
          >
            Close access now
          </Button>
        </AdminSectionCard>
      ) : (
        <AdminSectionCard
          title="Open a 15-minute maintenance window"
          description="Reauthenticate once, review the boundaries, then use the normal admin pages."
          density="compact"
        >
          <div className="max-w-2xl space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="maintenance-reason">Reason</Label>
              <Input
                id="maintenance-reason"
                value={reason}
                minLength={10}
                maxLength={240}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Example: Prepare clean academic data for the presentation"
              />
              <p className="text-xs text-[var(--admin-text-muted)]">
                10–240 characters; stored in the audit trail.
              </p>
            </div>

            <fieldset className="space-y-2 border-y border-[var(--admin-outline)] py-4">
              <legend className="mb-1 text-sm font-semibold">
                Confirm the scope
              </legend>
              {acknowledgementOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-2.5 text-sm leading-5"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-red-700"
                    checked={acknowledgements.includes(option.value)}
                    onChange={() => toggle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="maintenance-password">Current password</Label>
                <Input
                  id="maintenance-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maintenance-confirmation">
                  Type OPEN MAINTENANCE ACCESS
                </Label>
                <Input
                  id="maintenance-confirmation"
                  value={confirmation}
                  autoComplete="off"
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </div>

            <Button
              disabled={mutating || !ready}
              onClick={() => void submitOpen()}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Open Maintenance Access
            </Button>
          </div>
        </AdminSectionCard>
      )}

      <div aria-live="polite" className="text-sm font-medium text-red-800">
        {message ?? error}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard
          title="Available maintenance actions"
          description="These workflow rules may be resolved during your active window."
          density="compact"
        >
          <RuleList rules={status.rules} />
        </AdminSectionCard>
        <AdminSectionCard
          title="Still protected"
          description="These controls remain active. Full Reset is the separate whole-school exception."
          action={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
          density="compact"
        >
          <RuleList rules={status.protectedRules} />
        </AdminSectionCard>
      </div>
    </div>
  );
}
