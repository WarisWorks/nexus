import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  devIndicators: false,
};

export default config;
