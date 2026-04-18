export const AUTH_REFRESH_TIMEOUT_MS = 5_000;
export const AUTH_ME_TIMEOUT_MS = 5_000;
export const AUTH_ME_RETRY_DELAY_MS = 300;

export function shouldBootstrapAuth(pathname: string | null): boolean {
  return pathname === '/dashboard' || pathname?.startsWith('/dashboard/') || false;
}
