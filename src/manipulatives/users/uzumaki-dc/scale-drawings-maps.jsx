import { useEffect, useRef, useState } from 'react'

const plan = { width: 12.5, height: 7.5 }
const plot = { left: 42, top: 12, width: 440, height: 264 }
const svgSize = { width: 500, height: 300 }
const unitsToPixels = plot.width / plan.width
const fixedAnchor = { x: 1, y: 1 }
const animationDurationMs = 2500
const multiplySymbol = '\u00D7'

const scaleFactors = [
  {
    id: 'half',
    label: '\u00BD\u00D7',
    mathLabel: '\u00BD',
    accessibleLabel: 'Scale by one half',
    value: 0.5,
    observation: 'Every corresponding length was halved. The shape and angles stayed the same.',
  },
  {
    id: 'double',
    label: `2${multiplySymbol}`,
    mathLabel: '2',
    accessibleLabel: 'Scale by two',
    value: 2,
    observation: 'Every corresponding length doubled. The shape and angles stayed the same.',
  },
  {
    id: 'triple',
    label: `3${multiplySymbol}`,
    mathLabel: '3',
    accessibleLabel: 'Scale by three',
    value: 3,
    observation: 'Every corresponding length tripled. The shape and angles stayed the same.',
  },
]

const objectDefinitions = [
  {
    id: 'school',
    label: 'School',
    shortLabel: 'SCH',
    color: '#059669',
    width: 3,
    height: 2,
    shape: 'rectangle',
    dimensionMode: 'width-height',
  },
  {
    id: 'garden',
    label: 'Garden',
    shortLabel: 'GDN',
    color: '#d97706',
    width: 1.5,
    height: 1.5,
    shape: 'square',
    dimensionMode: 'width-height',
  },
  {
    id: 'fountain',
    label: 'Fountain',
    shortLabel: 'FTN',
    color: '#0284c7',
    width: 1.5,
    height: 1.5,
    shape: 'circle',
    dimensionMode: 'diameter',
  },
  {
    id: 'plaza',
    label: 'Plaza',
    shortLabel: 'PLZ',
    color: '#7c3aed',
    width: 2.5,
    height: 2,
    shape: 'triangle',
    dimensionMode: 'base-height',
  },
  {
    id: 'park',
    label: 'Park',
    shortLabel: 'PARK',
    color: '#65a30d',
    width: 2.5,
    height: 2,
    shape: 'l-shape',
    dimensionMode: 'width-height',
  },
  {
    id: 'main-road',
    label: 'Main Road',
    shortLabel: 'ROAD',
    color: '#475569',
    width: 3,
    height: 0.5,
    shape: 'road',
    dimensionMode: 'width-height',
  },
]

const formatNumber = (value) =>
  value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })

const scaledDimensions = (definition, factor) => ({
  width: definition.width * factor.value,
  height: definition.height * factor.value,
})

const shapeGeometry = (definition, dimensions) => {
  const widthPx = dimensions.width * unitsToPixels
  const heightPx = dimensions.height * unitsToPixels

  if (definition.shape === 'circle') {
    return {
      heightPx,
      widthPx,
      x: plot.left + (plot.width - widthPx) / 2,
      y: plot.top + (plot.height - heightPx) / 2,
    }
  }

  return {
    heightPx,
    widthPx,
    x: plot.left + fixedAnchor.x * unitsToPixels,
    y: plot.top + plot.height - fixedAnchor.y * unitsToPixels - heightPx,
  }
}

const dimensionItems = (definition) => {
  if (definition.dimensionMode === 'diameter') {
    return [{ key: 'diameter', label: 'Diameter', value: definition.width }]
  }

  if (definition.dimensionMode === 'base-height') {
    return [
      { key: 'base', label: 'Base', value: definition.width },
      { key: 'height', label: 'Height', value: definition.height },
    ]
  }

  return [
    { key: 'width', label: 'Width', value: definition.width },
    { key: 'height', label: 'Height', value: definition.height },
  ]
}

const dimensionSummary = (definition) => {
  if (definition.dimensionMode === 'diameter') return `diameter ${formatNumber(definition.width)} units`
  if (definition.dimensionMode === 'base-height') {
    return `base ${formatNumber(definition.width)} and height ${formatNumber(definition.height)} units`
  }
  return `${formatNumber(definition.width)} by ${formatNumber(definition.height)} units`
}

const compactDimensionSummary = (definition) => {
  if (definition.dimensionMode === 'diameter') return `d ${formatNumber(definition.width)}`
  if (definition.dimensionMode === 'base-height') {
    return `b ${formatNumber(definition.width)} ${multiplySymbol} h ${formatNumber(definition.height)}`
  }
  return `${formatNumber(definition.width)} ${multiplySymbol} ${formatNumber(definition.height)}`
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ShapeForm({ definition, height, strokeWidth = 2, width, x, y }) {
  const fill = `${definition.color}2f`
  const common = {
    fill,
    stroke: definition.color,
    strokeWidth,
    vectorEffect: 'non-scaling-stroke',
  }

  if (definition.shape === 'circle') {
    return <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} {...common} />
  }

  if (definition.shape === 'triangle') {
    return <polygon points={`${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`} {...common} />
  }

  if (definition.shape === 'l-shape') {
    const cornerX = x + width * 0.42
    const cornerY = y + height * 0.55
    return (
      <path
        d={`M ${x} ${y} H ${cornerX} V ${cornerY} H ${x + width} V ${y + height} H ${x} Z`}
        strokeLinejoin="round"
        {...common}
      />
    )
  }

  if (definition.shape === 'road') {
    return (
      <g>
        <rect height={height} rx={Math.min(8, height / 3)} width={width} x={x} y={y} {...common} />
        <line
          stroke="#f8fafc"
          strokeDasharray="10 7"
          strokeWidth={Math.max(1.4, strokeWidth)}
          vectorEffect="non-scaling-stroke"
          x1={x + 5}
          x2={x + width - 5}
          y1={y + height / 2}
          y2={y + height / 2}
        />
      </g>
    )
  }

  return (
    <rect
      height={height}
      rx={definition.shape === 'square' ? 7 : 5}
      width={width}
      x={x}
      y={y}
      {...common}
    />
  )
}

function ShapePreview({ definition }) {
  return (
    <svg aria-hidden="true" className="h-5 w-6 shrink-0" viewBox="0 0 100 100">
      <ShapeForm definition={definition} height={76} strokeWidth={5} width={82} x={9} y={12} />
    </svg>
  )
}

function PaletteButton({ active, definition, disabled, onClick }) {
  return (
    <button
      aria-label={`Choose ${definition.label}, ${dimensionSummary(definition)}`}
      aria-pressed={active}
      className={`scale-compare-palette flex h-9 min-w-0 items-center gap-1 rounded border px-1.5 text-left shadow-sm transition ${
        active
          ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
          : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <ShapePreview definition={definition} />
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-black leading-3 text-slate-800">{definition.label}</span>
        <span className="block whitespace-nowrap text-[8px] font-bold leading-2 text-slate-400">
          {compactDimensionSummary(definition)}
        </span>
      </span>
    </button>
  )
}

function ScaleButton({ active, disabled, factor, onClick }) {
  return (
    <button
      aria-label={factor.accessibleLabel}
      aria-pressed={active}
      className={`h-9 rounded border text-lg font-black shadow-sm transition ${
        active
          ? 'border-amber-500 bg-amber-200 text-amber-950 ring-2 ring-amber-300'
          : 'border-amber-200 bg-white text-amber-800 hover:border-amber-400 hover:bg-amber-50'
      } ${!disabled && !active ? 'scale-compare-ready' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {factor.label}
    </button>
  )
}

function CoordinatePlane() {
  const xGrid = Array.from({ length: 12 }, (_, index) => index + 1)
  const yGrid = Array.from({ length: 7 }, (_, index) => index + 1)
  const xTicks = Array.from({ length: 26 }, (_, index) => index * 0.5)
  const yTicks = Array.from({ length: 16 }, (_, index) => index * 0.5)
  const xLabels = [0, 2.5, 5, 7.5, 10, 12.5]
  const yLabels = [2.5, 5, 7.5]
  const xFor = (value) => plot.left + value * unitsToPixels
  const yFor = (value) => plot.top + plot.height - value * unitsToPixels

  return (
    <g aria-hidden="true">
      <rect fill="#f0f9ff" height={plot.height} width={plot.width} x={plot.left} y={plot.top} />
      {xGrid.map((value) => (
        <line
          key={`x-grid-${value}`}
          stroke="#bae6fd"
          strokeWidth="1"
          x1={xFor(value)}
          x2={xFor(value)}
          y1={plot.top}
          y2={plot.top + plot.height}
        />
      ))}
      {yGrid.map((value) => (
        <line
          key={`y-grid-${value}`}
          stroke="#bae6fd"
          strokeWidth="1"
          x1={plot.left}
          x2={plot.left + plot.width}
          y1={yFor(value)}
          y2={yFor(value)}
        />
      ))}
      <line stroke="#0f172a" strokeWidth="3" x1={plot.left} x2={plot.left + plot.width} y1={plot.top + plot.height} y2={plot.top + plot.height} />
      <line stroke="#0f172a" strokeWidth="3" x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.top + plot.height} />
      {xTicks.map((value) => (
        <line
          key={`x-tick-${value}`}
          stroke="#0f172a"
          strokeWidth={Number.isInteger(value) ? 2.1 : 1.35}
          x1={xFor(value)}
          x2={xFor(value)}
          y1={plot.top + plot.height}
          y2={plot.top + plot.height + (Number.isInteger(value) ? 8 : 5)}
        />
      ))}
      {yTicks.map((value) => (
        <line
          key={`y-tick-${value}`}
          stroke="#0f172a"
          strokeWidth={Number.isInteger(value) ? 2.1 : 1.35}
          x1={plot.left - (Number.isInteger(value) ? 8 : 5)}
          x2={plot.left}
          y1={yFor(value)}
          y2={yFor(value)}
        />
      ))}
      {xLabels.map((value) => (
        <text
          fill="#334155"
          fontSize="14"
          fontWeight="900"
          key={`x-label-${value}`}
          textAnchor="middle"
          x={xFor(value)}
          y={plot.top + plot.height + 19}
        >
          {formatNumber(value)}
        </text>
      ))}
      {yLabels.map((value) => (
        <text
          dominantBaseline="middle"
          fill="#334155"
          fontSize="14"
          fontWeight="900"
          key={`y-label-${value}`}
          textAnchor="end"
          x={plot.left - 12}
          y={yFor(value)}
        >
          {formatNumber(value)}
        </text>
      ))}
      <text fill="#0f172a" fontSize="15" fontWeight="900" x={plot.left + plot.width + 7} y={plot.top + plot.height + 4}>x</text>
      <text fill="#0f172a" fontSize="15" fontWeight="900" x={plot.left - 3} y={plot.top + 1}>y</text>
    </g>
  )
}

function DimensionTag({ color, label, rotate = false, x, y }) {
  const tagWidth = Math.max(64, label.length * 8 + 18)
  return (
    <g transform={`translate(${x} ${y})${rotate ? ' rotate(-90)' : ''}`}>
      <rect
        fill="#ffffff"
        fillOpacity="0.94"
        height="24"
        rx="6"
        stroke={color}
        strokeOpacity="0.32"
        width={tagWidth}
        x={-tagWidth / 2}
        y="-12"
      />
      <text dominantBaseline="middle" fill={color} fontSize="15" fontWeight="900" textAnchor="middle" y="0.5">
        {label}
      </text>
    </g>
  )
}

function DimensionGuides({ definition, dimensions, geometry, markerId }) {
  const { height, width } = dimensions
  const { heightPx, widthPx, x, y } = geometry
  const bottomGuideY = Math.min(plot.top + plot.height - 22, y + heightPx + 8)
  const rightGuideX = Math.min(plot.left + plot.width - 14, x + widthPx + 15)
  const horizontalLabel = `${formatNumber(width)} units`
  const verticalLabel = `${formatNumber(height)} units`
  const lineProps = {
    markerEnd: `url(#${markerId})`,
    markerStart: `url(#${markerId})`,
    stroke: definition.color,
    strokeWidth: 1.5,
  }

  return (
    <g className="scale-compare-dimensions">
      <line x1={x + 3} x2={x + widthPx - 3} y1={bottomGuideY} y2={bottomGuideY} {...lineProps} />
      <line stroke={definition.color} strokeOpacity="0.45" strokeWidth="1" x1={x} x2={x} y1={y + heightPx} y2={bottomGuideY + 3} />
      <line stroke={definition.color} strokeOpacity="0.45" strokeWidth="1" x1={x + widthPx} x2={x + widthPx} y1={y + heightPx} y2={bottomGuideY + 3} />
      <DimensionTag color={definition.color} label={horizontalLabel} x={x + widthPx / 2} y={bottomGuideY + 10} />
      {definition.dimensionMode !== 'diameter' ? (
        <>
          <line x1={rightGuideX} x2={rightGuideX} y1={y + 3} y2={y + heightPx - 3} {...lineProps} />
          <line stroke={definition.color} strokeOpacity="0.45" strokeWidth="1" x1={x + widthPx} x2={rightGuideX + 3} y1={y} y2={y} />
          <line stroke={definition.color} strokeOpacity="0.45" strokeWidth="1" x1={x + widthPx} x2={rightGuideX + 3} y1={y + heightPx} y2={y + heightPx} />
          <DimensionTag color={definition.color} label={verticalLabel} rotate x={rightGuideX + 12} y={y + heightPx / 2} />
        </>
      ) : null}
    </g>
  )
}

function CanvasObject({ definition, dimensions, markerId, objectRef, result }) {
  const geometry = shapeGeometry(definition, dimensions)
  const { heightPx, widthPx, x, y } = geometry
  const showLabel = widthPx >= 38 && heightPx >= 22
  const accessibleDimensions = definition.dimensionMode === 'diameter'
    ? `diameter ${formatNumber(dimensions.width)} units`
    : definition.dimensionMode === 'base-height'
      ? `base ${formatNumber(dimensions.width)} and height ${formatNumber(dimensions.height)} units`
      : `${formatNumber(dimensions.width)} by ${formatNumber(dimensions.height)} units`

  const anchoredDescription = definition.shape === 'circle'
    ? ''
    : `, from (1,1) to (${formatNumber(fixedAnchor.x + dimensions.width)},${formatNumber(fixedAnchor.y + dimensions.height)})`

  return (
    <g aria-label={`${result ? 'Scaled' : 'Original'} ${definition.label}, ${accessibleDimensions}${anchoredDescription}`} role="img">
      <g
        className={result ? 'scale-compare-result' : 'scale-compare-original'}
        ref={objectRef}
        style={{ transformOrigin: `${x + widthPx / 2}px ${y + heightPx / 2}px` }}
      >
        <ShapeForm definition={definition} height={heightPx} width={widthPx} x={x} y={y} />
        {showLabel ? (
          <text
            dominantBaseline="middle"
            fill={definition.color}
            fontSize={Math.min(18, Math.max(12, heightPx * 0.25))}
            fontWeight="900"
            textAnchor="middle"
            x={x + widthPx / 2}
            y={y + heightPx / 2}
          >
            {definition.shortLabel}
          </text>
        ) : null}
      </g>
      {definition.shape !== 'circle' ? (
        <g aria-hidden="true" className="scale-compare-dimensions">
          <circle
            cx={x}
            cy={y + heightPx}
            fill="#f59e0b"
            r="4.5"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            fill="#92400e"
            fontSize="13"
            fontWeight="900"
            textAnchor="end"
            x={x - 7}
            y={y + heightPx + 4}
          >
            (1,1)
          </text>
        </g>
      ) : null}
      <DimensionGuides
        definition={definition}
        dimensions={dimensions}
        geometry={geometry}
        markerId={markerId}
      />
    </g>
  )
}

function ComparisonCanvas({ canvasRef, definition, factor, originalObjectRef, result }) {
  const isOriginal = !result
  const dimensions = definition
    ? isOriginal
      ? { width: definition.width, height: definition.height }
      : scaledDimensions(definition, factor)
    : null
  const markerId = isOriginal ? 'dimension-arrow-original' : 'dimension-arrow-scaled'

  return (
    <section className="flex min-w-0 flex-col rounded border border-sky-200 bg-white p-1 shadow-sm">
      <div className="mb-0.5 flex items-center justify-between gap-2 px-1">
        <div>
          <div className={`text-[11px] font-black uppercase ${isOriginal ? 'text-teal-700' : 'text-sky-700'}`}>
            {isOriginal ? 'Original drawing' : 'Scaled drawing'}
          </div>
          <div className="text-[10px] font-bold text-slate-500">
            {isOriginal ? `Scale factor: 1${multiplySymbol}` : factor ? `Scale factor: ${factor.label}` : 'Choose a scale factor'}
          </div>
        </div>
        <div className={`rounded px-2 py-1 text-base font-black ${isOriginal ? 'bg-teal-50 text-teal-700' : 'bg-sky-50 text-sky-700'}`}>
          {isOriginal ? '1:1' : factor?.label ?? '?'}
        </div>
      </div>

      <svg
        aria-label={`${isOriginal ? 'Original' : 'Scaled'} coordinate plane, 12.5 units by 7.5 units`}
        className="mx-auto aspect-[5/3] w-full overflow-visible rounded border border-sky-300 bg-white"
        ref={canvasRef}
        role="img"
        viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
      >
        <defs>
          <marker id={markerId} markerHeight="5" markerWidth="5" orient="auto-start-reverse" refX="2.5" refY="2.5">
            <path d="M 5 0 L 0 2.5 L 5 5 Z" fill={definition?.color ?? '#0284c7'} />
          </marker>
        </defs>
        <CoordinatePlane />
        {!definition ? (
          <text fill="#94a3b8" fontSize="14" fontWeight="800" textAnchor="middle" x="250" y="153">
            {isOriginal ? 'Choose a town object.' : 'The scaled copy will land here.'}
          </text>
        ) : null}
        {dimensions ? (
          <CanvasObject
            definition={definition}
            dimensions={dimensions}
            markerId={markerId}
            objectRef={isOriginal ? originalObjectRef : undefined}
            result={!isOriginal}
          />
        ) : null}
      </svg>
    </section>
  )
}

function TransferGhost({ animation }) {
  if (!animation) return null

  return (
    <svg
      aria-hidden="true"
      className="scale-compare-flight pointer-events-none absolute z-50 overflow-visible drop-shadow-xl"
      style={{
        '--center-x': `${animation.centerX}px`,
        '--center-y': `${animation.centerY}px`,
        '--factor': animation.factor,
        '--landing-factor': animation.factor * 1.04,
        '--target-x': `${animation.targetX}px`,
        '--target-y': `${animation.targetY}px`,
        height: `${animation.height}px`,
        left: `${animation.left}px`,
        top: `${animation.top}px`,
        width: `${animation.width}px`,
      }}
      viewBox="0 0 100 100"
    >
      <ShapeForm definition={animation.definition} height={96} strokeWidth={4} width={96} x={2} y={2} />
    </svg>
  )
}

function EquationPanel({ definition, factor, resultFactor, animating }) {
  if (!definition) {
    return (
      <section className="flex h-[76px] items-center justify-center rounded border border-sky-200 bg-sky-50 text-center text-sm font-black text-slate-500 shadow-sm">
        Choose one town shape to begin comparing scale drawings.
      </section>
    )
  }

  const displayedFactor = resultFactor ?? factor
  if (!displayedFactor) {
    return (
      <section className="flex h-[76px] items-center justify-center rounded border border-sky-200 bg-sky-50 text-center text-sm font-black text-slate-600 shadow-sm">
        <span className="mr-2 text-teal-700">Original {definition.label}: {dimensionSummary(definition)}.</span>
        Choose a scale factor.
      </section>
    )
  }

  const items = dimensionItems(definition)

  return (
    <section className="grid h-[76px] grid-cols-[1.15fr_0.85fr] gap-2 rounded border border-sky-200 bg-sky-50 p-2 shadow-sm">
      <div className={`grid items-center gap-2 rounded bg-white px-2 shadow-sm ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {items.map((item) => {
          const scaledValue = item.value * displayedFactor.value
          return (
            <div className="text-center" key={item.key}>
              <div className="text-[9px] font-black uppercase text-slate-500">{item.label}</div>
              <div className="whitespace-nowrap text-[15px] font-black">
                <span className="text-teal-700">{formatNumber(item.value)}</span>
                <span className="mx-1 text-amber-700">{multiplySymbol} {displayedFactor.mathLabel}</span>
                <span className="mr-1 text-slate-400">=</span>
                <span className="text-sky-700">{animating ? '\u2026' : formatNumber(scaledValue)}</span>
                <span className="ml-1 text-[9px] text-slate-500">units</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-center rounded bg-white px-3 text-center text-[11px] font-black leading-4 text-slate-700 shadow-sm">
        {animating ? 'Watch every corresponding length change by the same factor.' : displayedFactor.observation}
      </div>
    </section>
  )
}

export default function ScaleDrawingsMaps() {
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [pendingFactorId, setPendingFactorId] = useState(null)
  const [resultFactorId, setResultFactorId] = useState(null)
  const [animation, setAnimation] = useState(null)
  const rootRef = useRef(null)
  const originalCanvasRef = useRef(null)
  const originalObjectRef = useRef(null)
  const resultCanvasRef = useRef(null)
  const animationTimerRef = useRef(null)

  const definition = objectDefinitions.find((item) => item.id === selectedObjectId) ?? null
  const pendingFactor = scaleFactors.find((factor) => factor.id === pendingFactorId) ?? null
  const resultFactor = scaleFactors.find((factor) => factor.id === resultFactorId) ?? null
  const animating = animation !== null

  useEffect(
    () => () => {
      if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current)
    },
    []
  )

  const chooseObject = (objectId) => {
    if (animating) return
    setSelectedObjectId(objectId)
    setPendingFactorId(null)
    setResultFactorId(null)
  }

  const completeScale = (factorId) => {
    setResultFactorId(factorId)
    setPendingFactorId(null)
    setAnimation(null)
    animationTimerRef.current = null
  }

  const animateScale = (factor) => {
    if (!definition || animating) return

    setPendingFactorId(factor.id)
    setResultFactorId(null)

    if (prefersReducedMotion()) {
      completeScale(factor.id)
      return
    }

    const root = rootRef.current
    const source = originalObjectRef.current
    const targetCanvas = resultCanvasRef.current
    if (!root || !source || !targetCanvas) {
      completeScale(factor.id)
      return
    }

    const rootRect = root.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const targetRect = targetCanvas.getBoundingClientRect()
    const targetGeometry = shapeGeometry(definition, scaledDimensions(definition, factor))
    const targetSvgScaleX = targetRect.width / svgSize.width
    const targetSvgScaleY = targetRect.height / svgSize.height
    const targetObjectCenterInViewportX = targetRect.left + (targetGeometry.x + targetGeometry.widthPx / 2) * targetSvgScaleX
    const targetObjectCenterInViewportY = targetRect.top + (targetGeometry.y + targetGeometry.heightPx / 2) * targetSvgScaleY
    const scaleX = rootRect.width / root.offsetWidth
    const scaleY = rootRect.height / root.offsetHeight
    const sourceCenterX = (sourceRect.left + sourceRect.width / 2 - rootRect.left) / scaleX
    const sourceCenterY = (sourceRect.top + sourceRect.height / 2 - rootRect.top) / scaleY
    const targetCenterX = (targetObjectCenterInViewportX - rootRect.left) / scaleX
    const targetCenterY = (targetObjectCenterInViewportY - rootRect.top) / scaleY

    setAnimation({
      centerX: root.offsetWidth / 2 - sourceCenterX,
      centerY: (sourceCenterY + targetCenterY) / 2 - sourceCenterY,
      definition,
      factor: factor.value,
      height: sourceRect.height / scaleY,
      left: (sourceRect.left - rootRect.left) / scaleX,
      targetX: targetCenterX - sourceCenterX,
      targetY: targetCenterY - sourceCenterY,
      top: (sourceRect.top - rootRect.top) / scaleY,
      width: sourceRect.width / scaleX,
    })

    animationTimerRef.current = window.setTimeout(() => completeScale(factor.id), animationDurationMs)
  }

  const reset = () => {
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current)
    animationTimerRef.current = null
    setSelectedObjectId(null)
    setPendingFactorId(null)
    setResultFactorId(null)
    setAnimation(null)
  }

  return (
    <div
      className="relative box-border flex h-[500px] flex-col overflow-hidden bg-slate-50 px-2 py-2 text-slate-800"
      ref={rootRef}
    >
      <header className="flex h-10 shrink-0 items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">Scale Drawings</h2>
          <p className="text-[11px] font-semibold text-slate-500">Compare one original shape with its scaled copy.</p>
        </div>
        <button
          className="h-8 rounded bg-slate-950 px-4 text-[11px] font-black text-white shadow-sm disabled:opacity-40"
          disabled={animating}
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </header>

      <div className="grid h-[58px] shrink-0 grid-cols-[1fr_220px] gap-2">
        <section className="rounded border border-slate-200 bg-white p-1.5 shadow-sm">
          <div className="mb-1 text-[9px] font-black uppercase text-slate-500">Choose one object</div>
          <div className="grid grid-cols-6 gap-1">
            {objectDefinitions.map((item) => (
              <PaletteButton
                active={item.id === selectedObjectId}
                definition={item}
                disabled={animating}
                key={item.id}
                onClick={() => chooseObject(item.id)}
              />
            ))}
          </div>
        </section>

        <section className="rounded border border-amber-200 bg-amber-50 p-1.5 shadow-sm">
          <div className="mb-1 text-[9px] font-black uppercase text-amber-700">Choose scale factor</div>
          <div className="grid grid-cols-3 gap-1">
            {scaleFactors.map((factor) => (
              <ScaleButton
                active={factor.id === (pendingFactorId ?? resultFactorId)}
                disabled={!definition || animating}
                factor={factor}
                key={factor.id}
                onClick={() => animateScale(factor)}
              />
            ))}
          </div>
        </section>
      </div>

      <main className="my-1.5 grid min-h-0 flex-1 grid-cols-[1fr_28px_1fr] gap-1">
        <ComparisonCanvas
          canvasRef={originalCanvasRef}
          definition={definition}
          originalObjectRef={originalObjectRef}
          result={false}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-black ${
            animating ? 'scale-compare-center-pulse border-amber-400 bg-amber-100 text-amber-800' : 'border-slate-200 bg-white text-slate-400'
          }`}>
            {pendingFactor?.label ?? resultFactor?.label ?? '\u2192'}
          </div>
          <div className="mt-1.5 text-[8px] font-black uppercase text-slate-400">Scale</div>
        </div>

        <ComparisonCanvas
          canvasRef={resultCanvasRef}
          definition={definition && resultFactor ? definition : null}
          factor={resultFactor}
          result
        />
      </main>

      <EquationPanel
        animating={animating}
        definition={definition}
        factor={pendingFactor}
        resultFactor={resultFactor}
      />

      <TransferGhost animation={animation} />
    </div>
  )
}
