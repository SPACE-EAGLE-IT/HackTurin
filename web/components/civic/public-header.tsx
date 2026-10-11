'use client'

import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { BrandLockup } from '@/components/civic/brand'
import { CitizenAssistant } from '@/components/cittadino/citizen-assistant'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Mappa' },
  { href: '/statistiche', label: 'Statistiche' },
  { href: '/volontari', label: 'Volontari' },
  { href: '/aziende', label: 'Aziende' },
  { href: '/dona', label: 'Dona' },
]

/** Header of the citizen site: brand, sections, theme, sign-in and the one primary action. */
export function PublicHeader() {
  const pathname = usePathname()
  return (
    <header className='bg-background/90 sticky top-0 z-40 border-b backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-6'>
        <Link href='/' className='min-w-0'>
          <BrandLockup tagline />
        </Link>
        <nav className='ml-4 hidden items-center gap-1 md:flex' aria-label='Sezioni'>
          {LINKS.map(l => (
            <Button
              key={l.href}
              asChild
              variant='ghost'
              size='sm'
              className={cn(pathname === l.href && 'bg-accent')}
            >
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>
        <div className='ml-auto flex items-center gap-1'>
          <CitizenAssistant />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='md:hidden' aria-label='Sezioni'>
                <MenuIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {LINKS.map(l => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className='sm:hidden' />
              <DropdownMenuItem asChild className='sm:hidden'>
                <Link href='/login'>Accedi</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* On phones sign-in moves into the menu: the bar keeps brand, menu and the one action. */}
          <Button asChild variant='outline' size='sm' className='hidden sm:inline-flex'>
            <Link href='/login'>Accedi</Link>
          </Button>
          {pathname !== '/segnala' && (
            <Button asChild size='sm'>
              <Link href='/segnala'>Segnala</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
