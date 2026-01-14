import { env } from '@/lib/env'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: env.NEXT_CONFIG_OUTPUT,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    '@workspace/ai',
    '@workspace/auth',
    '@workspace/billing',
    '@workspace/cache',
    '@workspace/core',
    '@workspace/db',
    '@workspace/engine',
    '@workspace/env',
    '@workspace/realtime',
    '@workspace/sdk',
    '@workspace/ui',
    '@workspace/utils',
    'shiki',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(env.NEXT_PUBLIC_STORAGE_URL).hostname,
      },
      {
        protocol: 'https',
        hostname: 'assets.niceyup.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/auth',
        destination: '/auth/sign-in',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path((?!auth/).*)*',
        destination: `${env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
