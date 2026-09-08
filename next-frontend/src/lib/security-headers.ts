/** Browser policies belong to HTML responses, not rewritten backend JSON. */
export const permissionsPolicy =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), fullscreen=(self "https://www.youtube.com"), autoplay=(self "https://www.youtube.com")';

export function baselineSecurityHeaders(production: boolean) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: permissionsPolicy },
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : []),
  ];
}

export function contentSecurityPolicy(
  nonce: string,
  production: boolean,
  socketOrigin = process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL,
) {
  const connections = new Set<string>(["'self'"]);
  if (socketOrigin) {
    const parsed = new URL(socketOrigin);
    if (!['https:', 'wss:', ...(production ? [] : ['http:', 'ws:'])].includes(parsed.protocol)) {
      throw new Error('The browser socket origin must use a secure HTTP/WebSocket scheme in production');
    }
    connections.add(parsed.origin);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : parsed.protocol === 'http:' ? 'ws:' : parsed.protocol;
    connections.add(parsed.origin);
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${production ? " 'strict-dynamic'" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://upload.wikimedia.org",
    "font-src 'self' data:",
    `connect-src ${[...connections].join(' ')}${production ? '' : ' ws: http://localhost:* http://127.0.0.1:*'}`,
    "media-src 'self' blob:",
    "frame-src 'self' blob: https://www.youtube.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
