import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mockup/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
