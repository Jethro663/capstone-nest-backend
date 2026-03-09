import { normalizeApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/api';

export function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export function toAppError(error: unknown) {
  return normalizeApiError(error);
}
