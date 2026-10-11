'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { AssistantButton } from '@/components/assistant/assistant-button'
import { AssistantDisc } from '@/components/assistant/assistant-disc'
import { AssistantDock, type AssistantPreview } from '@/components/assistant/assistant-dock'
import AppShell, { type AppShellCrumb, type AppShellNavItem } from '@/components/ds/app-shell'
import { type AccessMap, hasLevel } from '@/lib/access/types'
import { useAssistantPanel } from '@/lib/ai/panel-store'
import { NAVIGATION, navEntryFor } from '@/lib/navigation'
import { cn } from '@/lib/utils'

import { ThemeToggle } from './theme-toggle'
import { type ShellUser, UserMenu } from './user-menu'

/** Given by the layout when the assistant is wired; `preview` renders a fixed thread for static screens. */
export type ShellAssistant = { configured: boolean; examples: string[]; preview?: AssistantPreview }

export function Shell({
  user,
  access,
  assistant,
  children,
}: {
  user: ShellUser
  access: AccessMap
  assistant?: ShellAssistant
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const active = navEntryFor(pathname)
  const isDetail = pathname.split('/').filter(Boolean).length > 1
  const panel = useAssistantPanel()

  // Admins see every module, as `can()` grants them everything regardless of the access rows.
  const nav: AppShellNavItem[] = NAVIGATION.filter(
    entry => user.isAdmin || hasLevel(access[entry.key], 'read')
  ).map(entry => ({
    title: entry.title,
    icon: entry.icon,
    isActive: active?.key === entry.key,
    onSelect: () => router.push(entry.href),
  }))

  const trail: AppShellCrumb[] | undefined =
    active && isDetail ? [{ label: active.title, onSelect: () => router.push(active.href) }] : undefined

  // The assistant shows to those who may use it; on its own page the dock and the disc step aside.
  const assistantOn = assistant != null && (user.isAdmin || hasLevel(access.ai, 'read'))
  const onAssistantRoute = pathname.startsWith('/assistant')
  const docked = assistantOn && panel.open && !onAssistantRoute
  const discShown = assistantOn && !panel.open && !onAssistantRoute

  return (
    <>
      {/* The assistant's column is the twin of the rail on the other side: the content moves over, it is not covered.
          While the disc is in the corner, the content reserves room at the bottom so the last row stays readable. */}
      <div
        className={cn(
          'min-h-svh transition-[margin] duration-(--duration-base) ease-out motion-reduce:transition-none',
          docked && (panel.wide ? 'sm:mr-[calc(40rem+0.5rem)]' : 'sm:mr-[calc(26rem+0.5rem)]'),
          discShown && 'sm:[--flottanti-riserva:5.5rem]'
        )}
      >
        <AppShell
          brand={
            <Image
              src='/brand/iamaimpresa-marchio-bianco-256.png'
              alt='IAMAimpresa'
              width={256}
              height={203}
              className='size-6 object-contain'
              priority
            />
          }
          logotipo={
            <Image
              src='/brand/iamaimpresa-logo-esteso-bianco-400.png'
              alt='IAMAimpresa'
              width={400}
              height={29}
              className='h-5 w-auto'
              priority
            />
          }
          nav={nav}
          current={active?.title ?? 'IAMAimpresa'}
          trail={trail}
          headerActions={
            <>
              {assistantOn && <AssistantButton />}
              <ThemeToggle />
              <UserMenu user={user} />
            </>
          }
        >
          {children}
          {assistantOn && assistant && (
            <AssistantDock
              configured={assistant.configured}
              isAdmin={user.isAdmin}
              examples={assistant.examples}
              preview={assistant.preview}
            />
          )}
        </AppShell>
      </div>
      {assistantOn && <AssistantDisc />}
    </>
  )
}
