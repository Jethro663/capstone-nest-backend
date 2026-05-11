type ApiErrorShape = {
  response?: {
    data?: {
      message?: unknown;
      error?: unknown;
    };
  };
  message?: unknown;
};

function normalizeErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeErrorMessage(entry))
      .filter((entry): entry is string => Boolean(entry));
    return normalized.length > 0 ? normalized.join('; ') : null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedMessage = normalizeErrorMessage(record.message);
    if (nestedMessage) return nestedMessage;
    const nestedError = normalizeErrorMessage(record.error);
    if (nestedError) return nestedError;
  }

  return null;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiError = error as ApiErrorShape | null;
  const responseMessage = normalizeErrorMessage(apiError?.response?.data?.message);
  if (responseMessage) return responseMessage;

  const responseError = normalizeErrorMessage(apiError?.response?.data?.error);
  if (responseError) return responseError;

  const topLevelMessage = normalizeErrorMessage(apiError?.message);
  if (topLevelMessage) return topLevelMessage;

  return (
    fallback
  );
}
