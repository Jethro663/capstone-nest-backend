import type { NextConfig } from 'next';

const RAILWAY_BACKEND_PUBLIC_ORIGIN =
  process.env.RAILWAY_SERVICE_CAPSTONE_BACKEND_V2_URL
    ? `https://${process.env.RAILWAY_SERVICE_CAPSTONE_BACKEND_V2_URL}`
    : undefined;

const DEFAULT_SERVER_API_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? 'https://capstone-backend-v2-production.up.railway.app'
    : 'http://127.0.0.1:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.1.0',
  },
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
  ],
  async rewrites() {
    const apiOrigin =
      process.env.NODE_ENV === 'production'
        ? RAILWAY_BACKEND_PUBLIC_ORIGIN ?? DEFAULT_SERVER_API_ORIGIN
        : process.env.BACKEND_INTERNAL_URL ??
          process.env.API_INTERNAL_URL ??
          process.env.NEXT_PUBLIC_API_URL ??
          DEFAULT_SERVER_API_ORIGIN;

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
