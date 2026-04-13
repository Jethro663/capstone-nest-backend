import axios from 'axios';
import { AUTH_REFRESH_TIMEOUT_MS } from './auth-bootstrap';

interface RefreshSessionOptions {
  timeout?: number;
}

export async function refreshSessionAccessToken(
  options: RefreshSessionOptions = {},
): Promise<string | null> {
  const { timeout = AUTH_REFRESH_TIMEOUT_MS } = options;
  const response = await axios.post(
    '/api/auth/refresh',
    {},
    {
      withCredentials: true,
      timeout,
    },
  );

  return response.data?.data?.accessToken ?? response.data?.accessToken ?? null;
}
