import {
  studentParityRouteNames,
  studentRouteManifest,
  studentSupportRouteNames,
  type StudentParityRouteName,
  type StudentSupportRouteName,
} from "../navigation/student-route-manifest";
import {
  teacherParityRouteNames,
  teacherRouteManifest,
  teacherStackRouteNames,
  teacherTabRouteNames,
  teacherWebRouteMappings,
  type TeacherParityRouteName,
  type TeacherStackRouteName,
  type TeacherTabRouteName,
} from "../navigation/teacher-route-manifest";

export type StudentParityRouteInventoryEntry = {
  name: StudentParityRouteName;
  kind: "tab" | "stack";
};

export const studentParityRouteInventory = [
  ...studentRouteManifest.tabs.map((name) => ({ name, kind: "tab" as const })),
  ...studentRouteManifest.stack.map((name) => ({ name, kind: "stack" as const })),
] as const satisfies ReadonlyArray<StudentParityRouteInventoryEntry>;

export const studentParityRouteInventoryNames = studentParityRouteNames;

export type StudentSupportRouteInventoryEntry = {
  name: StudentSupportRouteName;
  kind: "stack";
};

export const studentSupportRouteInventory = [
  ...studentRouteManifest.support.map((name) => ({ name, kind: "stack" as const })),
] as const satisfies ReadonlyArray<StudentSupportRouteInventoryEntry>;

export const studentSupportRouteInventoryNames = studentSupportRouteNames;

export type TeacherParityRouteInventoryEntry =
  | {
      name: TeacherTabRouteName;
      kind: "tab";
    }
  | {
      name: TeacherStackRouteName;
      kind: "stack";
    };

export const teacherParityRouteInventory = [
  ...teacherRouteManifest.tabs.map((name) => ({ name, kind: "tab" as const })),
  ...teacherRouteManifest.stack.map((name) => ({ name, kind: "stack" as const })),
] as const satisfies ReadonlyArray<TeacherParityRouteInventoryEntry>;

export const teacherParityRouteInventoryNames = teacherParityRouteNames;
export const teacherMountedTabRouteNames = teacherTabRouteNames;
export const teacherMountedStackRouteNames = teacherStackRouteNames;
export const teacherWebParityMappings = teacherWebRouteMappings;

export function resolveInitialLxpClassId(params: {
  selectedClassId?: string | null;
  eligibleClassId?: string | null;
  tutorSelectedClassId?: string | null;
  fallbackClassId?: string | null;
}): string | undefined {
  if (params.selectedClassId) return params.selectedClassId;
  return (
    params.eligibleClassId ||
    params.tutorSelectedClassId ||
    params.fallbackClassId ||
    undefined
  );
}

export function resolveInitialTutorClassId(params: {
  selectedClassId?: string | null;
  bootstrapSelectedClassId?: string | null;
  bootstrapFirstClassId?: string | null;
}): string | undefined {
  if (params.selectedClassId) return params.selectedClassId;
  return params.bootstrapSelectedClassId || params.bootstrapFirstClassId || undefined;
}

export function canSendTutorMessage(
  activeSessionId: string | undefined,
  message: string,
): boolean {
  return Boolean(activeSessionId && message.trim());
}

export function buildTutorAnswerPayload(
  questionIds: string[],
  answersByQuestionId: Record<string, string>,
): string[] {
  return questionIds.map((questionId) => answersByQuestionId[questionId] || '');
}

export function canSubmitTutorAnswers(
  questionIds: string[],
  answersByQuestionId: Record<string, string>,
): boolean {
  return questionIds.some((questionId) => {
    const answer = answersByQuestionId[questionId];
    return typeof answer === "string" && answer.trim().length > 0;
  });
}

export function buildProfileFullName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const name = [params.firstName, params.lastName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');

  if (name) return name;
  if (params.email && params.email.trim()) return params.email.trim();
  return 'Student';
}

function hasNonEmptyValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return Boolean(value);
}

export function computeProfileReadiness(params: {
  phone?: string | null;
  address?: string | null;
  familyName?: string | null;
  familyRelationship?: string | null;
  familyContact?: string | null;
  profilePicture?: string | null;
}): number {
  const checkpoints = [
    params.phone,
    params.address,
    params.familyName,
    params.familyRelationship,
    params.familyContact,
    params.profilePicture,
  ];
  const completeCount = checkpoints.filter(hasNonEmptyValue).length;
  return Math.round((completeCount / checkpoints.length) * 100);
}

export type DevLoginSeed = {
  email: string;
  password: string;
  autoLogin: boolean;
};

function parseBooleanFlag(value: boolean | string | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

export function resolveDevLoginSeed(params: {
  isDev: boolean;
  allowNonDevSeed?: boolean;
  email?: string | null;
  password?: string | null;
  autoLogin?: boolean | string | null;
}): DevLoginSeed | null {
  if (!params.isDev && !params.allowNonDevSeed) return null;

  const email = typeof params.email === "string" ? params.email.trim() : "";
  const password = typeof params.password === "string" ? params.password : "";

  if (!email || !password.trim()) {
    return null;
  }

  return {
    email,
    password,
    autoLogin: parseBooleanFlag(params.autoLogin),
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpCodePattern = /^\d{6}$/;

let authNoticeMessage: string | null = null;

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAuthEmail(value: string): boolean {
  return emailPattern.test(normalizeAuthEmail(value));
}

export function isValidOtpCode(value: string): boolean {
  return otpCodePattern.test(value.trim());
}

export function normalizeOtpCode(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 6);
}

export type PasswordRuleState = {
  label: string;
  passed: boolean;
};

export function buildPasswordRuleStates(password: string): PasswordRuleState[] {
  return [
    { label: "8+ chars", passed: password.length >= 8 },
    { label: "Uppercase", passed: /[A-Z]/.test(password) },
    { label: "Lowercase", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Special", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return buildPasswordRuleStates(password).every((rule) => rule.passed);
}

export function getPasswordValidationMessage(password: string): string | null {
  if (!password.trim()) {
    return "Password is required.";
  }

  if (!isStrongPassword(password)) {
    return "Use at least 8 characters with uppercase, lowercase, number, and special character.";
  }

  return null;
}

export function getConfirmPasswordMessage(password: string, confirmPassword: string): string | null {
  if (!confirmPassword.trim()) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function pushAuthNotice(message: string) {
  authNoticeMessage = message.trim() || null;
}

export function consumeAuthNotice(): string | null {
  const message = authNoticeMessage;
  authNoticeMessage = null;
  return message;
}
