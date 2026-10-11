import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

import { AI_PROVIDERS, type AiConfig, type AiProvider, type AiStatus } from './types'

/**
 * Environment variables win over the database: a public deployment sets AI_PROVIDER, AI_MODEL,
 * AI_API_KEY (and AI_BASE_URL for compatible endpoints) and never shares the key with the team.
 */
function configFromEnv(): AiConfig | null {
  const provider = process.env.AI_PROVIDER
  const model = process.env.AI_MODEL
  const apiKey = process.env.AI_API_KEY
  if (!provider || !model || !apiKey) return null
  if (!(AI_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`AI_PROVIDER must be one of ${AI_PROVIDERS.join(', ')}`)
  }
  return {
    provider: provider as AiProvider,
    model,
    baseUrl: process.env.AI_BASE_URL ?? null,
    apiKey,
    source: 'env',
  }
}

/** The configuration with the key, for the server only. `null` when the assistant is not configured. */
export const getAiConfig = cache(async (): Promise<AiConfig | null> => {
  const env = configFromEnv()
  if (env) return env
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ai_settings_for_chat')
  if (error) {
    if (isMissingFunction(error)) return null
    throw error
  }
  const row = data?.[0]
  if (!row) return null
  return {
    provider: row.provider as AiProvider,
    model: row.model,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    source: 'database',
  }
})

/** What is configured, without the key. Safe to pass to the UI. */
export const getAiStatus = cache(async (): Promise<AiStatus> => {
  const env = configFromEnv()
  if (env) {
    return {
      configured: true,
      source: 'env',
      provider: env.provider,
      model: env.model,
      baseUrl: env.baseUrl,
      updatedAt: null,
      updatedByName: null,
    }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ai_settings_status')
  if (error) {
    if (isMissingFunction(error)) return { configured: false }
    throw error
  }
  const row = data?.[0]
  if (!row) return { configured: false }
  return {
    configured: true,
    source: 'database',
    provider: row.provider as AiProvider,
    model: row.model,
    baseUrl: row.base_url,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
  }
})

/** PostgREST answers PGRST202 when the assistant migration has not been applied: treated as "not configured". */
function isMissingFunction(error: { code?: string }) {
  return error.code === 'PGRST202'
}
