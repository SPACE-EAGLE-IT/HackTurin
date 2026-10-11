'use client'

import { PrinterIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ImpactWindow } from '@/lib/impatto/queries'
import { useUrlState } from '@/lib/url-state'

export function PrintButton() {
  return (
    <Button variant='outline' onClick={() => window.print()} className='print:hidden'>
      <PrinterIcon /> Stampa
    </Button>
  )
}

/** Period of the report, state in `?periodo=`. */
export function WindowToggle({ value, canAdoption }: { value: ImpactWindow; canAdoption: boolean }) {
  const { set } = useUrlState()
  return (
    <ToggleGroup
      type='single'
      variant='segmented'
      size='sm'
      value={value}
      className='print:hidden'
      onValueChange={next => {
        if (next) set('periodo', next === 'adozione' ? null : next)
      }}
    >
      <ToggleGroupItem value='adozione' disabled={!canAdoption}>
        Periodo di adozione
      </ToggleGroupItem>
      <ToggleGroupItem value='12mesi'>Ultimi 12 mesi</ToggleGroupItem>
    </ToggleGroup>
  )
}
