const LOCAL_BACKEND_ORIGIN = 'http://127.0.0.1:3000';

export function getFrontendApiOrigin(
  configuredOrigin = process.env.NEXT_PUBLIC_API_URL,
): string {
  return configuredOrigin || LOCAL_BACKEND_ORIGIN;
}

export { LOCAL_BACKEND_ORIGIN };
