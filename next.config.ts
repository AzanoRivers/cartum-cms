import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Video chunks can be up to 90 MB. Next.js 16 buffers request bodies
    // for proxy compatibility with a 10 MB default — raise it to 100 MB.
    proxyClientMaxBodySize: '100mb',
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
