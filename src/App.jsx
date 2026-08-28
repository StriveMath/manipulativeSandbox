import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import ManipulativeCanvas from './ManipulativeCanvas.jsx'
import ConvertPanel from './convert/ConvertPanel.jsx'
import LiveViewer from './live/LiveViewer.jsx'
import { manipulativeGroups, manipulatives } from './manipulatives/index.js'

const defaultManipulative =
  manipulatives.find((manipulative) => manipulative.id === 'percent-park-designer') ??
  manipulatives[0]
const defaultPath = `/${defaultManipulative.ownerSlug}/${defaultManipulative.id}`

function OwnerRedirect() {
  const { ownerSlug } = useParams()
  const firstManipulative = manipulatives.find(
    (manipulative) => manipulative.ownerSlug === ownerSlug,
  )

  return (
    <Navigate
      replace
      to={
        firstManipulative
          ? `/${firstManipulative.ownerSlug}/${firstManipulative.id}`
          : defaultPath
      }
    />
  )
}

function ManipulativePage() {
  const { ownerSlug, manipulativeId } = useParams()
  const active = manipulatives.find(
    (manipulative) =>
      manipulative.ownerSlug === ownerSlug && manipulative.id === manipulativeId,
  )

  if (!active) {
    return <Navigate replace to={defaultPath} />
  }

  const ActiveComponent = active.component

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <nav className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 p-2">
        <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Manipulatives
        </p>
        <Link
          to="/live"
          className="mb-1.5 rounded border border-blue-500/60 bg-blue-500/10 px-2 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 hover:text-white"
        >
          Open Live Viewer
        </Link>
        <Link
          to="/convert"
          className="mb-3 rounded border border-emerald-500/60 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:text-white"
        >
          Convert &amp; export
        </Link>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {manipulativeGroups.map((group) => (
            <section key={group.ownerSlug}>
              <Link
                to={`/${group.ownerSlug}`}
                className="mb-1 block rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                {group.source}
              </Link>
              <ul className="grid grid-cols-2 gap-1">
                {group.manipulatives.map((m) => (
                  <li className="min-w-0" key={m.id}>
                    <Link
                      to={`/${m.ownerSlug}/${m.id}`}
                      title={`${m.name} (${m.ownerName})`}
                      className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] leading-tight ${
                        m.id === active.id
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </Link>
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

export default function App() {
  return (
    <Routes>
      <Route path="/convert" element={<ConvertPanel />} />
      <Route path="/live" element={<LiveViewer />} />
      <Route path="/live/:liveId" element={<LiveViewer />} />
      <Route path="/:ownerSlug/:manipulativeId" element={<ManipulativePage />} />
      <Route path="/:ownerSlug" element={<OwnerRedirect />} />
      <Route path="*" element={<Navigate replace to={defaultPath} />} />
    </Routes>
  )
}
