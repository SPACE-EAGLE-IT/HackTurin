import {
  BanknoteIcon,
  CpuIcon,
  FolderKanbanIcon,
  HandHeartIcon,
  LayoutDashboardIcon,
  LeafIcon,
  LifeBuoyIcon,
  type LucideIcon,
  MapPinnedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquareCheckBigIcon,
} from 'lucide-react'

import { type AccessMap, hasLevel } from '@/lib/access/types'

/** One entry per feature. The shell shows the entries the user holds at least `read` on. */
export type NavEntry = {
  key: string
  title: string
  href: string
  icon: LucideIcon
}

export const NAVIGATION: readonly NavEntry[] = [
  { key: 'dashboard', title: 'Panoramica', href: '/dashboard', icon: LayoutDashboardIcon },
  { key: 'segnalazioni', title: 'Segnalazioni', href: '/segnalazioni', icon: MapPinnedIcon },
  { key: 'tasks', title: 'Interventi', href: '/tasks', icon: SquareCheckBigIcon },
  { key: 'projects', title: 'Appalti', href: '/projects', icon: FolderKanbanIcon },
  { key: 'pod', title: 'POD', href: '/pod', icon: CpuIcon },
  { key: 'help_desk', title: 'Help desk', href: '/help-desk', icon: LifeBuoyIcon },
  { key: 'missioni', title: 'Missioni', href: '/missioni', icon: HandHeartIcon },
  { key: 'fondo', title: 'Fondo e adozioni', href: '/fondo', icon: BanknoteIcon },
  { key: 'impatto', title: 'Impatto', href: '/impatto', icon: LeafIcon },
  { key: 'ai', title: 'Assistente', href: '/assistant', icon: SparklesIcon },
  { key: 'access', title: 'Accessi', href: '/access', icon: ShieldCheckIcon },
]

/** The entry a pathname belongs to (`/tasks/123` → tasks). */
export function navEntryFor(pathname: string) {
  return NAVIGATION.find(entry => pathname === entry.href || pathname.startsWith(`${entry.href}/`)) ?? null
}

/** Where a person lands after signing in: the first section they can see. */
export function homeFor(access: AccessMap) {
  return NAVIGATION.find(entry => hasLevel(access[entry.key], 'read'))?.href ?? '/'
}
