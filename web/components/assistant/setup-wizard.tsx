'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Passi, PiedePassi } from '@/components/ds/passi'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { saveAiSettings, testAiSettings } from '@/lib/ai/actions'
import { AI_PROVIDER_PRESETS, AI_PROVIDERS, type AiProvider, type AiStatus } from '@/lib/ai/types'
import { numeroIt } from '@/lib/format-number'
import { cn } from '@/lib/utils'

const STEPS = [
  { chiave: 'provider', etichetta: 'Provider' },
  { chiave: 'credentials', etichetta: 'Credenziali' },
  { chiave: 'verify', etichetta: 'Verifica e salva' },
] as const

const STEP_PROVIDER = 0
const STEP_CREDENTIALS = 1
const STEP_VERIFY = 2

// Field errors with these keys belong to the credentials step: the wizard jumps back to it.
const CREDENTIAL_FIELDS = ['apiKey', 'model', 'baseUrl']

type TestOutcome =
  | { ok: true; reply: string; durationMs: number; inputTokens: number; outputTokens: number }
  | { ok: false; message: string }

function isProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value)
}

export function SetupWizard({ status }: { status: AiStatus }) {
  if (status.configured && status.source === 'env') {
    return (
      <Avviso tono='info' className='px-4 py-3 text-sm'>
        Le impostazioni arrivano dalle variabili d’ambiente (AI_PROVIDER, AI_MODEL, AI_API_KEY): il wizard è
        disattivato.
      </Avviso>
    )
  }
  return <WizardForm status={status} />
}

function WizardForm({ status }: { status: AiStatus }) {
  const router = useRouter()
  const configured = status.configured
  const initialProvider: AiProvider = status.configured ? status.provider : 'anthropic'

  const [step, setStep] = useState(STEP_PROVIDER)
  const [provider, setProvider] = useState<AiProvider>(initialProvider)
  const [model, setModel] = useState(status.configured ? status.model : '')
  const [baseUrl, setBaseUrl] = useState(
    (status.configured ? status.baseUrl : null) ?? AI_PROVIDER_PRESETS[initialProvider].baseUrl ?? ''
  )
  const [apiKey, setApiKey] = useState('')
  const [test, setTest] = useState<TestOutcome | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [testing, startTest] = useTransition()
  const [saving, startSave] = useTransition()

  const preset = AI_PROVIDER_PRESETS[provider]
  const busy = testing || saving
  const credentialsComplete =
    model.trim() !== '' &&
    (!preset.baseUrlEditable || baseUrl.trim() !== '') &&
    (apiKey.trim() !== '' || configured)

  const payload = () => ({
    provider,
    model: model.trim(),
    baseUrl: preset.baseUrlEditable ? baseUrl.trim() || null : null,
    apiKey: apiKey.trim() || undefined,
  })

  const clearError = (field: string) => {
    if (!(field in fieldErrors)) return
    const next = { ...fieldErrors }
    delete next[field]
    setFieldErrors(next)
  }

  // Shows the server's field errors where they belong and brings the person back to that step.
  const showFieldErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors)
    if (CREDENTIAL_FIELDS.some(field => field in errors)) setStep(STEP_CREDENTIALS)
  }

  const selectProvider = (value: string) => {
    if (!isProvider(value)) return
    setProvider(value)
    setBaseUrl(AI_PROVIDER_PRESETS[value].baseUrl ?? '')
    setTest(null)
    setFieldErrors({})
  }

  const runTest = () => {
    startTest(async () => {
      const result = await testAiSettings(payload())
      if (result.ok) {
        setTest({ ok: true, ...result.data })
        setFieldErrors({})
        return
      }
      setTest({ ok: false, message: result.message })
      if (result.fieldErrors) showFieldErrors(result.fieldErrors)
    })
  }

  const save = () => {
    startSave(async () => {
      const result = await saveAiSettings(payload())
      if (!result.ok) {
        if (result.fieldErrors) showFieldErrors(result.fieldErrors)
        else toast.error(result.message)
        return
      }
      toast.success('Impostazioni salvate')
      setApiKey('')
      setTest(null)
      setFieldErrors({})
      setStep(STEP_PROVIDER)
      router.refresh()
    })
  }

  return (
    <div className='space-y-4'>
      <SectionCard title='Collega un provider'>
        <div className='space-y-6'>
          <Passi
            passi={STEPS}
            corrente={step}
            onVai={n => {
              if (n < step && !busy) setStep(n)
            }}
          />

          {step === STEP_PROVIDER && <ProviderStep value={provider} onChange={selectProvider} />}

          {step === STEP_CREDENTIALS && (
            <FormGrid>
              <PropertyField label='Chiave API' span>
                <Input
                  type='password'
                  autoComplete='off'
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value)
                    setTest(null)
                    clearError('apiKey')
                  }}
                  placeholder={configured ? '••••••••' : undefined}
                  aria-invalid={fieldErrors.apiKey ? true : undefined}
                />
                <p className='text-muted-foreground text-xs'>
                  {configured
                    ? 'Lascia vuoto per tenere la chiave salvata'
                    : 'Si incolla una volta, poi resta in Vault'}
                  {preset.keysUrl && (
                    <>
                      {' · '}
                      <a
                        href={preset.keysUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary underline-offset-4 hover:underline'
                      >
                        Dove la trovo
                      </a>
                    </>
                  )}
                </p>
                <FieldError message={fieldErrors.apiKey} />
              </PropertyField>
              <PropertyField label='Modello' span={!preset.baseUrlEditable}>
                <Input
                  value={model}
                  required
                  autoComplete='off'
                  placeholder={preset.modelPlaceholder}
                  onChange={e => {
                    setModel(e.target.value)
                    setTest(null)
                    clearError('model')
                  }}
                  aria-invalid={fieldErrors.model ? true : undefined}
                />
                <p className='text-muted-foreground text-xs'>
                  L’id esatto è nella documentazione del provider
                </p>
                <FieldError message={fieldErrors.model} />
              </PropertyField>
              {preset.baseUrlEditable && (
                <PropertyField label='URL base'>
                  <Input
                    type='url'
                    value={baseUrl}
                    required
                    autoComplete='off'
                    placeholder={preset.baseUrl ?? undefined}
                    onChange={e => {
                      setBaseUrl(e.target.value)
                      setTest(null)
                      clearError('baseUrl')
                    }}
                    aria-invalid={fieldErrors.baseUrl ? true : undefined}
                  />
                  <p className='text-muted-foreground text-xs'>Obbligatorio per gli endpoint compatibili</p>
                  <FieldError message={fieldErrors.baseUrl} />
                </PropertyField>
              )}
            </FormGrid>
          )}

          {step === STEP_VERIFY && (
            <div className='space-y-4'>
              <PannelloScheda occhiello='Riepilogo'>
                <RigaDettaglio label='Provider'>{preset.label}</RigaDettaglio>
                <RigaDettaglio label='Modello'>{model.trim()}</RigaDettaglio>
                {preset.baseUrlEditable && baseUrl.trim() !== '' && (
                  <RigaDettaglio label='URL base'>{baseUrl.trim()}</RigaDettaglio>
                )}
                <RigaDettaglio label='Chiave'>
                  {apiKey.trim() !== '' ? '•••• (nuova)' : '•••• (salvata)'}
                </RigaDettaglio>
              </PannelloScheda>
              <div className='flex flex-wrap items-center gap-3'>
                <Button variant='outline' onClick={runTest} disabled={busy}>
                  {testing && <Spinner />}
                  Prova il modello
                </Button>
                <p className='text-muted-foreground text-xs'>
                  Una chiamata vera, facoltativa: lascia la sua riga.
                </p>
              </div>
              {test?.ok === true && (
                <Avviso tono='success' className='space-y-1 px-4 py-3 text-sm'>
                  <p>
                    Risponde in {numeroIt(test.durationMs)} ms: “{test.reply}”
                  </p>
                  <p className='text-xs opacity-80'>
                    Token: {numeroIt(test.inputTokens)} in ingresso · {numeroIt(test.outputTokens)} in uscita
                  </p>
                </Avviso>
              )}
              {test?.ok === false && (
                <Avviso tono='destructive' className='px-4 py-3 text-sm'>
                  {test.message}
                </Avviso>
              )}
            </div>
          )}

          <PiedePassi
            indietro={step > STEP_PROVIDER ? { onClick: () => setStep(step - 1), disabled: busy } : null}
            avanti={
              step < STEP_VERIFY
                ? {
                    onClick: () => setStep(step + 1),
                    disabled: busy || (step === STEP_CREDENTIALS && !credentialsComplete),
                    verso: STEPS[step + 1].etichetta,
                  }
                : null
            }
            finale={
              step === STEP_VERIFY ? (
                <Button onClick={save} disabled={busy}>
                  {saving && <Spinner />}
                  Salva
                </Button>
              ) : undefined
            }
          />
        </div>
      </SectionCard>

      <Avviso tono='info' className='px-4 py-3 text-sm'>
        Chi può usare l’assistente può anche leggere la chiave dall’API: per un deployment pubblico usa le
        variabili d’ambiente (docs/AI.md).
      </Avviso>
    </div>
  )
}

/** One card per preset; the whole card is the radio's label, so it is one click target. */
function ProviderStep({ value, onChange }: { value: AiProvider; onChange: (value: string) => void }) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      aria-label='Provider'
      className='grid gap-3 sm:grid-cols-2'
    >
      {AI_PROVIDERS.map(key => {
        const preset = AI_PROVIDER_PRESETS[key]
        const id = `ai-provider-${key}`
        const selected = key === value
        return (
          <Label key={key} htmlFor={id} className='min-w-0 cursor-pointer items-stretch font-normal'>
            <Card
              className={cn(
                'w-full flex-row items-start gap-3 px-4 py-4 transition-colors max-sm:py-3',
                selected && 'border-primary ring-1 ring-primary'
              )}
            >
              <RadioGroupItem id={id} value={key} className='mt-0.5 shrink-0' />
              <span className='grid min-w-0 gap-1'>
                <span className='text-sm font-medium'>{preset.label}</span>
                <span className='text-muted-foreground text-xs'>{preset.hint}</span>
              </span>
            </Card>
          </Label>
        )
      })}
    </RadioGroup>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}
