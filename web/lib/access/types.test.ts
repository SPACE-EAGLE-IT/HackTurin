import { describe, expect, it } from 'vitest'

import { ACCESS_LEVELS, accessRank, hasLevel } from './types'

describe('access levels', () => {
  it('orders none < read < write < admin', () => {
    expect(ACCESS_LEVELS.map(accessRank)).toEqual([0, 1, 2, 3])
  })
  it('compares a held level with a required one', () => {
    expect(hasLevel('write', 'read')).toBe(true)
    expect(hasLevel('read', 'write')).toBe(false)
    expect(hasLevel(undefined, 'read')).toBe(false)
    expect(hasLevel('admin', 'admin')).toBe(true)
  })
})
