import { useState } from 'react'
import ManipulativeCanvas from './ManipulativeCanvas.jsx'
import { manipulatives } from './manipulatives/index.js'

export default function App() {
  const [activeId, setActiveId] = useState(manipulatives[0].id)
  const active = manipulatives.find((m) => m.id === activeId) ?? manipulatives[0]
  const ActiveComponent = active.component

  return (
    <div className="grid h-screen grid-cols-[254px_minmax(0,1fr)] overflow-hidden bg-[#050918] bg-[linear-gradient(rgba(72,94,140,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(72,94,140,0.12)_1px,transparent_1px)] bg-[size:48px_48px]">
      <nav className="flex min-h-0 shrink-0 flex-col border-r border-slate-700/70 bg-[#111827]/95 p-5 text-white">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
            Sandbox Environment
          </p>
          <h2 className="mt-3 text-base font-black">
            Math Manipulatives
          </h2>
        </div>

        <div className="my-6 h-px bg-slate-700/80" />

        <div className="min-h-0 flex-1 overflow-auto">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-blue-200">
            Active Tools
          </p>
          <ul className="space-y-2">
          {manipulatives.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActiveId(m.id)}
                className={`w-full rounded-lg px-3.5 py-3 text-left text-sm font-bold transition ${
                  m.id === activeId
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            </li>
          ))}
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-[#0b1224] px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
            Instructions
          </p>
          <p className="mt-3 text-xs leading-5 text-blue-200/80">
            Select any model from the list. The sandbox guarantees fluid sizing and real-time state preservation inside the workspace canvas.
          </p>
        </div>
      </nav>

      <main className="min-w-0 overflow-hidden px-8 py-8">
        <div className="mx-auto mb-3 w-fit rounded-full border border-indigo-500/30 bg-indigo-950/90 px-4 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300">
          Active Workspace
        </div>
        <h1 className="mb-5 text-center text-2xl font-black text-white drop-shadow">
          {active.name}
        </h1>
        <ManipulativeCanvas>
          <ActiveComponent />
        </ManipulativeCanvas>
        <p className="mt-4 text-center font-mono text-[11px] text-blue-200/70">
          Viewport Resolution: 800 x 500 px (Device Responsive)
        </p>
      </main>
    </div>
  )
}
