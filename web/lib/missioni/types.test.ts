import { describe, expect, it } from 'vitest'

import { allowanceFor, volunteerLevel } from './types'

describe('volunteer level', () => {
  it('starts as a new volunteer and points to the next level', () => {
    expect(volunteerLevel(0)).toEqual({
      label: 'Nuovo volontario',
      next: { label: 'Volontario attivo', hoursLeft: 4 },
    })
  })
  it('climbs with verified hours and stops at the top', () => {
    expect(volunteerLevel(25.5).label).toBe('Custode di quartiere')
    expect(volunteerLevel(25.5).next?.hoursLeft).toBe(24.5)
    expect(volunteerLevel(80)).toEqual({ label: 'Ambasciatore di Torino', next: null })
  })
})

describe('reimbursement allowance', () => {
  it('counts the day and the month separately', () => {
    const usage = [
      { spent_on: '2026-10-11', amount: 6 },
      { spent_on: '2026-10-02', amount: 140 },
      { spent_on: '2026-09-30', amount: 50 },
    ]
    expect(allowanceFor(usage, '2026-10-11')).toEqual({
      dayUsed: 6,
      monthUsed: 146,
      dayLeft: 4,
      monthLeft: 4,
    })
  })
})
