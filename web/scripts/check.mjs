#!/usr/bin/env node
/**
 * The one check of the kit: `pnpm check`.
 *
 * 1. TypeScript (`tsc --noEmit`).
 * 2. A style scan of application code (app/, components/ outside the design system, lib/) for the
 *    few things that break the design system: raw colours, `dark:` on colours, hand-made surfaces,
 *    headings outside PageHeader, raw tables, `window.confirm`, `any`.
 *
 * It takes seconds and prints `file:line CODE message`. Exit code 1 when something is found,
 * so it can run in CI. It is also the worklist of the "refactor to the design system" prompt.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks']
const SKIP = [/^components\/ui\//, /^components\/ds\//, /\.d\.ts$/, /database\.types\.ts$/]

const PALETTE =
  'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone'
const COLOUR_UTIL =
  'bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|accent|caret'

const RULES = [
  {
    code: 'HEX',
    test: /(?:["'`(\s]|^)#[0-9a-fA-F]{3,8}\b/,
    message: 'raw colour: use a semantic token (bg-card, text-muted-foreground, bg-success, …)',
  },
  {
    code: 'PALETTE',
    test: new RegExp(`(?<![\\w-])(?:${COLOUR_UTIL})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?![\\w-])`),
    message: 'raw palette: colour comes from tokens, never from bg-red-500 or text-gray-600',
  },
  {
    code: 'DARK',
    test: new RegExp(`(?<![\\w-])dark:(?:${COLOUR_UTIL})-`),
    message: '`dark:` on a colour: the dark theme lives in styles/tokens.css',
  },
  {
    code: 'SURFACE',
    test: line =>
      /(?<![\w:-])rounded(?:-\w+)?(?![\w-])/.test(line) &&
      /(?<![\w:-])border(?![\w-])/.test(line) &&
      /(?<![\w:-])bg-(?:card|background|muted|popover|secondary)(?:\/\d+)?(?![\w-])/.test(line),
    message: 'hand-made surface: use SectionCard or Card',
  },
  { code: 'H1', test: /<h1[\s>]/, message: 'heading outside PageHeader: use PageHeader' },
  { code: 'TABLE', test: /<table[\s>]/, message: 'raw table: use DataTable (and MobileRow on phones)' },
  { code: 'CONFIRM', test: /\b(?:window\.)?confirm\(/, message: 'window.confirm: use ConfirmDialog' },
  { code: 'ANY', test: /(?::\s*any\b|\bas any\b|<any>)/, message: '`any`: type it' },
  {
    code: 'ICON_FROM_SERVER',
    file: true,
    test: text =>
      !/^\s*'use client'/m.test(text) &&
      /<(?:EmptyState|KpiCard)\b/.test(text) &&
      /\bicon=\{[A-Z]\w*\}/.test(text),
    message:
      'a Server Component passes an icon (a function) to EmptyState/KpiCard, which are Client Components: move that markup into a client component or drop the icon',
  },
  {
    code: 'PX_TEXT',
    test: /(?<![\w-])text-\[\d+(?:\.\d+)?px\]/,
    message: 'pixel font size: use the type scale (text-xs … text-2xl)',
  },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|mts)$/.test(entry) && !SKIP.some(pattern => pattern.test(rel))) out.push(full)
  }
  return out
}

/** Runs the TypeScript compiler in-process (no shell, no PATH assumptions) and prints its diagnostics. */
async function typecheck() {
  const ts = (await import(join(ROOT, 'node_modules', 'typescript', 'lib', 'typescript.js'))).default
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json')
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT)
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true, incremental: false })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    console.log(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: file => file,
        getCurrentDirectory: () => ROOT,
        getNewLine: () => '\n',
      })
    )
  }
  return diagnostics.length === 0
}

function scan() {
  const findings = []
  let scanned = 0
  for (const dir of SCAN_DIRS) {
    let files = []
    try {
      files = walk(join(ROOT, dir))
    } catch {
      continue
    }
    for (const file of files) {
      scanned++
      const text = readFileSync(file, 'utf8')
      for (const rule of RULES) {
        if (rule.file && rule.test(text)) {
          findings.push({ file: relative(ROOT, file), line: 1, code: rule.code, message: rule.message })
        }
      }
      const lines = text.split('\n')
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        if (/\bds-allow\b/.test(line)) return // declared exception, with its reason on the same line
        for (const rule of RULES) {
          if (rule.file) continue
          const hit = typeof rule.test === 'function' ? rule.test(line) : rule.test.test(line)
          if (hit)
            findings.push({
              file: relative(ROOT, file),
              line: index + 1,
              code: rule.code,
              message: rule.message,
            })
        }
      })
    }
  }
  return { findings, scanned }
}

const tscOk = await typecheck()
console.log(tscOk ? '✓ typecheck' : '✗ typecheck failed')

/**
 * Every module that writes (has `lib/<module>/actions.ts`) must be linked to the assistant:
 * a `lib/<module>/ai.ts` listed in `lib/ai/modules.ts`. Infrastructure modules are exempt.
 */
function scanModules() {
  const findings = []
  const exempt = new Set(['auth', 'access', 'ai'])
  let registry = ''
  try {
    registry = readFileSync(join(ROOT, 'lib', 'ai', 'modules.ts'), 'utf8')
  } catch {
    return findings
  }
  let modules = []
  try {
    modules = readdirSync(join(ROOT, 'lib')).filter(name => statSync(join(ROOT, 'lib', name)).isDirectory())
  } catch {
    return findings
  }
  for (const name of modules) {
    if (exempt.has(name)) continue
    let hasActions = false
    try {
      statSync(join(ROOT, 'lib', name, 'actions.ts'))
      hasActions = true
    } catch {
      hasActions = false
    }
    if (!hasActions) continue
    let hasAi = false
    try {
      statSync(join(ROOT, 'lib', name, 'ai.ts'))
      hasAi = true
    } catch {
      hasAi = false
    }
    if (!hasAi) {
      findings.push({
        file: `lib/${name}/actions.ts`,
        line: 1,
        code: 'MODULE_WITHOUT_AI',
        message: `the module has no lib/${name}/ai.ts: link it to the assistant (docs/AI.md)`,
      })
    } else if (!registry.includes(`@/lib/${name}/ai`)) {
      findings.push({
        file: `lib/${name}/ai.ts`,
        line: 1,
        code: 'MODULE_NOT_REGISTERED',
        message: 'the module is not listed in lib/ai/modules.ts',
      })
    }
  }
  return findings
}

const { findings, scanned } = scan()
findings.push(...scanModules())
if (findings.length === 0) {
  console.log(`✓ style: nothing to fix in ${scanned} files`)
} else {
  console.log(`✗ style: ${findings.length} finding${findings.length === 1 ? '' : 's'}`)
  for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.code}  ${f.message}`)
  console.log('\nFix with docs/REFACTOR.md, or declare an exception on the same line: // ds-allow: <reason>')
}

process.exit(tscOk && findings.length === 0 ? 0 : 1)
