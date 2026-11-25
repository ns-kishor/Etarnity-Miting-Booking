import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/**': ['./db/**/*', './prisma/**/*'],
    '/*': ['./db/**/*', './prisma/**/*'],
    '/api/**/*': ['./db/**/*', './prisma/**/*'],
  },
};

export default nextConfig;
