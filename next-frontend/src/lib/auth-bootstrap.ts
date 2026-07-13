export const AUTH_REFRESH_TIMEOUT_MS = 5_000;
export const AUTH_ME_TIMEOUT_MS = 5_000;
export const AUTH_ME_RETRY_DELAY_MS = 300;

export async function settleWithTimeout<T>(
  primary: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      primary,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export function shouldBootstrapAuth(pathname: string | null): boolean {
  return pathname === '/dashboard' || pathname?.startsWith('/dashboard/') || false;
}
