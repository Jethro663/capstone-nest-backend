import { normalizeApiError } from "./errors";
import type { ApiEnvelope } from "../types/api";

export function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeObject<T extends object>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return {
    ...fallback,
    ...(value as Partial<T>),
  };
}

export function toAppError(error: unknown) {
  return normalizeApiError(error);
}
