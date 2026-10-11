import { describe, expect, it } from 'vitest'

import {
  createJoltFilter,
  detectPothole,
  distanceM,
  estimateDb,
  insideTorino,
  joltConfidence,
  REFRACTORY_MS,
  windowAverage,
  type DetectInput,
} from './detect'

const fix = { lat: 45.0703, lon: 7.6869, accuracy: 8, speedKmh: 30 }
const base: DetectInput = {
  peak: 9,
  now: 10_000,
  fix,
  threshold: 7,
  testMode: false,
  lastTriggerAt: null,
  lastSent: null,
}

describe('jolt filter', () => {
  it('projects the linear acceleration on gravity', () => {
    const jolt = createJoltFilter()
    const down = { x: 0, y: 0, z: 9.81 }
    expect(jolt({ acceleration: { x: 0, y: 0, z: 0 }, withGravity: down })).toBe(0)
    // A sideways push is not a vertical jolt; a vertical one is.
    expect(jolt({ acceleration: { x: 5, y: 0, z: 0 }, withGravity: down })).toBeCloseTo(0)
    expect(jolt({ acceleration: { x: 0, y: 0, z: -8 }, withGravity: down })).toBeCloseTo(8)
  })
  it('high-passes the raw signal when acceleration without gravity is missing', () => {
    const jolt = createJoltFilter()
    for (let i = 0; i < 50; i++) jolt({ withGravity: { x: 0, y: 9.81, z: 0 } })
    expect(jolt({ withGravity: { x: 0, y: 9.81, z: 0 } })).toBeCloseTo(0)
    expect(jolt({ withGravity: { x: 0, y: 19.81, z: 0 } })!).toBeGreaterThan(8)
  })
  it('falls back to the magnitude without a gravity reading', () => {
    const jolt = createJoltFilter()
    expect(jolt({ acceleration: { x: 3, y: 4, z: 0 } })).toBe(5)
    expect(jolt({})).toBeNull()
  })
})

describe('pothole decision', () => {
  it('triggers above the threshold while driving with a good fix', () => {
    expect(detectPothole(base)).toEqual({ trigger: true, confidence: joltConfidence(9, 7) })
  })
  it('ignores small jolts, the refractory period, walking and bad fixes', () => {
    expect(detectPothole({ ...base, peak: 6 })).toEqual({ trigger: false, reason: 'below' })
    expect(detectPothole({ ...base, lastTriggerAt: base.now - REFRACTORY_MS + 1 })).toMatchObject({
      reason: 'refractory',
    })
    expect(detectPothole({ ...base, fix: { ...fix, speedKmh: 4 } })).toMatchObject({ reason: 'slow' })
    expect(detectPothole({ ...base, fix: { ...fix, accuracy: 50 } })).toMatchObject({ reason: 'inaccurate' })
    expect(detectPothole({ ...base, fix: null, testMode: true })).toMatchObject({ reason: 'no_fix' })
  })
  it('lets test mode skip the speed gate', () => {
    expect(detectPothole({ ...base, testMode: true, fix: { ...fix, speedKmh: 0 } }).trigger).toBe(true)
  })
  it('dedupes within 25 m of the last sent pothole', () => {
    expect(detectPothole({ ...base, lastSent: { lat: 45.0704, lon: 7.6869 } })).toMatchObject({
      reason: 'nearby',
    })
    expect(detectPothole({ ...base, lastSent: { lat: 45.071, lon: 7.6869 } }).trigger).toBe(true)
  })
})

describe('helpers', () => {
  it('scales confidence between 0.5 and 0.95', () => {
    expect(joltConfidence(7, 7)).toBe(0.5)
    expect(joltConfidence(14, 7)).toBe(0.95)
    expect(joltConfidence(40, 7)).toBe(0.95)
  })
  it('measures distance and the Turin box', () => {
    expect(distanceM({ lat: 45, lon: 7.6 }, { lat: 45.001, lon: 7.6 })).toBeCloseTo(111.2, 0)
    expect(insideTorino(45.0703, 7.6869)).toBe(true)
    expect(insideTorino(45.4642, 9.19)).toBe(false)
  })
  it('estimates dB and averages over a window', () => {
    expect(estimateDb(1)).toBe(94)
    expect(estimateDb(0.01)).toBe(54)
    expect(estimateDb(0)).toBe(0)
    expect(
      windowAverage(
        [
          { t: 0, v: 50 },
          { t: 70_000, v: 60 },
          { t: 80_000, v: 70 },
        ],
        90_000
      )
    ).toBe(65)
    expect(windowAverage([], 0)).toBeNull()
  })
})
