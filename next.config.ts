import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Video chunks are 10 MB. Next.js 16 default buffer is 10 MB — raise slightly for multipart overhead.
    proxyClientMaxBodySize: '15mb',
  },
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
          // 'credentialless' still enables SharedArrayBuffer (ffmpeg.wasm)
          // but does NOT block cross-origin images/assets without CORP headers
          { key: 'Cross-Origin-Embedder-Policy',  value: 'credentialless' },
        ],
      },
    ]
  },
}

export default nextConfig
