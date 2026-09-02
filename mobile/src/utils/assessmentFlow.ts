import type { AssessmentQuestion } from "../types/assessment";

export type AnswerValue = string | string[];

export type DraftResponse = {
  questionId: string;
  studentAnswer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
};

export type UploadCandidate = {
  name: string;
  size?: number | null;
  mimeType?: string | null;
  uri?: string;
};

export type UploadBundleRules = {
  maxBytes: number;
  allowedExtensions?: string[] | null;
  allowedMimeTypes?: string[] | null;
};

export const DEFAULT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

const OPTION_RESPONSE_TYPES = new Set(["multiple_choice", "true_false", "dropdown"]);

export function restoreDraftResponses(draftResponses: DraftResponse[] | undefined) {
  const restored: Record<string, AnswerValue> = {};

  for (const response of draftResponses ?? []) {
    if (response.selectedOptionIds?.length) {
      restored[response.questionId] = response.selectedOptionIds;
      continue;
    }

    if (response.selectedOptionId) {
      restored[response.questionId] = response.selectedOptionId;
      continue;
    }

    if (typeof response.studentAnswer === "string") {
      restored[response.questionId] = response.studentAnswer;
    }
  }

  return restored;
}

export function buildAssessmentResponses(
  questions: Pick<AssessmentQuestion, "id" | "type">[],
  answers: Record<string, AnswerValue>,
) {
  return questions.map((question) => {
    const value = answers[question.id];
    if (Array.isArray(value)) {
      return { questionId: question.id, selectedOptionIds: value };
    }

    if (OPTION_RESPONSE_TYPES.has(question.type)) {
      return { questionId: question.id, selectedOptionId: value as string | undefined };
    }

    return { questionId: question.id, studentAnswer: (value as string | undefined) || "" };
  });
}

function normalizeList(values?: string[] | null) {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function extensionFromName(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toLowerCase() : "";
}

export function validateUploadBundle(files: UploadCandidate[], rules: UploadBundleRules) {
  if (files.length === 0) {
    return { ok: false as const, reason: "Choose at least one file.", totalBytes: 0 };
  }

  const totalBytes = files.reduce((total, file) => total + Math.max(0, file.size ?? 0), 0);
  const maxBytes = rules.maxBytes || DEFAULT_UPLOAD_MAX_BYTES;
  if (totalBytes > maxBytes) {
    return { ok: false as const, reason: "Files must be 25 MB or smaller in total.", totalBytes };
  }

  const allowedExtensions = normalizeList(rules.allowedExtensions);
  const allowedMimeTypes = normalizeList(rules.allowedMimeTypes);

  for (const file of files) {
    const extension = extensionFromName(file.name);
    const mimeType = (file.mimeType ?? "").toLowerCase();

    if (allowedExtensions.length > 0 && extension && !allowedExtensions.includes(extension)) {
      return { ok: false as const, reason: `.${extension} is not allowed for this assessment.`, totalBytes };
    }

    if (allowedMimeTypes.length > 0 && mimeType && !allowedMimeTypes.includes(mimeType)) {
      return { ok: false as const, reason: `${mimeType} is not allowed for this assessment.`, totalBytes };
    }
  }

  return { ok: true as const, totalBytes };
}

export function resolveAttemptTimer(
  attempt: {
    expiresAt?: string | null;
    timeLimitMinutes?: number | null;
    startedAt?: string | null;
    createdAt?: string | null;
  },
  now = Date.now(),
) {
  if (attempt.expiresAt) {
    const expiresAt = new Date(attempt.expiresAt).getTime();
    if (!Number.isNaN(expiresAt)) {
      return { source: "server" as const, secondsRemaining: Math.max(0, Math.ceil((expiresAt - now) / 1000)) };
    }
  }

  if (attempt.timeLimitMinutes) {
    const start = new Date(attempt.startedAt || attempt.createdAt || now).getTime();
    const localExpiresAt = start + attempt.timeLimitMinutes * 60_000;
    return { source: "local" as const, secondsRemaining: Math.max(0, Math.ceil((localExpiresAt - now) / 1000)) };
  }

  return { source: "none" as const, secondsRemaining: null };
}

export function orderAttemptQuestions<T extends { id: string }>(
  questions: readonly T[],
  questionOrder?: readonly string[] | null,
) {
  if (!questionOrder?.length) return [...questions];

  const positions = new Map(questionOrder.map((id, index) => [id, index]));
  return questions
    .map((question, sourceIndex) => ({ question, sourceIndex }))
    .sort((left, right) => {
      const leftPosition = positions.get(left.question.id);
      const rightPosition = positions.get(right.question.id);
      if (leftPosition !== undefined && rightPosition !== undefined) return leftPosition - rightPosition;
      if (leftPosition !== undefined) return -1;
      if (rightPosition !== undefined) return 1;
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ question }) => question);
}

export function resolveQuestionTimer(
  timedQuestionsEnabled: boolean,
  currentQuestionDeadlineAt?: string | null,
  now = Date.now(),
) {
  if (!timedQuestionsEnabled || !currentQuestionDeadlineAt) {
    return { secondsRemaining: null, deadlineAt: null };
  }

  const deadline = new Date(currentQuestionDeadlineAt).getTime();
  if (Number.isNaN(deadline)) {
    return { secondsRemaining: null, deadlineAt: null };
  }

  return {
    secondsRemaining: Math.max(0, Math.ceil((deadline - now) / 1000)),
    deadlineAt: currentQuestionDeadlineAt,
  };
}

export function resolveCurrentQuestionIndex(serverIndex: number | null | undefined, questionCount: number) {
  if (questionCount <= 0) return 0;
  return Math.min(Math.max(serverIndex ?? 0, 0), questionCount - 1);
}

export function resolveQuestionDeadlineAction(currentIndex: number, questionCount: number) {
  return currentIndex >= Math.max(0, questionCount - 1) ? "submit" as const : "advance" as const;
}

export function resolveSubmittedAttemptState(attempt?: { isSubmitted?: boolean; violationCount?: number } | null) {
  const submitted = Boolean(attempt?.isSubmitted);
  return {
    submitted,
    locked: submitted || (attempt?.violationCount ?? 0) >= 3,
  };
}

export function resolveViolationState(currentCount: number) {
  const nextCount = Math.max(0, currentCount) + 1;
  return { nextCount, locked: nextCount >= 3 };
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}
