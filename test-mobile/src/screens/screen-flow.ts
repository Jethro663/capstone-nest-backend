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
  familyContact?: string | null;
  profilePicture?: string | null;
}): number {
  const checkpoints = [
    params.phone,
    params.address,
    params.familyName,
    params.familyContact,
    params.profilePicture,
  ];
  const completeCount = checkpoints.filter(hasNonEmptyValue).length;
  return Math.round((completeCount / checkpoints.length) * 100);
}
