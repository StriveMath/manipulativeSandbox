import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Checks that run on the input before any model is called.
 *
 * Two problems are worth catching here rather than downstream. A component
 * that imports local helpers is only half of itself, and a model shown the
 * remaining half will cheerfully invent the rest — the output looks right
 * and is visually wrong. And a component that is really an HTML document in
 * an iframe has no props/state contract to convert to at all.
 *
 * So local imports are resolved and inlined into the prompt, and the
 * iframe wrappers are refused up front.
 */

/** Tried in order against an extensionless specifier. */
const RESOLVE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx']

/** Guards against a cycle or a mistakenly broad import graph. */
const MAX_HELPERS = 20
const MAX_TOTAL_HELPER_BYTES = 200 * 1024

export class PreflightError extends Error {
  constructor(message, status = 422) {
    super(message)
    this.name = 'PreflightError'
    this.status = status
  }
}

/**
 * Relative import specifiers in a source file.
 *
 * Comment lines are skipped. `shared/palette.js` documents its own usage with
 * a commented-out import line, and treating that as a real dependency sends
 * the resolver after a path that was never meant to exist.
 */
export function findRelativeImports(source) {
  const patterns = [
    /\bfrom\s*["'](\.[^"']*)["']/g,
    /\bimport\s*["'](\.[^"']*)["']/g,
    /\brequire\s*\(\s*["'](\.[^"']*)["']\s*\)/g,
  ]

  const specifiers = new Set()
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*')
    ) {
      continue
    }
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        if (match[1]) specifiers.add(match[1])
      }
    }
  }
  return Array.from(specifiers)
}

/**
 * An `?raw` or `.html` import means the component is a shell around a
 * hand-written HTML document, loaded as a string into an iframe.
 */
function isHtmlDocumentImport(specifier) {
  const withoutQuery = specifier.split('?')[0]
  return specifier.includes('?raw') || withoutQuery.endsWith('.html')
}

async function readIfFile(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return null
    throw error
  }
}

/**
 * Resolve a relative specifier the way a bundler would: exact path first,
 * then each extension, then an index file inside a directory of that name.
 */
async function resolveSpecifier(fromDir, specifier) {
  const base = path.resolve(fromDir, specifier.split('?')[0])

  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...RESOLVE_EXTENSIONS.map((extension) =>
      path.join(base, `index${extension}`),
    ),
  ]

  for (const candidate of candidates) {
    const source = await readIfFile(candidate)
    if (source !== null) return { filePath: candidate, source }
  }
  return null
}

/**
 * Walk the local import graph from one entry file and return every helper
 * it depends on, directly or transitively. The shared components import the
 * palette themselves, so a single pass would miss it.
 */
export async function collectHelpers({ root, entryPath, source }) {
  const helpers = []
  const seen = new Set([entryPath])
  const queue = [{ filePath: entryPath, source }]
  let totalBytes = 0

  while (queue.length > 0) {
    const current = queue.shift()
    const fromDir = path.dirname(current.filePath)

    for (const specifier of findRelativeImports(current.source)) {
      if (isHtmlDocumentImport(specifier)) {
        throw new PreflightError(
          `${path.relative(root, current.filePath)} loads an HTML document (${specifier}) into an iframe. ` +
            'These are self-contained pages, not React components with props and state, so there is nothing to convert. ' +
            'They need rewriting as React by hand.',
        )
      }

      const resolved = await resolveSpecifier(fromDir, specifier)
      if (!resolved) {
        throw new PreflightError(
          `Cannot resolve ${specifier} imported by ${path.relative(root, current.filePath)}, so it cannot be inlined`,
        )
      }
      if (seen.has(resolved.filePath)) continue
      seen.add(resolved.filePath)

      totalBytes += Buffer.byteLength(resolved.source, 'utf8')
      if (helpers.length >= MAX_HELPERS || totalBytes > MAX_TOTAL_HELPER_BYTES) {
        throw new PreflightError(
          `${path.relative(root, entryPath)} pulls in too many local files to inline`,
        )
      }

      helpers.push({
        specifier,
        relativePath: path.relative(root, resolved.filePath),
        source: resolved.source,
      })
      queue.push(resolved)
    }
  }

  return helpers
}

/**
 * Run every input check. Returns the helper sources to inline, or throws
 * `PreflightError` describing why this manipulative cannot be converted.
 */
export async function preflight({ root, filePath, source }) {
  const helpers = await collectHelpers({ root, entryPath: filePath, source })
  return { helpers }
}
