import type { NextConfig } from 'next';
import { getFrontendApiOrigin } from './src/lib/api-origin';

const nextConfig: NextConfig = {
  output: 'standalone',
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
