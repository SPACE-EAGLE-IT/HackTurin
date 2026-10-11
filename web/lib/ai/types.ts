import type { Enums } from '@/lib/supabase/database.types'

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'openai_compatible'
export const AI_PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'openai_compatible',
] as const satisfies readonly AiProvider[]

export type AiProviderPreset = {
  key: AiProvider
  label: string
  hint: string
  /** Shown as the placeholder of the model field; the exact id comes from the provider's documentation. */
  modelPlaceholder: string
  /** Default base URL; editable only for OpenAI-compatible endpoints. */
  baseUrl: string | null
  baseUrlEditable: boolean
  keysUrl: string | null
}

export const AI_PROVIDER_PRESETS: Record<AiProvider, AiProviderPreset> = {
  anthropic: {
    key: 'anthropic',
    label: 'Anthropic (Claude)',
    hint: 'Claude Sonnet, Opus e Haiku.',
    modelPlaceholder: 'claude-sonnet-5-5',
    baseUrl: null,
    baseUrlEditable: false,
    keysUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    key: 'openai',
    label: 'OpenAI',
    hint: 'I modelli GPT.',
    modelPlaceholder: 'gpt-5-mini',
    baseUrl: null,
    baseUrlEditable: false,
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    key: 'google',
    label: 'Google (Gemini)',
    hint: 'I modelli Gemini.',
    modelPlaceholder: 'gemini-2.5-flash',
    baseUrl: null,
    baseUrlEditable: false,
    keysUrl: 'https://aistudio.google.com/apikey',
  },
  openai_compatible: {
    key: 'openai_compatible',
    label: 'Compatibile OpenAI',
    hint: 'Groq, OpenRouter, Mistral, Together, Ollama e ogni endpoint con il formato OpenAI: serve l’URL base.',
    modelPlaceholder: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    baseUrlEditable: true,
    keysUrl: null,
  },
}

/** What the server needs to call a model. `source` says where it came from. */
export type AiConfig = {
  provider: AiProvider
  model: string
  baseUrl: string | null
  apiKey: string
  source: 'env' | 'database'
}

export type AiStatus =
  | { configured: false }
  | {
      configured: true
      source: 'env' | 'database'
      provider: AiProvider
      model: string
      baseUrl: string | null
      updatedAt: string | null
      updatedByName: string | null
    }

/**
 * An action the assistant suggests and the person confirms. `summary` is rendered as rows of the card;
 * `input` is validated again by the module when confirmed.
 */
export type Proposal<I = unknown> = {
  kind: string
  title: string
  summary: string[]
  input: I
}

export type AiRole = Enums<'task_status'> extends never ? never : 'user' | 'assistant'

export type ConversationSummary = { id: string; title: string; updated_at: string }

export type AiUsage = {
  calls: number
  inputTokens: number
  outputTokens: number
  lastCallAt: string | null
  byModel: Array<{
    provider: string
    model: string
    calls: number
    inputTokens: number
    outputTokens: number
  }>
}
