import type { NextConfig } from 'next'

// Baseline response headers: no MIME sniffing, no framing, a strict referrer, only GPS among device APIs
// (citizens report from where they stand).
const baseHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
const securityHeaders = [
  ...baseHeaders,
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]
// The phone POD page is the one place that reads GPS, motion sensors, the microphone and the wake lock.
const phonePodHeaders = [
  ...baseHeaders,
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), screen-wake-lock=(self)',
  },
]

// The report page hosts the voice assistant widget, which needs the microphone.
const reportPageHeaders = [
  ...baseHeaders,
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
]

const nextConfig: NextConfig = {
  // Next.js 16.3+ appends its own rules to AGENTS.md when it detects a coding agent.
  // The kit ships a hand-written AGENTS.md, so that behaviour is disabled.
  agentRules: false,
  async headers() {
    return [
      { source: '/((?!(?:pod-telefono|segnala)$).*)', headers: securityHeaders },
      { source: '/pod-telefono', headers: phonePodHeaders },
      { source: '/segnala', headers: reportPageHeaders },
    ]
  },
}

export default nextConfig
