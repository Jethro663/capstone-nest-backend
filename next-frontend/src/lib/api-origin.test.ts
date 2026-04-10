import { getFrontendApiOrigin } from './api-origin';

describe('getFrontendApiOrigin', () => {
  it('defaults to the IPv4-safe local backend origin', () => {
    expect(getFrontendApiOrigin()).toBe('http://127.0.0.1:3000');
  });

  it('honors NEXT_PUBLIC_API_URL when provided', () => {
    expect(getFrontendApiOrigin('http://backend:3000')).toBe(
      'http://backend:3000',
    );
  });
});
