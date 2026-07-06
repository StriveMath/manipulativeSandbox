import { useState } from 'react'
import ManipulativeCanvas from './ManipulativeCanvas.jsx'
import { manipulatives } from './manipulatives/index.js'

export default function App() {
  const [activeId, setActiveId] = useState(manipulatives[0].id)
  const active = manipulatives.find((m) => m.id === activeId) ?? manipulatives[0]
  const ActiveComponent = active.component

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <nav className="flex w-48 shrink-0 flex-col border-r border-slate-800 bg-slate-900 p-3">
        <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Manipulatives
        </p>
        <ul className="manipulative-list-scroll min-h-0 flex-1 space-y-1 overflow-y-scroll pr-1">
          {manipulatives.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActiveId(m.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                  m.id === activeId
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 overflow-hidden bg-slate-950 py-8">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-100">
          {active.name}
        </h1>
        <ManipulativeCanvas>
          <ActiveComponent />
        </ManipulativeCanvas>
      </main>
    </div>
  )
}
