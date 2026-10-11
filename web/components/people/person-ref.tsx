import { RiferimentoEntita } from '@/components/ds/riferimento-entita'
import type { PersonRef } from '@/lib/tasks/types'

/** A person shown with avatar and name; `null` renders the "unassigned" placeholder. */
export function Person({
  person,
  size = 'sm',
  emptyLabel = 'Non assegnata',
}: {
  person: PersonRef | null
  size?: 'xs' | 'sm' | 'md'
  emptyLabel?: string
}) {
  if (!person) return <span className='text-muted-foreground text-sm'>{emptyLabel}</span>
  return (
    <RiferimentoEntita
      tipo='utente'
      nome={person.full_name}
      immagine={person.avatar_url}
      iniziali={initialsOf(person.full_name)}
      size={size}
      muto
    />
  )
}

export function initialsOf(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** «Giulia Conti» → «Giulia C.»: the short form for tight rows such as board cards. */
export function shortNameOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return fullName.trim()
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}
