import { beforeEach, describe, expect, it } from 'vitest'

import {
  closeAssistant,
  openAssistant,
  readAssistantPanel,
  resetAssistantPanel,
  setAssistantWorking,
  toggleAssistant,
  toggleAssistantWidth,
} from './panel-store'

describe('assistant panel store', () => {
  beforeEach(() => resetAssistantPanel())

  it('starts closed, narrow and idle', () => {
    expect(readAssistantPanel()).toEqual({ open: false, everOpened: false, wide: false, working: false })
  })

  it('remembers that it was opened once', () => {
    openAssistant()
    closeAssistant()
    expect(readAssistantPanel()).toMatchObject({ open: false, everOpened: true })
  })

  it('toggles the open state and the width independently', () => {
    toggleAssistant()
    toggleAssistantWidth()
    expect(readAssistantPanel()).toMatchObject({ open: true, wide: true })
    toggleAssistant()
    expect(readAssistantPanel()).toMatchObject({ open: false, wide: true })
  })

  it('keeps the working flag apart from the open state', () => {
    setAssistantWorking(true)
    expect(readAssistantPanel()).toMatchObject({ open: false, working: true })
    setAssistantWorking(false)
    expect(readAssistantPanel().working).toBe(false)
  })
})
