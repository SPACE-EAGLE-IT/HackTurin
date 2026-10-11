// Renders docs/GIUDICI.md to an A4 PDF for the jury (docs/To.Be-dossier-giuria.pdf).
//   node scripts/docs/dossier-pdf.mjs
// A tiny Markdown subset (headings, paragraphs, lists, tables, code, **bold**, `code`) drawn with @react-pdf.
// Fonts come from macOS (Arial Unicode covers →, ≈, ₂); colours are document metadata, not app styling.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Document, Font, Image, Link, Page, renderToFile, StyleSheet, Text, View } from '@react-pdf/renderer'
import { createElement as h } from 'react'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '../../..')
const SRC = join(ROOT, 'docs/GIUDICI.md')
const OUT = join(ROOT, 'docs/To.Be-dossier-giuria.pdf')
const LOGO = join(ROOT, 'web/public/brand/tobe-logo.png')
const FONTS = '/System/Library/Fonts/Supplemental'

Font.register({
  family: 'Body',
  fonts: [{ src: `${FONTS}/Arial Unicode.ttf` }, { src: `${FONTS}/Arial Bold.ttf`, fontWeight: 'bold' }],
})
Font.register({ family: 'Mono', src: `${FONTS}/Courier New.ttf` })
// Long tokens (URLs, paths) may break anywhere so table cells never overflow; normal words stay whole.
Font.registerHyphenationCallback(word => (word.length > 44 ? word.match(/.{1,12}/g) : [word]))

const NAVY = '#0f2847' // ds-allow: PDF document colour (logo navy)
const RED = '#d4202c' // ds-allow: PDF document colour (logo red)
const GREY = '#5b6472' // ds-allow: PDF document colour
const LINE = '#d9dee5' // ds-allow: PDF document colour
const TINT = '#f3f5f8' // ds-allow: PDF document colour

const s = StyleSheet.create({
  page: { fontFamily: 'Body', fontSize: 9.5, lineHeight: 1.45, color: '#1d2430', padding: '42 46 54 46' }, // ds-allow: PDF text colour
  h1: { fontSize: 20, fontWeight: 'bold', color: NAVY, marginBottom: 4 },
  h2: {
    fontSize: 13,
    fontWeight: 'bold',
    color: NAVY,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1 solid ${LINE}`,
  },
  p: { marginBottom: 6 },
  li: { flexDirection: 'row', marginBottom: 3, paddingRight: 8 },
  bullet: { width: 14, color: RED },
  table: { marginBottom: 8, border: `1 solid ${LINE}` },
  tr: { flexDirection: 'row', borderBottom: `1 solid ${LINE}` },
  th: { fontWeight: 'bold', backgroundColor: TINT, color: NAVY },
  td: { padding: '3 5', flexGrow: 1, flexBasis: 0 },
  code: {
    fontFamily: 'Mono',
    fontSize: 7.6,
    backgroundColor: TINT,
    padding: 8,
    marginBottom: 8,
    lineHeight: 1.35,
  },
  inlineCode: { fontFamily: 'Mono', fontSize: 8.6 },
  bold: { fontWeight: 'bold' },
  link: { color: NAVY, textDecoration: 'underline' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 46,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: GREY,
  },
})

/** **bold**, `code` and bare https links inside one line of text. */
function inline(text, key = 'i') {
  const out = []
  const re = /\*\*(.+?)\*\*|`([^`]+)`|(https:\/\/[^\s)|]+)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(h(Text, { key: `${key}b${i}`, style: s.bold }, m[1]))
    else if (m[2]) out.push(h(Text, { key: `${key}c${i}`, style: s.inlineCode }, m[2]))
    else out.push(h(Link, { key: `${key}l${i}`, src: m[3], style: s.link }, m[3]))
    last = re.lastIndex
    i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function blocks(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const body = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      out.push({ type: 'code', text: body.join('\n') })
    } else if (line.startsWith('# ')) {
      out.push({ type: 'h1', text: line.slice(2) })
      i++
    } else if (line.startsWith('## ')) {
      out.push({ type: 'h2', text: line.slice(3) })
      i++
    } else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i]))
          rows.push(
            lines[i]
              .split('|')
              .slice(1, -1)
              .map(c => c.trim())
          )
        i++
      }
      out.push({ type: 'table', rows })
    } else if (/^\s*(-|\d+\.)\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*(-|\d+\.)\s|^\s{2,}\S/.test(lines[i]) && lines[i].trim()) {
        const m = lines[i].match(/^(\s*)(-|\d+\.)\s(.*)$/)
        if (m) items.push({ depth: m[1].length >= 2 ? 1 : 0, mark: m[2] === '-' ? '•' : m[2], text: m[3] })
        else items[items.length - 1].text += ' ' + lines[i].trim()
        i++
      }
      out.push({ type: 'list', items })
    } else {
      const para = []
      while (i < lines.length && lines[i].trim() && !/^(#|\||```|\s*(-|\d+\.)\s)/.test(lines[i]))
        para.push(lines[i++].trim())
      out.push({ type: 'p', text: para.join(' ') })
    }
  }
  return out
}

function render(b, k) {
  switch (b.type) {
    case 'h1':
      return h(
        View,
        { key: k, style: { marginBottom: 6 } },
        h(Image, { src: LOGO, style: { width: 190, marginBottom: 10 } }),
        h(Text, { style: s.h1 }, b.text)
      )
    case 'h2':
      return h(Text, { key: k, style: s.h2, minPresenceAhead: 60 }, b.text)
    case 'p':
      return h(Text, { key: k, style: s.p }, inline(b.text, k))
    case 'code':
      return h(Text, { key: k, style: s.code, wrap: false }, b.text)
    case 'list':
      return h(
        View,
        { key: k, style: { marginBottom: 6 } },
        b.items.map((it, j) =>
          h(
            View,
            { key: j, style: [s.li, { marginLeft: it.depth * 14 }], wrap: false },
            h(Text, { style: s.bullet }, it.mark),
            h(Text, { style: { flex: 1 } }, inline(it.text, `${k}-${j}`))
          )
        )
      )
    case 'table': {
      const widths =
        b.rows[0].length === 2
          ? [1, 3]
          : b.rows[0].length === 3
            ? b.rows[0][1] === 'Dove'
              ? [0.9, 2.3, 1.6]
              : [1, 1.1, 2.6]
            : b.rows[0].map(() => 1)
      return h(
        View,
        { key: k, style: s.table },
        b.rows.map((row, r) =>
          h(
            View,
            { key: r, style: [s.tr, r === 0 ? s.th : {}], wrap: false },
            row.map((cell, c) =>
              h(
                Text,
                { key: c, style: [s.td, { flexGrow: widths[c] }, r === 0 ? s.bold : {}] },
                inline(cell, `${k}-${r}-${c}`)
              )
            )
          )
        )
      )
    }
  }
}

const doc = h(
  Document,
  { title: 'To.Be — dossier per la giuria', author: 'Team Space Eagle', language: 'it' },
  h(
    Page,
    { size: 'A4', style: s.page },
    blocks(readFileSync(SRC, 'utf8')).map((b, k) => render(b, `b${k}`)),
    h(
      View,
      { style: s.footer, fixed: true },
      h(Text, null, 'To.Be · un nuovo modo di vivere Torino · HackTurin 2026'),
      h(Text, { render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}` })
    )
  )
)

await renderToFile(doc, OUT)
console.log(`✓ ${OUT}`)
