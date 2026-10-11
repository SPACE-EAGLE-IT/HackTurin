'use client'

import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import {
  CHART_ACTIVE_DOT,
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID,
  ChartCard,
  ChartTip,
  NoData,
} from '@/components/ds/chart-frame'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { metricLabel, metricUnit } from '@/lib/civic/metrics'
import { formatDataOraIt } from '@/lib/format-date'
import { numeroIt } from '@/lib/format-number'
import { SERIE, SPESSORE } from '@/lib/grafici-geometria'
import type { PodReading } from '@/lib/pod/types'
import { useUrlState } from '@/lib/url-state'

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })

/** The POD's readings over time, one metric at a time (chosen in `?metrica=`). */
export function PodReadingsChart({ readings, metrics }: { readings: PodReading[]; metrics: string[] }) {
  const { get, set } = useUrlState()
  const requested = get('metrica')
  const metric = requested && metrics.includes(requested) ? requested : (metrics[0] ?? null)
  const unit = metric ? metricUnit(metric) : ''

  const data = useMemo(
    () =>
      metric
        ? readings
            .filter(reading => reading.metrics[metric] !== undefined)
            .map(reading => ({ ts: reading.ts, value: reading.metrics[metric] }))
        : [],
    [readings, metric]
  )

  return (
    <ChartCard
      title='Letture'
      sottotitolo={
        metric ? `${metricLabel(metric)}${unit ? ` (${unit})` : ''} · ultime ${data.length}` : undefined
      }
      legend={
        metrics.length > 1 ? (
          <ToggleGroup
            type='single'
            variant='segmented'
            size='sm'
            value={metric ?? ''}
            onValueChange={value => {
              if (value) set('metrica', value === metrics[0] ? null : value)
            }}
          >
            {metrics.map(key => (
              <ToggleGroupItem key={key} value={key} aria-label={metricLabel(key)}>
                {metricLabel(key)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : undefined
      }
    >
      {data.length === 0 ? (
        <NoData>Nessuna lettura</NoData>
      ) : (
        <div className='h-64'>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ left: -8, right: 8, top: 4 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis
                dataKey='ts'
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tickFormatter={timeOf}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={['auto', 'auto']}
                tickFormatter={(value: number) => numeroIt(value)}
              />
              <Tooltip
                cursor={CHART_CURSOR}
                content={
                  <ChartTip
                    heading={formatDataOraIt}
                    format={value =>
                      `${typeof value === 'number' ? numeroIt(value, { massimo: 2 }) : value} ${unit}`
                    }
                  />
                }
              />
              <Line
                type='monotone'
                dataKey='value'
                name={metric ? metricLabel(metric) : ''}
                stroke={SERIE[0]}
                strokeWidth={SPESSORE.serie}
                dot={false}
                activeDot={CHART_ACTIVE_DOT}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
