"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth-service";
import { hasEdgeWhitespace, sanitizePasswordInput } from "@/lib/input-policy";
import { changePasswordSchema, passwordStrengthChecks } from "@/schemas/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function ProfileSecurityCard({
  appearance = "student",
  layout = "default",
}: {
  appearance?: "student" | "teacher" | "admin";
  layout?: "default" | "teacher-parity";
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const isTeacher = appearance === "teacher";
  const isAdmin = appearance === "admin";
  const isTeacherParity = isTeacher && layout === "teacher-parity";
  const passwordChecks = useMemo(
    () =>
      passwordStrengthChecks.map((check) => ({
        ...check,
        passed: check.test(newPassword),
      })),
    [newPassword],
  );
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const currentPasswordHasEdgeWhitespace =
    oldPassword.length > 0 && hasEdgeWhitespace(oldPassword);
  const newPasswordHasEdgeWhitespace =
    newPassword.length > 0 && hasEdgeWhitespace(newPassword);
  const confirmPasswordHasEdgeWhitespace =
    confirmPassword.length > 0 && hasEdgeWhitespace(confirmPassword);

  const handleChangePassword = async () => {
    const result = changePasswordSchema.safeParse({
      oldPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const nextErrors = result.error.flatten().fieldErrors;
      setSubmitErrors({
        oldPassword: nextErrors.oldPassword?.[0],
        newPassword: nextErrors.newPassword?.[0],
        confirmPassword: nextErrors.confirmPassword?.[0],
      });
      toast.error(
        nextErrors.oldPassword?.[0] ??
          nextErrors.newPassword?.[0] ??
          nextErrors.confirmPassword?.[0] ??
          "Please review your password details",
      );
      return;
    }

    try {
      setChangingPw(true);
      setSubmitErrors({});
      await changePassword({ oldPassword, newPassword, confirmPassword });
      toast.success("Password changed");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSubmitErrors({});
    } catch (error) {
      const message = getErrorMessage(error, "Failed to change password");
      if (message.toLowerCase().includes("current password")) {
        setSubmitErrors((current) => ({
          ...current,
          oldPassword: message,
        }));
      }
      toast.error(message);
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[1.5rem]",
        isTeacherParity
          ? "rounded-[1.65rem] border border-[#d7deea] bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)]"
          : isTeacher
            ? "teacher-panel teacher-panel-hover"
            : isAdmin
              ? "admin-panel"
              : "student-panel student-panel-hover",
      )}
    >
      <div
        className={cn(
          "border-b px-6 py-4",
          isTeacherParity
            ? "border-[#e1e7f0] bg-white"
            : isTeacher
              ? "border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)]"
              : isAdmin
                ? "border-[var(--admin-outline)] bg-[var(--admin-surface-soft)]"
                : "border-[var(--student-outline)] bg-[var(--student-surface-soft)]",
        )}
      >
        <h3
          className={cn(
            "flex items-center gap-2",
            isTeacherParity
              ? "text-[2.03rem] font-semibold tracking-tight text-[#0d2345]"
              : isTeacher
                ? "text-sm font-black uppercase tracking-widest text-[var(--teacher-text-strong)]"
                : isAdmin
                  ? "text-sm font-black uppercase tracking-widest text-[var(--admin-text-strong)]"
                  : "text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]",
          )}
        >
          <Lock
            className={cn(
              isTeacherParity ? "h-6 w-6 text-[#ef0018]" : "h-4 w-4",
              isTeacher && !isTeacherParity
                ? "text-[var(--teacher-accent)]"
                : isAdmin
                  ? "text-[var(--admin-accent)]"
                  : !isTeacherParity
                    ? "text-[var(--student-accent)]"
                    : undefined,
            )}
          />
          {isTeacherParity ? "Password & Security" : "Security"}
        </h3>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label
            htmlFor="currentPassword"
            className={cn(
              isTeacherParity
                ? "text-[1.02rem] font-medium text-[#2d4c77]"
                : "text-[10px] font-black uppercase",
              isTeacher && !isTeacherParity
                ? "text-[var(--teacher-text-muted)]"
                : isAdmin
                  ? "text-[var(--admin-text-muted)]"
                  : !isTeacherParity
                    ? "text-[var(--student-text-muted)]"
                    : undefined,
            )}
          >
            Current Password
          </Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showOldPassword ? "text" : "password"}
              className={cn(
                isTeacherParity
                  ? "h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 pr-12 text-[1.02rem] text-[#0f2748]"
                  : "rounded-xl pr-12",
                isTeacher && !isTeacherParity
                  ? "teacher-input"
                  : isAdmin
                    ? "admin-input"
                    : !isTeacherParity
                      ? "student-input"
                      : undefined,
              )}
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(sanitizePasswordInput(e.target.value));
                setSubmitErrors((current) => ({
                  ...current,
                  oldPassword: undefined,
                }));
              }}
            />
            <PasswordVisibilityButton
              visible={showOldPassword}
              label="current password"
              onClick={() => setShowOldPassword((current) => !current)}
            />
          </div>
          {submitErrors.oldPassword ? (
            <p className="text-xs text-rose-600">{submitErrors.oldPassword}</p>
          ) : currentPasswordHasEdgeWhitespace ? (
            <p className="text-xs text-amber-600">
              Leading or trailing spaces will be kept as part of your password.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="newPassword"
            className={cn(
              isTeacherParity
                ? "text-[1.02rem] font-medium text-[#2d4c77]"
                : "text-[10px] font-black uppercase",
              isTeacher && !isTeacherParity
                ? "text-[var(--teacher-text-muted)]"
                : isAdmin
                  ? "text-[var(--admin-text-muted)]"
                  : !isTeacherParity
                    ? "text-[var(--student-text-muted)]"
                    : undefined,
            )}
          >
            New Password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              className={cn(
                isTeacherParity
                  ? "h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 pr-12 text-[1.02rem] text-[#0f2748]"
                  : "rounded-xl pr-12",
                isTeacher && !isTeacherParity
                  ? "teacher-input"
                  : isAdmin
                    ? "admin-input"
                    : !isTeacherParity
                      ? "student-input"
                      : undefined,
              )}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(sanitizePasswordInput(e.target.value));
                setSubmitErrors((current) => ({
                  ...current,
                  newPassword: undefined,
                }));
              }}
            />
            <PasswordVisibilityButton
              visible={showNewPassword}
              label="new password"
              onClick={() => setShowNewPassword((current) => !current)}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {passwordChecks.map(({ label, passed }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                  passed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {passed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {label}
              </span>
            ))}
          </div>
          {submitErrors.newPassword ? (
            <p className="text-xs text-rose-600">{submitErrors.newPassword}</p>
          ) : newPasswordHasEdgeWhitespace ? (
            <p className="text-xs text-amber-600">
              Leading or trailing spaces will be kept as part of your password.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="confirmNewPassword"
            className={cn(
              isTeacherParity
                ? "text-[1.02rem] font-medium text-[#2d4c77]"
                : "text-[10px] font-black uppercase",
              isTeacher && !isTeacherParity
                ? "text-[var(--teacher-text-muted)]"
                : isAdmin
                  ? "text-[var(--admin-text-muted)]"
                  : !isTeacherParity
                    ? "text-[var(--student-text-muted)]"
                    : undefined,
            )}
          >
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirmNewPassword"
              type={showConfirmPassword ? "text" : "password"}
              className={cn(
                isTeacherParity
                  ? "h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 pr-12 text-[1.02rem] text-[#0f2748]"
                  : "rounded-xl pr-12",
                isTeacher && !isTeacherParity
                  ? "teacher-input"
                  : isAdmin
                    ? "admin-input"
                    : !isTeacherParity
                      ? "student-input"
                      : undefined,
              )}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(sanitizePasswordInput(e.target.value));
                setSubmitErrors((current) => ({
                  ...current,
                  confirmPassword: undefined,
                }));
              }}
            />
            <PasswordVisibilityButton
              visible={showConfirmPassword}
              label="confirm new password"
              onClick={() => setShowConfirmPassword((current) => !current)}
            />
          </div>
          {confirmPassword ? (
            <p
              className={cn(
                "text-xs",
                passwordsMatch ? "text-emerald-700" : "text-rose-600",
              )}
            >
              {passwordsMatch ? "Passwords match." : "Passwords do not match."}
            </p>
          ) : null}
          {submitErrors.confirmPassword ? (
            <p className="text-xs text-rose-600">
              {submitErrors.confirmPassword}
            </p>
          ) : confirmPasswordHasEdgeWhitespace ? (
            <p className="text-xs text-amber-600">
              Leading or trailing spaces will be kept as part of your password.
            </p>
          ) : null}
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={changingPw}
          className={cn(
            isTeacherParity
              ? "mt-1 inline-flex h-[46px] min-w-[204px] rounded-full bg-[#ef0018] px-7 text-[1.04rem] font-semibold text-white hover:bg-[#da0016]"
              : "mt-2 w-full rounded-xl font-bold transition-all",
            isTeacher && !isTeacherParity
              ? "teacher-button-outline"
              : isAdmin
                ? "admin-button-outline"
                : !isTeacherParity
                  ? "student-button-outline"
                  : undefined,
          )}
          variant={isTeacherParity ? "default" : "outline"}
        >
          {changingPw ? "Processing..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordVisibilityButton({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      onClick={onClick}
      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5f7698] transition-colors hover:bg-[#e8eef7] hover:text-[#16335f]"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
