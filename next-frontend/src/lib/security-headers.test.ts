import { baselineSecurityHeaders, contentSecurityPolicy } from './security-headers';

describe('browser security policy', () => {
  it('authorizes only nonce-bearing production scripts without eval or inline exceptions', () => {
    const policy = contentSecurityPolicy('per-request-token', true);
    expect(policy).toContain("script-src 'self' 'nonce-per-request-token' 'strict-dynamic'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).not.toContain('unsafe-eval');
    expect(policy.split('; ').find((part) => part.startsWith('script-src '))).not.toContain('unsafe-inline');
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it('preserves lesson videos and local document previews without allowing arbitrary frame hosts', () => {
    const policy = contentSecurityPolicy('nonce', true);
    expect(policy).toContain("frame-src 'self' blob: https://www.youtube.com");
    expect(policy).toContain("img-src 'self' blob: data:");
    expect(policy).toContain("connect-src 'self';");
    expect(policy).not.toContain('*');
    const permissions = baselineSecurityHeaders(true).find((entry) => entry.key === 'Permissions-Policy')!.value;
    expect(permissions).toContain('camera=()');
    expect(permissions).toContain('fullscreen=(self "https://www.youtube.com")');
  });

  it('does not force HTTPS or production transport persistence on localhost', () => {
    expect(contentSecurityPolicy('nonce', false)).not.toContain('upgrade-insecure-requests');
    expect(baselineSecurityHeaders(false).some((entry) => entry.key === 'Strict-Transport-Security')).toBe(false);
    expect(baselineSecurityHeaders(true).find((entry) => entry.key === 'Strict-Transport-Security')!.value).toBe('max-age=31536000; includeSubDomains');
  });

  it('allows only the configured notification origin and its secure websocket counterpart', () => {
    const policy = contentSecurityPolicy('nonce', true, 'https://notifications.example.test/api');
    expect(policy).toContain("connect-src 'self' https://notifications.example.test wss://notifications.example.test;");
    expect(() => contentSecurityPolicy('nonce', true, 'http://notifications.example.test')).toThrow();
  });
});
