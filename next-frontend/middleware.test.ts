/** @jest-environment node */

import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function createRequest(url: string, refreshToken?: string) {
  const headers = refreshToken
    ? { cookie: `refreshToken=${refreshToken}` }
    : undefined;
  return new NextRequest(url, { headers });
}

describe('middleware', () => {
  it('redirects the root route to login when no session cookie exists', () => {
    const response = middleware(createRequest('http://localhost:3001/'));

    expect(response.headers.get('location')).toBe('http://localhost:3001/login');
  });

  it('redirects login to dashboard when a refresh cookie exists', () => {
    const response = middleware(
      createRequest('http://localhost:3001/login', 'refresh-token'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/dashboard',
    );
  });

  it('redirects protected routes to login with a from param when unauthenticated', () => {
    const response = middleware(
      createRequest('http://localhost:3001/dashboard/student'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/login?from=%2Fdashboard%2Fstudent',
    );
  });

  it('allows protected routes through when a refresh cookie exists', () => {
    const response = middleware(
      createRequest('http://localhost:3001/dashboard/student', 'refresh-token'),
    );

    expect(response.headers.get('location')).toBeNull();
  });
});
