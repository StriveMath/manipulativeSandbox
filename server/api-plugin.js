import { readFile } from 'node:fs/promises'

import { loadEnv } from 'vite'

import { ConversionError, convertManipulative } from './convert.js'
import {
  listManipulatives,
  readManipulativeSource,
  SourceError,
} from './manipulative-source.js'
import { preflight, PreflightError } from './preflight.js'
import {
  availableProviders,
  CONVERSION_MODELS,
  findModel,
  PROVIDER_ENV_KEYS,
} from './models.js'

/**
 * Dev-server-only API for the convert-and-export panel.
 *
 * This exists as `configureServer` middleware rather than a real backend so
 * `vite build` stays a static bundle: provider keys are read here, in Node,
 * and never enter the client graph. There is no production counterpart, and
 * `npm run preview` deliberately does not serve these routes.
 */

/**
 * First convert is tiny (ids + a model name). Rebuild sends the current
 * converted file back, which can be a few hundred KB.
 */
const MAX_BODY_BYTES = 2 * 1024 * 1024
const MAX_INSTRUCTION_CHARS = 8000

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(payload)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new SourceError('Request body too large', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('error', reject)
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('body must be a JSON object')
        }
        resolve(parsed)
      } catch (error) {
        reject(new SourceError(`Invalid JSON body: ${error.message}`, 400))
      }
    })
  })
}

function handleModels(res, env) {
  const providers = availableProviders(env)
  sendJson(res, 200, {
    providers,
    models: CONVERSION_MODELS.map((model) => ({
      ...model,
      available: providers[model.provider] === true,
    })),
  })
}

/**
 * Which manipulatives can be converted, and what would be inlined into each.
 * The panel uses this to disable the ones that will be refused, so a rejection
 * shows up before you pick a model rather than after.
 */
async function handlePreflight(res, root) {
  const entries = await listManipulatives(root)

  const results = await Promise.all(
    entries.map(async ({ ownerSlug, id, filePath }) => {
      const source = await readFile(filePath, 'utf8')
      try {
        const { helpers } = await preflight({ root, filePath, source })
        return {
          ownerSlug,
          id,
          convertible: true,
          inlinedHelpers: helpers.map((helper) => helper.relativePath),
        }
      } catch (error) {
        if (!(error instanceof PreflightError)) throw error
        return { ownerSlug, id, convertible: false, reason: error.message }
      }
    }),
  )

  sendJson(res, 200, { manipulatives: results })
}

function parsePreviousConversion(raw) {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SourceError('previous must be a conversion object', 400)
  }
  if (typeof raw.code !== 'string' || !raw.code.trim()) {
    throw new SourceError('previous.code is required', 400)
  }
  if (
    typeof raw.props !== 'object' ||
    raw.props === null ||
    Array.isArray(raw.props)
  ) {
    throw new SourceError('previous.props must be an object', 400)
  }
  if (
    typeof raw.state !== 'object' ||
    raw.state === null ||
    Array.isArray(raw.state)
  ) {
    throw new SourceError('previous.state must be an object', 400)
  }

  const notes = Array.isArray(raw.notes)
    ? raw.notes.filter((note) => typeof note === 'string')
    : []

  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
    caption: typeof raw.caption === 'string' ? raw.caption : null,
    canvasHeight:
      typeof raw.canvasHeight === 'number' ? raw.canvasHeight : undefined,
    props: raw.props,
    state: raw.state,
    code: raw.code,
    notes,
  }
}

function parseRebuildFields(body) {
  const instruction =
    typeof body.instruction === 'string' ? body.instruction.trim() : ''
  const previous = parsePreviousConversion(body.previous)

  if (instruction && !previous) {
    throw new SourceError('Rebuild needs the current conversion in previous', 400)
  }
  if (previous && !instruction) {
    throw new SourceError('Rebuild needs a non-empty instruction', 400)
  }
  if (instruction.length > MAX_INSTRUCTION_CHARS) {
    throw new SourceError(
      `Instruction is too long (${instruction.length} chars; max ${MAX_INSTRUCTION_CHARS})`,
      400,
    )
  }

  return { instruction: instruction || null, previous }
}

async function handleConvert(req, res, { root, env }) {
  const body = await readJsonBody(req)
  const { ownerSlug, id, model: modelId } = body
  const { instruction, previous } = parseRebuildFields(body)

  if (typeof ownerSlug !== 'string' || typeof id !== 'string') {
    throw new SourceError('Expected { ownerSlug, id, model }', 400)
  }

  const model = typeof modelId === 'string' ? findModel(modelId) : null
  if (!model) {
    throw new SourceError(`Unknown model: ${String(modelId)}`, 400)
  }
  if (!env[PROVIDER_ENV_KEYS[model.provider]]?.trim()) {
    throw new SourceError(
      `No API key for ${model.provider}. Set ${PROVIDER_ENV_KEYS[model.provider]} in .env`,
      503,
    )
  }

  const { source, filePath, relativePath } = await readManipulativeSource({
    root,
    ownerSlug,
    id,
  })

  // Before spending a model call: refuse what cannot be converted, and
  // gather the local helpers the component would otherwise be missing.
  const { helpers } = await preflight({ root, filePath, source })

  const startedAt = Date.now()
  const { conversion, meta } = await convertManipulative({
    root,
    env,
    model,
    id,
    relativePath,
    source,
    helpers,
    previous,
    instruction,
  })

  sendJson(res, 200, {
    source: {
      ownerSlug,
      id,
      relativePath,
      inlinedHelpers: helpers.map((helper) => helper.relativePath),
    },
    conversion,
    meta: { ...meta, durationMs: Date.now() - startedAt },
  })
}

export function conversionApiPlugin() {
  let root = process.cwd()
  let mode = 'development'

  /**
   * Read per request rather than once at startup. Vite does not restart on
   * `.env` changes, so caching this would mean a newly added key looks
   * missing until the server is manually bounced.
   *
   * Empty prefix: these are server-side secrets, so they intentionally do
   * not carry Vite's `VITE_` prefix and never reach the client bundle.
   */
  const readEnv = () => ({ ...process.env, ...loadEnv(mode, root, '') })

  return {
    name: 'sandbox-conversion-api',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      mode = config.mode
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]

        if (url === '/api/models' && req.method === 'GET') {
          handleModels(res, readEnv())
          return
        }

        if (url !== '/api/convert' && url !== '/api/preflight') {
          next()
          return
        }

        const expectedMethod = url === '/api/preflight' ? 'GET' : 'POST'
        if (req.method !== expectedMethod) {
          sendJson(res, 405, { error: `Use ${expectedMethod}` })
          return
        }

        try {
          if (url === '/api/preflight') {
            await handlePreflight(res, root)
          } else {
            await handleConvert(req, res, { root, env: readEnv() })
          }
        } catch (error) {
          const known =
            error instanceof SourceError ||
            error instanceof PreflightError ||
            error instanceof ConversionError
          const status = known ? error.status : 500
          if (!known) server.config.logger.error(String(error?.stack))
          sendJson(res, status, { error: error?.message ?? 'Unknown error' })
        }
      })
    },
  }
}
