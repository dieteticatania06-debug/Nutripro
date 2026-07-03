import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nutripro-worker.*.workers.dev',
      },
      {
        protocol: 'https',
        hostname: 'api.nutripro.es',
      },
      {
        protocol: 'https',
        hostname: '*.nutripro.es',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8787',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8787',
      },
    ],
  },
  serverExternalPackages: [],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
