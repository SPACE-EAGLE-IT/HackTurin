/**
 * Browser-side storage of the phone POD: the paired key and the offline queue.
 * localStorage can throw (private mode, blocked storage): every access is guarded, and the key
 * also lives in memory so a pairing survives the session even when it cannot be persisted.
 */

const KEY_STORAGE = 'ts-pod-key'
const QUEUE_STORAGE = 'ts-pod-queue'
const QUEUE_MAX = 200

let memoryKey: string | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

function safeGet(name: string) {
  try {
    return window.localStorage.getItem(name)
  } catch {
    return null
  }
}
function safeSet(name: string, value: string) {
  try {
    window.localStorage.setItem(name, value)
  } catch {
    // Storage unavailable: the in-memory copy is enough for this session.
  }
}
function safeRemove(name: string) {
  try {
    window.localStorage.removeItem(name)
  } catch {
    // Nothing stored.
  }
}

/** The key carried by the pairing link (`#k=…`), if the page was opened from it. */
function keyFromHash() {
  const match = /(?:^#|&)k=([^&]+)/.exec(window.location.hash)
  if (!match) return null
  try {
    return decodeURIComponent(match[1]).trim() || null
  } catch {
    return null
  }
}

export function subscribePairing(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function readPairing() {
  return keyFromHash() ?? memoryKey ?? safeGet(KEY_STORAGE)
}

/** Saves the key from the link and strips it from the address bar and history. */
export function consumePairingHash() {
  const key = keyFromHash()
  if (!key) return
  memoryKey = key
  safeSet(KEY_STORAGE, key)
  // Keep the router's history state: Next.js syncs the URL from it.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  notify()
}

export function unpair() {
  memoryKey = null
  safeRemove(KEY_STORAGE)
  safeRemove(QUEUE_STORAGE)
  notify()
}

export type QueuedRequest = {
  endpoint: 'reports' | 'readings'
  body: Record<string, unknown>
  label: string
}

export function loadQueue(): QueuedRequest[] {
  try {
    const parsed: unknown = JSON.parse(safeGet(QUEUE_STORAGE) ?? '[]')
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : []
  } catch {
    return []
  }
}

export function saveQueue(items: QueuedRequest[]) {
  safeSet(QUEUE_STORAGE, JSON.stringify(items.slice(-QUEUE_MAX)))
}
