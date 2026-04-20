import { getFrontendApiOrigin, getServerApiOrigin } from './api-origin';

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
