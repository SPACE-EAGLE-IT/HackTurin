import { NextResponse } from 'next/server'

import { can } from '@/lib/access/queries'
import { getSession } from '@/lib/auth/session'
import { listExpensesToReimburse } from '@/lib/fondo/queries'
import { EXPENSE_KIND_LABEL } from '@/lib/fondo/types'
import { todayKey } from '@/lib/date-keys'

/** Quotes a CSV cell and neutralises formula injection in spreadsheet apps. */
function cell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

/** CSV of the expenses the ETS still has to reimburse; reads as the user, so RLS applies. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Accedi di nuovo' }, { status: 401 })
  if (!(await can('fondo', 'read'))) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const rows = await listExpensesToReimburse()
  const header = ['volontario', 'email', 'data', 'tipo', 'importo', 'autocertificata', 'missione']
  const lines = rows.map(row =>
    [
      row.volunteer?.full_name,
      row.volunteer?.email,
      row.spent_on,
      EXPENSE_KIND_LABEL[row.kind],
      row.amount.toFixed(2),
      row.self_certified ? 'sì' : 'no',
      row.mission?.title,
    ]
      .map(cell)
      .join(',')
  )
  const csv = '﻿' + [header.map(cell).join(','), ...lines].join('\r\n') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rimborsi-da-pagare-${todayKey()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
