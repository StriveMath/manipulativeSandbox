import { useMemo, useRef, useState } from 'react'

const places = [
  {
    id: 'ones',
    label: 'Ones',
    shortLabel: '1',
    value: 1,
    color: 'bg-emerald-500',
    softColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
    totalTextColor: 'text-emerald-300',
  },
  {
    id: 'tenths',
    label: 'Tenths',
    shortLabel: '0.1',
    value: 0.1,
    color: 'bg-blue-500',
    softColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    totalTextColor: 'text-blue-300',
  },
  {
    id: 'hundredths',
    label: 'Hundredths',
    shortLabel: '0.01',
    value: 0.01,
    color: 'bg-amber-500',
    softColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    totalTextColor: 'text-amber-300',
  },
  {
    id: 'thousandths',
    label: 'Thousandths',
    shortLabel: '0.001',
    value: 0.001,
    color: 'bg-violet-500',
    softColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-900',
    totalTextColor: 'text-violet-300',
  },
]

const initialCounts = {
  ones: 1,
  tenths: 2,
  hundredths: 3,
  thousandths: 4,
}

const clampCount = (value) => Math.max(0, Math.min(18, value))

const formatDecimal = (value) => value.toFixed(3).replace(/\.?0+$/, '')
const regroupAnimationMs = 1850
const pieceOffsets = Array.from({ length: 10 }, (_, index) => ({
  x: ((index % 5) - 2) * 14,
  y: (Math.floor(index / 5) - 0.5) * 16,
}))

const shouldReduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ExpandedForm({ counts }) {
  const activePlaces = places.filter((place) => counts[place.id] > 0)

  if (activePlaces.length === 0) return 'No disks selected'

  return activePlaces.map((place, index) => (
    <span key={place.id}>
      {index > 0 && <span className="mx-1 text-slate-400">+</span>}
      <span className={place.textColor}>
        {counts[place.id]} x {place.shortLabel}
      </span>
    </span>
  ))
}

function ColorCodedDecimal({ value }) {
  const [whole, decimalPart = ''] = value.toFixed(3).split('.')
  const visibleDecimals = decimalPart.replace(/0+$/, '')
  const decimalPlaces = places.slice(1)

  return (
    <>
      <span className={places[0].totalTextColor}>{whole}</span>
      {visibleDecimals.length > 0 && <span className="text-slate-500">.</span>}
      {visibleDecimals.split('').map((digit, index) => (
        <span className={decimalPlaces[index]?.totalTextColor ?? 'text-slate-100'} key={`${digit}-${index}`}>
          {digit}
        </span>
      ))}
    </>
  )
}

function Disk({ place, index, animate, highlight }) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white ${place.color} text-[8px] font-bold text-white shadow-sm ${
        animate ? 'place-disk-pop' : ''
      } ${highlight ? 'place-disk-highlight' : ''}`}
      style={{
        transform: `translate(${(index % 3) * 4}px, ${Math.floor(index / 3) * -2}px)`,
        '--place-disk-delay': `${Math.min(index, 9) * 24}ms`,
      }}
    >
      {place.shortLabel}
    </div>
  )
}

function RegroupGhostDisk({ place, className = '', size = 'large', style }) {
  const sizeClass = size === 'small' ? 'h-8 w-8 text-[8px]' : 'h-14 w-14 text-xs'

  return (
    <div
      className={`place-regroup-ghost-disk absolute flex items-center justify-center rounded-full border-2 border-white ${place.color} ${sizeClass} font-bold text-white shadow-lg ${className}`}
      style={style}
    >
      {place.shortLabel}
    </div>
  )
}

function RegroupAnimationOverlay({ animation }) {
  if (!animation) return null

  const baseStyle = {
    '--from-x': `${animation.sourcePoint.x}px`,
    '--from-y': `${animation.sourcePoint.y}px`,
    '--center-x': `${animation.centerPoint.x}px`,
    '--center-y': `${animation.centerPoint.y}px`,
    '--to-x': `${animation.destinationPoint.x}px`,
    '--to-y': `${animation.destinationPoint.y}px`,
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {animation.type === 'regroup-down' ? (
        <>
          <RegroupGhostDisk
            className="place-regroup-single-to-center"
            place={animation.sourcePlace}
            style={baseStyle}
          />
          <div className="place-regroup-split-flash absolute" style={baseStyle} />
          {pieceOffsets.map((offset, index) => (
            <RegroupGhostDisk
              className="place-regroup-split-piece"
              key={`${animation.id}-split-${index}`}
              place={animation.destinationPlace}
              size="small"
              style={{
                ...baseStyle,
                '--piece-x': `${offset.x}px`,
                '--piece-y': `${offset.y}px`,
                '--piece-delay': `${index * 42}ms`,
              }}
            />
          ))}
        </>
      ) : (
        <>
          {pieceOffsets.map((offset, index) => (
            <RegroupGhostDisk
              className="place-regroup-pieces-to-center"
              key={`${animation.id}-merge-source-${index}`}
              place={animation.sourcePlace}
              size="small"
              style={{
                ...baseStyle,
                '--piece-x': `${offset.x}px`,
                '--piece-y': `${offset.y}px`,
                '--piece-delay': `${index * 32}ms`,
              }}
            />
          ))}
          <div className="place-regroup-merge-flash absolute" style={baseStyle} />
          <RegroupGhostDisk
            className="place-regroup-merge-piece"
            place={animation.destinationPlace}
            style={baseStyle}
          />
        </>
      )}
    </div>
  )
}

export default function DecimalPlaceValueDisks() {
  const [counts, setCounts] = useState(initialCounts)
  const [lastChange, setLastChange] = useState(null)
  const [pendingRegroup, setPendingRegroup] = useState(null)
  const rootRef = useRef(null)
  const placeRefs = useRef({})
  const animationIdRef = useRef(0)

  const isAnimating = pendingRegroup !== null

  const total = useMemo(
    () =>
      places.reduce(
        (sum, place) => sum + counts[place.id] * place.value,
        0
      ),
    [counts]
  )

  const setPlaceCount = (placeId, updater) => {
    if (isAnimating) return

    const previous = counts[placeId]
    const next = clampCount(updater(previous))
    setLastChange({
      destinationId: next > previous ? placeId : null,
      placeId,
      sourceId: next < previous ? placeId : null,
      type: next > previous ? 'add' : next < previous ? 'remove' : 'same',
    })
    setCounts((prev) => ({
      ...prev,
      [placeId]: next,
    }))
  }

  const getAnimationPoints = (sourceId, destinationId) => {
    const root = rootRef.current
    const source = placeRefs.current[sourceId]
    const destination = placeRefs.current[destinationId]
    if (!root || !source || !destination) return null

    const rootRect = root.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const destinationRect = destination.getBoundingClientRect()

    const toPoint = (rect) => ({
      x: rect.left - rootRect.left + rect.width / 2,
      y: rect.top - rootRect.top + rect.height / 2,
    })

    return {
      centerPoint: { x: rootRect.width / 2, y: rootRect.height / 2 - 8 },
      destinationPoint: toPoint(destinationRect),
      sourcePoint: toPoint(sourceRect),
    }
  }

  const completeRegroup = ({ type, from, to }) => {
    setLastChange({ destinationId: to.id, sourceId: from.id, type })
    setCounts((prev) => {
      if (type === 'regroup-up') {
        return {
          ...prev,
          [from.id]: prev[from.id] - 10,
          [to.id]: clampCount(prev[to.id] + 1),
        }
      }

      return {
        ...prev,
        [from.id]: prev[from.id] - 1,
        [to.id]: clampCount(prev[to.id] + 10),
      }
    })
    setPendingRegroup(null)
  }

  const startRegroupAnimation = (type, fromIndex) => {
    if (isAnimating) return

    const from = places[fromIndex]
    const to = type === 'regroup-up' ? places[fromIndex - 1] : places[fromIndex + 1]
    const hasEnough = type === 'regroup-up' ? counts[from?.id] >= 10 : counts[from?.id] >= 1
    if (!from || !to || !hasEnough) return

    if (shouldReduceMotion()) {
      completeRegroup({ from, to, type })
      return
    }

    const points = getAnimationPoints(from.id, to.id)
    if (!points) {
      completeRegroup({ from, to, type })
      return
    }

    animationIdRef.current += 1

    const animation = {
      ...points,
      destinationPlace: to,
      from,
      id: `${type}-${from.id}-${animationIdRef.current}`,
      sourcePlace: from,
      to,
      type,
    }

    setPendingRegroup(animation)
    window.setTimeout(() => completeRegroup(animation), regroupAnimationMs)
  }

  const regroupUp = (fromIndex) => {
    startRegroupAnimation('regroup-up', fromIndex)
  }

  const regroupDown = (fromIndex) => {
    startRegroupAnimation('regroup-down', fromIndex)
  }

  const reset = () => {
    if (isAnimating) return

    setLastChange({ type: 'reset' })
    setCounts(initialCounts)
  }
  const clear = () => {
    if (isAnimating) return

    setLastChange({ type: 'clear' })
    setCounts(Object.fromEntries(places.map((place) => [place.id, 0])))
  }

  return (
    <div ref={rootRef} className="relative box-border flex h-full flex-col overflow-hidden bg-slate-50 px-6 py-3 text-slate-700">
      <RegroupAnimationOverlay animation={pendingRegroup} />
      <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Decimal place value disks
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Build decimals with ones, tenths, hundredths, and thousandths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={isAnimating}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={isAnimating}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-2">
        {places.map((place, index) => {
          const count = counts[place.id]
          const canRegroupUp = index > 0 && count >= 10
          const canRegroupDown = index < places.length - 1 && count > 0
          const isSource = lastChange?.sourceId === place.id
          const isDestination = lastChange?.destinationId === place.id

          return (
            <section
              key={place.id}
              ref={(node) => {
                placeRefs.current[place.id] = node
              }}
              className={`flex min-h-0 flex-col rounded border ${place.borderColor} ${place.softColor} p-2 ${
                isSource ? 'place-regroup-source' : ''
              } ${isDestination ? 'place-regroup-destination' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-bold ${place.textColor}`}>
                    {place.label}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    x {place.shortLabel}
                  </div>
                </div>
                <div
                  className={`place-value-refresh rounded bg-white px-2 py-1 text-sm font-bold tabular-nums ${place.textColor}`}
                  key={`${place.id}-${count}`}
                >
                  {count}
                </div>
              </div>

              <div className="mt-2 flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded border border-white/80 bg-white/70 p-2">
                <div className="grid grid-cols-3 gap-[2px]">
                  {Array.from({ length: count }, (_, diskIndex) => (
                    <Disk
                      animate={isDestination || lastChange?.placeId === place.id}
                      highlight={isSource && diskIndex >= Math.max(0, count - 10)}
                      index={diskIndex}
                      key={`${place.id}-${diskIndex}`}
                      place={place}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value - 1)}
                  disabled={count === 0 || isAnimating}
                  className="h-7 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove one ${place.label} disk`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceCount(place.id, (value) => value + 1)}
                  disabled={count === 18 || isAnimating}
                  className="h-7 rounded border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Add one ${place.label} disk`}
                >
                  +
                </button>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => regroupUp(index)}
                  disabled={!canRegroupUp || isAnimating}
                  className={`h-6 w-full rounded bg-slate-800 px-2 text-[10px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${
                    canRegroupUp ? 'place-ready-button' : ''
                  }`}
                >
                  Regroup 10 up
                </button>
                <button
                  type="button"
                  onClick={() => regroupDown(index)}
                  disabled={!canRegroupDown || isAnimating}
                  className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Break 1 down
                </button>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 rounded border border-slate-200 bg-white px-4 py-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expanded form
          </div>
          <div className="mt-1 text-xl font-bold text-slate-700">
            <ExpandedForm counts={counts} />
          </div>
        </div>
        <div className="rounded bg-slate-900 px-4 py-2 text-right text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Total
          </div>
          <div className="place-value-refresh text-2xl font-bold tabular-nums" key={formatDecimal(total)}>
            <ColorCodedDecimal value={total} />
          </div>
        </div>
      </div>
    </div>
  )
}
