import { useEffect, useMemo, useState } from 'react'

const denominatorOptions = [2, 3, 4, 5, 6, 8, 10, 12]

const colors = {
  first: {
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    soft: 'bg-emerald-50',
    fill: '#10b981',
  },
  second: {
    text: 'text-purple-700',
    border: 'border-purple-200',
    soft: 'bg-purple-50',
    fill: '#a855f7',
  },
  result: {
    text: 'text-sky-700',
    border: 'border-sky-200',
    soft: 'bg-sky-50',
    fill: '#0ea5e9',
  },
  removed: {
    text: 'text-orange-700',
    border: 'border-orange-200',
    soft: 'bg-orange-50',
    fill: '#fb923c',
  },
  guide: {
    text: 'text-amber-700',
    border: 'border-amber-200',
    soft: 'bg-amber-50',
    fill: '#f59e0b',
  },
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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const simplify = (numerator, denominator) => {
  if (numerator === 0) return { numerator: 0, denominator: 1 }

  const divisor = gcd(numerator, denominator)

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  }
}

const formatFraction = ({ numerator, denominator }) => {
  if (numerator === 0) return '0'
  if (denominator === 1) return `${numerator}`

  return `${numerator}/${denominator}`
}

const valueOf = ({ numerator, denominator }) => numerator / denominator

const properFraction = (fraction) => ({
  denominator: fraction.denominator,
  numerator: clamp(fraction.numerator, 1, fraction.denominator - 1),
})

const normalizeOperationProblem = (problem) => {
  const next = {
    operation: problem.operation,
    first: properFraction(problem.first),
    second: properFraction(problem.second),
  }

  if (next.operation === '+') {
    let maxSecond = Math.floor(
      (1 - valueOf(next.first)) * next.second.denominator + 1e-9
    )

    if (maxSecond < 1) {
      const maxFirst = Math.floor(
        (1 - 1 / next.second.denominator) * next.first.denominator + 1e-9
      )
      next.first.numerator = clamp(next.first.numerator, 1, Math.max(1, maxFirst))
      maxSecond = Math.floor(
        (1 - valueOf(next.first)) * next.second.denominator + 1e-9
      )
    }

    next.second.numerator = clamp(next.second.numerator, 1, Math.max(1, maxSecond))

    return next
  }

  let maxSecond = Math.floor(valueOf(next.first) * next.second.denominator + 1e-9)

  if (maxSecond < 1) {
    const minFirst = Math.ceil(
      (1 / next.second.denominator) * next.first.denominator - 1e-9
    )
    next.first.numerator = clamp(
      Math.max(next.first.numerator, minFirst),
      1,
      next.first.denominator - 1
    )
    maxSecond = Math.floor(valueOf(next.first) * next.second.denominator + 1e-9)
  }

  next.second.numerator = clamp(next.second.numerator, 1, Math.max(1, maxSecond))

  return next
}

function FractionText({ className = '', fraction }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      <span>{fraction.numerator}</span>
      <span className="text-slate-400">/</span>
      <span>{fraction.denominator}</span>
    </span>
  )
}

function FractionControl({ fraction, label, onChange, tone, maxNumerator }) {
  const updateNumerator = (numerator) => {
    onChange({
      ...fraction,
      numerator: clamp(numerator, 1, maxNumerator ?? fraction.denominator - 1),
    })
  }

  const updateDenominator = (denominator) => {
    const nextDenominator = Number(denominator)

    onChange({
      denominator: nextDenominator,
      numerator: clamp(fraction.numerator, 1, nextDenominator - 1),
    })
  }

  return (
    <div className={`rounded border ${tone.border} ${tone.soft} p-2`}>
      <div className={`mb-1 text-[10px] font-black uppercase ${tone.text}`}>
        {label}
      </div>
      <div className="grid grid-cols-[54px_1fr] items-center gap-2">
        <div className="rounded border border-white bg-white py-1 text-center text-lg font-black shadow-sm">
          <FractionText className={tone.text} fraction={fraction} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator <= 1}
            onClick={() => updateNumerator(fraction.numerator - 1)}
            type="button"
          >
            -
          </button>
          <button
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator >= (maxNumerator ?? fraction.denominator - 1)}
            onClick={() => updateNumerator(fraction.numerator + 1)}
            type="button"
          >
            +
          </button>
          <select
            aria-label={`${label} denominator`}
            className="col-span-2 h-7 rounded border border-slate-300 bg-white px-1 text-[11px] font-bold text-slate-700"
            onChange={(event) => updateDenominator(event.target.value)}
            value={fraction.denominator}
          >
            {denominatorOptions.map((denominator) => (
              <option key={denominator} value={denominator}>
                /{denominator}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function ModeButton({ active, children, onClick }) {
  return (
    <button
      className={`h-10 rounded border px-2 text-[12px] font-black transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function NumberLine({
  accentColor,
  animateBuild = false,
  benchmarkMarkers = [],
  buildKey,
  denominator,
  disabled = false,
  jumps = [],
  marker,
  onTickClick,
  showHalf = true,
  subtitle,
  title,
}) {
  const [hoverTick, setHoverTick] = useState(null)
  const left = 10
  const width = 564
  const viewBoxWidth = 584
  const y = 64
  const tickHeight = denominator > 24 ? 16 : 28
  const xFor = (units, denom = denominator) => left + (units / denom) * width
  const tickFromClientX = (clientX, bounds) => {
    const axisStartRatio = left / viewBoxWidth
    const axisEndRatio = (left + width) / viewBoxWidth
    const pointerRatio = clamp((clientX - bounds.left) / bounds.width, axisStartRatio, axisEndRatio)
    const axisRatio = (pointerRatio - axisStartRatio) / (axisEndRatio - axisStartRatio)

    return clamp(Math.round(axisRatio * denominator), 0, denominator)
  }
  const axisStroke = accentColor ?? '#0f172a'
  const tickStroke = accentColor ?? '#cbd5e1'
  const hoverLabel =
    hoverTick == null
      ? ''
      : hoverTick === 0
        ? '0'
        : hoverTick === denominator
          ? '1'
          : `${hoverTick}/${denominator}`
  const hoverX = hoverTick == null ? 0 : xFor(hoverTick)
  const hoverBubbleWidth = Math.max(42, hoverLabel.length * 8 + 18)
  const hoverBubbleX = clamp(hoverX - hoverBubbleWidth / 2, 5, 584 - hoverBubbleWidth - 5)

  return (
    <div className="relative h-[104px] rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="absolute left-3 right-3 top-2 z-10 flex items-baseline justify-between">
        <div className="text-[12px] font-black text-slate-800">{title}</div>
        <div className="text-[11px] font-bold text-slate-500">{subtitle}</div>
      </div>
      <svg
        className={`absolute bottom-0 left-2 h-[82px] overflow-visible ${
          disabled ? '' : 'cursor-pointer'
        }`}
        style={{ width: 'calc(100% - 1rem)' }}
        onClick={(event) => {
          if (disabled) return

          const bounds = event.currentTarget.getBoundingClientRect()
          onTickClick?.(tickFromClientX(event.clientX, bounds))
        }}
        onMouseLeave={() => setHoverTick(null)}
        onMouseMove={(event) => {
          if (disabled) return

          const bounds = event.currentTarget.getBoundingClientRect()
          setHoverTick(tickFromClientX(event.clientX, bounds))
        }}
        viewBox="0 0 584 120"
        role="img"
      >
        <line
          className={animateBuild ? 'number-line-draw' : ''}
          key={`line-${buildKey ?? 'static'}`}
          pathLength="1"
          x1={left}
          x2={left + width}
          y1={y}
          y2={y}
          stroke={axisStroke}
          strokeWidth="6"
        />
        {showHalf ? (
          <>
            <line
              x1={xFor(1, 2)}
              x2={xFor(1, 2)}
              y1={y - 32}
              y2={y + 24}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth="3"
            />
            <text
              fill="#b45309"
              fontSize="13"
              fontWeight="900"
              textAnchor="middle"
              x={xFor(1, 2)}
              y={y - 39}
            >
              1/2
            </text>
          </>
        ) : null}
        {Array.from({ length: denominator + 1 }, (_, index) => {
          const x = xFor(index)
          const major = index === 0 || index === denominator

          return (
            <g key={index}>
              <rect
                fill="transparent"
                height="58"
                width={Math.max(18, width / denominator)}
                x={x - Math.max(9, width / denominator / 2)}
                y={y - 30}
              />
              <line
                className={animateBuild ? 'number-line-tick-pop' : ''}
                x1={x}
                x2={x}
                y1={y - (major ? 18 : tickHeight / 2)}
                y2={y + (major ? 18 : tickHeight / 2)}
                stroke={major ? axisStroke : tickStroke}
                opacity={major ? 1 : 0.72}
                strokeWidth={major ? '4' : '3'}
                style={{ '--number-line-tick-delay': `${360 + index * 95}ms` }}
              />
              {major ? (
                <text
                  fill="#334155"
                  fontSize="14"
                  fontWeight="900"
                  textAnchor="middle"
                  x={x}
                  y={y + 47}
                >
                  {index === 0 ? '0' : '1'}
                </text>
              ) : null}
            </g>
          )
        })}
        {!disabled && hoverTick != null ? (
          <g className="number-line-hover-preview" pointerEvents="none">
            <circle
              className="number-line-hover-aura"
              cx={hoverX}
              cy={y - 34}
              fill={axisStroke}
              r="10"
            />
            <circle cx={hoverX} cy={y - 34} fill={axisStroke} fillOpacity="0.8" r="8" />
            <rect
              fill="white"
              height="24"
              rx="8"
              stroke={axisStroke}
              strokeOpacity="0.35"
              strokeWidth="1.5"
              width={hoverBubbleWidth}
              x={hoverBubbleX}
              y={y - 66}
            />
            <text
              fill={axisStroke}
              fontSize="12"
              fontWeight="900"
              textAnchor="middle"
              x={hoverBubbleX + hoverBubbleWidth / 2}
              y={y - 50}
            >
              {hoverLabel}
            </text>
          </g>
        ) : null}
        {jumps.map((jump) => {
          const from = xFor(jump.from, jump.denominator)
          const to = xFor(jump.to, jump.denominator)
          const mid = (from + to) / 2
          const arcY = y - 34 - jump.level * 9
          const path = `M ${from} ${y - 10} Q ${mid} ${arcY} ${to} ${y - 10}`
          const arrowDirection = to >= from ? 1 : -1

          return (
            <g key={jump.key}>
              <path d={path} fill="none" stroke={jump.color} strokeWidth="6" strokeLinecap="round" />
              <path
                d={`M ${to} ${y - 10} l ${-10 * arrowDirection} -6 l 2 ${6} l ${-2} 6 Z`}
                fill={jump.color}
              />
              <text
                fill={jump.color}
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                x={mid}
                y={arcY - 4}
              >
                {jump.label}
              </text>
            </g>
          )
        })}
        {marker ? (
          <g>
            <line
              x1={xFor(marker.units, marker.denominator)}
              x2={xFor(marker.units, marker.denominator)}
              y1={y - 30}
              y2={y + 33}
              stroke={marker.color}
              strokeWidth="5"
            />
            {marker.glow ? (
              <circle
                className="number-line-marker-aura"
                cx={xFor(marker.units, marker.denominator)}
                cy={y - 34}
                fill={marker.color}
                r="13"
              />
            ) : null}
            <circle
              cx={xFor(marker.units, marker.denominator)}
              cy={y - 34}
              fill={marker.color}
              fillOpacity="0.82"
              r="13"
            />
            <text
              fill="white"
              fontSize="12"
              fontWeight="900"
              textAnchor="middle"
              x={xFor(marker.units, marker.denominator)}
              y={y - 30}
            >
              {marker.label}
            </text>
          </g>
        ) : null}
        {benchmarkMarkers.map((benchmarkMarker) => {
          const markerX = xFor(benchmarkMarker.units, benchmarkMarker.denominator)
          const markerY = y - 34 + (benchmarkMarker.yOffset ?? 0)

          return (
            <g
              className={benchmarkMarker.transfer ? 'number-line-marker-transfer' : ''}
              key={benchmarkMarker.key}
              style={{ '--number-line-marker-delay': benchmarkMarker.delay ?? '0ms' }}
            >
              <line
                x1={markerX}
                x2={markerX}
                y1={markerY + 2}
                y2={y + 33}
                stroke={benchmarkMarker.color}
                strokeWidth="5"
              />
              <circle
                className="number-line-marker-aura"
                cx={markerX}
                cy={markerY}
                fill={benchmarkMarker.color}
                r="13"
              />
              <circle
                cx={markerX}
                cy={markerY}
                fill={benchmarkMarker.color}
                fillOpacity="0.82"
                r="13"
              />
              <text
                fill="white"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
                x={markerX}
                y={markerY + 4}
              >
                {benchmarkMarker.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function CompareMode() {
  const [first, setFirst] = useState({ numerator: 3, denominator: 4 })
  const [second, setSecond] = useState({ numerator: 2, denominator: 3 })
  const [placed, setPlaced] = useState({ first: false, second: false })
  const [stage, setStage] = useState('setup')
  const [buildRun, setBuildRun] = useState(0)
  const [feedback, setFeedback] = useState('Choose two fractions, then create their number lines.')

  const resetCompare = () => {
    setStage('setup')
    setPlaced({ first: false, second: false })
    setFeedback('Choose two fractions, then create their number lines.')
  }

  const comparison = useMemo(() => {
    const diff = first.numerator * second.denominator - second.numerator * first.denominator

    if (diff === 0) return '='
    if (diff > 0) return '>'

    return '<'
  }, [first, second])

  const showFirstLine = stage !== 'setup'
  const showSecondLine = !['setup', 'building-a'].includes(stage)
  const showBenchmark = ['comparing', 'result'].includes(stage)
  const canPlace = ['placing', 'compare-ready'].includes(stage)
  const resultShown = stage === 'result'

  useEffect(() => {
    if (stage === 'building-a') {
      const timer = window.setTimeout(() => {
        setStage('building-b')
        setFeedback('Fraction A line is ready. Now Fraction B is being created.')
      }, 1350)

      return () => window.clearTimeout(timer)
    }

    if (stage === 'building-b') {
      const timer = window.setTimeout(() => {
        setStage('placing')
        setFeedback('Click the correct tick on each fraction line.')
      }, 1350)

      return () => window.clearTimeout(timer)
    }

    if (stage === 'comparing') {
      const timer = window.setTimeout(() => {
        setStage('result')
        setFeedback(
          comparison === '>'
            ? 'Fraction A lands farther right, so it is greater.'
            : comparison === '<'
              ? 'Fraction A lands to the left, so it is less.'
              : 'Both fractions land at the same point, so they are equal.'
        )
      }, 1900)

      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [comparison, stage])

  const startLineBuild = () => {
    setBuildRun((run) => run + 1)
    setPlaced({ first: false, second: false })
    setStage('building-a')
    setFeedback('Fraction A line is being created.')
  }

  const resultDescription =
    comparison === '>'
      ? 'farther right than'
      : comparison === '<'
        ? 'left of'
        : 'at the same point as'
  const guidanceTitle =
    stage === 'setup'
      ? 'Create the lines'
      : stage === 'compare-ready'
        ? 'Ready to compare'
        : resultShown
          ? 'Comparison'
          : 'Next step'
  const guidanceBody = resultShown ? (
    <>
      <FractionText className={colors.first.text} fraction={first} /> is{' '}
      {resultDescription}{' '}
      <FractionText className={colors.second.text} fraction={second} />.
    </>
  ) : (
    feedback
  )

  return (
    <div className="grid h-full min-h-0 grid-cols-[230px_1fr] gap-3">
      <aside className="space-y-2">
        <FractionControl
          fraction={first}
          label="Fraction A"
          onChange={(next) => {
            setFirst(properFraction(next))
            resetCompare()
          }}
          tone={colors.first}
        />
        <FractionControl
          fraction={second}
          label="Fraction B"
          onChange={(next) => {
            setSecond(properFraction(next))
            resetCompare()
          }}
          tone={colors.second}
        />
        <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-sm">
          <div className="mb-1 text-[10px] font-black uppercase text-sky-700">
            {guidanceTitle}
          </div>
          <div className="text-[13px] font-black leading-5 text-slate-700">
            {guidanceBody}
          </div>
          {stage === 'setup' ? (
            <button
              className="fraction-step-ready-aura mt-3 h-11 w-full rounded border border-sky-300 bg-sky-500 px-4 text-sm font-black text-white shadow-sm"
              onClick={startLineBuild}
              type="button"
            >
              Create lines
            </button>
          ) : null}
          {stage === 'compare-ready' ? (
            <button
              className="fraction-step-ready-aura mt-3 h-11 w-full rounded border border-sky-300 bg-sky-500 px-4 text-sm font-black text-white shadow-sm"
              onClick={() => {
                setStage('comparing')
                setFeedback('Watch each marker move to the benchmark line.')
              }}
              type="button"
            >
              Compare
            </button>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-2">
        <div className="grid min-h-0 flex-1 content-start gap-2">
          {!showFirstLine ? (
            <div className="min-h-[398px] rounded border border-dashed border-slate-300 bg-white shadow-sm">
              <div className="grid h-full place-items-center text-sm font-black text-slate-300">
                Number line workspace
              </div>
            </div>
          ) : null}

          {showFirstLine ? (
            <NumberLine
              animateBuild={stage === 'building-a'}
              buildKey={`a-${buildRun}`}
              denominator={first.denominator}
              disabled={!canPlace || placed.first}
              marker={
                placed.first
                  ? {
                      units: first.numerator,
                      denominator: first.denominator,
                      color: colors.first.fill,
                      label: 'A',
                      glow: true,
                    }
                  : null
              }
              onTickClick={(tick) => {
                if (tick === first.numerator) {
                  setPlaced((current) => ({ ...current, first: true }))
                  if (placed.second) {
                    setStage('compare-ready')
                    setFeedback('Both fractions are placed. Compare them on the benchmark line.')
                    return
                  }
                  setFeedback('Fraction A is snapped to the correct tick.')
                  return
                }
                setFeedback(
                  `Not quite. Count ${first.numerator} parts out of ${first.denominator}.`
                )
              }}
              accentColor={colors.first.fill}
              showHalf={false}
              subtitle={`${first.denominator} equal parts`}
              title="Fraction A line"
            />
          ) : null}

          {showSecondLine ? (
            <NumberLine
              animateBuild={stage === 'building-b'}
              buildKey={`b-${buildRun}`}
              denominator={second.denominator}
              disabled={!canPlace || placed.second}
              marker={
                placed.second
                  ? {
                      units: second.numerator,
                      denominator: second.denominator,
                      color: colors.second.fill,
                      label: 'B',
                      glow: true,
                    }
                  : null
              }
              onTickClick={(tick) => {
                if (tick === second.numerator) {
                  setPlaced((current) => ({ ...current, second: true }))
                  if (placed.first) {
                    setStage('compare-ready')
                    setFeedback('Both fractions are placed. Compare them on the benchmark line.')
                    return
                  }
                  setFeedback('Fraction B is snapped to the correct tick.')
                  return
                }
                setFeedback(
                  `Not quite. Count ${second.numerator} parts out of ${second.denominator}.`
                )
              }}
              accentColor={colors.second.fill}
              showHalf={false}
              subtitle={`${second.denominator} equal parts`}
              title="Fraction B line"
            />
          ) : null}

          {showBenchmark ? (
            <NumberLine
              benchmarkMarkers={[
                {
                  color: colors.first.fill,
                  delay: '120ms',
                  denominator: first.denominator,
                  key: 'benchmark-a',
                  label: 'A',
                  transfer: true,
                  units: first.numerator,
                  yOffset: comparison === '=' ? -12 : 0,
                },
                {
                  color: colors.second.fill,
                  delay: '820ms',
                  denominator: second.denominator,
                  key: 'benchmark-b',
                  label: 'B',
                  transfer: true,
                  units: second.numerator,
                  yOffset: comparison === '=' ? 12 : 0,
                },
              ]}
              denominator={2}
              disabled
              showHalf
              subtitle="0, 1/2, and 1 help you compare"
              title="Benchmark line"
            />
          ) : null}
        </div>
        {resultShown ? (
          <div className="rounded border border-sky-200 bg-sky-50 px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-sky-700">
              Compare positions
            </div>
            <div className="text-3xl font-black">
              <FractionText className={colors.first.text} fraction={first} />
              <span className="px-3 text-slate-500">{comparison}</span>
              <FractionText className={colors.second.text} fraction={second} />
            </div>
            <div className="mt-1 text-[13px] font-black text-sky-800">
              <FractionText className={colors.first.text} fraction={first} /> is{' '}
              {resultDescription}{' '}
              <FractionText className={colors.second.text} fraction={second} />.
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function CommonSizeFinder({ firstDenominator, onUse, secondDenominator }) {
  const leastCommon = lcm(firstDenominator, secondDenominator)
  const [firstCount, setFirstCount] = useState(2)
  const [secondCount, setSecondCount] = useState(2)
  const [selected, setSelected] = useState(null)

  const firstMultiples = useMemo(
    () =>
      Array.from({ length: Math.max(2, firstCount) }, (_, index) => firstDenominator * (index + 1)),
    [firstCount, firstDenominator]
  )
  const secondMultiples = useMemo(
    () =>
      Array.from({ length: Math.max(2, secondCount) }, (_, index) => secondDenominator * (index + 1)),
    [secondCount, secondDenominator]
  )
  const visibleCommon = firstMultiples.filter((value) => secondMultiples.includes(value))
  const maxRows = 12

  const row = (label, tone, multiples) => (
    <div className={`rounded border ${tone.border} ${tone.soft} p-2`}>
      <div className={`mb-1 text-[10px] font-black uppercase ${tone.text}`}>{label}</div>
      <div className="flex flex-wrap gap-1">
        {multiples.map((multiple) => {
          const common = visibleCommon.includes(multiple)
          const active = selected === multiple

          return (
            <button
              className={`min-w-10 rounded border px-2 py-1 text-sm font-black transition ${
                active
                  ? 'border-amber-400 bg-amber-300 text-slate-900'
                  : common
                    ? 'common-size-hint border-amber-300 bg-white text-amber-700'
                    : 'border-white bg-white text-slate-700'
              }`}
              key={`${label}-${multiple}`}
              onClick={() => {
                if (common) setSelected(multiple)
              }}
              type="button"
            >
              {multiple}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-2">
      <div>
        <h3 className="text-lg font-black text-slate-900">Find a common size</h3>
        <p className="text-[12px] font-semibold text-slate-500">
          Reveal multiples. When a shared size appears, choose it.
        </p>
      </div>
      <div className="grid content-start gap-2">
        {row(`Multiples of ${firstDenominator}`, colors.first, firstMultiples)}
        {row(`Multiples of ${secondDenominator}`, colors.second, secondMultiples)}
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-black text-amber-800">
          {selected
            ? `${selected} works because both number lines can use ${selected} equal parts.`
            : visibleCommon.length
              ? 'The glowing numbers are common sizes. Pick one.'
              : `Keep revealing multiples until ${leastCommon} appears in both rows.`}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <button
          className="h-10 rounded border border-emerald-200 bg-white text-[12px] font-black text-emerald-700 disabled:opacity-35"
          disabled={firstCount >= maxRows}
          onClick={() => setFirstCount((count) => Math.min(maxRows, count + 1))}
          type="button"
        >
          Next green multiple
        </button>
        <button
          className="h-10 rounded border border-purple-200 bg-white text-[12px] font-black text-purple-700 disabled:opacity-35"
          disabled={secondCount >= maxRows}
          onClick={() => setSecondCount((count) => Math.min(maxRows, count + 1))}
          type="button"
        >
          Next purple multiple
        </button>
        <button
          className={`h-10 rounded border px-4 text-[12px] font-black transition ${
            selected
              ? 'fraction-step-ready-aura border-sky-300 bg-sky-500 text-white'
              : 'border-slate-200 bg-slate-100 text-slate-400'
          }`}
          disabled={!selected}
          onClick={() => onUse(selected)}
          type="button"
        >
          Use {selected ?? '?'} parts
        </button>
      </div>
    </div>
  )
}

export function OperationMode() {
  const [problem, setProblem] = useState(
    normalizeOperationProblem({
      operation: '+',
      first: { numerator: 1, denominator: 2 },
      second: { numerator: 1, denominator: 4 },
    })
  )
  const [selectedCommon, setSelectedCommon] = useState(null)
  const [placedFirst, setPlacedFirst] = useState(false)
  const [placedSecond, setPlacedSecond] = useState(false)
  const [feedback, setFeedback] = useState('Place the first jump from 0.')

  const model = useMemo(() => {
    const needsCommon = problem.first.denominator !== problem.second.denominator
    const leastCommon = lcm(problem.first.denominator, problem.second.denominator)
    const denominator = needsCommon ? selectedCommon || leastCommon : problem.first.denominator
    const firstUnits = problem.first.numerator * (denominator / problem.first.denominator)
    const secondUnits = problem.second.numerator * (denominator / problem.second.denominator)
    const resultUnits =
      problem.operation === '+' ? firstUnits + secondUnits : firstUnits - secondUnits
    const simplified = simplify(resultUnits, denominator)

    return {
      denominator,
      firstUnits,
      leastCommon,
      needsCommon,
      resultUnits,
      secondUnits,
      simplified,
    }
  }, [problem, selectedCommon])

  const resetWork = () => {
    setSelectedCommon(null)
    setPlacedFirst(false)
    setPlacedSecond(false)
    setFeedback('Place the first jump from 0.')
  }

  const updateProblem = (updater) => {
    setProblem((current) => normalizeOperationProblem(updater(current)))
    resetWork()
  }

  const target = !placedFirst ? model.firstUnits : model.resultUnits
  const finished = placedFirst && placedSecond
  const equationSymbol = problem.operation
  const finalFraction = { numerator: model.resultUnits, denominator: model.denominator }
  const simplifiedText = formatFraction(model.simplified)
  const workText = formatFraction(finalFraction)

  const jumps = [
    placedFirst
      ? {
          color: colors.first.fill,
          denominator: model.denominator,
          from: 0,
          key: 'first',
          label: `${model.firstUnits}/${model.denominator}`,
          level: 0,
          to: model.firstUnits,
        }
      : null,
    placedSecond
      ? {
          color: problem.operation === '+' ? colors.second.fill : colors.removed.fill,
          denominator: model.denominator,
          from: model.firstUnits,
          key: 'second',
          label: `${problem.operation}${model.secondUnits}/${model.denominator}`,
          level: 1,
          to: model.resultUnits,
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="grid h-full min-h-0 grid-cols-[218px_1fr] gap-3">
      <aside className="space-y-2">
        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
            Operation
          </div>
          <div className="grid grid-cols-2 gap-1">
            <ModeButton
              active={problem.operation === '+'}
              onClick={() =>
                updateProblem((current) => ({
                  ...current,
                  operation: '+',
                }))
              }
            >
              + Add
            </ModeButton>
            <ModeButton
              active={problem.operation === '-'}
              onClick={() =>
                updateProblem((current) => ({
                  ...current,
                  operation: '-',
                }))
              }
            >
              - Subtract
            </ModeButton>
          </div>
        </div>
        <FractionControl
          fraction={problem.first}
          label="First fraction"
          onChange={(first) => updateProblem((current) => ({ ...current, first }))}
          tone={colors.first}
        />
        <FractionControl
          fraction={problem.second}
          label={problem.operation === '+' ? 'Second fraction' : 'Amount to subtract'}
          onChange={(second) => updateProblem((current) => ({ ...current, second }))}
          tone={problem.operation === '+' ? colors.second : colors.removed}
        />
        <div className="rounded border border-slate-200 bg-white p-2 shadow-sm">
          <div className="mb-1 text-[10px] font-black uppercase text-slate-400">Path</div>
          <p className="text-[12px] font-bold leading-4 text-slate-600">
            {model.needsCommon
              ? selectedCommon
                ? `Use ${selectedCommon} equal parts, then place the jumps.`
                : 'Find a shared tick size before jumping.'
              : 'Same denominators: use the same tick spacing.'}
          </p>
        </div>
      </aside>

      <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {model.needsCommon && !selectedCommon ? 'Common size' : 'Number line jumps'}
            </h3>
            <p className="text-[12px] font-semibold text-slate-500">
              {model.needsCommon && !selectedCommon
                ? 'Find one denominator that can partition both fractions.'
                : 'Click the landing point for each jump.'}
            </p>
          </div>
          <div className="text-2xl font-black">
            <FractionText className={colors.first.text} fraction={problem.first} />
            <span className="px-2 text-amber-500">{equationSymbol}</span>
            <FractionText
              className={problem.operation === '+' ? colors.second.text : colors.removed.text}
              fraction={problem.second}
            />
          </div>
        </div>

        {model.needsCommon && !selectedCommon ? (
          <CommonSizeFinder
            firstDenominator={problem.first.denominator}
            onUse={(denominator) => {
              setSelectedCommon(denominator)
              setFeedback(`Now use ${denominator} equal parts on the number line.`)
            }}
            secondDenominator={problem.second.denominator}
          />
        ) : (
          <div className="grid content-start gap-2">
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded border ${colors.first.border} ${colors.first.soft} p-2 text-center`}>
                <div className={`text-[10px] font-black uppercase ${colors.first.text}`}>First jump</div>
                <div className={`text-xl font-black ${colors.first.text}`}>
                  {model.firstUnits}/{model.denominator}
                </div>
              </div>
              <div
                className={`rounded border ${
                  problem.operation === '+' ? colors.second.border : colors.removed.border
                } ${problem.operation === '+' ? colors.second.soft : colors.removed.soft} p-2 text-center`}
              >
                <div
                  className={`text-[10px] font-black uppercase ${
                    problem.operation === '+' ? colors.second.text : colors.removed.text
                  }`}
                >
                  {problem.operation === '+' ? 'Second jump' : 'Jump back'}
                </div>
                <div
                  className={`text-xl font-black ${
                    problem.operation === '+' ? colors.second.text : colors.removed.text
                  }`}
                >
                  {model.secondUnits}/{model.denominator}
                </div>
              </div>
              <div className={`rounded border ${colors.result.border} ${colors.result.soft} p-2 text-center`}>
                <div className={`text-[10px] font-black uppercase ${colors.result.text}`}>Landing point</div>
                <div className={`text-xl font-black ${colors.result.text}`}>
                  {finished ? workText : '?'}
                </div>
              </div>
            </div>
            <NumberLine
              denominator={model.denominator}
              jumps={jumps}
              marker={
                finished
                  ? {
                      units: model.resultUnits,
                      denominator: model.denominator,
                      color: colors.result.fill,
                      label: 'R',
                      glow: true,
                    }
                  : placedFirst
                    ? {
                        units: model.firstUnits,
                        denominator: model.denominator,
                        color: colors.first.fill,
                        label: '1',
                        glow: true,
                      }
                    : null
              }
              onTickClick={(tick) => {
                if (tick !== target) {
                  setFeedback(
                    !placedFirst
                      ? `Not quite. The first jump should land on ${model.firstUnits}/${model.denominator}.`
                      : `Not quite. The result should land on ${model.resultUnits}/${model.denominator}.`
                  )
                  return
                }

                if (!placedFirst) {
                  setPlacedFirst(true)
                  setFeedback(
                    problem.operation === '+'
                      ? 'First jump placed. Now jump forward for the second fraction.'
                      : 'First jump placed. Now jump back by the amount being subtracted.'
                  )
                  return
                }

                setPlacedSecond(true)
                setFeedback(
                  problem.operation === '+'
                    ? `Start at 0, jump ${model.firstUnits}/${model.denominator}, then jump ${model.secondUnits}/${model.denominator} more. You land on ${workText}.`
                    : `Start at 0, jump to ${model.firstUnits}/${model.denominator}, then jump back ${model.secondUnits}/${model.denominator}. You land on ${workText}.`
                )
              }}
              subtitle={`${model.denominator} equal parts`}
              title="Working number line"
            />
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-black shadow-inner">
              <span className={colors.first.text}>{model.firstUnits}/{model.denominator}</span>
              <span className="px-2 text-amber-500">{equationSymbol}</span>
              <span className={problem.operation === '+' ? colors.second.text : colors.removed.text}>
                {model.secondUnits}/{model.denominator}
              </span>
              <span className="px-2 text-slate-300">=</span>
              <span className={finished ? colors.result.text : 'text-slate-400'}>
                {finished ? workText : '?'}
              </span>
              {finished && simplifiedText !== workText ? (
                <span className={`${colors.result.text} ml-2 text-base`}>= {simplifiedText}</span>
              ) : null}
            </div>
          </div>
        )}

        <div
          className={`rounded border px-3 py-2 text-center text-sm font-black ${
            finished
              ? 'border-sky-200 bg-sky-50 text-sky-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {feedback}
        </div>
      </section>
    </div>
  )
}

export default function FractionsNumberLine() {
  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-900">
      <header className="mb-2">
        <div>
          <h2 className="text-xl font-black">Fractions on a Number Line</h2>
          <p className="text-[12px] font-semibold text-slate-500">
            Place fractions, compare positions, and order values.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <CompareMode />
      </div>
    </div>
  )
}
