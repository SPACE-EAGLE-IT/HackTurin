import type { NextConfig } from 'next'

// Baseline response headers: no MIME sniffing, no framing, a strict referrer, no device APIs.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // Next.js 16.3+ appends its own rules to AGENTS.md when it detects a coding agent.
  // The kit ships a hand-written AGENTS.md, so that behaviour is disabled.
  agentRules: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
