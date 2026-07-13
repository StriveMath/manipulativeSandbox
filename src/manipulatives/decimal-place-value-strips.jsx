import { useEffect, useMemo, useRef, useState } from 'react'

const places = [
  {
    id: 'ones',
    label: 'Ones',
    singular: 'one',
    unit: '1',
    value: 1,
    color: 'bg-emerald-500',
    softColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
    totalTextColor: 'text-emerald-300',
    stripWidth: 240,
    stripHeight: 40,
    segments: 10,
    maxCount: 18,
  },
  {
    id: 'tenths',
    label: 'Tenths',
    singular: 'tenth',
    unit: '0.1',
    value: 0.1,
    color: 'bg-blue-500',
    softColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    totalTextColor: 'text-blue-300',
    stripWidth: 24,
    stripHeight: 40,
    segments: 10,
    maxCount: 18,
  },
  {
    id: 'hundredths',
    label: 'Hundredths',
    singular: 'hundredth',
    unit: '0.01',
    value: 0.01,
    color: 'bg-amber-500',
    softColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    totalTextColor: 'text-amber-300',
    stripWidth: 2.4,
    stripHeight: 40,
    segments: 1,
    maxCount: 100,
  },
  {
    id: 'thousandths',
    label: 'Thousandths',
    singular: 'thousandth',
    unit: '0.001',
    value: 0.001,
    color: 'bg-violet-500',
    softColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-900',
    totalTextColor: 'text-violet-300',
    stripWidth: 0.24,
    stripHeight: 40,
    segments: 1,
    maxCount: 1000,
  },
]

const initialCounts = {
  ones: 1,
  tenths: 2,
  hundredths: 3,
  thousandths: 4,
}

const clampCount = (place, value) => Math.max(0, Math.min(place.maxCount, value))

const formatDecimal = (value) => value.toFixed(3).replace(/\.?0+$/, '')

function ExpandedForm({ counts }) {
  const activePlaces = places.filter((place) => counts[place.id] > 0)

  if (activePlaces.length === 0) {
    return <span className="text-slate-500">No strips selected</span>
  }

  return activePlaces.map((place, index) => (
    <span key={place.id}>
      {index > 0 && <span className="mx-1 text-slate-400">+</span>}
      <span className={place.textColor}>
        {counts[place.id]} x {place.unit}
      </span>
    </span>
  ))
}

function ColorCodedTotal({ value }) {
  const [whole, decimals] = value.toFixed(3).split('.')
  const decimalDigits = decimals.replace(/0+$/, '').split('')
  const decimalPlaces = places.slice(1)

  return (
    <>
      <span className={places[0].totalTextColor}>{whole}</span>
      {decimalDigits.length > 0 && <span className="text-slate-400">.</span>}
      {decimalDigits.map((digit, index) => (
        <span
          className={decimalPlaces[index].totalTextColor}
          key={`${digit}-${index}`}
        >
          {digit}
        </span>
      ))}
    </>
  )
}

function StripRun({ count, onResizeStart, place }) {
  if (count === 0) return null

  const runWidth = count * place.stripWidth
  const runValue = formatDecimal(count * place.value)
  const showLabel = runWidth >= 24

  return (
    <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
      <div
        data-place-strip={place.id}
        className={`relative flex shrink-0 overflow-visible rounded-sm ${place.color} shadow-sm`}
        style={{
          width: runWidth,
          height: place.stripHeight,
        }}
      >
        {count > 1 && (
          <div
            className="grid h-full w-full"
            style={{ gridTemplateColumns: `repeat(${count}, ${place.stripWidth}px)` }}
          >
            {Array.from({ length: count }, (_, segmentIndex) => (
              <span
                key={`${place.id}-${segmentIndex}`}
                className="border-r border-white/40 last:border-r-0"
              />
            ))}
          </div>
        )}
        {showLabel && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
            {runValue}
          </span>
        )}
        <div
          aria-label={`Resize ${place.label} strip`}
          aria-valuemax={place.maxCount}
          aria-valuemin={0}
          aria-valuenow={count}
          className="absolute -right-1 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded bg-slate-900/80 ring-2 ring-white/80"
          data-strip-resize-handle={place.id}
          onMouseDown={(event) => onResizeStart(event, place)}
          onPointerDown={(event) => onResizeStart(event, place)}
          role="slider"
          tabIndex={0}
        />
      </div>
      {!showLabel && (
        <span className={`text-[10px] font-bold tabular-nums ${place.textColor}`}>
          {runValue}
        </span>
      )}
    </div>
  )
}

function TradeButton({ disabled, label, onClick }) {
  return (
    <button
      aria-label={label}
      className="flex min-h-8 items-center rounded border border-slate-300 bg-white px-2 py-1 text-left text-[11px] font-bold leading-3 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export default function DecimalPlaceValueStrips() {
  const [counts, setCounts] = useState(initialCounts)
  const resizeRef = useRef(null)

  useEffect(() => {
    const resizeStrip = (event) => {
      const resize = resizeRef.current
      if (!resize) return

      const steps = Math.round((event.clientX - resize.startX) / resize.place.stripWidth)
      const nextCount = clampCount(resize.place, resize.startCount + steps)

      setCounts((prev) => ({
        ...prev,
        [resize.place.id]: nextCount,
      }))
    }

    const stopResize = () => {
      resizeRef.current = null
    }

    window.addEventListener('mousemove', resizeStrip)
    window.addEventListener('mouseup', stopResize)
    window.addEventListener('pointermove', resizeStrip)
    window.addEventListener('pointerup', stopResize)

    return () => {
      window.removeEventListener('mousemove', resizeStrip)
      window.removeEventListener('mouseup', stopResize)
      window.removeEventListener('pointermove', resizeStrip)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [])

  const total = useMemo(
    () =>
      places.reduce(
        (sum, place) => sum + counts[place.id] * place.value,
        0
      ),
    [counts]
  )

  const setPlaceCount = (placeId, updater) => {
    const place = places.find((item) => item.id === placeId)
    if (!place) return

    setCounts((prev) => ({
      ...prev,
      [placeId]: clampCount(place, updater(prev[placeId])),
    }))
  }

  const regroupUp = (fromIndex) => {
    const from = places[fromIndex]
    const to = places[fromIndex - 1]
    if (!from || !to || counts[from.id] < 10 || counts[to.id] >= to.maxCount) return

    setCounts((prev) => ({
      ...prev,
      [from.id]: prev[from.id] - 10,
      [to.id]: clampCount(to, prev[to.id] + 1),
    }))
  }

  const breakDown = (fromIndex) => {
    const from = places[fromIndex]
    const to = places[fromIndex + 1]
    if (!from || !to || counts[from.id] < 1 || counts[to.id] + 10 > to.maxCount) return

    setCounts((prev) => ({
      ...prev,
      [from.id]: prev[from.id] - 1,
      [to.id]: clampCount(to, prev[to.id] + 10),
    }))
  }

  const clear = () =>
    setCounts(Object.fromEntries(places.map((place) => [place.id, 0])))

  const reset = () => {
    setCounts(initialCounts)
  }

  const clearAll = () => {
    clear()
  }

  const startResize = (event, place) => {
    event.preventDefault()
    event.stopPropagation()

    resizeRef.current = {
      place,
      startX: event.clientX,
      startCount: counts[place.id],
    }

    if ('pointerId' in event) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  return (
    <div className="box-border flex h-full flex-col overflow-hidden bg-slate-50 px-4 py-2 text-slate-700">
      <div className="mb-1.5 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Decimal place value strips
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Trade strips across ones, tenths, hundredths, and thousandths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5">
        {places.map((place, index) => {
          const count = counts[place.id]
          const previousPlace = places[index - 1]
          const nextPlace = places[index + 1]
          const canRegroupUp =
            index > 0 && count >= 10 && counts[previousPlace.id] < previousPlace.maxCount
          const canBreakDown =
            index < places.length - 1 &&
            count > 0 &&
            counts[nextPlace.id] + 10 <= nextPlace.maxCount

          return (
            <section
              key={place.id}
              className={`grid grid-cols-[94px_1fr_250px] items-stretch gap-2 rounded border ${place.borderColor} ${place.softColor} p-2`}
            >
              <div className="self-center">
                <div className={`text-sm font-bold ${place.textColor}`}>
                  {place.label}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  {count} x {place.unit}
                </div>
                <div className={`mt-1 inline-flex rounded bg-white px-2 py-0.5 text-sm font-bold tabular-nums ${place.textColor}`}>
                  {formatDecimal(count * place.value)}
                </div>
              </div>

              <div
                className="relative min-h-10 overflow-hidden rounded border border-white/80 bg-white/70 p-1.5"
                data-strip-track={place.id}
              >
                <StripRun
                  count={count}
                  onResizeStart={startResize}
                  place={place}
                />
              </div>

              <div className="grid grid-cols-[34px_34px_1fr] gap-1">
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value - 1)}
                  disabled={count === 0}
                  className="h-full min-h-9 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove one ${place.label} strip`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value + 1)}
                  disabled={count === place.maxCount}
                  className="h-full min-h-9 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Add one ${place.label} strip`}
                >
                  +
                </button>
                <div className="grid gap-1">
                  <TradeButton
                    disabled={!canRegroupUp}
                    label={
                      previousPlace
                        ? `Bundle 10 ${place.label.toLowerCase()}`
                        : 'No larger'
                    }
                    onClick={() => regroupUp(index)}
                  />
                  <TradeButton
                    disabled={!canBreakDown}
                    label={
                      nextPlace
                        ? `Break 1 ${place.singular}`
                        : 'No smaller'
                    }
                    onClick={() => breakDown(index)}
                  />
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-1 grid shrink-0 grid-cols-[1fr_auto] items-center gap-3 rounded border border-slate-200 bg-white px-3 py-1.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Expanded form
          </div>
          <div className="mt-0.5 text-[30px] font-bold text-slate-700">
            <ExpandedForm counts={counts} />
          </div>
        </div>
        <div className="rounded bg-slate-900 px-3 py-1 text-right text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Total
          </div>
          <div className="text-[30px] font-bold tabular-nums">
            <ColorCodedTotal value={total} />
          </div>
        </div>
      </div>
    </div>
  )
}
