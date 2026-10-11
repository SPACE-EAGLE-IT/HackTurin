'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { PropertyField } from '@/components/ds/field-trigger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ActionResult } from '@/lib/action-result'
import { signIn, signUp } from '@/lib/auth/actions'

type Tab = 'accedi' | 'registrati'
type FieldErrors = Record<string, string>

export function LoginForm({ next, error }: { next: string; error?: 'link' }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('accedi')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function switchTab(value: string) {
    setTab(value === 'registrati' ? 'registrati' : 'accedi')
    setErrors({})
  }

  function enter() {
    router.push(next)
    router.refresh()
  }

  // Field errors go under the fields; anything else (wrong credentials, provider error) is a toast.
  function reportFailure(result: Extract<ActionResult<unknown>, { ok: false }>) {
    setErrors(result.fieldErrors ?? {})
    if (!result.fieldErrors) toast.error(result.message)
  }

  function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = { email: valueOf(form, 'email'), password: valueOf(form, 'password') }
    startTransition(async () => {
      const result = await signIn(input)
      if (result.ok) enter()
      else reportFailure(result)
    })
  }

  function onSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      fullName: valueOf(form, 'fullName'),
      email: valueOf(form, 'email'),
      password: valueOf(form, 'password'),
    }
    startTransition(async () => {
      const result = await signUp(input)
      if (!result.ok) reportFailure(result)
      else if (result.data.needsConfirmation) setConfirmationSent(true)
      else enter()
    })
  }

  return (
    <div className='space-y-4'>
      {error === 'link' && (
        <Avviso tono='destructive'>Il collegamento non è più valido. Accedi di nuovo.</Avviso>
      )}

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='accedi'>Accedi</TabsTrigger>
          <TabsTrigger value='registrati'>Registrati</TabsTrigger>
        </TabsList>

        <TabsContent value='accedi'>
          <form onSubmit={onSignIn} noValidate className='space-y-4 pt-2'>
            <PropertyField label='E-mail'>
              <Input
                name='email'
                type='email'
                autoComplete='email'
                aria-label='E-mail'
                aria-invalid={errors.email ? true : undefined}
                autoFocus
              />
              <FieldError message={errors.email} />
            </PropertyField>
            <PropertyField label='Password'>
              <Input
                name='password'
                type='password'
                autoComplete='current-password'
                aria-label='Password'
                aria-invalid={errors.password ? true : undefined}
              />
              <FieldError message={errors.password} />
            </PropertyField>
            <Button type='submit' className='w-full' disabled={pending}>
              {pending && <Spinner />}
              Accedi
            </Button>
          </form>
        </TabsContent>

        <TabsContent value='registrati'>
          {confirmationSent ? (
            <Avviso tono='info' className='mt-2'>
              Controlla la posta: ti abbiamo inviato il link per confermare l’account.
            </Avviso>
          ) : (
            <form onSubmit={onSignUp} noValidate className='space-y-4 pt-2'>
              <PropertyField label='Nome e cognome'>
                <Input
                  name='fullName'
                  autoComplete='name'
                  aria-label='Nome e cognome'
                  aria-invalid={errors.fullName ? true : undefined}
                  autoFocus
                />
                <FieldError message={errors.fullName} />
              </PropertyField>
              <PropertyField label='E-mail'>
                <Input
                  name='email'
                  type='email'
                  autoComplete='email'
                  aria-label='E-mail'
                  aria-invalid={errors.email ? true : undefined}
                />
                <FieldError message={errors.email} />
              </PropertyField>
              <PropertyField label='Password'>
                <Input
                  name='password'
                  type='password'
                  autoComplete='new-password'
                  aria-label='Password'
                  aria-invalid={errors.password ? true : undefined}
                />
                {errors.password ? (
                  <FieldError message={errors.password} />
                ) : (
                  <p className='text-muted-foreground text-xs'>Almeno 8 caratteri</p>
                )}
              </PropertyField>
              <Button type='submit' className='w-full' disabled={pending}>
                {pending && <Spinner />}
                Crea account
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}

function valueOf(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}
