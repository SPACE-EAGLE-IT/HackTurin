import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { uuidSchema } from '@/lib/validation'

import { createDevice, setDeviceActive } from './actions'
import { getPodTraffic, listDevices } from './queries'
import { DEVICE_TYPES, deviceTypeLabel, POD_STATE_LABEL, podState } from './types'

const createPodSchema = z.object({
  name: z.string().trim().min(1).max(80).describe('Nome del POD, es. "Semaforo Porta Nuova"'),
  type: z.enum(DEVICE_TYPES).describe('fixed = su semaforo/palo, mobile = su un mezzo GTT'),
  label: z.string().trim().max(160).optional().describe('Posizione (fisso) o mezzo (mobile)'),
})

const setActiveSchema = z.object({
  id: uuidSchema.describe('Id del POD, da list_pods'),
  name: z.string().max(80).describe('Nome del POD, per il riepilogo'),
  active: z.boolean(),
})

export const podAi: ModuleAi = {
  key: 'pod',
  description:
    'POD (sensori su mezzi e semafori): stato di connessione, batteria, traffico API delle ultime 24 ore; proposte di creazione e di attivazione/disattivazione.',
  examples: ['Quali POD sono offline?', 'Quanti errori hanno fatto i POD nelle ultime 24 ore?'],
  tools: ctx => {
    if (!hasLevel(ctx.access.pod, 'read')) return {}
    const read = {
      list_pods: tool({
        description: 'Elenca i POD con stato (online/offline/disattivato), batteria e ultimo contatto.',
        inputSchema: z.object({ onlyOffline: z.boolean().optional() }),
        execute: async ({ onlyOffline }) => {
          const rows = await listDevices()
          const pods = rows
            .map(device => ({
              id: device.id,
              name: device.name,
              type: deviceTypeLabel(device.type),
              label: device.label,
              state: POD_STATE_LABEL[podState(device)],
              online: device.active && device.online,
              battery: device.battery,
              firmware: device.firmware,
              lastSeenAt: device.last_seen_at,
              requests24h: device.requests24h,
              errors24h: device.errors24h,
              href: `/pod/${device.id}`,
            }))
            .filter(pod => !onlyOffline || !pod.online)
          return { count: pods.length, pods: pods.slice(0, 50) }
        },
      }),
      pod_traffic: tool({
        description:
          'Conteggi del traffico API dei POD nelle ultime 24 ore: richieste, errori, chiavi rifiutate.',
        inputSchema: z.object({}),
        execute: async () => {
          const traffic = await getPodTraffic()
          return {
            podTotal: traffic.total,
            podOnline: traffic.online,
            requests24h: traffic.requests24h,
            errors24h: traffic.errors24h,
            rejectedKeys24h: traffic.rejected24h,
            href: '/pod',
          }
        },
      }),
    }
    if (!hasLevel(ctx.access.pod, 'write')) return read
    return {
      ...read,
      propose_create_pod: proposalTool('create_pod', 'Propone un nuovo POD.', createPodSchema, input => ({
        title: 'Crea POD',
        summary: [
          `Nome: ${input.name}`,
          `Tipo: ${deviceTypeLabel(input.type)}`,
          input.label ? `Posizione o mezzo: ${input.label}` : 'Posizione o mezzo: non indicata',
          'La chiave API si genera dalla pagina del POD con «Nuova chiave» e si vede una sola volta.',
        ],
      })),
      propose_set_pod_active: proposalTool(
        'set_pod_active',
        'Propone di disattivare o riattivare un POD.',
        setActiveSchema,
        input => ({
          title: input.active ? 'Riattiva POD' : 'Disattiva POD',
          summary: [
            `POD: ${input.name}`,
            input.active
              ? 'Il POD torna ad accettare le richieste con le sue chiavi.'
              : 'Le richieste del POD verranno rifiutate finché non viene riattivato.',
          ],
        })
      ),
    }
  },
  proposals: {
    create_pod: defineProposal({
      label: 'Crea POD',
      schema: createPodSchema,
      run: async input => {
        // The plain key never travels through the assistant: it is created on the POD page.
        const result = await createDevice({ ...input, withKey: false })
        return result.ok ? ok({ href: `/pod/${result.data.id}` }) : result
      },
    }),
    set_pod_active: defineProposal({
      label: 'Attiva/disattiva POD',
      schema: setActiveSchema,
      run: async ({ id, active }) => {
        const result = await setDeviceActive(id, active)
        return result.ok ? ok({ href: `/pod/${id}` }) : result
      },
    }),
  },
}
