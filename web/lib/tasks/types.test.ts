import { describe, expect, it } from 'vitest'

import { isOverdue, TASK_STATUS_LABEL, TASK_STATUSES } from './types'

describe('tasks', () => {
  it('is overdue only when open and past due', () => {
    expect(isOverdue({ status: 'todo', due_date: '2026-10-09' }, '2026-10-10')).toBe(true)
    expect(isOverdue({ status: 'done', due_date: '2026-10-09' }, '2026-10-10')).toBe(false)
    expect(isOverdue({ status: 'todo', due_date: null }, '2026-10-10')).toBe(false)
    expect(isOverdue({ status: 'todo', due_date: '2026-10-10' }, '2026-10-10')).toBe(false)
  })
  it('has an Italian label for every status', () => {
    for (const status of TASK_STATUSES) expect(TASK_STATUS_LABEL[status]).toBeTruthy()
  })
})
