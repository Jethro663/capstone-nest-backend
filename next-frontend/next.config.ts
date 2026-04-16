import type { NextConfig } from 'next';
import { getFrontendApiOrigin } from './src/lib/api-origin';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
  ],
  async rewrites() {
    const apiOrigin = getFrontendApiOrigin();

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
