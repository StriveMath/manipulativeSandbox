import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Locating a manipulative's source on disk.
 *
 * The registry in `src/manipulatives/index.js` is a JSX module, so the dev
 * server cannot read it directly. It does not need to: every manipulative's
 * file basename is its `id`, and its directory follows from `ownerSlug`, so
 * the path is derivable from the two fields the browser already has.
 */

const APPROVED_SLUG = 'approved'
const EXTENSIONS = ['.jsx', '.tsx']

/**
 * Both segments go into a filesystem path, so they are matched against a
 * strict slug shape rather than merely stripped of `..`.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export class SourceError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'SourceError'
    this.status = status
  }
}

/**
 * Absolute path candidates for a manipulative, most likely extension first.
 */
function candidatePaths(root, ownerSlug, id) {
  const directory =
    ownerSlug === APPROVED_SLUG
      ? path.join(root, 'src', 'manipulatives', APPROVED_SLUG)
      : path.join(root, 'src', 'manipulatives', 'users', ownerSlug)

  return EXTENSIONS.map((extension) =>
    path.join(directory, `${id}${extension}`),
  )
}

/**
 * Read one manipulative's source. Throws `SourceError` with an HTTP status
 * when the identifiers are malformed or nothing matches on disk.
 */
export async function readManipulativeSource({ root, ownerSlug, id }) {
  if (!SLUG_PATTERN.test(ownerSlug)) {
    throw new SourceError(`Invalid ownerSlug: ${ownerSlug}`)
  }
  if (!SLUG_PATTERN.test(id)) {
    throw new SourceError(`Invalid manipulative id: ${id}`)
  }

  for (const filePath of candidatePaths(root, ownerSlug, id)) {
    try {
      const source = await readFile(filePath, 'utf8')
      return { source, filePath, relativePath: path.relative(root, filePath) }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  throw new SourceError(`No source file for ${ownerSlug}/${id}`, 404)
}
