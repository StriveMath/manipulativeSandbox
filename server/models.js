/**
 * Models offered by the convert panel.
 *
 * Hand-maintained. Provider model IDs are pinned snapshots that get retired,
 * and a retired ID comes back as an opaque 404 from the provider, so keeping
 * them in one list makes a retirement a one-line fix.
 */
export const CONVERSION_MODELS = [
  { id: 'gpt-5.1', label: 'GPT-5.1', provider: 'openai' },
  { id: 'gpt-5', label: 'GPT-5', provider: 'openai' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini (cheap, for iterating)', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'claude-opus-5', label: 'Claude Opus 5', provider: 'anthropic' },
]

/** Which environment variable carries each provider's key. */
export const PROVIDER_ENV_KEYS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

export const PROVIDERS = Object.keys(PROVIDER_ENV_KEYS)

export function findModel(modelId) {
  return CONVERSION_MODELS.find((model) => model.id === modelId) ?? null
}

/** `{ openai: true, anthropic: false }` — which providers have a usable key. */
export function availableProviders(env) {
  return Object.fromEntries(
    PROVIDERS.map((provider) => [
      provider,
      Boolean(env[PROVIDER_ENV_KEYS[provider]]?.trim()),
    ]),
  )
}
