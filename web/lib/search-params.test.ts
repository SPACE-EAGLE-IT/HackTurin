import { describe, expect, it } from 'vitest'

import { enumListParam, enumParam, firstParam, listParam } from './search-params'

const STATES = ['todo', 'done'] as const

describe('search params', () => {
  it('reads the first value and comma lists', () => {
    expect(firstParam({ q: ['a', 'b'] }, 'q')).toBe('a')
    expect(listParam({ stato: 'todo,done,' }, 'stato')).toEqual(['todo', 'done'])
    expect(listParam({}, 'stato')).toEqual([])
  })
  it('keeps only allowed values, typed', () => {
    expect(enumListParam({ stato: 'todo,evil,done' }, 'stato', STATES)).toEqual(['todo', 'done'])
    expect(enumParam({ scadenza: 'done' }, 'scadenza', STATES)).toBe('done')
    expect(enumParam({ scadenza: 'evil' }, 'scadenza', STATES)).toBeUndefined()
  })
})
