'use client'

import { useSyncExternalStore } from 'react'

/**
 * The state of the assistant panel, shared by pieces that live apart in the shell: the disc in the corner, the
 * header button on phones, the docked panel and the content margin. A module-level store rather than a context,
 * so it survives navigation and any piece can open the panel.
 */
export type AssistantPanelState = {
  /** The panel is on screen. */
  open: boolean
  /** The panel was opened at least once: the dock mounts lazily and then stays mounted. */
  everOpened: boolean
  /** The wide layout (40rem) instead of the narrow one (26rem). */
  wide: boolean
  /** A turn is running: the disc and the header button show the pulse. */
  working: boolean
}

const INITIAL: AssistantPanelState = { open: false, everOpened: false, wide: false, working: false }

let state = INITIAL
const listeners = new Set<() => void>()

function emit(patch: Partial<AssistantPanelState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The current state; re-renders on every change. The server and the hydrating client see the panel closed. */
export function useAssistantPanel(): AssistantPanelState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL
  )
}

/** The state outside React (tests, event handlers). */
export const readAssistantPanel = () => state

export function openAssistant() {
  emit({ open: true, everOpened: true })
}

export function closeAssistant() {
  emit({ open: false })
}

export function toggleAssistant() {
  if (state.open) closeAssistant()
  else openAssistant()
}

export function toggleAssistantWidth() {
  emit({ wide: !state.wide })
}

export function setAssistantWorking(working: boolean) {
  if (state.working !== working) emit({ working })
}

/** Back to the initial state (tests). */
export function resetAssistantPanel() {
  emit(INITIAL)
}
