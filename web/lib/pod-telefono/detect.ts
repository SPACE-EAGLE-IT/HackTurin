import { TORINO_BOUNDS } from '@/lib/civic/categories'

/** Pure helpers of the phone POD: jolt from the accelerometer, the pothole decision, noise estimate. */

export type Vec3 = { x: number; y: number; z: number }

export const SENSITIVITIES = ['bassa', 'media', 'alta'] as const
export type Sensitivity = (typeof SENSITIVITIES)[number]
export const SENSITIVITY_LABEL: Record<Sensitivity, string> = { bassa: 'Bassa', media: 'Media', alta: 'Alta' }
/** Peak vertical jolt (m/s², gravity removed) that counts as a pothole. */
export const SENSITIVITY_THRESHOLD: Record<Sensitivity, number> = { bassa: 10, media: 7, alta: 5 }

export const MIN_SPEED_KMH = 8
export const REFRACTORY_MS = 2000
export const DEDUPE_RADIUS_M = 25
export const MAX_ACCURACY_M = 30

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const norm = (a: Vec3) => Math.sqrt(dot(a, a))

/**
 * Turns devicemotion samples into a vertical-ish jolt in m/s². A low-pass of the raw signal tracks
 * gravity (its direction is "down" whatever the phone's orientation); the jolt is the linear
 * acceleration projected on it, or the magnitude when no gravity reading exists.
 */
export function createJoltFilter(alpha = 0.9) {
  let gravity: Vec3 | null = null
  return function jolt(sample: { acceleration?: Vec3 | null; withGravity?: Vec3 | null }): number | null {
    const raw = sample.withGravity ?? null
    if (raw) {
      gravity = gravity
        ? {
            x: alpha * gravity.x + (1 - alpha) * raw.x,
            y: alpha * gravity.y + (1 - alpha) * raw.y,
            z: alpha * gravity.z + (1 - alpha) * raw.z,
          }
        : { ...raw }
    }
    const linear =
      sample.acceleration ??
      (raw && gravity ? { x: raw.x - gravity.x, y: raw.y - gravity.y, z: raw.z - gravity.z } : null)
    if (!linear) return null
    const g = gravity ? norm(gravity) : 0
    if (g < 1) return norm(linear)
    return Math.abs(dot(linear, gravity as Vec3) / g)
  }
}

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const insideTorino = (lat: number, lon: number) =>
  lat >= TORINO_BOUNDS.minLat &&
  lat <= TORINO_BOUNDS.maxLat &&
  lon >= TORINO_BOUNDS.minLon &&
  lon <= TORINO_BOUNDS.maxLon

/** 0.5 at the threshold, 0.95 at twice the threshold and above. */
export function joltConfidence(peak: number, threshold: number) {
  const over = peak / threshold - 1
  return Math.round(Math.min(0.95, Math.max(0.5, 0.5 + 0.45 * over)) * 100) / 100
}

export type Fix = { lat: number; lon: number; accuracy: number; speedKmh: number | null }

export type DetectInput = {
  peak: number
  now: number
  fix: Fix | null
  threshold: number
  /** Test mode ignores the speed gate (walking, desk). */
  testMode: boolean
  lastTriggerAt: number | null
  lastSent: { lat: number; lon: number } | null
}

export type DetectResult =
  | { trigger: true; confidence: number }
  | { trigger: false; reason: 'below' | 'refractory' | 'slow' | 'no_fix' | 'inaccurate' | 'nearby' }

/** Decides whether one jolt is a pothole worth reporting. */
export function detectPothole(i: DetectInput): DetectResult {
  if (i.peak < i.threshold) return { trigger: false, reason: 'below' }
  if (i.lastTriggerAt !== null && i.now - i.lastTriggerAt < REFRACTORY_MS) {
    return { trigger: false, reason: 'refractory' }
  }
  if (!i.testMode && (i.fix?.speedKmh ?? 0) < MIN_SPEED_KMH) return { trigger: false, reason: 'slow' }
  if (!i.fix) return { trigger: false, reason: 'no_fix' }
  if (i.fix.accuracy > MAX_ACCURACY_M) return { trigger: false, reason: 'inaccurate' }
  if (i.lastSent && distanceM(i.lastSent, i.fix) < DEDUPE_RADIUS_M)
    return { trigger: false, reason: 'nearby' }
  return { trigger: true, confidence: joltConfidence(i.peak, i.threshold) }
}

/** Approximate sound level from the RMS of a [-1, 1] signal: dBFS plus a fixed 94 dB offset. */
export function estimateDb(rms: number) {
  if (rms <= 0) return 0
  return Math.round(Math.min(130, Math.max(0, 20 * Math.log10(rms) + 94)) * 10) / 10
}

/** Running average over a time window, for the 60-second noise level. */
export function windowAverage(samples: { t: number; v: number }[], now: number, windowMs = 60000) {
  const recent = samples.filter(s => now - s.t <= windowMs)
  if (recent.length === 0) return null
  return Math.round((recent.reduce((sum, s) => sum + s.v, 0) / recent.length) * 10) / 10
}
