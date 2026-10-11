import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { dateKeySchema, escapeLike, fieldErrorsOf, optionalText } from './validation'

describe('optionalText', () => {
  it('trims and turns an empty string into null', () => {
    const schema = optionalText(10)
    expect(schema.parse('  ciao ')).toBe('ciao')
    expect(schema.parse('')).toBeNull()
    expect(schema.parse(undefined)).toBeUndefined()
  })
  it('rejects text over the limit', () => {
    expect(optionalText(3).safeParse('quattro').success).toBe(false)
  })
})

describe('dateKeySchema', () => {
  it('accepts YYYY-MM-DD and nothing else', () => {
    expect(dateKeySchema.safeParse('2026-10-10').success).toBe(true)
    expect(dateKeySchema.safeParse('10/10/2026').success).toBe(false)
  })
})

describe('fieldErrorsOf', () => {
  it('keeps the first message per field', () => {
    const result = z
      .object({ title: z.string().min(1, 'Obbligatorio').max(2, 'Troppo lungo') })
      .safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrorsOf(result.error)).toEqual({ title: 'Obbligatorio' })
  })
})

describe('escapeLike', () => {
  it('escapes the wildcard characters of a LIKE pattern', () => {
    expect(escapeLike('100%_sure\\')).toBe('100\\%\\_sure\\\\')
  })
})
