import { describe, expect, it } from 'vitest'

import { isTicketOverdue, requesterLabel, TICKET_STATUS_LABEL, TICKET_STATUSES } from './types'

describe('tickets', () => {
  it('names the requester whether inside or outside the team', () => {
    expect(
      requesterLabel({
        requester: { id: '1', full_name: 'Giulia Conti', avatar_url: null },
        requester_name: null,
      })
    ).toBe('Giulia Conti')
    expect(requesterLabel({ requester: null, requester_name: 'Mario Rossi' })).toBe('Mario Rossi')
    expect(requesterLabel({ requester: null, requester_name: null })).toBe('Sconosciuto')
  })
  it('is overdue only while still to handle and past due', () => {
    const now = '2026-10-10T12:00:00.000Z'
    expect(isTicketOverdue({ status: 'open', due_at: '2026-10-09T12:00:00.000Z' }, now)).toBe(true)
    expect(isTicketOverdue({ status: 'resolved', due_at: '2026-10-09T12:00:00.000Z' }, now)).toBe(false)
    expect(isTicketOverdue({ status: 'waiting', due_at: null }, now)).toBe(false)
  })
  it('has an Italian label for every status', () => {
    for (const status of TICKET_STATUSES) expect(TICKET_STATUS_LABEL[status]).toBeTruthy()
  })
})
