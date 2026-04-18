import {
  studentParityRouteNames,
  studentRouteManifest,
  studentSupportRouteNames,
  type StudentParityRouteName,
  type StudentSupportRouteName,
} from "../navigation/student-route-manifest";

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
  email?: string | null;
  password?: string | null;
  autoLogin?: boolean | string | null;
}): DevLoginSeed | null {
  if (!params.isDev) return null;

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
