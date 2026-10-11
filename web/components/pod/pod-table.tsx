'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { RadioTowerIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { PodStateBadge } from '@/components/pod/pod-badges'
import { useIsMobile } from '@/hooks/use-mobile'
import { numeroIt } from '@/lib/format-number'
import { deviceTypeLabel, type PodListItem } from '@/lib/pod/types'

const podHref = (device: PodListItem) => `/pod/${device.id}`

const Dash = () => <span className='text-muted-foreground'>—</span>

function LastSeen({ value }: { value: string | null }) {
  return value ? <Data valore={value} forma='eta' /> : <span className='text-muted-foreground'>Mai</span>
}

function Traffic({ device }: { device: PodListItem }) {
  return (
    <span className='tabular-nums'>
      {numeroIt(device.requests24h)}
      <span className='text-muted-foreground'> / </span>
      <span className={device.errors24h > 0 ? 'text-destructive' : 'text-muted-foreground'}>
        {numeroIt(device.errors24h)}
      </span>
    </span>
  )
}

const COLUMNS: ColumnDef<PodListItem>[] = [
  {
    id: 'state',
    accessorFn: device => (device.active ? (device.online ? 0 : 1) : 2),
    header: 'Stato',
    cell: ({ row }) => <PodStateBadge device={row.original} />,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
  },
  {
    id: 'type',
    accessorFn: device => deviceTypeLabel(device.type),
    header: 'Tipo',
  },
  {
    id: 'label',
    accessorFn: device => device.label ?? '',
    header: 'Posizione o mezzo',
    cell: ({ row }) => row.original.label ?? <Dash />,
  },
  {
    id: 'lastSeen',
    accessorFn: device => device.last_seen_at ?? '',
    header: 'Ultimo contatto',
    cell: ({ row }) => <LastSeen value={row.original.last_seen_at} />,
  },
  {
    id: 'battery',
    accessorFn: device => device.battery ?? -1,
    header: 'Batteria',
    cell: ({ row }) =>
      row.original.battery === null ? (
        <Dash />
      ) : (
        <span className={row.original.battery < 20 ? 'text-destructive tabular-nums' : 'tabular-nums'}>
          {numeroIt(row.original.battery)}%
        </span>
      ),
  },
  {
    id: 'firmware',
    accessorFn: device => device.firmware ?? '',
    header: 'Firmware',
    cell: ({ row }) => row.original.firmware ?? <Dash />,
  },
  {
    id: 'traffic',
    accessorKey: 'requests24h',
    header: 'Richieste / errori 24h',
    cell: ({ row }) => <Traffic device={row.original} />,
  },
]

export function PodTable({ devices, cornice = true }: { devices: PodListItem[]; cornice?: boolean }) {
  const isMobile = useIsMobile()

  if (devices.length === 0) {
    return (
      <EmptyState icon={RadioTowerIcon} title='Nessun POD' description='Crea il primo POD con «Nuovo POD».' />
    )
  }

  if (isMobile) {
    return (
      <MobileRowList>
        {devices.map((device, index) => (
          <MobileRow
            key={device.id}
            index={index}
            href={podHref(device)}
            title={device.name}
            meta={[
              deviceTypeLabel(device.type),
              device.label,
              <LastSeen key='seen' value={device.last_seen_at} />,
              device.battery !== null ? `${numeroIt(device.battery)}%` : null,
            ]}
            signal={<PodStateBadge device={device} />}
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={devices}
      columns={COLUMNS}
      rowHref={podHref}
      rowLabel={device => device.name}
      footer={({ rese, totali }) => `${rese} di ${totali} POD`}
      densita='media'
      cornice={cornice}
    />
  )
}
