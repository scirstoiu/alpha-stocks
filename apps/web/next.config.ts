import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@alpha-stocks/core'],
  output: 'standalone',
};

export default nextConfig;
