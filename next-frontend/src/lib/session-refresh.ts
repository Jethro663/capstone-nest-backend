import axios from 'axios';
import { AUTH_REFRESH_TIMEOUT_MS } from './auth-bootstrap';

interface RefreshSessionOptions {
  timeout?: number;
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
    } catch (err: any) {
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
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
