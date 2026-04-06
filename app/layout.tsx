import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cartum CMS',
  description: 'Serverless-first headless CMS and visual data modeling platform.',
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
