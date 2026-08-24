import { useEffect, useMemo, useState } from 'react'

const examples = [
  {
    id: 'triple',
    title: 'Mystery A',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 3 },
      { x: 2, y: 6 },
      { x: 3, y: 9 },
    ],
  },
  {
    id: 'double',
    title: 'Mystery B',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ],
  },
  {
    id: 'offset-double',
    title: 'Mystery C',
    points: [
      { x: 0, y: 3 },
      { x: 1, y: 5 },
      { x: 2, y: 7 },
      { x: 3, y: 9 },
    ],
  },
  {
    id: 'offset-one',
    title: 'Mystery D',
    points: [
      { x: 0, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 6 },
      { x: 3, y: 7 },
    ],
  },
  {
    id: 'square',
    title: 'Mystery E',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
    ],
  },
  {
    id: 'square-plus-one',
    title: 'Mystery F',
    points: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
      { x: 3, y: 10 },
    ],
  },
]

const graphViewBox = { width: 560, height: 320 }
const graph = { x: 43, y: 15, width: 498, height: 270, xMax: 6, yMax: 18 }
const EPSILON = 1e-9
const ANALYSIS_DURATION = 1050

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const closeEnough = (a, b) => Math.abs(a - b) < EPSILON
const formatNumber = (value) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

const makeRows = (example) =>
  example.points.map((point, order) => ({ ...point, id: `${example.id}-${order}`, order }))

const sortedPoints = (points) =>
  [...points].sort((a, b) => a.x - b.x || a.order - b.order)

const duplicateXValues = (points) => {
  const counts = new Map()
  points.forEach((point) => counts.set(point.x, (counts.get(point.x) || 0) + 1))
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([x]) => x)
    .sort((a, b) => a - b)
}

const isConstantRatio = (points) => {
  const ratios = []

  for (const point of points) {
    if (point.x === 0) {
      if (point.y !== 0) return false
      continue
    }
    ratios.push(point.y / point.x)
  }

  return ratios.length > 0 && ratios.every((ratio) => closeEnough(ratio, ratios[0]))
}

const isCollinear = (points) => {
  if (points.length < 3) return true
  const ordered = sortedPoints(points)
  const first = ordered[0]
  const second = ordered.find((point) => point.x !== first.x || point.y !== first.y)
  if (!second) return true

  return ordered.every(
    (point) =>
      (second.x - first.x) * (point.y - first.y) ===
      (second.y - first.y) * (point.x - first.x)
  )
}

const passesThroughOrigin = (points) => {
  const yAxisPoints = points.filter((point) => point.x === 0)
  if (yAxisPoints.length > 0) return yAxisPoints.every((point) => point.y === 0)
  if (!isCollinear(points)) return false

  const ordered = sortedPoints(points)
  const first = ordered[0]
  const second = ordered.find((point) => point.x !== first.x)
  if (!second) return false
  const slope = (second.y - first.y) / (second.x - first.x)
  return closeEnough(first.y - slope * first.x, 0)
}

const relationshipEvidence = (points) => {
  const repeatedX = duplicateXValues(points)
  const isFunction = repeatedX.length === 0
  const ratiosMatch = isConstantRatio(points)
  const straight = isCollinear(points)
  const origin = passesThroughOrigin(points)

  return {
    classification:
      isFunction && ratiosMatch && straight && origin ? 'proportional' : 'nonproportional',
    duplicateXValues: repeatedX,
    isFunction,
    origin,
    ratiosMatch,
    straight,
  }
}

const constantOfProportionality = (points, evidence) => {
  if (evidence.classification !== 'proportional') return null
  const point = points.find((candidate) => candidate.x !== 0)
  return point ? point.y / point.x : null
}

const coordsToSvg = (point) => ({
  x: graph.x + (point.x / graph.xMax) * graph.width,
  y: graph.y + graph.height - (point.y / graph.yMax) * graph.height,
})

const svgToCoords = (clientX, clientY, bounds) => {
  const viewX = ((clientX - bounds.left) / bounds.width) * graphViewBox.width
  const viewY = ((clientY - bounds.top) / bounds.height) * graphViewBox.height

  return {
    x: clamp(Math.round(((viewX - graph.x) / graph.width) * graph.xMax), 0, graph.xMax),
    y: clamp(
      Math.round(((graph.y + graph.height - viewY) / graph.height) * graph.yMax),
      0,
      graph.yMax
    ),
  }
}

const pointPath = (points) =>
  sortedPoints(points)
    .map((point, index) => {
      const svgPoint = coordsToSvg(point)
      return `${index === 0 ? 'M' : 'L'} ${svgPoint.x} ${svgPoint.y}`
    })
    .join(' ')

const lineBoundaryPoints = (points) => {
  const ordered = sortedPoints(points)
  const first = ordered[0]
  const second = ordered.find((point) => point.x !== first.x)
  if (!second) return []

  const slope = (second.y - first.y) / (second.x - first.x)
  const intercept = first.y - slope * first.x
  const candidates = []
  const addCandidate = (x, y) => {
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= -EPSILON &&
      x <= graph.xMax + EPSILON &&
      y >= -EPSILON &&
      y <= graph.yMax + EPSILON &&
      !candidates.some((point) => closeEnough(point.x, x) && closeEnough(point.y, y))
    ) {
      candidates.push({ x: clamp(x, 0, graph.xMax), y: clamp(y, 0, graph.yMax) })
    }
  }

  addCandidate(0, intercept)
  addCandidate(graph.xMax, slope * graph.xMax + intercept)
  if (!closeEnough(slope, 0)) {
    addCandidate(-intercept / slope, 0)
    addCandidate((graph.yMax - intercept) / slope, graph.yMax)
  }

  if (candidates.length < 2) return []
  let pair = [candidates[0], candidates[1]]
  let longestDistance = -1
  candidates.forEach((start, startIndex) => {
    candidates.slice(startIndex + 1).forEach((end) => {
      const distance = (end.x - start.x) ** 2 + (end.y - start.y) ** 2
      if (distance > longestDistance) {
        longestDistance = distance
        pair = [start, end]
      }
    })
  })
  return pair
}

const makeRelationshipPath = (points, evidence) => {
  if (!evidence.isFunction || !evidence.straight) return pointPath(points)
  const boundaries = lineBoundaryPoints(points)
  if (boundaries.length < 2) return pointPath(points)
  const start = coordsToSvg(boundaries[0])
  const end = coordsToSvg(boundaries[1])
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

const resultExplanation = (evidence, k) => {
  if (!evidence.isFunction) {
    const values = evidence.duplicateXValues.join(', ')
    return `x = ${values} has more than one plotted point, so this is not a proportional function.`
  }
  if (evidence.classification === 'proportional') {
    return `The ratios match, the graph is straight through (0,0), and k = ${formatNumber(k)}.`
  }
  if (evidence.straight && !evidence.origin) {
    return 'The points form a straight line, but the line misses (0,0).'
  }
  if (evidence.origin && !evidence.straight) {
    return 'The path reaches (0,0), but the points do not form one straight line.'
  }
  if (!evidence.ratiosMatch) {
    return 'The y / x ratios change, so the relationship is not proportional.'
  }
  return 'A proportional relationship must be a straight line through (0,0).'
}

function EvidenceChip({ label, pass, value }) {
  return (
    <div
      className={`min-w-[60px] rounded border px-1.5 py-1 text-center shadow-sm ${
        pass ? 'border-emerald-200 bg-emerald-50' : 'border-purple-200 bg-purple-50'
      }`}
    >
      <div className="text-[9px] font-black uppercase text-slate-500">{label}</div>
      <div className={`text-[11px] font-black ${pass ? 'text-emerald-700' : 'text-purple-700'}`}>
        {value}
      </div>
    </div>
  )
}

function RelationshipTable({ disabled, onPointChange, points }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[28px_1fr_1fr] bg-slate-100 text-center text-[10px] font-black uppercase text-slate-600">
        <div className="py-1">#</div>
        <div className="border-l border-slate-200 py-1">x</div>
        <div className="border-l border-slate-200 py-1">y</div>
      </div>
      {points.map((point, index) => (
        <div className="grid grid-cols-[28px_1fr_1fr] items-center border-t border-slate-200" key={point.id}>
          <div className="text-center text-[11px] font-black text-slate-400">{index + 1}</div>
          <label className="border-l border-slate-200 p-1">
            <span className="sr-only">Point {index + 1} x-coordinate</span>
            <input
              aria-label={`Point ${index + 1} x-coordinate`}
              className="h-8 w-full rounded border border-emerald-200 bg-emerald-50 text-center text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
              disabled={disabled}
              max="6"
              min="0"
              onChange={(event) => onPointChange(point.id, 'x', Number(event.target.value))}
              type="number"
              value={point.x}
            />
          </label>
          <label className="border-l border-slate-200 p-1">
            <span className="sr-only">Point {index + 1} y-coordinate</span>
            <input
              aria-label={`Point ${index + 1} y-coordinate`}
              className="h-8 w-full rounded border border-purple-200 bg-purple-50 text-center text-sm font-black text-purple-700 outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
              disabled={disabled}
              max="18"
              min="0"
              onChange={(event) => onPointChange(point.id, 'y', Number(event.target.value))}
              type="number"
              value={point.y}
            />
          </label>
        </div>
      ))}
      <div className="min-h-7 px-2 py-1 text-[10px] font-bold text-slate-500">
        {disabled ? 'Watch the relationship draw.' : 'Drag points freely. Shared x-values are allowed.'}
      </div>
    </div>
  )
}

function GraphPanel({ analysisState, changedPointId, evidence, onPointChange, points }) {
  const [draggingPointId, setDraggingPointId] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const interactive = analysisState !== 'animating'
  const showRelationship = analysisState !== 'idle'
  const showOrigin = analysisState === 'revealed'
  const path = makeRelationshipPath(points, evidence)
  const originPoint = coordsToSvg({ x: 0, y: 0 })
  const duplicateSet = new Set(evidence.duplicateXValues)

  const handlePointerMove = (event) => {
    if (!interactive || !draggingPointId) return
    const next = svgToCoords(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
    onPointChange(draggingPointId, null, null, next)
    setDragPreview(next)
  }

  const finishPointer = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingPointId(null)
    setDragPreview(null)
  }

  const movePointWithKeyboard = (event, point) => {
    if (!interactive) return
    const changes = {
      ArrowDown: { x: point.x, y: point.y - 1 },
      ArrowLeft: { x: point.x - 1, y: point.y },
      ArrowRight: { x: point.x + 1, y: point.y },
      ArrowUp: { x: point.x, y: point.y + 1 },
    }
    const next = changes[event.key]
    if (!next) return
    event.preventDefault()
    onPointChange(point.id, null, null, {
      x: clamp(next.x, 0, graph.xMax),
      y: clamp(next.y, 0, graph.yMax),
    })
  }

  const activeGuide = draggingPointId && dragPreview ? coordsToSvg(dragPreview) : null

  return (
    <div className="min-h-0 flex-1 rounded border border-slate-200 bg-white p-1.5 shadow-sm">
      <svg
        aria-label="Editable coordinate graph from x zero to six and y zero to eighteen"
        className="h-full min-h-[276px] w-full touch-none"
        onPointerCancel={finishPointer}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        role="img"
        viewBox={`0 0 ${graphViewBox.width} ${graphViewBox.height}`}
      >
        <rect fill="#f8fafc" height={graph.height} rx="7" width={graph.width} x={graph.x} y={graph.y} />
        {Array.from({ length: graph.xMax + 1 }, (_, x) => {
          const svgX = coordsToSvg({ x, y: 0 }).x
          return (
            <g className="proportion-grid-line" key={`x-${x}`}>
              <line stroke={x === 0 ? '#0f172a' : '#dbeafe'} strokeWidth={x === 0 ? 3 : 1.2} x1={svgX} x2={svgX} y1={graph.y} y2={graph.y + graph.height} />
              <text fill="#475569" fontSize="11" fontWeight="900" textAnchor="middle" x={svgX} y={graph.y + graph.height + 18}>{x}</text>
            </g>
          )
        })}
        {Array.from({ length: 7 }, (_, index) => index * 3).map((y) => {
          const svgY = coordsToSvg({ x: 0, y }).y
          return (
            <g className="proportion-grid-line" key={`y-${y}`}>
              <line stroke={y === 0 ? '#0f172a' : '#dbeafe'} strokeWidth={y === 0 ? 3 : 1.2} x1={graph.x} x2={graph.x + graph.width} y1={svgY} y2={svgY} />
              <text fill="#475569" fontSize="11" fontWeight="900" textAnchor="end" x={graph.x - 9} y={svgY + 4}>{y}</text>
            </g>
          )
        })}
        <text fill="#0f172a" fontSize="12" fontWeight="900" x={graph.x + graph.width - 4} y={graphViewBox.height - 3}>x</text>
        <text fill="#0f172a" fontSize="12" fontWeight="900" x="19" y={graph.y + 5}>y</text>

        {activeGuide ? (
          <g className="proportion-lab-axis-guide" pointerEvents="none">
            <rect fill="#0ea5e9" fillOpacity="0.08" height={graph.height} width="18" x={clamp(activeGuide.x - 9, graph.x, graph.x + graph.width - 18)} y={graph.y} />
            <rect fill="#0ea5e9" fillOpacity="0.08" height="18" width={graph.width} x={graph.x} y={clamp(activeGuide.y - 9, graph.y, graph.y + graph.height - 18)} />
            <line stroke="#0ea5e9" strokeDasharray="5 4" strokeWidth="2" x1={activeGuide.x} x2={activeGuide.x} y1={graph.y} y2={graph.y + graph.height} />
            <line stroke="#0ea5e9" strokeDasharray="5 4" strokeWidth="2" x1={graph.x} x2={graph.x + graph.width} y1={activeGuide.y} y2={activeGuide.y} />
            <circle cx={activeGuide.x} cy={activeGuide.y} fill="white" r="6" stroke="#0ea5e9" strokeWidth="3" />
            <rect fill="#f0f9ff" height="20" rx="7" stroke="#0ea5e9" width="66" x={clamp(activeGuide.x - 33, graph.x, graph.x + graph.width - 66)} y={clamp(activeGuide.y + 12, graph.y + 3, graph.y + graph.height - 23)} />
            <text fill="#0369a1" fontSize="10" fontWeight="900" textAnchor="middle" x={clamp(activeGuide.x, graph.x + 33, graph.x + graph.width - 33)} y={clamp(activeGuide.y + 26, graph.y + 17, graph.y + graph.height - 9)}>({dragPreview.x}, {dragPreview.y})</text>
          </g>
        ) : null}

        {showRelationship ? (
          <path
            className="proportion-graph-path"
            d={path}
            fill="none"
            pathLength="1"
            stroke={evidence.classification === 'proportional' ? '#10b981' : '#a855f7'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        ) : null}

        {showOrigin ? (
          <g className="proportion-origin-check-point">
            <circle className="proportion-origin-pulse" cx={originPoint.x} cy={originPoint.y} fill={evidence.origin ? '#10b981' : '#f59e0b'} fillOpacity="0.3" r="15" />
            <circle cx={originPoint.x} cy={originPoint.y} fill={evidence.origin ? '#10b981' : '#f59e0b'} r="6" stroke="white" strokeWidth="2" />
            <text fill={evidence.origin ? '#047857' : '#92400e'} fontSize="10" fontWeight="900" x={originPoint.x + 11} y={originPoint.y - 10}>(0,0)</text>
          </g>
        ) : null}

        {points.map((point, index) => {
          const position = coordsToSvg(point)
          const highlightDuplicate = analysisState === 'revealed' && duplicateSet.has(point.x)
          return (
            <g
              aria-disabled={!interactive}
              aria-label={`Point ${index + 1} at ${point.x}, ${point.y}. Use arrow keys to move it.`}
              className={`${interactive ? 'cursor-move' : 'cursor-wait'} ${changedPointId === point.id ? 'proportion-lab-point-move' : ''} ${highlightDuplicate ? 'proportion-ratio-mismatch' : ''}`}
              key={point.id}
              onKeyDown={(event) => movePointWithKeyboard(event, point)}
              onPointerDown={(event) => {
                if (!interactive) return
                event.stopPropagation()
                event.currentTarget.ownerSVGElement.setPointerCapture(event.pointerId)
                setDraggingPointId(point.id)
                setDragPreview({ x: point.x, y: point.y })
              }}
              role="button"
              tabIndex="0"
            >
              <circle cx={position.x} cy={position.y} fill="#8b5cf6" fillOpacity="0.14" r="17" />
              <circle cx={position.x} cy={position.y} fill="#8b5cf6" r="8" stroke="white" strokeWidth="2" />
              <text fill="white" fontSize="9" fontWeight="900" textAnchor="middle" x={position.x} y={position.y + 3}>{index + 1}</text>
              <rect fill="white" height="18" rx="6" stroke="#8b5cf6" strokeOpacity="0.45" width="48" x={clamp(position.x - 24, graph.x, graph.x + graph.width - 48)} y={Math.max(2, position.y - 31)} />
              <text fill="#7e22ce" fontSize="9" fontWeight="900" textAnchor="middle" x={clamp(position.x, graph.x + 24, graph.x + graph.width - 24)} y={Math.max(14, position.y - 19)}>({point.x},{point.y})</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ExplorationTray({ analysisState, evidence, onAnimate, points }) {
  const k = constantOfProportionality(points, evidence)
  const revealed = analysisState === 'revealed'
  const animating = analysisState === 'animating'
  const shapeValue = !evidence.isFunction ? 'not a function' : evidence.straight ? 'straight' : 'bends'

  return (
    <div className="flex h-full items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        {revealed ? (
          <div className="proportion-explore-result">
            <div className={`text-sm font-black ${evidence.classification === 'proportional' ? 'text-emerald-700' : 'text-purple-700'}`}>
              {evidence.classification === 'proportional'
                ? `Proportional relationship: y = ${formatNumber(k)}x`
                : 'Non-proportional relationship'}
            </div>
            <div className="text-[9px] font-bold leading-3 text-slate-600">
              {resultExplanation(evidence, k)}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xs font-black text-slate-900">{animating ? 'Drawing the relationship...' : 'Ready to explore'}</div>
            <div className="text-[10px] font-bold text-slate-500">{animating ? 'Watch how the path travels through every point.' : 'Move any point, then animate the current relationship.'}</div>
          </div>
        )}
      </div>

      {revealed ? (
        <div className="flex gap-1.5">
          <EvidenceChip label="Ratios" pass={evidence.ratiosMatch} value={evidence.ratiosMatch ? 'match' : 'change'} />
          <EvidenceChip label="Shape" pass={evidence.isFunction && evidence.straight} value={shapeValue} />
          <EvidenceChip label="Origin" pass={evidence.origin} value={evidence.origin ? 'passes' : 'misses'} />
        </div>
      ) : null}

      <button
        className={`h-9 shrink-0 rounded px-3 text-[11px] font-black shadow-sm ${
          animating
            ? 'bg-slate-200 text-slate-500'
            : 'fraction-step-ready-aura bg-sky-500 text-white'
        }`}
        disabled={animating}
        onClick={onAnimate}
        type="button"
      >
        {animating ? 'Drawing...' : revealed ? 'Replay' : 'Animate relationship'}
      </button>
    </div>
  )
}

export default function ProportionalVsNonProportionalGraphs() {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [points, setPoints] = useState(() => makeRows(examples[0]))
  const [analysisState, setAnalysisState] = useState('idle')
  const [changedPointId, setChangedPointId] = useState(null)
  const evidence = useMemo(() => relationshipEvidence(points), [points])
  const controlsDisabled = analysisState === 'animating'

  useEffect(() => {
    if (analysisState !== 'animating') return undefined
    const timer = window.setTimeout(() => setAnalysisState('revealed'), ANALYSIS_DURATION)
    return () => window.clearTimeout(timer)
  }, [analysisState])

  const updatePoint = (id, axis, value, replacement) => {
    if (controlsDisabled) return false
    const current = points.find((point) => point.id === id)
    if (!current) return false

    const boundedValue =
      axis === 'x'
        ? clamp(value, 0, graph.xMax)
        : axis === 'y'
          ? clamp(value, 0, graph.yMax)
          : value
    const nextPoint = replacement
      ? { ...current, x: clamp(replacement.x, 0, graph.xMax), y: clamp(replacement.y, 0, graph.yMax) }
      : { ...current, [axis]: boundedValue }

    if (!Number.isInteger(nextPoint.x) || !Number.isInteger(nextPoint.y)) return false
    if (nextPoint.x === current.x && nextPoint.y === current.y) return true

    setChangedPointId(id)
    setPoints((currentPoints) => currentPoints.map((point) => (point.id === id ? nextPoint : point)))
    setAnalysisState('idle')
    return true
  }

  const loadExample = (nextIndex) => {
    if (controlsDisabled) return
    const normalized = (nextIndex + examples.length) % examples.length
    setExampleIndex(normalized)
    setPoints(makeRows(examples[normalized]))
    setAnalysisState('idle')
    setChangedPointId(null)
  }

  const animateRelationship = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setAnalysisState(reducedMotion ? 'revealed' : 'animating')
  }

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-900">
      <header className="mb-1.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Proportional vs Non-Proportional Graphs</h2>
          <p className="text-[11px] font-semibold text-slate-500">Move the points freely, then animate and inspect the relationship.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 rounded border border-slate-300 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm disabled:opacity-50" disabled={controlsDisabled} onClick={() => loadExample(exampleIndex + 1)} type="button">New relationship</button>
          <button className="h-8 rounded bg-slate-950 px-3 text-[11px] font-black text-white shadow-sm disabled:opacity-50" disabled={controlsDisabled} onClick={() => loadExample(exampleIndex)} type="button">Reset</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[218px_1fr] gap-2.5">
        <aside className="min-h-0 space-y-1.5">
          <div className="rounded border border-sky-200 bg-sky-50 p-2 shadow-sm">
            <div className="text-[9px] font-black uppercase text-sky-700">relationship explorer</div>
            <div className="flex items-end justify-between">
              <div className="text-xl font-black">{examples[exampleIndex].title}</div>
              <div className="rounded bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-500">editable</div>
            </div>
          </div>

          <RelationshipTable disabled={controlsDisabled} onPointChange={updatePoint} points={points} />

          <div className="rounded border border-sky-200 bg-sky-50 p-2 shadow-sm">
            <div className="mb-1 text-[9px] font-black uppercase text-sky-700">Explore</div>
            <div className="text-[10px] font-black leading-4 text-slate-700">
              Move points in any direction. Try straight lines, curves, and shared x-values.
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col gap-1.5">
          <GraphPanel
            analysisState={analysisState}
            changedPointId={changedPointId}
            evidence={evidence}
            onPointChange={updatePoint}
            points={points}
          />

          <section aria-live="polite" className="h-[88px] shrink-0 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <ExplorationTray
              analysisState={analysisState}
              evidence={evidence}
              onAnimate={animateRelationship}
              points={points}
            />
          </section>
        </main>
      </div>
    </div>
  )
}
