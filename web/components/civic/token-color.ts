/** Resolves a design-system colour token to an rgb() string MapLibre understands (tokens may be oklch). */
export function tokenColor(token: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || !raw) return 'gray'
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}
