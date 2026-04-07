import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  'cartumedia.azanolabs.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // COOP + COEP required for SharedArrayBuffer (ffmpeg.wasm)
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'require-corp' },
        ],
      },
    ]
  },
}

export default nextConfig
