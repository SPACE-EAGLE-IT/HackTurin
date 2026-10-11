import type { MetadataRoute } from 'next'

/** Web app manifest: the icons installed on a phone's home screen. Colours here are metadata, not styling. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IAMAimpresa Kit',
    short_name: 'IAMAimpresa',
    description: 'Task, commesse, accessi e assistente.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff', // ds-allow: manifest metadata
    theme_color: '#15151a', // ds-allow: manifest metadata
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
