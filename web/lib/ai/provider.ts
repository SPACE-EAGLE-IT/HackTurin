import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

import type { AiConfig } from './types'

/** Builds the model object for any supported provider. One function, so the rest of the app never sees a provider. */
export function languageModel(
  config: Pick<AiConfig, 'provider' | 'model' | 'baseUrl' | 'apiKey'>
): LanguageModel {
  const baseURL = config.baseUrl ?? undefined
  switch (config.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey, baseURL })(config.model)
    case 'openai':
      return createOpenAI({ apiKey: config.apiKey, baseURL })(config.model)
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL })(config.model)
    case 'openai_compatible':
      if (!baseURL) throw new Error('An OpenAI-compatible provider needs a base URL')
      return createOpenAICompatible({ name: 'openai-compatible', baseURL, apiKey: config.apiKey })(
        config.model
      )
  }
}
