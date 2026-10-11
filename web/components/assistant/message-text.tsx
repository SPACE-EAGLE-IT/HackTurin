import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

const BULLET = /^\s*[-*]\s+/
const HEADING = /^#{1,3}\s+/
// Bold, inline code and links; everything else stays text (React escapes it).
const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g
const LINK = 'text-primary font-medium underline underline-offset-4'

/** A tiny renderer for the subset of markdown the assistant writes: paragraphs, bullets, bold, code, links. */
export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return <div className='space-y-2 text-sm leading-relaxed'>{blocks.flatMap(renderBlock)}</div>
}

function renderBlock(block: string, blockIndex: number): ReactNode[] {
  const nodes: ReactNode[] = []
  const lines = block.split('\n').filter(line => line.trim() !== '')
  let i = 0
  while (i < lines.length) {
    const key = `${blockIndex}-${nodes.length}`
    if (BULLET.test(lines[i])) {
      const items: string[] = []
      while (i < lines.length && BULLET.test(lines[i])) items.push(lines[i++].replace(BULLET, ''))
      nodes.push(
        <ul key={key} className='list-disc space-y-1 pl-5'>
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length && !BULLET.test(lines[i])) paragraph.push(lines[i++])
    nodes.push(
      <p key={key}>
        {paragraph.map((line, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {HEADING.test(line) ? (
              <span className='font-semibold'>{renderInline(line.replace(HEADING, ''))}</span>
            ) : (
              renderInline(line)
            )}
          </Fragment>
        ))}
      </p>
    )
  }
  return nodes
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0
    if (start > last) nodes.push(text.slice(last, start))
    const [whole, bold, code, label, href] = match
    if (bold !== undefined) nodes.push(<strong key={start}>{bold}</strong>)
    else if (code !== undefined)
      nodes.push(
        <code key={start} className='bg-muted rounded px-1 font-mono text-xs'>
          {code}
        </code>
      )
    else nodes.push(renderLink(label, href, start))
    last = start + whole.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Internal paths navigate in place, http(s) opens a tab, anything else is shown as text. */
function renderLink(label: string, href: string, key: number): ReactNode {
  if (href.startsWith('/'))
    return (
      <Link key={key} href={href} className={LINK}>
        {label}
      </Link>
    )
  if (/^https?:\/\//.test(href))
    return (
      <a key={key} href={href} target='_blank' rel='noopener noreferrer' className={LINK}>
        {label}
      </a>
    )
  return <span key={key}>{label}</span>
}
