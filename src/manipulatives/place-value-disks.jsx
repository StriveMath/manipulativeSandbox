import { useMemo, useState } from 'react'

const places = [
  {
    id: 'thousands',
    label: 'Thousands',
    shortLabel: '1,000',
    value: 1000,
    color: 'bg-violet-500',
    softColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-900',
  },
  {
    id: 'hundreds',
    label: 'Hundreds',
    shortLabel: '100',
    value: 100,
    color: 'bg-blue-500',
    softColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
  },
  {
    id: 'tens',
    label: 'Tens',
    shortLabel: '10',
    value: 10,
    color: 'bg-amber-500',
    softColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
  },
  {
    id: 'ones',
    label: 'Ones',
    shortLabel: '1',
    value: 1,
    color: 'bg-emerald-500',
    softColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
  },
]

const initialCounts = {
  thousands: 1,
  hundreds: 2,
  tens: 3,
  ones: 4,
}

const clampCount = (value) => Math.max(0, Math.min(18, value))

function Disk({ place, index }) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${place.color} text-[10px] font-bold text-white shadow-sm`}
      style={{
        transform: `translate(${(index % 3) * 4}px, ${Math.floor(index / 3) * -2}px)`,
      }}
    >
      {place.shortLabel}
    </div>
  )
}

export default function PlaceValueDisks() {
  const [counts, setCounts] = useState(initialCounts)

  const total = useMemo(
    () =>
      places.reduce(
        (sum, place) => sum + counts[place.id] * place.value,
        0
      ),
    [counts]
  )

  const setPlaceCount = (placeId, updater) => {
    setCounts((prev) => ({
      ...prev,
      [placeId]: clampCount(updater(prev[placeId])),
    }))
  }

  const regroupUp = (fromIndex) => {
    const from = places[fromIndex]
    const to = places[fromIndex - 1]
    if (!from || !to || counts[from.id] < 10) return

    setCounts((prev) => ({
      ...prev,
      [from.id]: prev[from.id] - 10,
      [to.id]: clampCount(prev[to.id] + 1),
    }))
  }

  const regroupDown = (fromIndex) => {
    const from = places[fromIndex]
    const to = places[fromIndex + 1]
    if (!from || !to || counts[from.id] < 1) return

    setCounts((prev) => ({
      ...prev,
      [from.id]: prev[from.id] - 1,
      [to.id]: clampCount(prev[to.id] + 10),
    }))
  }

  const reset = () => setCounts(initialCounts)
  const clear = () =>
    setCounts(Object.fromEntries(places.map((place) => [place.id, 0])))

  return (
    <div className="box-border flex h-full flex-col bg-slate-50 px-6 py-5 text-slate-700">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Place value disks
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Compose numbers with disks, then regroup ten smaller disks into one larger disk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
        {places.map((place, index) => {
          const count = counts[place.id]
          const canRegroupUp = index > 0 && count >= 10
          const canRegroupDown = index < places.length - 1 && count > 0

          return (
            <section
              key={place.id}
              className={`flex min-h-0 flex-col rounded border ${place.borderColor} ${place.softColor} p-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-bold ${place.textColor}`}>
                    {place.label}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    x {place.value.toLocaleString()}
                  </div>
                </div>
                <div className={`rounded bg-white px-2 py-1 text-sm font-bold tabular-nums ${place.textColor}`}>
                  {count}
                </div>
              </div>

              <div className="mt-3 flex min-h-0 flex-1 content-start items-start justify-center overflow-hidden rounded border border-white/80 bg-white/70 p-2">
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: count }, (_, diskIndex) => (
                    <Disk key={`${place.id}-${diskIndex}`} place={place} index={diskIndex} />
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value - 1)}
                  disabled={count === 0}
                  className="h-8 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove one ${place.label} disk`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value + 1)}
                  disabled={count === 18}
                  className="h-8 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Add one ${place.label} disk`}
                >
                  +
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => regroupUp(index)}
                  disabled={!canRegroupUp}
                  className="h-7 w-full rounded bg-slate-800 px-2 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Regroup 10 up
                </button>
                <button
                  type="button"
                  onClick={() => regroupDown(index)}
                  disabled={!canRegroupDown}
                  className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Break 1 down
                </button>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 rounded border border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expanded form
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-700">
            {places
              .filter((place) => counts[place.id] > 0)
              .map((place) => `${counts[place.id]} x ${place.value.toLocaleString()}`)
              .join(' + ') || 'No disks selected'}
          </div>
        </div>
        <div className="rounded bg-slate-900 px-4 py-2 text-right text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Total
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
