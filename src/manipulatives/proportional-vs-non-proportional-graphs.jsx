import { useEffect, useMemo, useState } from 'react'

const examples = [
  {
    id: 'triple',
    title: 'Table A',
    rule: 'y = 3x',
    passesOrigin: true,
    type: 'proportional',
    points: [
      { x: 1, y: 3 },
      { x: 2, y: 6 },
      { x: 3, y: 9 },
      { x: 4, y: 12 },
    ],
  },
  {
    id: 'double',
    title: 'Table B',
    rule: 'y = 2x',
    passesOrigin: true,
    type: 'proportional',
    points: [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
    ],
  },
  {
    id: 'offset-double',
    title: 'Table C',
    rule: 'y = 2x + 3',
    passesOrigin: false,
    type: 'nonproportional-linear',
    points: [
      { x: 0, y: 3 },
      { x: 1, y: 5 },
      { x: 2, y: 7 },
      { x: 3, y: 9 },
    ],
  },
  {
    id: 'offset-one',
    title: 'Table D',
    rule: 'y = x + 4',
    passesOrigin: false,
    type: 'nonproportional-linear',
    points: [
      { x: 0, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 6 },
      { x: 3, y: 7 },
    ],
  },
  {
    id: 'square',
    title: 'Table E',
    rule: 'y = x^2',
    passesOrigin: true,
    type: 'nonproportional-curved',
    points: [
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
      { x: 4, y: 16 },
    ],
  },
  {
    id: 'square-plus-one',
    title: 'Table F',
    rule: 'y = x^2 + 1',
    passesOrigin: false,
    type: 'nonproportional-curved',
    points: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
      { x: 3, y: 10 },
    ],
  },
]

const colors = {
  proportional: {
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    soft: 'bg-emerald-50',
    fill: '#10b981',
  },
  nonproportional: {
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
  guide: {
    text: 'text-amber-700',
    border: 'border-amber-200',
    soft: 'bg-amber-50',
    fill: '#f59e0b',
  },
}

const graphViewBox = {
  width: 560,
  height: 358,
}

const graph = {
  x: 42,
  y: 18,
  width: 492,
  height: 316,
  xMax: 5,
  yMax: 18,
}

const closeEnough = (a, b) => Math.abs(a - b) < 1e-9

const pointKey = (point) => `${point.x},${point.y}`

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const ratioForPoint = (point) => {
  if (point.x === 0) return point.y === 0 ? '0' : 'undefined'

  const ratio = point.y / point.x
  return Number.isInteger(ratio) ? `${ratio}` : ratio.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

const numericRatio = (point) => (point.x === 0 ? null : point.y / point.x)

const isConstantRatio = (points) => {
  const ratios = []

  for (const point of points) {
    if (point.x === 0) {
      if (point.y !== 0) return false
      continue
    }

    ratios.push(point.y / point.x)
  }

  if (ratios.length === 0) return false

  return ratios.every((ratio) => closeEnough(ratio, ratios[0]))
}

const passesThroughOrigin = (points, knownPassesOrigin) => {
  if (typeof knownPassesOrigin === 'boolean') return knownPassesOrigin

  if (points.some((point) => point.x === 0)) {
    return points.some((point) => point.x === 0 && point.y === 0)
  }

  return isConstantRatio(points)
}

const hasOriginPoint = (points) => points.some((point) => point.x === 0 && point.y === 0)

const classifyRelationship = (example) => {
  if (example.type === 'proportional') return 'proportional'
  if (example.type === 'nonproportional-curved') return 'nonproportional-curved'
  return 'nonproportional-linear'
}

const coordsToSvg = (point) => ({
  x: graph.x + (point.x / graph.xMax) * graph.width,
  y: graph.y + graph.height - (point.y / graph.yMax) * graph.height,
})

const svgToCoords = (clientX, clientY, bounds) => {
  const viewX = ((clientX - bounds.left) / bounds.width) * graphViewBox.width
  const viewY = ((clientY - bounds.top) / bounds.height) * graphViewBox.height
  const x = Math.round(((viewX - graph.x) / graph.width) * graph.xMax)
  const y = Math.round(((graph.y + graph.height - viewY) / graph.height) * graph.yMax)

  return {
    x: clamp(x, 0, graph.xMax),
    y: clamp(y, 0, graph.yMax),
  }
}

const makeGraphPath = (example) => {
  if (example.type === 'nonproportional-curved') {
    const graphPoints =
      passesThroughOrigin(example.points, example.passesOrigin) && !hasOriginPoint(example.points)
        ? [{ x: 0, y: 0 }, ...example.points]
        : example.points
    const plotted = [...graphPoints]
      .sort((a, b) => a.x - b.x)
      .map((point) => coordsToSvg(point))
    const pieces = [`M ${plotted[0].x} ${plotted[0].y}`]

    for (let index = 0; index < plotted.length - 1; index += 1) {
      const previous = plotted[Math.max(0, index - 1)]
      const current = plotted[index]
      const next = plotted[index + 1]
      const afterNext = plotted[Math.min(plotted.length - 1, index + 2)]
      const controlOne = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      }
      const controlTwo = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6,
      }

      pieces.push(
        `C ${controlOne.x} ${controlOne.y} ${controlTwo.x} ${controlTwo.y} ${next.x} ${next.y}`
      )
    }

    return pieces.join(' ')
  }

  const [first, second] = example.points
  const slope = (second.y - first.y) / (second.x - first.x)
  const intercept = first.y - slope * first.x
  const start = { x: 0, y: intercept }
  const end = { x: graph.xMax, y: slope * graph.xMax + intercept }
  const clippedStart = coordsToSvg({
    x: start.x,
    y: clamp(start.y, 0, graph.yMax),
  })
  const clippedEnd = coordsToSvg({
    x: end.x,
    y: clamp(end.y, 0, graph.yMax),
  })

  return `M ${clippedStart.x} ${clippedStart.y} L ${clippedEnd.x} ${clippedEnd.y}`
}

const originCheckText = (example) => {
  const reachesOrigin = passesThroughOrigin(example.points, example.passesOrigin)

  if (!reachesOrigin) return 'does not pass through (0,0)'
  if (hasOriginPoint(example.points)) return 'passes through (0,0)'

  return 'test point (0,0) is on the graph'
}

const resultText = (classification) => {
  if (classification === 'proportional') {
    return 'This is proportional because the graph is a straight line through (0,0) and the ratios match.'
  }

  if (classification === 'nonproportional-linear') {
    return 'This is not proportional because the line does not pass through (0,0).'
  }

  return 'This is not proportional because the points do not make a straight line and the ratios change.'
}

function MiniFraction({ numerator, denominator }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 tabular-nums">
      <span>{numerator}</span>
      <span className="text-slate-400">/</span>
      <span>{denominator}</span>
    </span>
  )
}

function RelationshipTable({ example, placedKeys }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_56px] bg-slate-100 text-center text-[10px] font-black uppercase text-slate-600">
        <div className="border-r border-slate-200 py-0.5">x</div>
        <div className="border-r border-slate-200 py-0.5">y</div>
        <div className="py-0.5">plot</div>
      </div>
      {example.points.map((point) => {
        const plotted = placedKeys.has(pointKey(point))

        return (
          <div
            className={`grid grid-cols-[1fr_1fr_56px] text-center text-[13px] font-black ${
              plotted ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-800'
            }`}
            key={pointKey(point)}
          >
            <div className="border-r border-t border-slate-200 py-1">{point.x}</div>
            <div className="border-r border-t border-slate-200 py-1">{point.y}</div>
            <div className="border-t border-slate-200 py-1">{plotted ? 'yes' : '...'}</div>
          </div>
        )
      })}
    </div>
  )
}

function RatioTiles({ example, testingStarted }) {
  const ratios = example.points
    .filter((point) => point.x !== 0)
    .map((point) => ({
      key: pointKey(point),
      label: ratioForPoint(point),
      point,
      value: numericRatio(point),
    }))
  const constant = isConstantRatio(example.points)
  const tone = constant ? colors.proportional : colors.nonproportional

  return (
    <div className={`rounded border ${tone.border} ${tone.soft} p-1.5`}>
      <div className="mb-1 flex items-center justify-between">
        <div className={`text-[10px] font-black uppercase ${tone.text}`}>constant ratio</div>
        <div className="text-[10px] font-black text-slate-500">y / x</div>
      </div>
      <div className="flex gap-1">
        {ratios.map((ratio, index) => (
          <div
            className={`min-w-0 flex-1 rounded border bg-white px-1 py-0.5 text-center text-[10px] font-black ${
              testingStarted
                ? constant
                  ? 'proportion-ratio-match border-emerald-200 text-emerald-700'
                  : 'proportion-ratio-mismatch border-purple-200 text-purple-700'
                : 'border-slate-200 text-slate-600'
            }`}
            key={ratio.key}
            style={{ '--ratio-delay': `${index * 120}ms` }}
          >
            <div>
              <MiniFraction numerator={ratio.point.y} denominator={ratio.point.x} />
            </div>
            <div className="text-[9px] text-slate-400">= {ratio.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GraphPanel({
  example,
  hoverPoint,
  onGraphClick,
  onGraphLeave,
  onGraphMove,
  placedKeys,
  stage,
}) {
  const classification = classifyRelationship(example)
  const pathColor =
    classification === 'proportional' ? colors.proportional.fill : colors.nonproportional.fill
  const graphPath = makeGraphPath(example)
  const testingStarted = stage === 'testing' || stage === 'result'
  const reachesOrigin = passesThroughOrigin(example.points, example.passesOrigin)
  const originPoint = coordsToSvg({ x: 0, y: 0 })

  return (
    <div className="rounded border border-slate-200 bg-white p-2 shadow-sm">
      <svg
        className="h-[362px] w-full cursor-crosshair"
        onClick={onGraphClick}
        onMouseLeave={onGraphLeave}
        onMouseMove={onGraphMove}
        role="img"
        viewBox={`0 0 ${graphViewBox.width} ${graphViewBox.height}`}
      >
        <rect
          fill="#f8fafc"
          height={graph.height}
          rx="8"
          width={graph.width}
          x={graph.x}
          y={graph.y}
        />
        {Array.from({ length: graph.xMax + 1 }, (_, x) => {
          const svgX = coordsToSvg({ x, y: 0 }).x
          return (
            <g className="proportion-grid-line" key={`x-${x}`}>
              <line
                stroke={x === 0 ? '#0f172a' : '#dbeafe'}
                strokeWidth={x === 0 ? '4' : '1.5'}
                x1={svgX}
                x2={svgX}
                y1={graph.y}
                y2={graph.y + graph.height}
              />
              <text
                fill="#475569"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
                x={svgX}
                y={graph.y + graph.height + 22}
              >
                {x}
              </text>
            </g>
          )
        })}
        {Array.from({ length: 7 }, (_, index) => index * 3).map((y) => {
          const svgY = coordsToSvg({ x: 0, y }).y
          return (
            <g className="proportion-grid-line" key={`y-${y}`}>
              <line
                stroke={y === 0 ? '#0f172a' : '#dbeafe'}
                strokeWidth={y === 0 ? '4' : '1.5'}
                x1={graph.x}
                x2={graph.x + graph.width}
                y1={svgY}
                y2={svgY}
              />
              <text
                fill="#475569"
                fontSize="12"
                fontWeight="900"
                textAnchor="end"
                x={graph.x - 12}
                y={svgY + 4}
              >
                {y}
              </text>
            </g>
          )
        })}
        <text
          fill="#0f172a"
          fontSize="13"
          fontWeight="900"
          x={graph.x + graph.width - 8}
          y={graphViewBox.height - 5}
        >
          x
        </text>
        <text fill="#0f172a" fontSize="13" fontWeight="900" x="18" y={graph.y + 6}>
          y
        </text>

        {testingStarted ? (
          <>
            <circle
              className="proportion-origin-pulse"
              cx={originPoint.x}
              cy={originPoint.y}
              fill={reachesOrigin ? colors.proportional.fill : colors.guide.fill}
              r="13"
            />
            <path
              className="proportion-graph-path"
              d={graphPath}
              fill="none"
              pathLength="1"
              stroke={pathColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="6"
            />
            <g className="proportion-origin-check-point">
              <circle
                cx={originPoint.x}
                cy={originPoint.y}
                fill={reachesOrigin ? colors.proportional.fill : colors.guide.fill}
                r="7"
                stroke="white"
                strokeWidth="3"
              />
              <text
                fill={reachesOrigin ? colors.proportional.text : '#92400e'}
                fontSize="11"
                fontWeight="900"
                x={originPoint.x + 18}
                y={originPoint.y - 14}
              >
                origin (0,0)
              </text>
            </g>
          </>
        ) : null}

        {example.points.map((point, index) => {
          const svgPoint = coordsToSvg(point)
          const placed = placedKeys.has(pointKey(point))

          return placed ? (
            <g className="proportion-point-snap" key={pointKey(point)}>
              <circle
                cx={svgPoint.x}
                cy={svgPoint.y}
                fill={pathColor}
                fillOpacity="0.16"
                r="18"
              />
              <circle cx={svgPoint.x} cy={svgPoint.y} fill={pathColor} r="8" />
              <text
                fill="white"
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                x={svgPoint.x}
                y={svgPoint.y + 4}
              >
                {index + 1}
              </text>
            </g>
          ) : null
        })}

        {hoverPoint ? (
          <g className="proportion-hover-point" pointerEvents="none">
            <line
              stroke={colors.guide.fill}
              strokeDasharray="4 5"
              strokeWidth="2"
              x1={coordsToSvg({ x: hoverPoint.x, y: 0 }).x}
              x2={coordsToSvg(hoverPoint).x}
              y1={coordsToSvg({ x: hoverPoint.x, y: 0 }).y}
              y2={coordsToSvg(hoverPoint).y}
            />
            <line
              stroke={colors.guide.fill}
              strokeDasharray="4 5"
              strokeWidth="2"
              x1={coordsToSvg({ x: 0, y: hoverPoint.y }).x}
              x2={coordsToSvg(hoverPoint).x}
              y1={coordsToSvg({ x: 0, y: hoverPoint.y }).y}
              y2={coordsToSvg(hoverPoint).y}
            />
            <circle
              cx={coordsToSvg(hoverPoint).x}
              cy={coordsToSvg(hoverPoint).y}
              fill={colors.guide.fill}
              fillOpacity="0.28"
              r="16"
            />
            <circle cx={coordsToSvg(hoverPoint).x} cy={coordsToSvg(hoverPoint).y} fill={colors.guide.fill} r="6" />
            <rect
              fill="white"
              height="24"
              rx="8"
              stroke={colors.guide.fill}
              width="62"
              x={clamp(coordsToSvg(hoverPoint).x - 31, graph.x, graph.x + graph.width - 62)}
              y={Math.max(4, coordsToSvg(hoverPoint).y - 40)}
            />
            <text
              fill="#92400e"
              fontSize="12"
              fontWeight="900"
              textAnchor="middle"
              x={clamp(coordsToSvg(hoverPoint).x, graph.x + 31, graph.x + graph.width - 31)}
              y={Math.max(20, coordsToSvg(hoverPoint).y - 24)}
            >
              ({hoverPoint.x}, {hoverPoint.y})
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}

export default function ProportionalVsNonProportionalGraphs() {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [placedKeys, setPlacedKeys] = useState(() => new Set())
  const [hoverPoint, setHoverPoint] = useState(null)
  const [stage, setStage] = useState('plotting')
  const [feedback, setFeedback] = useState('Plot each table point on the graph.')

  const example = examples[exampleIndex]
  const classification = classifyRelationship(example)
  const allPlaced = placedKeys.size === example.points.length
  const testingStarted = stage === 'testing' || stage === 'result'
  const resultTone =
    classification === 'proportional' ? colors.proportional : colors.nonproportional

  const unplacedPoints = useMemo(
    () => example.points.filter((point) => !placedKeys.has(pointKey(point))),
    [example.points, placedKeys]
  )

  useEffect(() => {
    if (stage !== 'testing') return undefined

    const timer = window.setTimeout(() => {
      setStage('result')
      setFeedback(resultText(classification))
    }, 1700)

    return () => window.clearTimeout(timer)
  }, [classification, stage])

  const resetCurrent = () => {
    setPlacedKeys(new Set())
    setHoverPoint(null)
    setStage('plotting')
    setFeedback('Plot each table point on the graph.')
  }

  const loadExample = (nextIndex) => {
    setExampleIndex((nextIndex + examples.length) % examples.length)
    setPlacedKeys(new Set())
    setHoverPoint(null)
    setStage('plotting')
    setFeedback('Plot each table point on the graph.')
  }

  const handleMove = (event) => {
    if (stage !== 'plotting') return

    const bounds = event.currentTarget.getBoundingClientRect()
    setHoverPoint(svgToCoords(event.clientX, event.clientY, bounds))
  }

  const handleClick = (event) => {
    if (stage !== 'plotting') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const clickedPoint = svgToCoords(event.clientX, event.clientY, bounds)
    const clickedKey = pointKey(clickedPoint)
    const match = example.points.find((point) => pointKey(point) === clickedKey)

    if (match && !placedKeys.has(clickedKey)) {
      const next = new Set(placedKeys)
      next.add(clickedKey)
      setPlacedKeys(next)

      if (next.size === example.points.length) {
        setFeedback('All points are placed. Test the graph.')
        return
      }

      setFeedback(`Good. ${example.points.length - next.size} point${example.points.length - next.size === 1 ? '' : 's'} left.`)
      return
    }

    const nextPoint = unplacedPoints[0]
    if (nextPoint) {
      setFeedback(`Not quite. Plot x = ${nextPoint.x}, then move up to y = ${nextPoint.y}.`)
    }
  }

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-900">
      <header className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Proportional vs Non-Proportional Graphs</h2>
          <p className="text-[12px] font-semibold text-slate-500">
            Plot the table, then test the graph.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="h-9 rounded border border-slate-300 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm"
            onClick={() => loadExample(exampleIndex + 1)}
            type="button"
          >
            New table
          </button>
          <button
            className="h-9 rounded bg-slate-950 px-3 text-[12px] font-black text-white shadow-sm"
            onClick={resetCurrent}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr] gap-3">
        <aside className="min-h-0 space-y-1.5">
          <div className={`rounded border ${resultTone.border} ${resultTone.soft} p-2 shadow-sm`}>
            <div className={`text-[10px] font-black uppercase ${resultTone.text}`}>
              relationship table
            </div>
            <div className="mt-0.5 flex items-end justify-between">
              <div>
                <div className="text-2xl font-black text-slate-900">{example.title}</div>
                <div className="text-[12px] font-black text-slate-500">{example.rule}</div>
              </div>
              <div
                className={`rounded px-2 py-1 text-[10px] font-black uppercase ${
                  testingStarted ? `${resultTone.text} bg-white` : 'bg-white text-slate-400'
                }`}
              >
                {stage === 'result'
                  ? classification === 'proportional'
                    ? 'proportional'
                    : 'not proportional'
                  : 'mystery'}
              </div>
            </div>
          </div>

          <RelationshipTable example={example} placedKeys={placedKeys} />

          <RatioTiles example={example} testingStarted={testingStarted} />

          <div className="rounded border border-sky-200 bg-sky-50 p-2 shadow-sm">
            <div className="mb-1 text-[10px] font-black uppercase text-sky-700">
              next step
            </div>
            <div className="min-h-[34px] text-[11px] font-black leading-4 text-slate-700">
              {feedback}
            </div>
            <button
              className={`mt-1.5 h-9 w-full rounded px-3 text-[12px] font-black shadow-sm ${
                allPlaced
                  ? 'fraction-step-ready-aura border border-sky-300 bg-sky-500 text-white'
                  : 'border border-slate-200 bg-slate-100 text-slate-400'
              }`}
              disabled={!allPlaced || stage !== 'plotting'}
              onClick={() => {
                setStage('testing')
                setFeedback('Checking the origin and the ratios.')
              }}
              type="button"
            >
              Test the graph
            </button>
          </div>
        </aside>

        <main className="min-h-0 space-y-1.5">
          <GraphPanel
            example={example}
            hoverPoint={hoverPoint}
            onGraphClick={handleClick}
            onGraphLeave={() => setHoverPoint(null)}
            onGraphMove={handleMove}
            placedKeys={placedKeys}
            stage={stage}
          />

          <div className="grid grid-cols-[1fr_1fr] gap-1.5">
            <div
              className={`rounded border p-2 shadow-sm ${
                testingStarted
                  ? passesThroughOrigin(example.points, example.passesOrigin)
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-500">
                origin check
              </div>
              <div className="text-sm font-black text-slate-800">
                {testingStarted ? originCheckText(example) : 'waiting for graph test'}
              </div>
            </div>

            <div className={`rounded border ${resultTone.border} ${stage === 'result' ? resultTone.soft : 'bg-white'} p-2 shadow-sm`}>
              <div className="text-[10px] font-black uppercase text-slate-500">
                conclusion
              </div>
              <div className={`text-sm font-black ${stage === 'result' ? resultTone.text : 'text-slate-400'}`}>
                {stage === 'result'
                  ? classification === 'proportional'
                    ? 'Proportional relationship'
                    : 'Non-proportional relationship'
                  : 'plot all points first'}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
