import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import './globals.css'

import { Toaster } from '@/components/ui/sonner'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'TorinoSegnala', template: '%s · TorinoSegnala' },
  description: 'Segnalazioni urbane di Torino da cittadini e sensori, gestite dal Comune.',
  applicationName: 'TorinoSegnala',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'TorinoSegnala',
    title: 'TorinoSegnala',
    description: 'Segnalazioni urbane di Torino da cittadini e sensori, gestite dal Comune.',
    locale: 'it_IT',
    images: [{ url: '/brand/og-image-1200x630.png', width: 1200, height: 630, alt: 'IAMAimpresa' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon-180.png',
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
