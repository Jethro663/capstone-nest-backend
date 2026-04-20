import type { NextConfig } from 'next';
import { getServerApiOrigin } from './src/lib/api-origin';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
  ],
  async rewrites() {
    const apiOrigin = getServerApiOrigin();

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
