import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { manipulativeGroups } from '../manipulatives/index.js'
import ManipulativePreview from './ManipulativePreview.jsx'
import {
  buildBundleFile,
  buildManipulativeRecord,
  buildSingleFile,
  downloadJson,
  fileNameFor,
} from './manipulative-file.js'

const keyFor = (ownerSlug, id) => `${ownerSlug}/${id}`

export default function ConvertPanel() {
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState('')
  const [preflight, setPreflight] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  /** Conversion results this session, keyed by owner/id, for the bundle export. */
  const [results, setResults] = useState({})
  const [liveState, setLiveState] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetch('/api/models')
      .then((response) => response.json())
      .then((data) => {
        const available = (data.models ?? []).filter((model) => model.available)
        setModels(data.models ?? [])
        setModelId(available[0]?.id ?? '')
      })
      .catch(() => setError('Could not load models. Is the dev server running?'))
  }, [])

  useEffect(() => {
    fetch('/api/preflight')
      .then((response) => response.json())
      .then((data) => {
        const map = {}
        for (const item of data.manipulatives ?? []) {
          map[keyFor(item.ownerSlug, item.id)] = item
        }
        setPreflight(map)
      })
      .catch(() => setPreflight({}))
  }, [])

  const activeKey = selected ? keyFor(selected.ownerSlug, selected.id) : null
  const activeResult = activeKey ? results[activeKey] : null
  const convertedCount = Object.keys(results).length

  const runConversion = useCallback(async () => {
    if (!selected || !modelId) return
    setBusy(true)
    setError(null)
    setLiveState(null)

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerSlug: selected.ownerSlug,
          id: selected.id,
          model: modelId,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Conversion failed')

      setResults((previous) => ({
        ...previous,
        [keyFor(selected.ownerSlug, selected.id)]: data,
      }))
      setReloadKey((value) => value + 1)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }, [selected, modelId])

  const exportOne = () => {
    if (!activeResult) return
    const record = buildManipulativeRecord({
      source: activeResult.source,
      conversion: activeResult.conversion,
      model: activeResult.meta.model,
    })
    downloadJson(fileNameFor(activeResult.source.id), buildSingleFile(record))
  }

  const exportAll = () => {
    const records = Object.values(results).map((result) =>
      buildManipulativeRecord({
        source: result.source,
        conversion: result.conversion,
        model: result.meta.model,
      }),
    )
    if (records.length === 0) return
    downloadJson('manipulatives.bundle.json', buildBundleFile(records))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar
        groups={manipulativeGroups}
        preflight={preflight}
        results={results}
        selected={selected}
        onSelect={(manipulative) => {
          setSelected(manipulative)
          setError(null)
          setLiveState(null)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          selected={selected}
          preflight={preflight}
          models={models}
          modelId={modelId}
          onModelChange={setModelId}
          busy={busy}
          onConvert={runConversion}
          hasResult={Boolean(activeResult)}
          onExportOne={exportOne}
          onExportAll={exportAll}
          convertedCount={convertedCount}
        />

        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <p className="mb-3 rounded border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {!selected && (
            <EmptyState message="Pick a manipulative on the left." />
          )}

          {selected && !activeResult && !busy && (
            <EmptyState
              message={`Ready to convert ${selected.name}. Choose a model and press Convert.`}
            />
          )}

          {busy && (
            <EmptyState message="Converting. This usually takes 60–90 seconds." />
          )}

          {activeResult && !busy && (
            <ResultView
              result={activeResult}
              liveState={liveState}
              onStateChange={setLiveState}
              reloadKey={reloadKey}
              onReset={() => {
                setLiveState(null)
                setReloadKey((value) => value + 1)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ groups, preflight, results, selected, onSelect }) {
  return (
    <nav className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 p-2">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Convert
        </p>
        <Link to="/" className="text-[10px] text-slate-500 hover:text-white">
          Sandbox
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => (
          <section key={group.ownerSlug}>
            <p className="mb-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              {group.source}
            </p>
            <ul className="space-y-0.5">
              {group.manipulatives.map((manipulative) => {
                const key = keyFor(manipulative.ownerSlug, manipulative.id)
                const status = preflight?.[key]
                const refused = status ? !status.convertible : false
                const done = Boolean(results[key])
                const active = selected?.id === manipulative.id

                return (
                  <li key={manipulative.id}>
                    <button
                      type="button"
                      disabled={refused}
                      onClick={() => onSelect(manipulative)}
                      title={refused ? status.reason : manipulative.name}
                      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] leading-tight ${
                        active
                          ? 'bg-blue-500 text-white'
                          : refused
                            ? 'cursor-not-allowed text-slate-600 line-through'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {manipulative.name}
                      </span>
                      {done && <span className="text-emerald-400">✓</span>}
                      {status?.inlinedHelpers?.length > 0 && (
                        <span
                          title={`Inlines ${status.inlinedHelpers.length} helper files`}
                          className="text-amber-400"
                        >
                          +
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-2 shrink-0 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-500">
        <span className="text-amber-400">+</span> inlines shared helpers ·{' '}
        <span className="line-through">struck through</span> cannot be converted
      </p>
    </nav>
  )
}

function Header({
  selected,
  preflight,
  models,
  modelId,
  onModelChange,
  busy,
  onConvert,
  hasResult,
  onExportOne,
  onExportAll,
  convertedCount,
}) {
  const key = selected ? keyFor(selected.ownerSlug, selected.id) : null
  const status = key ? preflight?.[key] : null

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
          Convert &amp; export
        </p>
        <h1 className="truncate text-lg font-semibold">
          {selected ? selected.name : 'Nothing selected'}
        </h1>
        {status?.inlinedHelpers?.length > 0 && (
          <p className="truncate text-[10px] text-amber-400">
            Inlines {status.inlinedHelpers.length} shared helper files
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <select
          value={modelId}
          onChange={(event) => onModelChange(event.target.value)}
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id} disabled={!model.available}>
              {model.label}
              {model.available ? '' : ' — no API key'}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selected || busy || !modelId}
          onClick={onConvert}
          className="rounded bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {busy ? 'Converting…' : hasResult ? 'Convert again' : 'Convert'}
        </button>

        <button
          type="button"
          disabled={!hasResult}
          onClick={onExportOne}
          className="rounded border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Export
        </button>

        <button
          type="button"
          disabled={convertedCount === 0}
          onClick={onExportAll}
          className="rounded border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Export all ({convertedCount})
        </button>
      </div>
    </header>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      {message}
    </div>
  )
}

function ResultView({ result, liveState, onStateChange, reloadKey, onReset }) {
  const { conversion, meta, source } = result
  const seconds = (meta.durationMs / 1000).toFixed(0)

  const displayedState = liveState ?? conversion.state
  const stateChanged = useMemo(
    () =>
      liveState !== null &&
      JSON.stringify(liveState) !== JSON.stringify(conversion.state),
    [liveState, conversion.state],
  )

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)] gap-4">
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Preview — runs exactly as Strive will
          </p>
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>

        <ManipulativePreview
          code={conversion.code}
          props={conversion.props}
          state={conversion.state}
          canvasHeight={conversion.canvasHeight}
          onStateChange={onStateChange}
          reloadKey={reloadKey}
        />

        <p className="shrink-0 text-[11px] text-slate-500">
          {source.relativePath} · {conversion.code.length.toLocaleString()} chars
          · {meta.model} · {seconds}s
          {source.inlinedHelpers?.length > 0 &&
            ` · inlined ${source.inlinedHelpers.length} helpers`}
        </p>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        {conversion.notes?.length > 0 && (
          <Section title="Notes from the model" tone="amber">
            <ul className="space-y-1.5">
              {conversion.notes.map((note) => (
                <li key={note} className="text-[11px] leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Prompt">
          <p className="text-[11px] leading-relaxed">{conversion.prompt}</p>
        </Section>

        <Section title="Props — author config, immutable">
          <Json value={conversion.props} />
        </Section>

        <Section
          title={
            stateChanged
              ? 'State — updating as you interact ✓'
              : 'State — interact with the preview to check it moves'
          }
          tone={stateChanged ? 'emerald' : undefined}
        >
          <Json value={displayedState} />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, tone, children }) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-900 bg-amber-950/30 text-amber-200'
      : tone === 'emerald'
        ? 'border-emerald-900 bg-emerald-950/30 text-emerald-200'
        : 'border-slate-800 bg-slate-900 text-slate-300'

  return (
    <section className={`shrink-0 rounded-lg border p-3 ${toneClass}`}>
      <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Json({ value }) {
  return (
    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
