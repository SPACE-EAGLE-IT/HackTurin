'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-renders the server page every few seconds while the tab is visible, so the log stays live. */
export function AutoRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, ms)
    return () => window.clearInterval(id)
  }, [ms, router])
  return null
}
