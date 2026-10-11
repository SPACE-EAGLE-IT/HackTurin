import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import './globals.css'

import { Toaster } from '@/components/ui/sonner'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'To.Be · un nuovo modo di vivere Torino', template: '%s · To.Be' },
  description: 'Segnalazioni, sensori, volontari e dati ambientali: un nuovo modo di vivere Torino.',
  applicationName: 'To.Be',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'To.Be',
    title: 'To.Be · un nuovo modo di vivere Torino',
    description: 'Segnalazioni, sensori, volontari e dati ambientali: un nuovo modo di vivere Torino.',
    locale: 'it_IT',
    images: [{ url: '/brand/tobe-og-1200x630.png', width: 1200, height: 630, alt: 'To.Be' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/brand/tobe-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/tobe-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/brand/tobe-apple-180.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' }, // ds-allow: theme-color metadata
    { media: '(prefers-color-scheme: dark)', color: '#15151a' }, // ds-allow: theme-color metadata
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='it' suppressHydrationWarning>
      <body className='min-h-dvh antialiased'>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
