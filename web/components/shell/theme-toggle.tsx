'use client'

import { MonitorIcon, MoonIcon, SunIcon, SunMoonIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { BottoneIcona } from '@/components/ds/bottone-icona'

const ORDER = ['light', 'dark', 'system'] as const
type Theme = (typeof ORDER)[number]

const ICON = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const
const NEXT_LABEL: Record<Theme, string> = {
  light: 'Passa al tema scuro',
  dark: 'Passa al tema di sistema',
  system: 'Passa al tema chiaro',
}

const noSubscription = () => () => {}

/** Cycles light → dark → system. Until hydration the icon is neutral: the server does not know the theme. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  )

  const current: Theme = ORDER.find(value => value === theme) ?? 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Icon = mounted ? ICON[current] : SunMoonIcon

  return (
    <BottoneIcona
      etichetta='Tema'
      spiegazione={mounted ? NEXT_LABEL[current] : undefined}
      icona={<Icon />}
      onClick={() => setTheme(next)}
    />
  )
}
