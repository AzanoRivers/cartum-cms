import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { getLocale } from '@/lib/i18n/getLocale'
import { getTheme } from '@/lib/settings/get-setting'
import { Toaster } from 'sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Cartum', template: 'Cartum - %s' },
  description: 'Serverless-first headless CMS with visual data modeling',
  robots: {
    index:     false,
    follow:    false,
    nocache:   true,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: 'Cartum CMS',
    description: 'Serverless-first headless CMS with visual data modeling',
    images: [{ url: '/images/brand/logo-1000.png', width: 1000, height: 1000 }],
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()])
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Apply stored theme before hydration to avoid flash — must use next/script, not bare <script> in RSC */}
        <Script
          id="theme-hydration"
          strategy="beforeInteractive"
        >{`(function(){try{var t=localStorage.getItem('cartum-theme');if(t==='dark'||t==='cyber-soft'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`}</Script>
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          closeButton
          visibleToasts={3}
          gap={8}
          toastOptions={{
            classNames: {
              toast:        'font-mono text-sm !border !bg-surface !border-border [animation:toast-vhs-in_200ms_ease-out_forwards]',
              title:        '!text-text',
              description:  '!text-muted',
              actionButton: '!bg-primary !text-white !text-xs',
              cancelButton: '!bg-surface-2 !text-muted !text-xs',
              closeButton:  '!text-muted hover:!text-text',
              success:      '!border-success/30',
              error:        '!border-danger/30',
              warning:      '!border-yellow-500/30',
              info:         '!border-primary/30',
            },
          }}
        />
      </body>
    </html>
  )
}
