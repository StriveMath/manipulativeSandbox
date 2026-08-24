import { useState } from 'react'
import ManipulativeCanvas from './ManipulativeCanvas.jsx'
import { manipulativeGroups, manipulatives } from './manipulatives/index.js'

export default function App() {
  const [activeId, setActiveId] = useState('percent-park-designer')
  const active = manipulatives.find((m) => m.id === activeId) ?? manipulatives[0]
  const ActiveComponent = active.component

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <nav className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 p-2">
        <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Manipulatives
        </p>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {manipulativeGroups.map((group) => (
            <section key={group.source}>
              <h2 className="mb-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                {group.source}
              </h2>
              <ul className="grid grid-cols-2 gap-1">
                {group.manipulatives.map((m) => (
                  <li className="min-w-0" key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(m.id)}
                      title={`${m.name} (${m.source})`}
                      className={`w-full truncate rounded px-1.5 py-1 text-left text-[10px] leading-tight ${
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
            </section>
          ))}
        </div>
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
