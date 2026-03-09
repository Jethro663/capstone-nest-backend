type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiError = error as ApiErrorShape | null;
  return (
    apiError?.response?.data?.message ||
    apiError?.message ||
    fallback
  );
}
