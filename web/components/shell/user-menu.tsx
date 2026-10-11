'use client'

import { LogOutIcon } from 'lucide-react'
import { useTransition } from 'react'

import { BottoneIcona } from '@/components/ds/bottone-icona'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { signOut } from '@/lib/auth/actions'

export type ShellUser = {
  name: string
  email: string | null
  initials: string
  isAdmin: boolean
}

export function UserMenu({ user }: { user: ShellUser }) {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <BottoneIcona
          etichetta='Account'
          size='icon'
          className='rounded-full'
          icona={
            <Avatar className='size-8'>
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
          }
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuLabel className='font-normal'>
          <p className='truncate text-sm font-medium'>{user.name}</p>
          {user.email && <p className='text-muted-foreground truncate text-xs'>{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={event => {
            // Keep the menu open so the pending state is visible until the redirect lands.
            event.preventDefault()
            startTransition(async () => {
              await signOut()
            })
          }}
        >
          {pending ? <Spinner /> : <LogOutIcon />}
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
