import { loadEnv } from 'vite'

import { readManipulativeSource, SourceError } from './manipulative-source.js'
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

/** Requests are small — ids and a model name — so anything large is a bug. */
const MAX_BODY_BYTES = 1024 * 1024

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

async function handleConvert(req, res, { root, env }) {
  const body = await readJsonBody(req)
  const { ownerSlug, id, model: modelId } = body

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

  const { source, relativePath } = await readManipulativeSource({
    root,
    ownerSlug,
    id,
  })

  sendJson(res, 501, {
    error: 'Conversion is not implemented yet',
    resolved: { relativePath, bytes: Buffer.byteLength(source, 'utf8') },
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

        if (url !== '/api/convert') {
          next()
          return
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Use POST' })
          return
        }

        try {
          await handleConvert(req, res, { root, env: readEnv() })
        } catch (error) {
          const status = error instanceof SourceError ? error.status : 500
          if (status === 500) server.config.logger.error(String(error?.stack))
          sendJson(res, status, { error: error?.message ?? 'Unknown error' })
        }
      })
    },
  }
}
