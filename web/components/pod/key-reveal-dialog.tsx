'use client'

import { useSyncExternalStore } from 'react'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { copiaNegliAppunti, CopiaValore } from '@/components/ds/copia-valore'
import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QrCode } from '@/components/pod/qr-code'

const noop = () => () => {}
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => ''
  )

function snippets(origin: string, apiKey: string) {
  const env = `TS_BASE_URL=${origin}\nTS_API_KEY=${apiKey}`
  const curl = [
    `curl -X POST "${origin}/api/v1/reports" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"category":"rifiuti_abbandonati","lat":45.0703,"lon":7.6869,"confidence":0.9}'`,
  ].join('\n')
  const python = [
    'import requests',
    '',
    'r = requests.post(',
    `    "${origin}/api/v1/readings",`,
    `    headers={"Authorization": "Bearer ${apiKey}"},`,
    '    json={"metrics": {"temperature_c": 21.5, "co2_ppm": 480}},',
    '    timeout=10,',
    ')',
    'print(r.status_code, r.json())',
  ].join('\n')
  const team = `${env}\n\nDocumentazione: docs/POD_API.md`
  // The key travels in the fragment, which browsers never send to the server.
  const phone = `${origin}/pod-telefono#k=${encodeURIComponent(apiKey)}`
  return { env, curl, python, team, phone }
}

function Snippet({ testo, etichetta }: { testo: string; etichetta: string }) {
  return (
    <div className='relative'>
      <pre className='bg-muted overflow-x-auto rounded-md p-3 pr-10 font-mono text-xs leading-relaxed'>
        {testo}
      </pre>
      <CopiaValore testo={testo} etichetta={etichetta} className='absolute top-1.5 right-1.5' />
    </div>
  )
}

/** Pairs a phone: scan the QR (or open the link) and the phone becomes this POD. */
function PhonePairing({ link }: { link: string }) {
  return (
    <div className='flex flex-col items-center gap-3 sm:flex-row sm:items-start'>
      <QrCode text={link} label='QR per collegare il telefono' className='max-w-56' />
      <div className='min-w-0 flex-1 space-y-2 text-sm'>
        <p>Inquadra il codice con la fotocamera del telefono: si apre la pagina del POD già collegata.</p>
        <div className='flex items-center gap-2'>
          <code className='bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 font-mono text-xs'>
            {link}
          </code>
          <CopiaValore testo={link} etichetta='link per il telefono' variant='outline' size='icon-sm' />
        </div>
        <p className='text-muted-foreground text-xs'>
          La chiave è nel frammento del link (dopo #): resta sul telefono e non arriva ai log del server.
        </p>
      </div>
    </div>
  )
}

/** Shows a freshly created API key once, with ready-made snippets for the hardware team. */
export function KeyRevealDialog({
  apiKey,
  deviceType,
  onClose,
}: {
  /** The plain key; `null` closes the dialog. */
  apiKey: string | null
  /** A phone POD opens on the QR pairing tab. */
  deviceType?: string
  onClose: () => void
}) {
  const isPhone = deviceType === 'phone'
  const origin = useOrigin()
  const s = apiKey ? snippets(origin, apiKey) : null

  const copyTeam = () => {
    if (!s) return
    void copiaNegliAppunti(s.team).then(done =>
      done ? toast.success('Messaggio copiato') : toast.error('Non si riesce a copiare da qui')
    )
  }

  return (
    <DialogoAzione
      open={apiKey !== null}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      titolo='Chiave API del POD'
      natura='documento'
      azione={{ etichetta: 'Chiudi', onClick: onClose }}
      annulla={false}
    >
      {s && apiKey && (
        <div className='space-y-4'>
          <Avviso tono='warning'>
            La chiave è visibile solo adesso: copiala e consegnala al team hardware. Se va persa, crea una
            nuova chiave e revoca questa.
          </Avviso>
          <div className='flex items-center gap-2'>
            <code className='bg-muted min-w-0 flex-1 rounded-md px-3 py-2 font-mono text-sm break-all'>
              {apiKey}
            </code>
            <CopiaValore testo={apiKey} etichetta='chiave API' variant='outline' size='icon-sm' />
          </div>
          <Tabs defaultValue={isPhone ? 'telefono' : 'env'}>
            <TabsList>
              <TabsTrigger value='telefono'>Telefono</TabsTrigger>
              <TabsTrigger value='env'>.env</TabsTrigger>
              <TabsTrigger value='curl'>curl</TabsTrigger>
              <TabsTrigger value='python'>Python</TabsTrigger>
            </TabsList>
            <TabsContent value='telefono'>
              <PhonePairing link={s.phone} />
            </TabsContent>
            <TabsContent value='env'>
              <Snippet testo={s.env} etichetta='file .env' />
            </TabsContent>
            <TabsContent value='curl'>
              <Snippet testo={s.curl} etichetta='comando curl' />
            </TabsContent>
            <TabsContent value='python'>
              <Snippet testo={s.python} etichetta='esempio Python' />
            </TabsContent>
          </Tabs>
          <Button variant='outline' onClick={copyTeam}>
            <CopyIcon /> Copia messaggio per il team
          </Button>
        </div>
      )}
    </DialogoAzione>
  )
}
