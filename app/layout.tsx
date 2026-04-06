import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Cartum', template: 'Cartum - %s' },
  description: 'Serverless-first headless CMS with visual data modeling',
  openGraph: {
    title: 'Cartum CMS',
    description: 'Serverless-first headless CMS with visual data modeling',
    images: [{ url: '/images/brand/logo-1000.png', width: 1000, height: 1000 }],
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
