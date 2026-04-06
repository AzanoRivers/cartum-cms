import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Add R2 public URL pattern when configured
      // { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
}

export default nextConfig
