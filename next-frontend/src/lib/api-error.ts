type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
      error?: unknown;
      statusCode?: unknown;
      code?: unknown;
      errors?: unknown;
      fieldErrors?: unknown;
    };
  };
  message?: unknown;
};

export type ApiErrorEvidence = {
  statusCode?: number;
  code?: string;
  message: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
};

function normalizeErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeErrorMessage(entry))
      .filter((entry): entry is string => Boolean(entry));
    return normalized.length > 0 ? normalized.join("; ") : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedMessage = normalizeErrorMessage(record.message);
    if (nestedMessage) return nestedMessage;
    const nestedError = normalizeErrorMessage(record.error);
    if (nestedError) return nestedError;
  }

  return null;
}

export function getApiErrorEvidence(
  error: unknown,
  fallback: string,
): ApiErrorEvidence {
  const apiError = error as ApiErrorShape | null;
  const payload = apiError?.response?.data;
  const responseMessage = normalizeErrorMessage(
    apiError?.response?.data?.message,
  );
  const responseError = normalizeErrorMessage(apiError?.response?.data?.error);
  const topLevelMessage = normalizeErrorMessage(apiError?.message);
  const errors = Array.isArray(payload?.errors)
    ? payload.errors
        .map((entry) => normalizeErrorMessage(entry))
        .filter((entry): entry is string => Boolean(entry))
    : Array.isArray(payload?.message)
      ? payload.message
          .map((entry) => normalizeErrorMessage(entry))
          .filter((entry): entry is string => Boolean(entry))
      : undefined;
  const fieldErrors = Array.isArray(payload?.fieldErrors)
    ? payload.fieldErrors.reduce<Record<string, string[]>>((result, issue) => {
        if (!issue || typeof issue !== "object") return result;
        const record = issue as Record<string, unknown>;
        if (
          typeof record.field !== "string" ||
          typeof record.message !== "string"
        ) {
          return result;
        }
        result[record.field] = [
          ...(result[record.field] ?? []),
          record.message,
        ];
        return result;
      }, {})
    : undefined;
  const payloadStatus = Number(payload?.statusCode);

  return {
    statusCode: Number.isFinite(payloadStatus)
      ? payloadStatus
      : apiError?.response?.status,
    code: typeof payload?.code === "string" ? payload.code : undefined,
    message:
      responseMessage ??
      responseError ??
      topLevelMessage ??
      errors?.[0] ??
      fallback,
    errors: errors?.length ? errors : undefined,
    fieldErrors:
      fieldErrors && Object.keys(fieldErrors).length ? fieldErrors : undefined,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorEvidence(error, fallback).message;
}
