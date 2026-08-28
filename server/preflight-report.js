/**
 * Run the pre-flight over every manipulative and print the verdict.
 *
 * Not a test suite — a one-shot survey, so the split between what converts
 * cleanly, what needs helpers inlined, and what is refused is visible before
 * any model call is spent. Run with `node server/preflight.check.mjs`.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { preflight, PreflightError } from './preflight.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manipulativesDir = path.join(root, 'src', 'manipulatives')
const EXTENSIONS = ['.jsx', '.tsx']

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'shared') continue
      files.push(...(await collectFiles(full)))
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files.sort()
}

const files = await collectFiles(manipulativesDir)
const clean = []
const withHelpers = []
const refused = []

for (const filePath of files) {
  const source = await readFile(filePath, 'utf8')
  const relativePath = path.relative(manipulativesDir, filePath)
  try {
    const { helpers } = await preflight({ root, filePath, source })
    if (helpers.length === 0) clean.push(relativePath)
    else withHelpers.push({ relativePath, helpers })
  } catch (error) {
    if (!(error instanceof PreflightError)) throw error
    refused.push({ relativePath, reason: error.message })
  }
}

console.log(`Scanned ${files.length} manipulatives\n`)
console.log(`Convertible as-is: ${clean.length}`)
console.log(`Needs helpers inlined: ${withHelpers.length}`)
for (const item of withHelpers) {
  const names = item.helpers.map((h) => path.basename(h.relativePath))
  console.log(`  ${item.relativePath} <- ${names.join(', ')}`)
}
console.log(`\nRefused: ${refused.length}`)
for (const item of refused) {
  console.log(`  ${item.relativePath}`)
  console.log(`    ${item.reason.split('. ')[0]}.`)
}
