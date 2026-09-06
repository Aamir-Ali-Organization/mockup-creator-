import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, '../..');

const nextConfig: NextConfig = {
  // Smaller production image for Coolify / Docker.
  output: 'standalone',
  // Required for pnpm monorepo deploys on Vercel.
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@mockup/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
