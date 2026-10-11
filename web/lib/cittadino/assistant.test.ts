import { afterEach, describe, expect, it, vi } from 'vitest'

import { citizenAiConfig } from './assistant'

afterEach(() => vi.unstubAllEnvs())

describe('citizen assistant config', () => {
  it('is off without a key', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('AI_API_KEY', '')
    expect(citizenAiConfig()).toBeNull()
  })
  it('reuses the staff key only when the staff provider is Anthropic', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('AI_PROVIDER', 'openai')
    vi.stubEnv('AI_API_KEY', 'k-openai')
    expect(citizenAiConfig()).toBeNull()
    vi.stubEnv('AI_PROVIDER', 'anthropic')
    expect(citizenAiConfig()).toMatchObject({ provider: 'anthropic', apiKey: 'k-openai' })
  })
  it('defaults to the fast Claude model', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k')
    vi.stubEnv('CITIZEN_AI_MODEL', '')
    expect(citizenAiConfig()?.model).toBe('claude-haiku-5-5')
  })
})
