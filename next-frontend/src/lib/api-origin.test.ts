import {
  getBrowserSocketOrigin,
  getFrontendApiOrigin,
  getServerApiOrigin,
} from './api-origin';

describe('getFrontendApiOrigin', () => {
  it('defaults to the IPv4-safe local backend origin', () => {
    expect(getFrontendApiOrigin()).toBe(window.location.origin);
  });

  it('rejects docker-internal backend host values for browser usage', () => {
    expect(getFrontendApiOrigin('http://backend:3000')).toBe(window.location.origin);
  });

  it('honors public frontend origins when provided', () => {
    expect(getFrontendApiOrigin('https://nexora.example.com')).toBe(
      'https://nexora.example.com',
    );
  });
});

describe('getServerApiOrigin', () => {
  it('returns backend internal origin when provided', () => {
    expect(getServerApiOrigin('http://backend:3000')).toBe(
      'http://backend:3000',
    );
  });
});

describe('getBrowserSocketOrigin', () => {
  it('prefers explicit public websocket origin', () => {
    expect(
      getBrowserSocketOrigin(
        'https://ws.nexora.example.com',
        'http://127.0.0.1:3000',
      ),
    ).toBe('https://ws.nexora.example.com');
  });

  it('falls back to NEXT_PUBLIC_API_URL when websocket origin is missing', () => {
    expect(getBrowserSocketOrigin(undefined, 'http://127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000',
    );
  });

  it('rejects docker-internal hostnames and uses window origin', () => {
    expect(getBrowserSocketOrigin('http://backend:3000', 'http://backend:3000')).toBe(
      window.location.origin,
    );
  });
});
