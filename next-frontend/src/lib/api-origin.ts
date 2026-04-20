const LOCAL_BACKEND_ORIGIN = 'http://127.0.0.1:3000';

function isDockerInternalHostname(origin: string) {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'backend';
  } catch {
    return false;
  }
}

export function getFrontendApiOrigin(
  configuredOrigin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL,
): string {
  if (configuredOrigin && !isDockerInternalHostname(configuredOrigin)) {
    return configuredOrigin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://127.0.0.1:3000';
}

export function getServerApiOrigin(
  configuredOrigin =
    process.env.BACKEND_INTERNAL_URL ??
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL,
): string {
  return configuredOrigin || LOCAL_BACKEND_ORIGIN;
}

export { LOCAL_BACKEND_ORIGIN };
