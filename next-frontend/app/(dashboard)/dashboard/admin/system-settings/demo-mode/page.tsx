"use client";

import { useRef, useState } from "react";
import { FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminDemoMode } from "@/providers/AdminDemoModeProvider";
import type {
  AdminDemoModeAcknowledgement,
  AdminDemoModeRule,
} from "@/types/admin-demo-mode";
import { getApiErrorMessage } from "@/lib/api-error";

const acknowledgementOptions: Array<{
  value: AdminDemoModeAcknowledgement;
  label: string;
}> = [
  {
    value: "SHARED_DATA_CAN_CHANGE",
    label: "Shared school data can change during this window.",
  },
  {
    value: "ACTIONS_REMAIN_AUDITED",
    label: "Every relaxed action remains audited.",
  },
  {
    value: "HARD_SAFEGUARDS_REMAIN",
    label:
      "Authentication, record integrity, and permanent safeguards remain enforced.",
  },
];

function RuleList({ rules }: { rules: AdminDemoModeRule[] }) {
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

export default function AdminDemoModeSettingsPage() {
  const { status, loading, error, mutating, activate, deactivate, refresh } =
    useAdminDemoMode();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<15 | 30 | 60 | 120>(
    30,
  );
  const [acknowledgements, setAcknowledgements] = useState<
    AdminDemoModeAcknowledgement[]
  >([]);
  const [deactivationConfirmation, setDeactivationConfirmation] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const activationButtonRef = useRef<HTMLButtonElement>(null);
  const deactivationButtonRef = useRef<HTMLButtonElement>(null);

  if (loading && !status) {
    return (
      <div role="status" className="rounded-md border bg-white p-5 text-sm">
        Loading Demo mode status…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-md border border-red-200 bg-white p-5">
        <p role="alert" className="text-sm font-medium text-red-800">
          {error ?? "Demo mode status could not be loaded."}
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

  const activationReady =
    status.available &&
    !status.active &&
    reason.trim().length >= 10 &&
    reason.trim().length <= 240 &&
    password.length > 0 &&
    confirmation === "ENABLE DEMO MODE" &&
    acknowledgementOptions.every((option) =>
      acknowledgements.includes(option.value),
    );

  const toggleAcknowledgement = (value: AdminDemoModeAcknowledgement) => {
    setAcknowledgements((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const submitActivation = async () => {
    if (!activationReady) return;
    setActionMessage(null);
    try {
      await activate({
        currentPassword: password,
        confirmation: "ENABLE DEMO MODE",
        reason: reason.trim(),
        durationMinutes,
        expectedVersion: status.version,
        acknowledgements: acknowledgementOptions.map((option) => option.value),
      });
      setActionMessage("Demo mode is active for the selected window.");
      setReason("");
      setConfirmation("");
      setAcknowledgements([]);
    } catch (requestError) {
      setActionMessage(
        getApiErrorMessage(requestError, "Demo mode could not be activated."),
      );
    } finally {
      setPassword("");
      activationButtonRef.current?.focus();
    }
  };

  const submitDeactivation = async () => {
    if (deactivationConfirmation !== "DISABLE DEMO MODE") return;
    setActionMessage(null);
    try {
      await deactivate({
        confirmation: "DISABLE DEMO MODE",
        expectedVersion: status.version,
      });
      setActionMessage(
        "Demo mode is off. Normal workflow safeguards are active.",
      );
      setDeactivationConfirmation("");
    } catch (requestError) {
      setActionMessage(
        getApiErrorMessage(requestError, "Demo mode could not be deactivated."),
      );
    } finally {
      deactivationButtonRef.current?.focus();
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
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              status.active
                ? "bg-amber-100 text-amber-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--admin-text-muted)]">
              Presentation controls
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text-strong)]">
              {status.active ? "Demo mode is active" : "Demo mode is off"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
              {status.active
                ? `Normal workflow locks are relaxed until ${new Date(
                    status.expiresAt!,
                  ).toLocaleString()}. Permanent safeguards remain enforced.`
                : "Use a short, reviewed window when presentation data must be rearranged quickly. Normal safeguards return immediately when the window ends."}
            </p>
            {status.state === "expired" ? (
              <p className="mt-2 text-sm font-medium text-amber-800">
                The previous Demo mode window expired. Normal safeguards are
                active.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {!status.available ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Demo mode activation is unavailable in this deployment. Existing
          status can still be reviewed, but a deployment operator must enable
          availability.
        </section>
      ) : status.active ? (
        <AdminSectionCard
          title="End the presentation window"
          description="Deactivation is immediate and does not require the password again. The exact phrase prevents accidental clicks."
          density="compact"
        >
          <div className="max-w-lg space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="demo-deactivation-confirmation">
                Type DISABLE DEMO MODE
              </Label>
              <Input
                id="demo-deactivation-confirmation"
                value={deactivationConfirmation}
                autoComplete="off"
                onChange={(event) =>
                  setDeactivationConfirmation(event.target.value)
                }
              />
            </div>
            <Button
              ref={deactivationButtonRef}
              type="button"
              variant="outline"
              disabled={
                mutating || deactivationConfirmation !== "DISABLE DEMO MODE"
              }
              onClick={() => void submitDeactivation()}
            >
              Deactivate Demo mode
            </Button>
          </div>
        </AdminSectionCard>
      ) : (
        <AdminSectionCard
          title="Open a controlled presentation window"
          description="Complete every check. The backend uses its own clock and current state version before enabling any relaxed rule."
          density="compact"
        >
          <div className="max-w-2xl space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="demo-duration">Window length</Label>
                <select
                  id="demo-duration"
                  className="h-10 w-full rounded-md border border-[var(--admin-outline-strong)] bg-white px-3 text-sm"
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(
                      Number(event.target.value) as 15 | 30 | 60 | 120,
                    )
                  }
                >
                  {[15, 30, 60, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-reason">Reason for Demo mode</Label>
                <Input
                  id="demo-reason"
                  value={reason}
                  minLength={10}
                  maxLength={240}
                  onChange={(event) => setReason(event.target.value)}
                />
                <p className="text-xs text-[var(--admin-text-muted)]">
                  10–240 characters; stored in the audit trail.
                </p>
              </div>
            </div>

            <fieldset className="space-y-2 border-y border-[var(--admin-outline)] py-4">
              <legend className="mb-1 text-sm font-semibold text-[var(--admin-text-strong)]">
                Confirm the scope
              </legend>
              {acknowledgementOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-2.5 text-sm leading-5 text-[var(--admin-text-strong)]"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-red-700"
                    checked={acknowledgements.includes(option.value)}
                    onChange={() => toggleAcknowledgement(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="demo-password">Current password</Label>
                <Input
                  id="demo-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-confirmation">Type ENABLE DEMO MODE</Label>
                <Input
                  id="demo-confirmation"
                  value={confirmation}
                  autoComplete="off"
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </div>

            <Button
              ref={activationButtonRef}
              type="button"
              disabled={mutating || !activationReady}
              onClick={() => void submitActivation()}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Activate Demo mode
            </Button>
          </div>
        </AdminSectionCard>
      )}

      <div aria-live="polite" className="text-sm font-medium text-red-800">
        {actionMessage ?? error}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard
          title="Temporarily relaxed"
          description="Only these named workflow rules can change during an active window."
          density="compact"
        >
          <RuleList rules={status.relaxedRules} />
        </AdminSectionCard>
        <AdminSectionCard
          title="Always protected"
          description="These controls remain active in every mode."
          action={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
          density="compact"
        >
          <RuleList rules={status.protectedRules} />
        </AdminSectionCard>
      </div>
    </div>
  );
}
