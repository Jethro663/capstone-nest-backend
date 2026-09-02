import type { ChangePasswordPayload } from "../types/auth";

export type PasswordChangeErrors = Partial<Record<keyof ChangePasswordPayload, string>>;

export function validatePasswordChange(payload: ChangePasswordPayload): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};
  if (!payload.oldPassword) errors.oldPassword = "Current password is required.";
  if (/^\s|\s$/.test(payload.oldPassword)) errors.oldPassword = "Current password cannot start or end with spaces.";
  if (payload.newPassword.length < 8) errors.newPassword = "Use at least 8 characters.";
  else if (!/[A-Z]/.test(payload.newPassword)) errors.newPassword = "Add an uppercase letter.";
  else if (!/[a-z]/.test(payload.newPassword)) errors.newPassword = "Add a lowercase letter.";
  else if (!/\d/.test(payload.newPassword)) errors.newPassword = "Add a number.";
  else if (!/[^A-Za-z0-9]/.test(payload.newPassword)) errors.newPassword = "Add a special character.";
  else if (/^\s|\s$/.test(payload.newPassword)) errors.newPassword = "New password cannot start or end with spaces.";
  if (payload.confirmPassword !== payload.newPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function isProfileIncomplete(user?: { firstName?: string | null; lastName?: string | null } | null) {
  return Boolean(user && (!user.firstName?.trim() || !user.lastName?.trim()));
}
