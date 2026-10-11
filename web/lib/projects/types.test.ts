import { describe, expect, it } from 'vitest'

import { completionPercent } from './types'

describe('completionPercent', () => {
  it('rounds and survives an empty project', () => {
    expect(completionPercent({ tasksTotal: 0, tasksDone: 0, tasksOverdue: 0 })).toBe(0)
    expect(completionPercent({ tasksTotal: 3, tasksDone: 1, tasksOverdue: 0 })).toBe(33)
    expect(completionPercent({ tasksTotal: 4, tasksDone: 4, tasksOverdue: 0 })).toBe(100)
  })
})
