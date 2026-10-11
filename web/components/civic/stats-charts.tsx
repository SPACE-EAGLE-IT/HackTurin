'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CHART_AXIS_TICK, CHART_GRID, ChartCard, ChartTip, LegendPill } from '@/components/ds/chart-frame'
import { SERIE } from '@/lib/grafici-geometria'

type Day = { day: string; cittadini: number; pod: number }

/** Reports per day, citizens and PODs stacked. */
export function ReportsTrend({ data }: { data: Day[] }) {
  return (
    <ChartCard
      title='Segnalazioni negli ultimi 30 giorni'
      legend={
        <>
          <LegendPill colore={SERIE[0]} label='Cittadini' />
          <LegendPill colore={SERIE[2]} label='POD' />
        </>
      }
    >
      <div className='h-56'>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -16, right: 8 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey='day'
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval={6}
              tickFormatter={d => `${d.slice(8)}/${d.slice(5, 7)}`}
            />
            <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} />
            <Area
              type='monotone'
              dataKey='cittadini'
              name='Cittadini'
              stackId='1'
              stroke={SERIE[0]}
              fill={SERIE[0]}
              fillOpacity={0.12}
            />
            <Area
              type='monotone'
              dataKey='pod'
              name='POD'
              stackId='1'
              stroke={SERIE[2]}
              fill={SERIE[2]}
              fillOpacity={0.12}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
