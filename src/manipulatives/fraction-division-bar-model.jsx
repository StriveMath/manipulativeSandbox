import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const denominators = [2, 3, 4, 6, 8, 12]

const defaultProblem = {
  dividend: { numerator: 3, denominator: 4 },
  divisor: { numerator: 1, denominator: 3 },
}

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)

  while (y) {
    const next = x % y
    x = y
    y = next
  }

  return x || 1
}

const lcm = (a, b) => (a * b) / gcd(a, b)

const simplify = (numerator, denominator) => {
  const commonFactor = gcd(numerator, denominator)

  return {
    numerator: numerator / commonFactor,
    denominator: denominator / commonFactor,
  }
}

const formatFraction = ({ numerator, denominator }) => {
  if (numerator === 0) return '0'
  if (denominator === 1) return `${numerator}`

  const whole = Math.floor(numerator / denominator)
  const remainder = numerator % denominator

  if (whole === 0) return `${numerator}/${denominator}`
  return remainder === 0 ? `${whole}` : `${whole} ${remainder}/${denominator}`
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function FractionText({ fraction, className = '' }) {
  return (
    <span
      className={`inline-grid translate-y-0.5 grid-rows-2 text-center leading-none ${className}`}
    >
      <span className="border-b-2 border-current px-0.5">
        {fraction.numerator}
      </span>
      <span className="px-0.5">{fraction.denominator}</span>
    </span>
  )
}

function FractionSetter({ disabled, fraction, label, onChange, tone }) {
  const setNumerator = (numerator) => {
    onChange({
      ...fraction,
      numerator: Math.max(1, Math.min(fraction.denominator, numerator)),
    })
  }

  const setDenominator = (denominator) => {
    onChange({
      numerator: Math.max(1, Math.min(denominator, fraction.numerator)),
      denominator,
    })
  }

  return (
    <section className={`rounded border ${tone.border} ${tone.bg} p-1.5`}>
      <div className={`text-[10px] font-black uppercase ${tone.text}`}>
        {label}
      </div>
      <div className="mt-1 grid grid-cols-[58px_1fr] items-center gap-2">
        <div className="rounded bg-white px-2 py-1 text-center shadow-sm">
          <FractionText
            className={`text-xl font-black tabular-nums ${tone.text}`}
            fraction={fraction}
          />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            aria-label={`Decrease ${label} numerator`}
            className="h-6 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled || fraction.numerator === 1}
            onClick={() => setNumerator(fraction.numerator - 1)}
            type="button"
          >
            -
          </button>
          <button
            aria-label={`Increase ${label} numerator`}
            className="h-6 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled || fraction.numerator === fraction.denominator}
            onClick={() => setNumerator(fraction.numerator + 1)}
            type="button"
          >
            +
          </button>
          <select
            aria-label={`${label} denominator`}
            className="col-span-2 h-6 rounded border border-slate-300 bg-white px-1 text-xs font-bold text-slate-700 disabled:opacity-50"
            disabled={disabled}
            onChange={(event) => setDenominator(Number(event.target.value))}
            value={fraction.denominator}
          >
            {denominators.map((denominator) => (
              <option key={denominator} value={denominator}>
                /{denominator}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

function SegmentedBar({
  className = '',
  dataSource,
  denominator,
  filledUnits,
  tone,
}) {
  return (
    <div
      className={`grid h-full min-w-0 overflow-hidden rounded border-2 bg-white ${tone.border} ${className}`}
      data-division-source={dataSource}
      style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: denominator }, (_, index) => (
        <span
          className={`min-w-0 border-r border-white/95 last:border-r-0 ${
            index < filledUnits ? tone.fill : 'bg-slate-100'
          }`}
          data-division-cell={dataSource ? index : undefined}
          key={index}
        />
      ))}
    </div>
  )
}

function ConversionBar({
  commonDenominator,
  converting,
  fraction,
  label,
  renamed,
  run,
  sourceKey,
  tone,
  units,
}) {
  const multiplier = commonDenominator / fraction.denominator
  const displayFraction = renamed
    ? { numerator: units, denominator: commonDenominator }
    : fraction

  return (
    <div className="grid grid-cols-[70px_1fr] items-center gap-2">
      <div>
        <div className={`text-[10px] font-black uppercase ${tone.text}`}>
          {label}
        </div>
        <FractionText
          className={`mt-1 text-base font-black ${tone.text}`}
          fraction={displayFraction}
        />
      </div>
      <div className="relative h-9" key={`${run}-${label}`}>
        {!renamed && (
          <div
            className={`absolute inset-0 ${
              converting ? 'division-lab-conversion-source' : ''
            }`}
          >
            <SegmentedBar
              denominator={fraction.denominator}
              filledUnits={fraction.numerator}
              tone={tone}
            />
          </div>
        )}

        {converting && (
          <>
            <span className="division-lab-multiplier absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded bg-amber-100 px-2 py-1 text-xs font-black text-amber-700 shadow">
              x{multiplier}
            </span>
            <div
              className={`absolute inset-0 grid overflow-hidden rounded border-2 ${tone.border}`}
              style={{
                gridTemplateColumns: `repeat(${commonDenominator}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: commonDenominator }, (_, index) => (
                <span
                  className={`division-lab-conversion-brick min-w-0 border-r border-white/95 last:border-r-0 ${
                    index < units ? tone.fill : 'bg-slate-100'
                  }`}
                  key={index}
                  style={{ '--division-lab-delay': `${650 + index * 42}ms` }}
                />
              ))}
            </div>
          </>
        )}

        {renamed && !converting && (
          <SegmentedBar
            className="division-lab-renamed-reveal"
            dataSource={sourceKey}
            denominator={commonDenominator}
            filledUnits={units}
            tone={tone}
          />
        )}
      </div>
    </div>
  )
}

function FractionModels({ dividend, divisor, model, phase, run }) {
  const converting = phase === 'converting'
  const renamed = phase !== 'original' && phase !== 'converting'

  return (
    <section
      className="rounded border border-slate-200 bg-white p-2 shadow-sm"
      data-division-models
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-800">Same whole length</h3>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-black ${
            renamed || converting
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {renamed || converting
            ? `${model.commonDenominator} equal parts`
            : 'Original parts'}
        </span>
      </div>
      <div className="space-y-2">
        <ConversionBar
          commonDenominator={model.commonDenominator}
          converting={converting}
          fraction={dividend}
          label="Dividend"
          renamed={renamed}
          run={run}
          sourceKey="dividend"
          tone={{
            border: 'border-emerald-400',
            fill: 'bg-emerald-500',
            text: 'text-emerald-700',
          }}
          units={model.dividendUnits}
        />
        <ConversionBar
          commonDenominator={model.commonDenominator}
          converting={converting}
          fraction={divisor}
          label="Divisor"
          renamed={renamed}
          run={run}
          sourceKey="divisor"
          tone={{
            border: 'border-purple-400',
            fill: 'bg-purple-500',
            text: 'text-purple-700',
          }}
          units={model.divisorUnits}
        />
      </div>
    </section>
  )
}

const localRect = (rect, rootRect, scaleX, scaleY) => ({
  height: rect.height / scaleY,
  left: (rect.left - rootRect.left) / scaleX,
  top: (rect.top - rootRect.top) / scaleY,
  width: rect.width / scaleX,
})

function EqualPartTransferOverlay({ model, phase, rootRef, run }) {
  const [pieces, setPieces] = useState([])
  const sourceKey = phase === 'transfer-dividend' ? 'dividend' : 'divisor'
  const unitCount =
    sourceKey === 'dividend' ? model.dividendUnits : model.divisorUnits

  useLayoutEffect(() => {
    if (phase !== 'transfer-dividend' && phase !== 'transfer-divisor') {
      return undefined
    }

    const root = rootRef.current
    const destination = root?.querySelector(
      `[data-division-destination="${sourceKey}"]`
    )
    const source = root?.querySelector(`[data-division-source="${sourceKey}"]`)

    if (!root || !destination || !source) return undefined

    const frame = window.requestAnimationFrame(() => {
      const rootRect = root.getBoundingClientRect()
      const destinationRect = destination.getBoundingClientRect()
      const scaleX = rootRect.width / root.offsetWidth || 1
      const scaleY = rootRect.height / root.offsetHeight || 1
      const target = localRect(destinationRect, rootRect, scaleX, scaleY)
      const targetWidth = target.width / model.commonDenominator

      const nextPieces = Array.from({ length: unitCount }, (_, index) => {
        const cell = source.querySelector(`[data-division-cell="${index}"]`)
        if (!cell) return null

        const start = localRect(
          cell.getBoundingClientRect(),
          rootRect,
          scaleX,
          scaleY
        )
        const destinationLeft = target.left + index * targetWidth
        const destinationTop = target.top
        const deltaX = destinationLeft - start.left
        const deltaY = destinationTop - start.top

        return {
          delay: 80 + index * 45,
          deltaX,
          deltaY,
          height: start.height,
          id: `${run}-${sourceKey}-${index}`,
          left: start.left,
          midX: deltaX * 0.5,
          midY: deltaY * 0.5 - 20,
          scaleX: targetWidth / start.width,
          scaleY: target.height / start.height,
          top: start.top,
          width: start.width,
        }
      }).filter(Boolean)

      setPieces(nextPieces)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [model, phase, rootRef, run, sourceKey, unitCount])

  if (phase !== 'transfer-dividend' && phase !== 'transfer-divisor') {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[80] overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          className={`division-lab-transfer-piece absolute rounded-sm border border-white/90 shadow-md ${
            sourceKey === 'dividend' ? 'bg-emerald-500' : 'bg-purple-500'
          }`}
          key={piece.id}
          style={{
            '--division-transfer-delay': `${piece.delay}ms`,
            '--division-transfer-dx': `${piece.deltaX}px`,
            '--division-transfer-dy': `${piece.deltaY}px`,
            '--division-transfer-mid-x': `${piece.midX}px`,
            '--division-transfer-mid-y': `${piece.midY}px`,
            '--division-transfer-scale-x': piece.scaleX,
            '--division-transfer-scale-y': piece.scaleY,
            height: piece.height,
            left: piece.left,
            top: piece.top,
            width: piece.width,
          }}
        />
      ))}
    </div>
  )
}

function DivisorStrip({ pieceCount, tone = 'purple' }) {
  const fill = tone === 'orange' ? 'bg-orange-400' : 'bg-purple-500'
  const border = tone === 'orange' ? 'border-orange-500' : 'border-purple-600'

  return (
    <div
      className={`grid h-full overflow-hidden rounded border-2 ${border} ${fill} shadow-sm`}
      style={{ gridTemplateColumns: `repeat(${pieceCount}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: pieceCount }, (_, index) => (
        <span
          className="border-r-2 border-white/90 last:border-r-0"
          key={index}
        />
      ))}
    </div>
  )
}

function quotientLabel(coveredUnits, divisorUnits) {
  if (coveredUnits === 0) return 'No groups placed yet'

  const groupFraction = simplify(coveredUnits, divisorUnits)
  const amount = formatFraction(groupFraction)
  return `${amount} ${amount === '1' ? 'group' : 'groups'}`
}

function DivisionMeasurementWorkspace({
  divisor,
  model,
  onBusyChange,
  onPlace,
  phase,
  placements,
}) {
  const rootRef = useRef(null)
  const targetRef = useRef(null)
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const ready = phase === 'ready'
  const dividendPrepared = phase === 'transfer-divisor' || ready

  const coveredUnits = placements.reduce(
    (total, placement) => total + placement.coverageUnits,
    0
  )
  const remainingUnits = Math.max(model.dividendUnits - coveredUnits, 0)
  const complete = remainingUnits === 0
  const nextCoverage = Math.min(model.divisorUnits, remainingUnits)
  const nextIsPartial = nextCoverage > 0 && nextCoverage < model.divisorUnits
  const stripPieceCount = model.divisorUnits

  const localPoint = (clientX, clientY) => {
    const root = rootRef.current
    if (!root) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }

    const rect = root.getBoundingClientRect()
    const scaleX = rect.width / root.offsetWidth || 1
    const scaleY = rect.height / root.offsetHeight || 1

    return {
      x: (clientX - rect.left) / scaleX,
      y: (clientY - rect.top) / scaleY,
      scaleX,
      scaleY,
    }
  }

  const isOverTarget = (clientX, clientY) => {
    const rect = targetRef.current?.getBoundingClientRect()
    return Boolean(
      rect &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top - 14 &&
        clientY <= rect.bottom + 14
    )
  }

  const beginDrag = (event) => {
    if (!ready || complete || event.button !== 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = localPoint(event.clientX, event.clientY)
    const targetRect = targetRef.current?.getBoundingClientRect()
    const targetWidth = targetRect
      ? targetRect.width / point.scaleX
      : 420

    dragRef.current = { pointerId: event.pointerId }
    onBusyChange(true)
    setDrag({
      over: isOverTarget(event.clientX, event.clientY),
      width: targetWidth * (model.divisorUnits / model.commonDenominator),
      x: point.x,
      y: point.y,
    })
  }

  const moveDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const point = localPoint(event.clientX, event.clientY)
    setDrag((current) =>
      current
        ? {
            ...current,
            over: isOverTarget(event.clientX, event.clientY),
            x: point.x,
            y: point.y,
          }
        : current
    )
  }

  const endDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const validDrop = isOverTarget(event.clientX, event.clientY)
    dragRef.current = null
    setDrag(null)
    onBusyChange(false)
    onPlace(validDrop)
  }

  const placeWithKeyboard = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && ready && !complete) {
      event.preventDefault()
      onPlace(true)
    }
  }

  return (
    <section
      className="relative min-h-0 rounded border border-sky-200 bg-sky-50/60 p-2 shadow-sm"
      data-division-measurement
      ref={rootRef}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            Measure the dividend
          </h3>
          <p className="text-[11px] font-semibold text-slate-500">
            {ready
              ? 'Drag the purple divisor strip onto the next open space.'
              : phase === 'transfer-dividend' || phase === 'transfer-divisor'
                ? 'Watch the equal parts move into the measuring workspace.'
                : 'Rename both fractions to equal parts first.'}
          </p>
        </div>
        {ready ? (
          <div className="rounded bg-white px-3 py-1 text-right shadow-sm">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Measured
            </div>
            <div className="text-sm font-black text-sky-600">
              {quotientLabel(coveredUnits, model.divisorUnits)}
            </div>
          </div>
        ) : (
          <div className="rounded border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-400">
            Locked
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[68px_1fr] items-center gap-2">
        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-emerald-700">
            Dividend
          </span>
        </div>
        <div
          aria-label="Dividend measurement bar"
          className={`relative h-12 overflow-hidden rounded border-2 bg-white ${
            dividendPrepared
              ? 'division-lab-destination-ready border-slate-800'
              : 'border-dashed border-slate-300'
          }`}
          data-division-destination="dividend"
          ref={targetRef}
        >
          {dividendPrepared && (
            <>
              <div
                className="absolute inset-y-0 left-0 bg-emerald-100"
                style={{
                  width: `${(model.dividendUnits / model.commonDenominator) * 100}%`,
                }}
              />
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${model.commonDenominator}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: model.commonDenominator }, (_, index) => (
                  <span
                    className={`border-r last:border-r-0 ${
                      index < model.dividendUnits
                        ? 'border-emerald-300'
                        : 'border-slate-200'
                    }`}
                    key={index}
                  />
                ))}
              </div>
            </>
          )}

          {ready && placements.map((placement, index) => (
            <div
              className={`division-lab-group-land absolute inset-y-0 z-10 border-r-2 border-white ${
                placement.type === 'full' ? 'bg-sky-400' : 'bg-orange-400'
              }`}
              key={placement.id}
              style={{
                '--division-lab-land-delay': `${index * 40}ms`,
                left: `${(placement.startUnits / model.commonDenominator) * 100}%`,
                width: `${
                  (placement.coverageUnits / model.commonDenominator) * 100
                }%`,
              }}
            >
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${placement.coverageUnits}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: placement.coverageUnits }, (_, unitIndex) => (
                  <span
                    className="border-r border-white/80 last:border-r-0"
                    key={unitIndex}
                  />
                ))}
              </div>
              <span className="absolute inset-0 z-10 flex items-center justify-center text-[10px] font-black text-white">
                {placement.type === 'full'
                  ? `${index + 1}`
                  : formatFraction(placement.groupFraction)}
              </span>
            </div>
          ))}

          {ready && drag?.over && nextCoverage > 0 && (
            <div
              className={`division-lab-drop-preview absolute inset-y-0 z-20 border-2 border-dashed ${
                nextIsPartial
                  ? 'border-orange-500 bg-orange-200/70'
                  : 'border-purple-600 bg-purple-300/60'
              }`}
              style={{
                left: `${(coveredUnits / model.commonDenominator) * 100}%`,
                width: `${(nextCoverage / model.commonDenominator) * 100}%`,
              }}
            />
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-purple-700">
            Divisor
          </span>
        </div>
        <div
          className={`relative h-12 rounded border border-dashed bg-white/80 p-1 ${
            ready
              ? 'division-lab-destination-ready border-purple-300'
              : 'border-slate-300'
          }`}
          data-division-destination="divisor"
        >
          {ready && (
            <button
              aria-label={`Drag another ${divisor.numerator}/${divisor.denominator} divisor group into the dividend`}
              className="division-lab-source-strip absolute bottom-1 left-1 top-1 cursor-grab touch-none rounded active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
              disabled={complete}
              onKeyDown={placeWithKeyboard}
              onPointerCancel={endDrag}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              style={{
                width: `calc(${(model.divisorUnits / model.commonDenominator) * 100}% - 4px)`,
              }}
              type="button"
            >
              <DivisorStrip pieceCount={stripPieceCount} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow">
                {divisor.numerator}/{divisor.denominator}
              </span>
            </button>
          )}
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {ready ? 'Drag or press Enter' : 'Waiting for equal parts'}
          </span>
        </div>
      </div>

      {drag && (
        <div
          className={`pointer-events-none absolute z-50 h-10 -translate-x-1/2 -translate-y-1/2 ${
            drag.over ? 'division-lab-drag-ready' : ''
          }`}
          style={{ left: drag.x, top: drag.y, width: drag.width }}
        >
          <DivisorStrip pieceCount={stripPieceCount} />
        </div>
      )}
    </section>
  )
}

function LiveEquation({ dividend, divisor, model, phase, placements }) {
  const coveredUnits = placements.reduce(
    (total, placement) => total + placement.coverageUnits,
    0
  )
  const placedQuotient = simplify(coveredUnits, model.divisorUnits)
  const complete = coveredUnits === model.dividendUnits
  const lastPlacement = placements.at(-1)

  let observation =
    phase === 'ready'
      ? 'Drag a divisor strip onto the dividend to begin measuring.'
      : phase === 'original'
        ? 'Prepare equal parts before measuring.'
        : 'The equal parts are being prepared for measurement.'

  if (phase === 'ready' && placements.length > 0 && !complete) {
    observation = `${quotientLabel(
      coveredUnits,
      model.divisorUnits
    )} fit so far. Measure the space that remains.`
  }

  if (phase === 'ready' && complete && lastPlacement?.type === 'partial') {
    observation = `The orange part is ${formatFraction(
      lastPlacement.groupFraction
    )} of one divisor group.`
  } else if (phase === 'ready' && complete) {
    observation = 'The dividend is covered exactly by complete divisor groups.'
  }

  return (
    <section
      className="grid grid-cols-[1fr_240px] items-center gap-3 rounded border border-slate-200 bg-white px-4 py-2 shadow-sm"
      data-division-equation
    >
      <div>
        <div className="text-[9px] font-black uppercase text-slate-400">
          Live quotient
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xl font-black">
          <FractionText className="text-emerald-600" fraction={dividend} />
          <span className="text-slate-500">&divide;</span>
          <FractionText className="text-purple-600" fraction={divisor} />
          <span className="text-slate-400">=</span>
          <span
            className={
              complete
                ? 'division-lab-answer-reveal text-sky-600'
                : placements.length > 0
                  ? 'text-sky-600'
                  : 'text-slate-300'
            }
          >
            {phase === 'ready' && placements.length > 0
              ? formatFraction(placedQuotient)
              : '?'}
          </span>
        </div>
      </div>
      <p
        className={`rounded px-3 py-2 text-xs font-bold leading-snug ${
          complete
            ? 'bg-sky-50 text-sky-700'
            : 'bg-amber-50 text-amber-800'
        }`}
      >
        {observation}
      </p>
    </section>
  )
}

export default function FractionDivisionBarModel() {
  const rootRef = useRef(null)
  const [dividend, setDividend] = useState(defaultProblem.dividend)
  const [divisor, setDivisor] = useState(defaultProblem.divisor)
  const [phase, setPhase] = useState('original')
  const [conversionRun, setConversionRun] = useState(0)
  const [placements, setPlacements] = useState([])
  const [feedback, setFeedback] = useState(
    'Rename both fractions to equal parts before measuring.'
  )
  const [dragging, setDragging] = useState(false)

  const model = useMemo(() => {
    const commonDenominator = lcm(dividend.denominator, divisor.denominator)
    const dividendUnits =
      dividend.numerator * (commonDenominator / dividend.denominator)
    const divisorUnits =
      divisor.numerator * (commonDenominator / divisor.denominator)

    return {
      commonDenominator,
      dividendUnits,
      divisorUnits,
      quotient: simplify(dividendUnits, divisorUnits),
    }
  }, [dividend, divisor])

  useEffect(() => {
    let duration
    let nextPhase
    let message

    if (phase === 'converting') {
      duration = 2450
      nextPhase = 'transfer-dividend'
      message = 'The green dividend pieces are moving into the measuring bar.'
    } else if (phase === 'transfer-dividend') {
      duration = 780 + model.dividendUnits * 45
      nextPhase = 'transfer-divisor'
      message = 'Now the purple divisor pieces are moving into the strip tray.'
    } else if (phase === 'transfer-divisor') {
      duration = 780 + model.divisorUnits * 45
      nextPhase = 'ready'
      message = 'The equal parts are ready. Drag the divisor strip across the dividend.'
    } else {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setPhase(nextPhase)
      setFeedback(message)
    }, duration)

    return () => window.clearTimeout(timer)
  }, [
    conversionRun,
    model.dividendUnits,
    model.divisorUnits,
    phase,
  ])

  const clearMeasurement = (message) => {
    setPlacements([])
    setFeedback(message)
  }

  const updateDividend = (nextDividend) => {
    setDividend(nextDividend)
    setPhase('original')
    clearMeasurement('The fraction changed. Prepare equal parts again.')
  }

  const updateDivisor = (nextDivisor) => {
    setDivisor(nextDivisor)
    setPhase('original')
    clearMeasurement('The divisor changed. Prepare equal parts again.')
  }

  const renameFractions = () => {
    if (phase !== 'original') return

    setConversionRun((current) => current + 1)
    if (prefersReducedMotion()) {
      setPhase('ready')
      setFeedback(
        `The ${model.commonDenominator} equal parts are ready for measurement.`
      )
      return
    }

    if (dividend.denominator === divisor.denominator) {
      setPhase('transfer-dividend')
      setFeedback('The green dividend pieces are moving into the measuring bar.')
    } else {
      setPhase('converting')
      setFeedback(
        `Watch both fractions rename themselves using ${model.commonDenominator} equal parts.`
      )
    }
  }

  const placeNextGroup = (validDrop) => {
    if (phase !== 'ready') return

    if (!validDrop) {
      setFeedback('Drop the strip on the dividend bar. It will snap to the next open space.')
      return
    }

    const coveredUnits = placements.reduce(
      (total, placement) => total + placement.coverageUnits,
      0
    )
    const remainingUnits = model.dividendUnits - coveredUnits

    if (remainingUnits <= 0) return

    const coverageUnits = Math.min(model.divisorUnits, remainingUnits)
    const type = coverageUnits === model.divisorUnits ? 'full' : 'partial'
    const groupFraction = simplify(coverageUnits, model.divisorUnits)
    const nextPlacement = {
      coverageUnits,
      groupFraction,
      id: `${conversionRun}-${placements.length}-${coverageUnits}`,
      startUnits: coveredUnits,
      type,
    }
    const nextPlacements = [...placements, nextPlacement]
    const nextCovered = coveredUnits + coverageUnits

    setPlacements(nextPlacements)

    if (nextCovered === model.dividendUnits) {
      setFeedback(
        type === 'partial'
          ? `The last space is ${formatFraction(groupFraction)} of one divisor group.`
          : 'The divisor groups cover the dividend exactly.'
      )
    } else {
      setFeedback(
        `${quotientLabel(nextCovered, model.divisorUnits)} fit. Drag another copy.`
      )
    }
  }

  const undoPlacement = () => {
    if (placements.length === 0) return
    setPlacements((current) => current.slice(0, -1))
    setFeedback('The last group was removed. Measure that space again.')
  }

  const reset = () => {
    setDividend(defaultProblem.dividend)
    setDivisor(defaultProblem.divisor)
    setPhase('original')
    setPlacements([])
    setDragging(false)
    setFeedback('Rename both fractions to equal parts before measuring.')
    setConversionRun((current) => current + 1)
  }

  const animationBusy =
    phase === 'converting' ||
    phase === 'transfer-dividend' ||
    phase === 'transfer-divisor'
  const sameDenominator = dividend.denominator === divisor.denominator

  return (
    <div
      className="relative box-border flex h-[500px] w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-800"
      data-fraction-division-lab
      data-division-phase={phase}
      ref={rootRef}
    >
      <header className="mb-2 flex h-11 shrink-0 items-start justify-between">
        <div>
          <h2 className="text-lg font-black leading-tight text-slate-950">
            Fraction Division Measuring Lab
          </h2>
          <p className="text-[11px] font-semibold text-slate-500">
            Find how many copies of the divisor fit inside the dividend.
          </p>
        </div>
        <button
          className="h-8 rounded bg-slate-900 px-4 text-xs font-black text-white shadow hover:bg-slate-700 disabled:opacity-40"
          disabled={animationBusy || dragging}
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[182px_minmax(0,1fr)] gap-2">
        <aside className="flex min-h-0 flex-col gap-1.5">
          <section className="rounded border-2 border-slate-900 bg-white px-2 py-1.5 text-center shadow-sm">
            <div className="text-[9px] font-black uppercase text-slate-400">
              How many divisor groups?
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-3 text-2xl font-black">
              <FractionText className="text-emerald-600" fraction={dividend} />
              <span className="text-slate-700">&divide;</span>
              <FractionText className="text-purple-600" fraction={divisor} />
            </div>
          </section>

          <FractionSetter
            disabled={animationBusy || dragging}
            fraction={dividend}
            label="Dividend"
            onChange={updateDividend}
            tone={{
              bg: 'bg-emerald-50',
              border: 'border-emerald-200',
              text: 'text-emerald-700',
            }}
          />
          <FractionSetter
            disabled={animationBusy || dragging}
            fraction={divisor}
            label="Divisor"
            onChange={updateDivisor}
            tone={{
              bg: 'bg-purple-50',
              border: 'border-purple-200',
              text: 'text-purple-700',
            }}
          />

          <button
            className={`min-h-10 rounded border px-2 py-1 text-[11px] font-black leading-tight shadow-sm disabled:cursor-not-allowed ${
              phase === 'original'
                ? 'division-lab-ready border-amber-400 bg-amber-100 text-amber-800'
                : 'border-slate-200 bg-slate-100 text-slate-400'
            }`}
            disabled={
              animationBusy ||
              dragging ||
              phase !== 'original'
            }
            onClick={renameFractions}
            type="button"
          >
            {phase === 'ready'
              ? `Using ${model.commonDenominator} equal parts`
              : phase === 'converting'
                ? 'Renaming...'
                : phase === 'transfer-dividend'
                  ? 'Moving dividend...'
                  : phase === 'transfer-divisor'
                    ? 'Moving divisor...'
                    : sameDenominator
                      ? 'Prepare equal parts'
                      : 'Rename to equal parts'}
          </button>

          <button
            className="h-7 rounded border border-slate-300 bg-white text-xs font-black text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              placements.length === 0 || phase !== 'ready' || dragging
            }
            onClick={undoPlacement}
            type="button"
          >
            Undo last group
          </button>

          <div className="min-h-0 flex-1 rounded border border-sky-200 bg-sky-50 p-2 text-[11px] font-bold leading-snug text-sky-800">
            <div className="mb-1 text-[9px] font-black uppercase text-sky-600">
              Observation
            </div>
            {feedback}
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[154px_minmax(0,1fr)_80px] gap-2">
          <FractionModels
            dividend={dividend}
            divisor={divisor}
            model={model}
            phase={phase}
            run={conversionRun}
          />
          <DivisionMeasurementWorkspace
            divisor={divisor}
            model={model}
            onBusyChange={setDragging}
            onPlace={placeNextGroup}
            phase={phase}
            placements={placements}
          />
          <LiveEquation
            dividend={dividend}
            divisor={divisor}
            model={model}
            phase={phase}
            placements={placements}
          />
        </main>
      </div>
      <EqualPartTransferOverlay
        key={`${conversionRun}-${phase}`}
        model={model}
        phase={phase}
        rootRef={rootRef}
        run={conversionRun}
      />
    </div>
  )
}
