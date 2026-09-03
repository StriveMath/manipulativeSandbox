import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, NoObjectGeneratedError } from 'ai'
import { z } from 'zod'

import { PROVIDER_ENV_KEYS } from './models.js'

/**
 * Recode an approved sandbox manipulative into the controlled
 * `{ props, state, setState }` form that Strive can save and share.
 *
 * This is a re-authoring job, not a reformat. A sandbox component keeps its
 * work in local `useState`, so nothing about it can be persisted or mirrored
 * to a second client. The model has to decide, value by value, what is
 * author-time configuration, what is student work worth synchronising, and
 * what is merely derivable — which is the judgement `src/live/AGENTS.md`
 * exists to describe.
 */

/** Conversions involve a lot of reasoning over a whole file; they are slow. */
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Generous because the answer contains a whole rewritten component. Too low
 * and a reasoning model spends its budget thinking and returns nothing,
 * which surfaces as NoObjectGeneratedError rather than a truncated answer.
 */
const MAX_OUTPUT_TOKENS = 32_000

/** Mirrors MIN/MAX_CANVAS_HEIGHT in Strive's scene schema. */
const MIN_CANVAS_HEIGHT = 200
const MAX_CANVAS_HEIGHT = 1200

const REFERENCE_ID = 'factor-tree'

export class ConversionError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'ConversionError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Output schema
//
// `props` and `state` are arbitrary JSON objects, which a strict JSON schema
// cannot describe: strict mode requires every property to be declared and
// `additionalProperties: false`. They are therefore requested as JSON *strings*
// and parsed here. That is not just a workaround — parsing is the check. The
// data contract demands both blocks be valid JSON, and a value that survives
// JSON.parse cannot be a function, a Date, a Map, undefined or NaN.
// ---------------------------------------------------------------------------

const ConversionSchema = z.object({
  title: z
    .string()
    .describe('Human-readable name, e.g. "Factor Tree". Title Case.'),
  prompt: z
    .string()
    .describe(
      'One sentence telling the student what to do, shown above the manipulative.',
    ),
  caption: z
    .string()
    .nullable()
    .describe('Optional caption shown below. Use null when not needed.'),
  canvasHeight: z
    .number()
    .int()
    .min(MIN_CANVAS_HEIGHT)
    .max(MAX_CANVAS_HEIGHT)
    .describe(
      'Canvas height in pixels; width is always 800. Sandbox manipulatives are authored against 800x500, so use 500 unless the original genuinely needs a taller frame.',
    ),
  propsJson: z
    .string()
    .describe(
      'The `props` block as a JSON object string. Author-time configuration only.',
    ),
  stateJson: z
    .string()
    .describe(
      'The `state` seed as a JSON object string. Minimal: nothing derivable from props or other state.',
    ),
  code: z
    .string()
    .describe(
      'The complete converted component as one self-contained file. No local imports.',
    ),
  notes: z
    .array(z.string())
    .describe(
      'What you assumed, simplified, or could not preserve. Empty array if the conversion is faithful.',
    ),
})

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * How this task differs from the one `AGENTS.md` describes. That document is
 * written for an agent editing files in the repo; here the same rules apply
 * but the answer comes back as one structured response.
 */
const OUTPUT_CONTRACT = `
## How to deliver your answer here

The rules above are the contract. These are the mechanics of this request.

- You are not writing files. Return the component in \`code\`, and the two data
  blocks as JSON strings in \`propsJson\` and \`stateJson\`.
- \`code\` must be ONE self-contained file. Importing from "react" is fine.
  Importing any local path (anything starting with "." or "/") is not — the
  runtime cannot resolve it, so inline whatever you need instead.
- Default-export the component. Any name is fine.
- The component is called as \`<Component props={props} state={state} setState={setState} />\`.
  It may also receive \`readOnly\`; when true, ignore student interaction.
- Tailwind utility classes are available. No other styling or UI library is.
- Keep the visual and interaction design of the original. You are changing where
  the data lives, not redesigning the activity.
- \`propsJson\` and \`stateJson\` must each parse as a JSON object. Not an array,
  not null. Use \`{}\` for genuinely empty.
- Put anything you were unsure about in \`notes\`. A conversion that quietly drops
  a feature is worse than one that admits to it.
`.trim()

const REBUILD_CONTRACT = `
## Incremental rebuild

You already converted this manipulative. The user is asking for a revision of
that conversion, not a fresh start.

- Edit the current conversion. Do not recode from the original unless the
  instruction says to restore something.
- Change what they asked for. Leave everything else — visuals, interactions,
  props, state shape, prompt, caption, canvas height — as it is.
- Do not "improve" unrelated layout, copy, or state.
- Still obey the Live contract above if the instruction would break it; note
  that in \`notes\` instead of silently ignoring the request.
- In \`notes\`, list what you changed this round. Repeat a previous note only
  if it still applies.
`.trim()

async function readIfPresent(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

/**
 * The worked example: the approved component and the Live conversion made
 * from it. `AGENTS.md` names `src/live/factor-tree/` as the reference
 * implementation, and a before/after pair teaches the state-minimality
 * judgement far better than the prose alone — its seed is two nulls, with
 * every id, coordinate and completion flag derived.
 */
async function buildReferenceExample(root) {
  const [original, converted, data] = await Promise.all([
    readIfPresent(
      path.join(root, 'src', 'manipulatives', 'approved', 'factor-tree.jsx'),
    ),
    readIfPresent(
      path.join(root, 'src', 'live', REFERENCE_ID, 'FactorTree.jsx'),
    ),
    readIfPresent(path.join(root, 'src', 'live', REFERENCE_ID, 'data.json')),
  ])

  if (!original || !converted || !data) return null

  return `
## Worked example

This is the reference conversion. Note how small the state seed is: the root
value comes from props, and every node id, coordinate and completion flag is
computed during render.

### Before — the approved sandbox component

\`\`\`jsx
${original}
\`\`\`

### After — data.json

\`\`\`json
${data}
\`\`\`

### After — the converted component

\`\`\`jsx
${converted}
\`\`\`
`.trim()
}

async function buildSystemPrompt(root, { includeExample, rebuild }) {
  const agentsPath = path.join(root, 'src', 'live', 'AGENTS.md')
  const instructions = await readIfPresent(agentsPath)
  if (!instructions) {
    throw new ConversionError(
      `Cannot read the conversion instructions at ${path.relative(root, agentsPath)}`,
      500,
    )
  }

  const sections = [instructions.trim(), OUTPUT_CONTRACT]
  if (rebuild) sections.push(REBUILD_CONTRACT)

  if (includeExample) {
    const example = await buildReferenceExample(root)
    if (example) sections.push(example)
  }

  return sections.join('\n\n---\n\n')
}

function appendHelpers(parts, helpers) {
  if (!helpers?.length) return
  parts.push(
    'It depends on these local modules, directly or through each other. ' +
      'Their real source is below — inline what is actually used, keeping the exact ' +
      'colours, easing and behaviour. Do not substitute your own versions, and do not ' +
      'carry the imports over: the output must be one self-contained file.',
  )
  for (const helper of helpers) {
    parts.push(
      `### ${helper.relativePath} (imported as \`${helper.specifier}\`)`,
      '```jsx\n' + helper.source + '\n```',
    )
  }
}

function buildUserPrompt({ relativePath, source, helpers }) {
  const parts = [
    `Convert this approved sandbox manipulative. Source file: \`${relativePath}\`.`,
    '```jsx\n' + source + '\n```',
  ]
  appendHelpers(parts, helpers)
  return parts.join('\n\n')
}

function buildRebuildPrompt({
  relativePath,
  source,
  helpers,
  previous,
  instruction,
}) {
  const meta = {
    title: previous.title,
    prompt: previous.prompt,
    caption: previous.caption ?? null,
    canvasHeight: previous.canvasHeight,
  }

  const parts = [
    `Incrementally update the converted manipulative. Source file: \`${relativePath}\`.`,
    'Apply only the requested changes to the current conversion. Keep everything else.',
    `## Requested changes\n\n${instruction}`,
    '## Current conversion — edit this',
    '### title, prompt, caption, canvasHeight\n\n```json\n' +
      JSON.stringify(meta, null, 2) +
      '\n```',
    '### props\n\n```json\n' + JSON.stringify(previous.props, null, 2) + '\n```',
    '### state\n\n```json\n' + JSON.stringify(previous.state, null, 2) + '\n```',
    '### code\n\n```jsx\n' + previous.code + '\n```',
  ]

  if (previous.notes?.length) {
    parts.push(
      '### notes from the previous conversion\n\n' +
        previous.notes.map((note) => `- ${note}`).join('\n'),
    )
  }

  parts.push(
    '## Original sandbox component (reference only — do not recode from this unless asked to restore something)',
    '```jsx\n' + source + '\n```',
  )
  appendHelpers(parts, helpers)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Output validation
//
// The schema guarantees the shape but not the meaning. These are the checks
// that catch a well-formed answer that would still fail on import.
// ---------------------------------------------------------------------------

function parseJsonObject(label, raw) {
  let value
  try {
    value = JSON.parse(raw)
  } catch (error) {
    throw new ConversionError(`${label} is not valid JSON: ${error.message}`)
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConversionError(`${label} must be a JSON object`)
  }
  return value
}

/** Relative import specifiers, which the Strive iframe cannot resolve. */
function findLocalImports(code) {
  const specifiers = new Set()
  const patterns = [
    /\bfrom\s*["'](\.[^"']*)["']/g,
    /\bimport\s*["'](\.[^"']*)["']/g,
    /\brequire\s*\(\s*["'](\.[^"']*)["']\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1])
    }
  }
  return Array.from(specifiers)
}

function validateCode(code) {
  if (!code.trim()) {
    throw new ConversionError('The model returned empty code')
  }

  const localImports = findLocalImports(code)
  if (localImports.length > 0) {
    throw new ConversionError(
      `Converted code still imports local files (${localImports.join(', ')}); it must be self-contained`,
    )
  }

  if (!/export\s+default/.test(code)) {
    throw new ConversionError('Converted code has no default export')
  }
}

// ---------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------

function resolveModel({ model, env }) {
  const apiKey = env[PROVIDER_ENV_KEYS[model.provider]]?.trim()
  if (!apiKey) {
    throw new ConversionError(`No API key for ${model.provider}`, 503)
  }

  if (model.provider === 'openai') {
    return createOpenAI({ apiKey })(model.id)
  }
  if (model.provider === 'anthropic') {
    return createAnthropic({ apiKey })(model.id)
  }
  throw new ConversionError(`Unsupported provider: ${model.provider}`, 400)
}

export async function convertManipulative({
  root,
  env,
  model,
  id,
  relativePath,
  source,
  helpers,
  previous,
  instruction,
}) {
  const languageModel = resolveModel({ model, env })
  const rebuild = Boolean(previous && instruction)

  const [system, prompt] = await Promise.all([
    buildSystemPrompt(root, {
      includeExample: !rebuild && id !== REFERENCE_ID,
      rebuild,
    }),
    Promise.resolve(
      rebuild
        ? buildRebuildPrompt({
            relativePath,
            source,
            helpers,
            previous,
            instruction,
          })
        : buildUserPrompt({ relativePath, source, helpers }),
    ),
  ])

  let result
  try {
    result = await generateObject({
      model: languageModel,
      schema: ConversionSchema,
      schemaName: 'ManipulativeConversion',
      schemaDescription:
        'A sandbox manipulative recoded into the controlled props/state form.',
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new ConversionError(
        `${model.id} did not return a usable object (finish reason: ${error.finishReason ?? 'unknown'}). ` +
          'This usually means the output token budget ran out. Try a smaller component or a different model.',
      )
    }
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ConversionError(
        `${model.id} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        504,
      )
    }
    throw new ConversionError(
      `${model.id} failed: ${error?.message ?? String(error)}`,
    )
  }

  const output = result.object
  validateCode(output.code)

  return {
    conversion: {
      title: output.title,
      prompt: output.prompt,
      caption: output.caption,
      canvasHeight: output.canvasHeight,
      props: parseJsonObject('props', output.propsJson),
      state: parseJsonObject('state', output.stateJson),
      code: output.code,
      notes: output.notes,
    },
    meta: {
      model: model.id,
      provider: model.provider,
      usage: result.usage,
      warnings: result.warnings ?? [],
      finishReason: result.finishReason,
    },
  }
}
