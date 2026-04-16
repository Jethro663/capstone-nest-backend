export const AUTH_REFRESH_TIMEOUT_MS = 2_500;
export const AUTH_ME_TIMEOUT_MS = 1_500;

export function shouldBootstrapAuth(pathname: string | null): boolean {
  return pathname === '/dashboard' || pathname?.startsWith('/dashboard/') || false;
}
