import axios from 'axios';
import { AUTH_REFRESH_TIMEOUT_MS } from './auth-bootstrap';

interface RefreshSessionOptions {
  timeout?: number;
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }
  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return undefined;
  }
  return typeof response.status === 'number' ? response.status : undefined;
}

let sharedRefreshPromise: Promise<string | null> | null = null;

export async function refreshSessionAccessToken(
  options: RefreshSessionOptions = {},
): Promise<string | null> {
  if (sharedRefreshPromise) {
    return sharedRefreshPromise;
  }

  const { timeout = AUTH_REFRESH_TIMEOUT_MS } = options;

  sharedRefreshPromise = (async () => {
    try {
      const response = await axios.post(
        '/api/auth/refresh',
        {},
        {
          withCredentials: true,
          timeout,
        },
      );
      return (
        response.data?.data?.accessToken ??
        response.data?.accessToken ??
        null
      );
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401 || status === 403) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        const response = await axios.post(
          '/api/auth/refresh',
          {},
          {
            withCredentials: true,
            timeout,
          },
        );
        return (
          response.data?.data?.accessToken ??
          response.data?.accessToken ??
          null
        );
      } catch {
        return null;
      }
    }
  })().finally(() => {
    sharedRefreshPromise = null;
  });

  return sharedRefreshPromise;
}
