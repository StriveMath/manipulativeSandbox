import { useEffect, useMemo, useRef, useState } from 'react'

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

function FractionControl({
  disabled = false,
  fraction,
  label,
  onChange,
  tone,
  maxNumerator,
}) {
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
            aria-label={`Decrease ${label} numerator`}
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={disabled || fraction.numerator <= 1}
            onClick={() => updateNumerator(fraction.numerator - 1)}
            type="button"
          >
            -
          </button>
          <button
            aria-label={`Increase ${label} numerator`}
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={
              disabled ||
              fraction.numerator >= (maxNumerator ?? fraction.denominator - 1)
            }
            onClick={() => updateNumerator(fraction.numerator + 1)}
            type="button"
          >
            +
          </button>
          <select
            aria-label={`${label} denominator`}
            className="col-span-2 h-7 rounded border border-slate-300 bg-white px-1 text-[11px] font-bold text-slate-700"
            disabled={disabled}
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
  benchmarkTargets = [],
  buildKey,
  comparisonEqual = false,
  denominator,
  disabled = false,
  gap,
  jumps = [],
  marker,
  markerRef,
  onMarkerChange,
  onTickClick,
  showHalf = true,
  subtitle,
  title,
}) {
  const [hoverTick, setHoverTick] = useState(null)
  const markerDraggingRef = useRef(false)
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
  const updateMarkerFromPointer = (clientX, svg) => {
    if (!onMarkerChange || disabled) return

    const bounds = svg.getBoundingClientRect()
    const nextTick = clamp(tickFromClientX(clientX, bounds), 1, denominator - 1)
    onMarkerChange(nextTick)
  }

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
            <g key={`${buildKey ?? 'static'}-${index}`}>
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
        {gap ? (
          <g className={gap.animate ? 'fraction-compare-gap' : ''}>
            <line
              x1={xFor(gap.from.units, gap.from.denominator)}
              x2={xFor(gap.to.units, gap.to.denominator)}
              y1={y}
              y2={y}
              stroke={gap.color ?? colors.guide.fill}
              strokeLinecap="round"
              strokeOpacity="0.34"
              strokeWidth="13"
            />
            <text
              fill={gap.color ?? '#b45309'}
              fontSize="12"
              fontWeight="900"
              textAnchor="middle"
              x={
                (xFor(gap.from.units, gap.from.denominator) +
                  xFor(gap.to.units, gap.to.denominator)) /
                2
              }
              y={y + 29}
            >
              gap {gap.label}
            </text>
          </g>
        ) : null}
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
          <g
            aria-label={`${marker.label} marker at ${marker.units}/${marker.denominator}. Use Left and Right arrows to move it.`}
            aria-valuemax={marker.denominator - 1}
            aria-valuemin="1"
            aria-valuenow={marker.units}
            className={onMarkerChange ? 'number-line-draggable-marker' : ''}
            onClick={(event) => onMarkerChange && event.stopPropagation()}
            onKeyDown={(event) => {
              if (!onMarkerChange || disabled) return
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

              event.preventDefault()
              onMarkerChange(
                clamp(
                  marker.units + (event.key === 'ArrowRight' ? 1 : -1),
                  1,
                  marker.denominator - 1
                )
              )
            }}
            onPointerCancel={(event) => {
              markerDraggingRef.current = false
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onPointerDown={(event) => {
              if (!onMarkerChange || disabled) return
              event.preventDefault()
              event.stopPropagation()
              markerDraggingRef.current = true
              event.currentTarget.setPointerCapture?.(event.pointerId)
              updateMarkerFromPointer(event.clientX, event.currentTarget.ownerSVGElement)
            }}
            onPointerMove={(event) => {
              if (!markerDraggingRef.current) return
              updateMarkerFromPointer(event.clientX, event.currentTarget.ownerSVGElement)
            }}
            onPointerUp={(event) => {
              if (!markerDraggingRef.current) return
              updateMarkerFromPointer(event.clientX, event.currentTarget.ownerSVGElement)
              markerDraggingRef.current = false
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            role={onMarkerChange ? 'slider' : undefined}
            style={{ touchAction: 'none' }}
            tabIndex={onMarkerChange && !disabled ? 0 : undefined}
          >
            {onMarkerChange ? (
              <circle
                cx={xFor(marker.units, marker.denominator)}
                cy={y - 34}
                fill="transparent"
                r="25"
              />
            ) : null}
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
              className={onMarkerChange ? 'number-line-marker-core' : undefined}
              ref={markerRef}
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
        {comparisonEqual && benchmarkMarkers.length ? (
          <circle
            className="fraction-compare-equality-aura"
            cx={xFor(benchmarkMarkers[0].units, benchmarkMarkers[0].denominator)}
            cy={y - 34}
            fill="none"
            r="26"
            stroke={colors.guide.fill}
            strokeWidth="4"
          />
        ) : null}
        {benchmarkTargets.map((target) => (
          <circle
            aria-hidden="true"
            cx={xFor(target.units, target.denominator)}
            cy={y - 34 + (target.yOffset ?? 0)}
            fill="transparent"
            key={target.key}
            ref={target.targetRef}
            r="13"
          />
        ))}
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
  const [comparisonPhase, setComparisonPhase] = useState('idle')
  const [transfer, setTransfer] = useState(null)
  const rootRef = useRef(null)
  const firstMarkerRef = useRef(null)
  const secondMarkerRef = useRef(null)
  const firstTargetRef = useRef(null)
  const secondTargetRef = useRef(null)
  const animationTimerRef = useRef(null)

  const comparisonModel = useMemo(() => {
    const difference =
      first.numerator * second.denominator -
      second.numerator * first.denominator
    const comparison = difference === 0 ? '=' : difference > 0 ? '>' : '<'
    const gap = simplify(
      Math.abs(difference),
      first.denominator * second.denominator
    )
    const firstIsLeft = valueOf(first) <= valueOf(second)

    return {
      comparison,
      firstIsLeft,
      gap,
      gapText: formatFraction(gap),
    }
  }, [first, second])

  const clearComparison = () => {
    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    setComparisonPhase('idle')
    setTransfer(null)
  }

  useEffect(
    () => () => {
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current)
      }
    },
    []
  )

  const updateFraction = (side, nextFraction) => {
    clearComparison()
    if (side === 'first') setFirst(properFraction(nextFraction))
    else setSecond(properFraction(nextFraction))
  }

  const localCenter = (element) => {
    const root = rootRef.current
    if (!root || !element) return null

    const rootBounds = root.getBoundingClientRect()
    const bounds = element.getBoundingClientRect()
    const scaleX = rootBounds.width / root.offsetWidth || 1
    const scaleY = rootBounds.height / root.offsetHeight || 1

    return {
      x: (bounds.left + bounds.width / 2 - rootBounds.left) / scaleX,
      y: (bounds.top + bounds.height / 2 - rootBounds.top) / scaleY,
    }
  }

  const animateComparison = () => {
    if (comparisonPhase === 'animating') return

    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (reducedMotion) {
      setTransfer(null)
      setComparisonPhase('revealed')
      return
    }

    const firstFrom = localCenter(firstMarkerRef.current)
    const firstTo = localCenter(firstTargetRef.current)
    const secondFrom = localCenter(secondMarkerRef.current)
    const secondTo = localCenter(secondTargetRef.current)

    if (!firstFrom || !firstTo || !secondFrom || !secondTo) {
      setComparisonPhase('revealed')
      return
    }

    setComparisonPhase('animating')
    setTransfer({
      first: { from: firstFrom, to: firstTo },
      id: performance.now(),
      second: { from: secondFrom, to: secondTo },
    })
    animationTimerRef.current = window.setTimeout(() => {
      setTransfer(null)
      setComparisonPhase('revealed')
      animationTimerRef.current = null
    }, 1580)
  }

  const reset = () => {
    clearComparison()
    setFirst({ numerator: 3, denominator: 4 })
    setSecond({ numerator: 2, denominator: 3 })
  }

  const resultDescription =
    comparisonModel.comparison === '='
      ? 'The fractions occupy the same point, so the gap is 0.'
      : comparisonModel.comparison === '>'
        ? `${formatFraction(first)} is ${comparisonModel.gapText} farther right than ${formatFraction(second)}.`
        : `${formatFraction(second)} is ${comparisonModel.gapText} farther right than ${formatFraction(first)}.`
  const comparisonRevealed = comparisonPhase === 'revealed'
  const controlsDisabled = comparisonPhase === 'animating'
  const equalityOffset = comparisonModel.comparison === '=' ? 12 : 0
  const sharedMarkers = comparisonRevealed
    ? [
        {
          color: colors.first.fill,
          denominator: first.denominator,
          key: 'shared-a',
          label: 'A',
          units: first.numerator,
          yOffset: -equalityOffset,
        },
        {
          color: colors.second.fill,
          denominator: second.denominator,
          key: 'shared-b',
          label: 'B',
          units: second.numerator,
          yOffset: equalityOffset,
        },
      ]
    : []
  const sharedTargets = [
    {
      denominator: first.denominator,
      key: 'target-a',
      targetRef: firstTargetRef,
      units: first.numerator,
      yOffset: -equalityOffset,
    },
    {
      denominator: second.denominator,
      key: 'target-b',
      targetRef: secondTargetRef,
      units: second.numerator,
      yOffset: equalityOffset,
    },
  ]
  const gap =
    comparisonRevealed && comparisonModel.comparison !== '='
      ? {
          animate: true,
          color: colors.guide.fill,
          from: comparisonModel.firstIsLeft
            ? { denominator: first.denominator, units: first.numerator }
            : { denominator: second.denominator, units: second.numerator },
          label: comparisonModel.gapText,
          to: comparisonModel.firstIsLeft
            ? { denominator: second.denominator, units: second.numerator }
            : { denominator: first.denominator, units: first.numerator },
        }
      : null

  return (
    <div
      className="relative grid h-full min-h-0 grid-cols-[220px_1fr] gap-3 overflow-hidden"
      ref={rootRef}
    >
      <aside className="grid content-start gap-2">
        <FractionControl
          disabled={controlsDisabled}
          fraction={first}
          label="Fraction A"
          onChange={(next) => updateFraction('first', next)}
          tone={colors.first}
        />
        <FractionControl
          disabled={controlsDisabled}
          fraction={second}
          label="Fraction B"
          onChange={(next) => updateFraction('second', next)}
          tone={colors.second}
        />
        <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-sm">
          <div className="mb-1 text-[10px] font-black uppercase text-sky-700">
            Explore positions
          </div>
          <div className="text-[12px] font-bold leading-5 text-slate-700">
            Drag either marker left or right, or click a tick. Then bring both
            markers onto one line.
          </div>
          <button
            className="fraction-step-ready-aura mt-3 h-11 w-full rounded border border-sky-300 bg-sky-500 px-3 text-sm font-black text-white shadow-sm disabled:cursor-wait disabled:opacity-60"
            disabled={controlsDisabled}
            onClick={animateComparison}
            type="button"
          >
            {comparisonPhase === 'animating'
              ? 'Comparing...'
              : comparisonRevealed
                ? 'Animate again'
                : 'Animate comparison'}
          </button>
          <button
            className="mt-2 h-9 w-full rounded border border-slate-300 bg-white text-xs font-black text-slate-600 shadow-sm disabled:opacity-40"
            disabled={controlsDisabled}
            onClick={reset}
            type="button"
          >
            Reset fractions
          </button>
        </div>
      </aside>

      <section className="grid min-h-0 grid-rows-[104px_104px_104px_1fr] gap-2">
        <NumberLine
          accentColor={colors.first.fill}
          animateBuild
          buildKey={`a-${first.denominator}`}
          denominator={first.denominator}
          disabled={controlsDisabled}
          marker={{
            color: colors.first.fill,
            denominator: first.denominator,
            glow: true,
            label: 'A',
            units: first.numerator,
          }}
          markerRef={firstMarkerRef}
          onMarkerChange={(numerator) =>
            updateFraction('first', { ...first, numerator })
          }
          onTickClick={(tick) =>
            updateFraction('first', {
              ...first,
              numerator: clamp(tick, 1, first.denominator - 1),
            })
          }
          showHalf={false}
          subtitle={`${first.denominator} equal parts`}
          title="Fraction A line"
        />
        <NumberLine
          accentColor={colors.second.fill}
          animateBuild
          buildKey={`b-${second.denominator}`}
          denominator={second.denominator}
          disabled={controlsDisabled}
          marker={{
            color: colors.second.fill,
            denominator: second.denominator,
            glow: true,
            label: 'B',
            units: second.numerator,
          }}
          markerRef={secondMarkerRef}
          onMarkerChange={(numerator) =>
            updateFraction('second', { ...second, numerator })
          }
          onTickClick={(tick) =>
            updateFraction('second', {
              ...second,
              numerator: clamp(tick, 1, second.denominator - 1),
            })
          }
          showHalf={false}
          subtitle={`${second.denominator} equal parts`}
          title="Fraction B line"
        />
        <NumberLine
          benchmarkMarkers={sharedMarkers}
          benchmarkTargets={sharedTargets}
          comparisonEqual={
            comparisonRevealed && comparisonModel.comparison === '='
          }
          denominator={2}
          disabled
          gap={gap}
          showHalf
          subtitle="0, 1/2, and 1 show the shared whole"
          title="Shared comparison line"
        />
        <div className="min-h-0">
          {comparisonRevealed ? (
            <div className="fraction-compare-result-reveal grid h-full place-content-center rounded border border-sky-200 bg-sky-50 px-4 py-1 text-center shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-sky-700">
              Compare positions
            </div>
            <div className="text-2xl font-black">
              <FractionText className={colors.first.text} fraction={first} />
              <span className="px-3 text-slate-500">
                {comparisonModel.comparison}
              </span>
              <FractionText className={colors.second.text} fraction={second} />
            </div>
            <div className="text-[12px] font-black text-sky-800">
              {resultDescription}
            </div>
          </div>
          ) : (
            <div className="grid h-full place-content-center rounded border border-dashed border-slate-300 bg-white text-center text-[12px] font-black text-slate-400">
              {comparisonPhase === 'animating'
                ? 'Watch A and B move onto the shared line.'
                : 'Move either marker, then animate the comparison.'}
            </div>
          )}
        </div>
      </section>

      {transfer ? (
        <div className="pointer-events-none absolute inset-0 z-50" key={transfer.id}>
          {[
            { color: colors.first.fill, delay: '0ms', label: 'A', trip: transfer.first },
            {
              color: colors.second.fill,
              delay: '720ms',
              label: 'B',
              trip: transfer.second,
            },
          ].map((flight) => (
            <div
              className="fraction-compare-marker-flight absolute grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[11px] font-black text-white shadow-lg"
              key={flight.label}
              style={{
                '--compare-delay': flight.delay,
                '--compare-from-x': `${flight.trip.from.x}px`,
                '--compare-from-y': `${flight.trip.from.y}px`,
                '--compare-mid-x': `${(flight.trip.from.x + flight.trip.to.x) / 2}px`,
                '--compare-mid-y': `${Math.min(flight.trip.from.y, flight.trip.to.y) - 24}px`,
                '--compare-to-x': `${flight.trip.to.x}px`,
                '--compare-to-y': `${flight.trip.to.y}px`,
                backgroundColor: flight.color,
              }}
            >
              {flight.label}
            </div>
          ))}
        </div>
      ) : null}
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
          <h2 className="text-xl font-black">Compare Fractions on a Number Line</h2>
          <p className="text-[12px] font-semibold text-slate-500">
            Move fractions, bring them onto one line, and measure the gap.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <CompareMode />
      </div>
    </div>
  )
}
