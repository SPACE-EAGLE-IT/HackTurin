import { describe, expect, it, vi } from 'vitest'

import { rateLimited } from './limit'
import { normalizeAddress, normalizeCategory } from './normalize'
import { handleVoiceReport, secretMatches, voiceReportSchema } from './report'
import { summarizeZone } from './zone'

describe('normalizeCategory', () => {
  it('keeps exact slugs and names', () => {
    expect(normalizeCategory('buca')).toBe('buca')
    expect(normalizeCategory('cassonetto_pieno')).toBe('cassonetto_pieno')
    expect(normalizeCategory('Illuminazione guasta')).toBe('illuminazione')
  })
  it('maps spoken synonyms', () => {
    expect(normalizeCategory('Buche nella strada')).toBe('buca')
    expect(normalizeCategory('il cassonetto è strapieno')).toBe('cassonetto_pieno')
    expect(normalizeCategory('spazzatura abbandonata')).toBe('rifiuti_abbandonati')
    expect(normalizeCategory('lampione spento')).toBe('illuminazione')
    expect(normalizeCategory('scritte sul muro')).toBe('graffiti')
  })
  it('falls back to altro', () => {
    expect(normalizeCategory('albero caduto')).toBe('altro')
  })
})

describe('normalizeAddress', () => {
  it('drops fillers and civic-number words', () => {
    expect(normalizeAddress('in via Roma numero 12')).toBe('via Roma 12')
    expect(normalizeAddress('davanti alla Mole Antonelliana, Torino')).toBe('Mole Antonelliana')
    expect(normalizeAddress('  corso   Vittorio Emanuele civico 3. ')).toBe('corso Vittorio Emanuele 3')
  })
})

describe('secretMatches', () => {
  it('compares in constant time and rejects missing or wrong values', () => {
    expect(secretMatches('abc', 'abc')).toBe(true)
    expect(secretMatches('abd', 'abc')).toBe(false)
    expect(secretMatches('a-much-longer-value', 'abc')).toBe(false)
    expect(secretMatches(null, 'abc')).toBe(false)
  })
})

describe('voiceReportSchema', () => {
  it('requires category, address and description', () => {
    expect(voiceReportSchema.safeParse({ category: 'buca', address: 'via Roma 1' }).success).toBe(false)
    expect(
      voiceReportSchema.safeParse({ category: 'buca', address: 'via Roma 1', description: 'profonda' })
        .success
    ).toBe(true)
  })
})

describe('handleVoiceReport', () => {
  const place = { lat: 45.068, lon: 7.684, label: 'Via Roma 12', cap: '10121' }
  const input = { category: 'buche', address: 'in via Roma numero 12', description: 'Buca profonda' }

  it('geocodes, saves with the [Telefono] prefix and reads back the place', async () => {
    const geocode = vi.fn().mockResolvedValue(place)
    const submit = vi.fn().mockResolvedValue({ id: 'r1', deduped: false })
    const res = await handleVoiceReport(input, { geocode, submit })
    expect(geocode).toHaveBeenCalledWith('via Roma 12')
    expect(submit).toHaveBeenCalledWith({
      category: 'buca',
      lat: 45.068,
      lon: 7.684,
      description: '[Telefono] Buca profonda',
    })
    expect(res).toMatchObject({ ok: true, report_id: 'r1', deduped: false, address_found: 'Via Roma 12' })
    expect(res.message).toContain('Via Roma 12, CAP 10121')
  })

  it('asks again when the address is not found, without saving', async () => {
    const submit = vi.fn()
    const res = await handleVoiceReport(input, { geocode: vi.fn().mockResolvedValue(null), submit })
    expect(res).toMatchObject({ ok: false, reason: 'address_not_found' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('reports a failed save', async () => {
    const res = await handleVoiceReport(input, {
      geocode: vi.fn().mockResolvedValue(place),
      submit: vi.fn().mockResolvedValue(null),
    })
    expect(res).toMatchObject({ ok: false, reason: 'save_failed' })
  })

  it('says when the report joined an existing one', async () => {
    const res = await handleVoiceReport(input, {
      geocode: vi.fn().mockResolvedValue(place),
      submit: vi.fn().mockResolvedValue({ id: 'r2', deduped: true }),
    })
    expect(res.ok && res.deduped).toBe(true)
    expect(res.message).toMatch(/già una segnalazione/)
  })
})

describe('summarizeZone', () => {
  it('counts only open reports within the radius', () => {
    const c = { lat: 45.068, lon: 7.684 }
    const s = summarizeZone(c, 'Via Roma', [
      { ...c, category: 'buca', status: 'open' },
      { ...c, category: 'buca', status: 'in_progress' },
      { ...c, category: 'graffiti', status: 'resolved' },
      { lat: 45.1, lon: 7.7, category: 'buca', status: 'open' },
    ])
    expect(s.open_reports).toBe(2)
    expect(s.by_category).toEqual({ buca: 2 })
    expect(s.message).toContain('2 segnalazioni aperte')
  })
})

describe('rateLimited', () => {
  it('blocks past the per-minute budget and recovers after a minute', () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) expect(rateLimited('test-key', 3, t)).toBe(false)
    expect(rateLimited('test-key', 3, t)).toBe(true)
    expect(rateLimited('test-key', 3, t + 61_000)).toBe(false)
  })
})

describe('voiceGuard', () => {
  const req = (secret?: string) =>
    new Request('http://x/api/voice/report', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.9', ...(secret ? { 'x-voice-secret': secret } : {}) },
    })

  it('answers 503 without VOICE_TOOL_SECRET, 401 on a missing or wrong secret, passes the right one', async () => {
    const { voiceGuard } = await import('./guard')
    vi.stubEnv('VOICE_TOOL_SECRET', '')
    expect(voiceGuard(req('x'), 't', 5)?.status).toBe(503)
    vi.stubEnv('VOICE_TOOL_SECRET', 'a-long-enough-test-secret-value')
    expect(voiceGuard(req(), 't', 5)?.status).toBe(401)
    expect(voiceGuard(req('wrong'), 't', 5)?.status).toBe(401)
    expect(voiceGuard(req('a-long-enough-test-secret-value'), 't', 5)).toBeNull()
    vi.unstubAllEnvs()
  })
})
