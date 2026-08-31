import axios from "axios";
import type { AppError, ErrorPresentationPayload, FieldErrorMap } from "../types/api";

let globalPresenter: ((payload: ErrorPresentationPayload) => void) | null = null;

export function setGlobalErrorPresenter(presenter: (payload: ErrorPresentationPayload) => void) {
  globalPresenter = presenter;
}

export function clearGlobalErrorPresenter() {
  globalPresenter = null;
}

export function presentGlobalError(payload: ErrorPresentationPayload) {
  globalPresenter?.(payload);
}

type NormalizeApiErrorOptions = {
  present?: boolean;
};

function toFieldErrors(message: unknown): FieldErrorMap | undefined {
  if (!message || typeof message !== "object") return undefined;
  return message as FieldErrorMap;
}

export function normalizeApiError(error: unknown, options?: NormalizeApiErrorOptions): AppError {
  if (!axios.isAxiosError(error)) {
    return {
      title: "Unexpected Error",
      message: "The app hit an unexpected state.",
      shouldShowModal: true,
    };
  }

  const status = error.response?.status;
  const payload = error.response?.data as
    | { message?: string | string[] | FieldErrorMap; error?: string; code?: string; errors?: string[]; fieldErrors?: Array<{ field: string; message: string }> }
    | undefined;

  const details = payload?.errors ?? (Array.isArray(payload?.message)
    ? payload.message
    : typeof payload?.message === "string"
      ? [payload.message]
      : undefined);

  const fieldErrors = Array.isArray(payload?.fieldErrors) ? Object.fromEntries(payload.fieldErrors.map(issue => [issue.field, [issue.message]])) :
    payload?.message && typeof payload.message === "object" && !Array.isArray(payload.message)
      ? toFieldErrors(payload.message)
      : undefined;

  const message =
    typeof payload?.message === "string"
      ? payload.message
      : details?.[0] || error.message || "The request could not be completed.";

  const appError: AppError = {
    status,
    code: payload?.code,
    title:
      status === 409
        ? "Save conflict or academic restriction"
        : status === 401
        ? "Session Expired"
        : status === 403
          ? "Access Denied"
          : status === 404
            ? "Not Found"
            : status === 422 || status === 400
              ? "Validation Failed"
              : error.code === "ERR_NETWORK"
                ? "Network Error"
                : "Request Failed",
    message,
    details,
    fieldErrors,
    isNetworkError: error.code === "ERR_NETWORK",
    shouldShowModal: error.code === "ERR_NETWORK" || (status !== undefined && status >= 500) || status === 404,
  };

  if (options?.present !== false && appError.shouldShowModal) {
    presentGlobalError({
      title: appError.title,
      message: appError.message,
      details: appError.details,
    });
  }

  return appError;
}
