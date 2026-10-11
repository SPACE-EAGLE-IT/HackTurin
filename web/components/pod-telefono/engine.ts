import { categoryName, TORINO_CENTER } from '@/lib/civic/categories'
import {
  createJoltFilter,
  detectPothole,
  distanceM,
  estimateDb,
  insideTorino,
  joltConfidence,
  SENSITIVITY_THRESHOLD,
  windowAverage,
  type Fix,
  type Sensitivity,
  type Vec3,
} from '@/lib/pod-telefono/detect'
import { loadQueue, saveQueue, type QueuedRequest } from '@/lib/pod-telefono/storage'

/** The phone POD at runtime: sensors in, POD API calls out. Framework-free; the UI subscribes to it. */

export type PermState = 'off' | 'waiting' | 'on' | 'denied' | 'unsupported'
export type LogTone = 'success' | 'info' | 'warning' | 'destructive' | 'muted'

export type LogEntry = {
  id: number
  ts: number
  label: string
  status: number | null
  note: string
  tone: LogTone
}

export type PodSnapshot = {
  running: boolean
  sensitivity: Sensitivity
  testMode: boolean
  noiseOn: boolean
  fix: Fix | null
  perms: { motion: PermState; gps: PermState; wakeLock: PermState; mic: PermState }
  detected: number
  sent: number
  queued: number
  /** Highest jolt of the last fraction of a second, m/s². */
  jolt: number
  noiseDb: number | null
  noiseAvg: number | null
  log: LogEntry[]
  /** Last heartbeat: when and with which HTTP status (null = no network). */
  heartbeat: { ts: number; status: number | null } | null
}

const HEARTBEAT_MS = 60_000
const FIRMWARE = 'phone-web 1.0'
const round1 = (n: number) => Math.round(n * 10) / 10

type DeviceMotionWithPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }
type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<{ level: number }> }

const toVec = (a: DeviceMotionEventAcceleration | null): Vec3 | null =>
  a && a.x !== null && a.y !== null && a.z !== null ? { x: a.x, y: a.y, z: a.z } : null

export class PhonePodEngine {
  private snap: PodSnapshot
  private listeners = new Set<() => void>()
  private nextLogId = 1

  private jolt = createJoltFilter()
  private joltPeak = 0
  private lastTriggerAt: number | null = null
  private lastSent: { lat: number; lon: number } | null = null
  private lastFixAt: number | null = null
  private noiseSamples: { t: number; v: number }[] = []

  private watchId: number | null = null
  private wakeLock: WakeLockSentinel | null = null
  private audio: { ctx: AudioContext; stream: MediaStream } | null = null
  private timers: ReturnType<typeof setInterval>[] = []
  private noiseTimer: ReturnType<typeof setInterval> | null = null
  private flushing = false

  constructor(private apiKey: string) {
    this.snap = {
      running: false,
      sensitivity: 'media',
      testMode: false,
      noiseOn: false,
      fix: null,
      perms: { motion: 'off', gps: 'off', wakeLock: 'off', mic: 'off' },
      detected: 0,
      sent: 0,
      queued: loadQueue().length,
      jolt: 0,
      noiseDb: null,
      noiseAvg: null,
      log: [],
      heartbeat: null,
    }
  }

  /** Browser listeners live between attach and detach (an effect), not in the constructor. */
  attach() {
    window.addEventListener('online', this.onOnline)
    document.addEventListener('visibilitychange', this.onVisibility)
  }
  detach() {
    this.stop()
    window.removeEventListener('online', this.onOnline)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  getSnapshot = () => this.snap

  private set(patch: Partial<PodSnapshot>) {
    this.snap = { ...this.snap, ...patch }
    this.listeners.forEach(listener => listener())
  }
  private setPerm(key: keyof PodSnapshot['perms'], value: PermState) {
    this.set({ perms: { ...this.snap.perms, [key]: value } })
  }
  private log(entry: Omit<LogEntry, 'id' | 'ts'>) {
    this.set({ log: [{ ...entry, id: this.nextLogId++, ts: Date.now() }, ...this.snap.log].slice(0, 10) })
  }

  setSensitivity(sensitivity: Sensitivity) {
    this.set({ sensitivity })
  }
  setTestMode(testMode: boolean) {
    this.set({ testMode })
  }

  async setNoise(on: boolean) {
    this.set({ noiseOn: on })
    if (!on) this.stopNoise()
    else if (this.snap.running) await this.startNoise()
  }

  /** Must run inside the click handler: iOS only grants motion from a user gesture. */
  async start() {
    if (this.snap.running) return
    const DME = (typeof window.DeviceMotionEvent === 'undefined' ? undefined : window.DeviceMotionEvent) as
      DeviceMotionWithPermission | undefined
    let motion: PermState = 'unsupported'
    if (DME) {
      if (typeof DME.requestPermission === 'function') {
        try {
          motion = (await DME.requestPermission()) === 'granted' ? 'waiting' : 'denied'
        } catch {
          motion = 'denied'
        }
      } else motion = 'waiting'
    }
    if (motion === 'waiting') window.addEventListener('devicemotion', this.onMotion)
    this.set({ running: true, perms: { ...this.snap.perms, motion } })

    if ('geolocation' in navigator) {
      this.setPerm('gps', 'waiting')
      this.watchId = navigator.geolocation.watchPosition(this.onPosition, this.onPositionError, {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 30_000,
      })
    } else this.setPerm('gps', 'unsupported')

    await this.acquireWakeLock()
    if (this.snap.noiseOn) await this.startNoise()

    this.timers.push(setInterval(() => void this.heartbeat(), HEARTBEAT_MS))
    this.timers.push(
      setInterval(() => {
        this.set({ jolt: round1(this.joltPeak) })
        this.joltPeak = 0
      }, 250)
    )
    void this.heartbeat()
  }

  stop() {
    window.removeEventListener('devicemotion', this.onMotion)
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId)
    this.watchId = null
    void this.wakeLock?.release().catch(() => undefined)
    this.wakeLock = null
    this.stopNoise()
    this.timers.forEach(clearInterval)
    this.timers = []
    this.set({
      running: false,
      jolt: 0,
      perms: { motion: 'off', gps: 'off', wakeLock: 'off', mic: 'off' },
    })
  }

  // --- sensors ---

  private onMotion = (event: DeviceMotionEvent) => {
    const value = this.jolt({
      acceleration: toVec(event.acceleration),
      withGravity: toVec(event.accelerationIncludingGravity),
    })
    if (value === null) return
    if (this.snap.perms.motion !== 'on') this.setPerm('motion', 'on')
    this.joltPeak = Math.max(this.joltPeak, value)

    const now = Date.now()
    const threshold = SENSITIVITY_THRESHOLD[this.snap.sensitivity]
    const decision = detectPothole({
      peak: value,
      now,
      fix: this.snap.fix,
      threshold,
      testMode: this.snap.testMode,
      lastTriggerAt: this.lastTriggerAt,
      lastSent: this.lastSent,
    })
    if (decision.trigger) {
      this.lastTriggerAt = now
      void this.sendPothole(value, decision.confidence, false)
      return
    }
    if (decision.reason === 'below' || decision.reason === 'refractory' || decision.reason === 'slow') return
    this.lastTriggerAt = now
    const note =
      decision.reason === 'nearby'
        ? 'Già segnalata entro 25 m'
        : decision.reason === 'no_fix'
          ? 'Scartata: posizione GPS assente'
          : 'Scartata: GPS impreciso (> 30 m)'
    this.log({ label: 'Buca', status: null, note, tone: 'muted' })
  }

  private onPosition = (position: GeolocationPosition) => {
    const { latitude: lat, longitude: lon, accuracy, speed } = position.coords
    const previous = this.snap.fix
    let speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : null
    if (speedKmh === null && previous && this.lastFixAt !== null) {
      const seconds = (position.timestamp - this.lastFixAt) / 1000
      if (seconds > 0.5) speedKmh = (distanceM(previous, { lat, lon }) / seconds) * 3.6
    }
    this.lastFixAt = position.timestamp
    this.set({
      fix: { lat, lon, accuracy, speedKmh: speedKmh === null ? null : round1(speedKmh) },
      perms: { ...this.snap.perms, gps: 'on' },
    })
  }

  private onPositionError = (error: GeolocationPositionError) => {
    this.setPerm('gps', error.code === error.PERMISSION_DENIED ? 'denied' : 'waiting')
  }

  private async acquireWakeLock() {
    if (!('wakeLock' in navigator)) {
      this.setPerm('wakeLock', 'unsupported')
      return
    }
    try {
      this.wakeLock = await navigator.wakeLock.request('screen')
      this.setPerm('wakeLock', 'on')
      this.wakeLock.addEventListener('release', () => {
        if (this.snap.running) this.setPerm('wakeLock', 'waiting')
      })
    } catch {
      this.setPerm('wakeLock', 'denied')
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && this.snap.running) void this.acquireWakeLock()
  }

  private onOnline = () => void this.flush()

  private async startNoise() {
    if (this.audio) return
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setPerm('mic', 'unsupported')
      return
    }
    try {
      // Audio stays on the phone: only the level is computed, nothing is recorded or sent.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      this.audio = { ctx, stream }
      this.setPerm('mic', 'on')
      this.noiseTimer = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer)
        let sum = 0
        for (const v of buffer) sum += v * v
        const db = estimateDb(Math.sqrt(sum / buffer.length))
        const now = Date.now()
        this.noiseSamples = [...this.noiseSamples.filter(s => now - s.t <= HEARTBEAT_MS), { t: now, v: db }]
        this.set({ noiseDb: db, noiseAvg: windowAverage(this.noiseSamples, now) })
      }, 500)
    } catch {
      this.setPerm('mic', 'denied')
      this.set({ noiseOn: false })
    }
  }

  private stopNoise() {
    if (this.noiseTimer) clearInterval(this.noiseTimer)
    this.noiseTimer = null
    this.audio?.stream.getTracks().forEach(track => track.stop())
    void this.audio?.ctx.close().catch(() => undefined)
    this.audio = null
    this.noiseSamples = []
    this.set({ noiseDb: null, noiseAvg: null, perms: { ...this.snap.perms, mic: 'off' } })
  }

  // --- reports ---

  /** A synthetic pothole at the current position (Piazza Castello without GPS), for demos. */
  simulate() {
    const threshold = SENSITIVITY_THRESHOLD[this.snap.sensitivity]
    const peak = round1(threshold * 1.6)
    void this.sendPothole(peak, joltConfidence(peak, threshold), true)
  }

  private async sendPothole(peak: number, confidence: number, simulated: boolean) {
    const fix = this.snap.fix
    const lat = fix?.lat ?? TORINO_CENTER[1]
    const lon = fix?.lon ?? TORINO_CENTER[0]
    this.lastSent = { lat, lon }
    this.set({ detected: this.snap.detected + 1 })
    const metadata: Record<string, unknown> = { source: 'phone', peak_ms2: round1(peak) }
    if (fix?.speedKmh != null) metadata.speed_kmh = fix.speedKmh
    if (fix) metadata.accuracy_m = Math.round(fix.accuracy)
    if (simulated) metadata.simulated = true
    await this.submit({
      endpoint: 'reports',
      label: simulated ? 'Buca (simulata)' : 'Buca',
      body: { category: 'buca', lat, lon, confidence, captured_at: new Date().toISOString(), metadata },
    })
  }

  /** A report chosen by hand, at the current position; asks for one fix if the GPS is not running. */
  async manual(category: string) {
    const fix = this.snap.fix ?? (await this.oneFix())
    if (!fix) {
      this.log({
        label: categoryName(category),
        status: null,
        note: 'Posizione non disponibile',
        tone: 'warning',
      })
      return
    }
    const metadata: Record<string, unknown> = { source: 'phone_manual', accuracy_m: Math.round(fix.accuracy) }
    await this.submit({
      endpoint: 'reports',
      label: categoryName(category),
      body: {
        category,
        lat: fix.lat,
        lon: fix.lon,
        confidence: 1,
        captured_at: new Date().toISOString(),
        metadata,
      },
    })
  }

  private oneFix(): Promise<Fix | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null)
    return new Promise(resolve =>
      navigator.geolocation.getCurrentPosition(
        p =>
          resolve({
            lat: p.coords.latitude,
            lon: p.coords.longitude,
            accuracy: p.coords.accuracy,
            speedKmh: null,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 }
      )
    )
  }

  // --- transport ---

  private async post(endpoint: string, body: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/v1/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json: unknown = await response.json().catch(() => null)
      return { status: response.status, json }
    } catch {
      return null
    }
  }

  /** Sends one request; on network failure (or a 5xx) it goes to the offline queue. */
  private async submit(request: QueuedRequest, fromQueue = false): Promise<'done' | 'queued'> {
    const result = await this.post(request.endpoint, request.body)
    if (!result || result.status >= 500) {
      if (!fromQueue) {
        const queue = [...loadQueue(), request]
        saveQueue(queue)
        this.set({ queued: queue.length })
        this.log({
          label: request.label,
          status: result?.status ?? null,
          note: 'In coda: nuovo invio più tardi',
          tone: 'warning',
        })
      }
      return 'queued'
    }
    this.log({ label: request.label, status: result.status, ...describe(result.status, result.json) })
    if (result.status < 300 && request.endpoint === 'reports') this.set({ sent: this.snap.sent + 1 })
    return 'done'
  }

  async flush() {
    if (this.flushing) return
    this.flushing = true
    try {
      let queue = loadQueue()
      while (queue.length > 0) {
        if ((await this.submit(queue[0], true)) === 'queued') break
        queue = queue.slice(1)
        saveQueue(queue)
        this.set({ queued: queue.length })
      }
    } finally {
      this.flushing = false
    }
  }

  private async heartbeat() {
    await this.flush()
    const fix = this.snap.fix
    const body: Record<string, unknown> = { firmware: FIRMWARE }
    if (fix) {
      body.lat = fix.lat
      body.lon = fix.lon
    }
    const battery = await (navigator as NavigatorWithBattery)
      .getBattery?.()
      .then(b => Math.round(b.level * 100))
      .catch(() => null)
    if (typeof battery === 'number') body.battery = battery
    const metrics: Record<string, number> = {}
    if (this.snap.noiseOn && this.snap.noiseAvg !== null) metrics.noise_db = this.snap.noiseAvg
    if (fix?.speedKmh != null) metrics.speed_kmh = fix.speedKmh
    if (Object.keys(metrics).length > 0) body.metrics = metrics

    const result = await this.post('heartbeat', body)
    this.set({ heartbeat: { ts: Date.now(), status: result?.status ?? null } })
    // Successful heartbeats show in the status card; only failures take room in the log.
    if (!result) this.log({ label: 'Heartbeat', status: null, note: 'Rete assente', tone: 'warning' })
    else if (result.status >= 300) {
      this.log({ label: 'Heartbeat', status: result.status, ...describe(result.status, result.json) })
    }

    if (this.snap.noiseOn && this.snap.noiseAvg !== null) {
      const reading: Record<string, unknown> = { metrics: { noise_db: this.snap.noiseAvg } }
      // Readings outside Turin are rejected: drop the position instead of the measure.
      if (fix && insideTorino(fix.lat, fix.lon)) {
        reading.lat = fix.lat
        reading.lon = fix.lon
      }
      await this.submit({ endpoint: 'readings', label: 'Rumore', body: reading })
    }
  }
}

/** Turns an API answer into the log's note and tone. */
function describe(status: number, json: unknown): { note: string; tone: LogTone } {
  const body = (json ?? {}) as { deduped?: boolean; details?: { field: string }[] }
  if (status < 300) {
    return body.deduped
      ? { note: 'Unita a una segnalazione vicina', tone: 'info' }
      : { note: 'Inviata', tone: 'success' }
  }
  if (status === 401) return { note: 'Chiave non valida o POD disattivato', tone: 'destructive' }
  if (status === 422) {
    const outside = body.details?.some(d => d.field === 'lat' || d.field === 'lon')
    return outside
      ? { note: "Fuori dall'area di Torino: scartata", tone: 'warning' }
      : { note: 'Dati non validi', tone: 'warning' }
  }
  return { note: `Errore ${status}`, tone: 'destructive' }
}
