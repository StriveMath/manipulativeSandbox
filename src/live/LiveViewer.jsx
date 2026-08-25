import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import ManipulativeCanvas from '../ManipulativeCanvas.jsx'
import { liveManipulatives } from './index.js'

const cloneStateSeed = (stateSeed) => structuredClone(stateSeed)

export default function LiveViewer() {
  const { liveId } = useParams()
  const active = liveManipulatives.find(
    (manipulative) => manipulative.id === liveId,
  )

  if (!active) {
    const firstManipulative = liveManipulatives[0]
    return firstManipulative ? (
      <Navigate replace to={`/live/${firstManipulative.id}`} />
    ) : (
      <Navigate replace to="/" />
    )
  }

  return <LiveSession key={active.id} manipulative={active} />
}

function LiveSession({ manipulative }) {
  const ActiveComponent = manipulative.component
  const [state, setState] = useState(() =>
    cloneStateSeed(manipulative.data.state),
  )
  const [showData, setShowData] = useState(false)

  const backendData = {
    props: manipulative.data.props,
    state,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <nav className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 p-2">
        <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Live Manipulatives
        </p>
        <ul className="grid grid-cols-2 gap-1">
          {liveManipulatives.map((option) => (
            <li className="min-w-0" key={option.id}>
              <Link
                to={`/live/${option.id}`}
                title={option.name}
                className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] leading-tight ${
                  option.id === manipulative.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {option.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto border-t border-slate-800 pt-2">
          <Link
            to={manipulative.sandboxPath}
            className="block rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Back to sandbox
          </Link>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
              Live
            </p>
            <h1 className="text-lg font-semibold">{manipulative.name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(cloneStateSeed(manipulative.data.state))}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setShowData(true)}
              className="rounded bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-400"
            >
              See data
            </button>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
          {['User A', 'User B'].map((userLabel) => (
            <section
              key={userLabel}
              className="flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3"
            >
              <p className="mb-2 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
                {userLabel}
              </p>
              <div className="w-full max-w-[min(800px,calc((100vh-8rem)*1.6))]">
                <ManipulativeCanvas>
                  <ActiveComponent
                    props={manipulative.data.props}
                    state={state}
                    setState={setState}
                  />
                </ManipulativeCanvas>
              </div>
            </section>
          ))}
        </main>

      {showData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="data-dialog-title"
          className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/90 p-6"
        >
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                  Mock backend
                </p>
                <h2 id="data-dialog-title" className="text-lg font-semibold">
                  Shared JSON data
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowData(false)}
                className="rounded border border-slate-600 px-3 py-1.5 text-sm font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] gap-3 overflow-hidden">
              <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                <div className="shrink-0 border-b border-slate-800 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">Props</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Immutable author configuration
                  </p>
                </div>
                <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-sky-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {JSON.stringify(backendData.props, null, 2)}
                </pre>
              </section>

              <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                <div className="shrink-0 border-b border-slate-800 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">State</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Shared runtime data
                  </p>
                </div>
                <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-5 text-emerald-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {JSON.stringify(backendData.state, null, 2)}
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
