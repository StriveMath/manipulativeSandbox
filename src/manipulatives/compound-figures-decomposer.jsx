import { useEffect, useMemo, useRef, useState } from 'react'

const grid = { columns: 10, rows: 8, left: 48, top: 16, cell: 40 }
const svgSize = { width: 500, height: 360 }
const epsilon = 0.0001
const maximumPieces = 6

const pieceTones = [
  { fill: '#d1fae5', stroke: '#059669', text: '#047857' },
  { fill: '#ede9fe', stroke: '#7c3aed', text: '#6d28d9' },
  { fill: '#e0f2fe', stroke: '#0284c7', text: '#0369a1' },
  { fill: '#fef3c7', stroke: '#d97706', text: '#b45309' },
  { fill: '#ffe4e6', stroke: '#e11d48', text: '#be123c' },
  { fill: '#cffafe', stroke: '#0891b2', text: '#0e7490' },
]

const presets = [
  {
    id: 'l-shape',
    label: 'L-shaped room',
    points: [
      { x: 1, y: 1 },
      { x: 7, y: 1 },
      { x: 7, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 6 },
      { x: 1, y: 6 },
    ],
  },
  {
    id: 'steps',
    label: 'Stepped garden',
    points: [
      { x: 1, y: 1 },
      { x: 8, y: 1 },
      { x: 8, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 5 },
      { x: 3, y: 5 },
      { x: 3, y: 7 },
      { x: 1, y: 7 },
    ],
  },
  {
    id: 'house',
    label: 'House front',
    points: [
      { x: 2, y: 1 },
      { x: 6, y: 1 },
      { x: 6, y: 4 },
      { x: 4, y: 6 },
      { x: 2, y: 4 },
    ],
  },
  {
    id: 'notched',
    label: 'Notched courtyard',
    points: [
      { x: 1, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 7 },
      { x: 6, y: 7 },
      { x: 6, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 7 },
      { x: 1, y: 7 },
    ],
  },
]

const pointKey = (point) => `${point.x},${point.y}`
const samePoint = (first, second) =>
  Math.abs(first.x - second.x) < epsilon && Math.abs(first.y - second.y) < epsilon
const cross = (first, second, third) =>
  (second.x - first.x) * (third.y - first.y) -
  (second.y - first.y) * (third.x - first.x)

const signedPolygonArea = (points) =>
  points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2

const polygonArea = (points) => Math.abs(signedPolygonArea(points))

const formatNumber = (value) =>
  Number(value.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 })

const pointOnSegment = (point, start, end) =>
  Math.abs(cross(start, end, point)) < epsilon &&
  point.x >= Math.min(start.x, end.x) - epsilon &&
  point.x <= Math.max(start.x, end.x) + epsilon &&
  point.y >= Math.min(start.y, end.y) - epsilon &&
  point.y <= Math.max(start.y, end.y) + epsilon

const pointOnPolygonBoundary = (point, points) =>
  points.some((start, index) => pointOnSegment(point, start, points[(index + 1) % points.length]))

const pointInPolygon = (point, points) => {
  if (pointOnPolygonBoundary(point, points)) return true
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const currentPoint = points[index]
    const previousPoint = points[previous]
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (intersects) inside = !inside
  }
  return inside
}

const orientation = (first, second, third) => {
  const value = cross(first, second, third)
  if (Math.abs(value) < epsilon) return 0
  return value > 0 ? 1 : -1
}

const segmentsIntersect = (firstStart, firstEnd, secondStart, secondEnd) => {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart)
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd)
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart)
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd)

  if (firstOrientation !== secondOrientation && thirdOrientation !== fourthOrientation) return true
  return (
    (firstOrientation === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) ||
    (secondOrientation === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (thirdOrientation === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) ||
    (fourthOrientation === 0 && pointOnSegment(firstEnd, secondStart, secondEnd))
  )
}

const isAllowedGridEdge = (start, end) => {
  const horizontal = Math.abs(start.y - end.y) < epsilon
  const vertical = Math.abs(start.x - end.x) < epsilon
  const diagonal = Math.abs(Math.abs(start.x - end.x) - Math.abs(start.y - end.y)) < epsilon
  return !samePoint(start, end) && (horizontal || vertical || diagonal)
}

const removeCollinearPoints = (points) => {
  let result = [...points]
  let changed = true
  while (changed && result.length > 3) {
    changed = false
    result = result.filter((point, index) => {
      const previous = result[(index - 1 + result.length) % result.length]
      const next = result[(index + 1) % result.length]
      if (Math.abs(cross(previous, point, next)) < epsilon) {
        changed = true
        return false
      }
      return true
    })
  }
  return result
}

const classifyPiece = (points) => {
  const cleanPoints = removeCollinearPoints(points)
  const area = polygonArea(cleanPoints)

  if (cleanPoints.length === 4) {
    const xValues = [...new Set(cleanPoints.map((point) => point.x))]
    const yValues = [...new Set(cleanPoints.map((point) => point.y))]
    const axisAligned = cleanPoints.every((point, index) => {
      const next = cleanPoints[(index + 1) % cleanPoints.length]
      return Math.abs(point.x - next.x) < epsilon || Math.abs(point.y - next.y) < epsilon
    })
    if (axisAligned && xValues.length === 2 && yValues.length === 2) {
      const width = Math.abs(xValues[1] - xValues[0])
      const height = Math.abs(yValues[1] - yValues[0])
      return { kind: 'rectangle', area, width, height, points: cleanPoints }
    }
  }

  if (cleanPoints.length === 3) {
    for (let index = 0; index < cleanPoints.length; index += 1) {
      const start = cleanPoints[index]
      const end = cleanPoints[(index + 1) % cleanPoints.length]
      const opposite = cleanPoints[(index + 2) % cleanPoints.length]
      if (Math.abs(start.y - end.y) < epsilon) {
        return {
          kind: 'triangle',
          area,
          base: Math.abs(end.x - start.x),
          height: Math.abs(opposite.y - start.y),
          baseAxis: 'horizontal',
          baseStart: start,
          baseEnd: end,
          points: cleanPoints,
        }
      }
      if (Math.abs(start.x - end.x) < epsilon) {
        return {
          kind: 'triangle',
          area,
          base: Math.abs(end.y - start.y),
          height: Math.abs(opposite.x - start.x),
          baseAxis: 'vertical',
          baseStart: start,
          baseEnd: end,
          points: cleanPoints,
        }
      }
    }
  }

  return { kind: 'compound', area, points: cleanPoints }
}

const insertBoundaryPoint = (points, target) => {
  if (points.some((point) => samePoint(point, target))) return [...points]
  const expanded = []
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]
    expanded.push(point)
    if (pointOnSegment(target, point, next) && !samePoint(target, point) && !samePoint(target, next)) {
      expanded.push(target)
    }
  })
  return expanded
}

const splitPolygon = (points, start, end) => {
  const withStart = insertBoundaryPoint(points, start)
  const expanded = insertBoundaryPoint(withStart, end)
  const startIndex = expanded.findIndex((point) => samePoint(point, start))
  const endIndex = expanded.findIndex((point) => samePoint(point, end))
  if (startIndex < 0 || endIndex < 0) return null

  const collectPath = (from, to) => {
    const path = [expanded[from]]
    let index = from
    while (index !== to) {
      index = (index + 1) % expanded.length
      path.push(expanded[index])
    }
    return removeCollinearPoints(path)
  }

  const first = collectPath(startIndex, endIndex)
  const second = collectPath(endIndex, startIndex)
  if (first.length < 3 || second.length < 3) return null
  if (polygonArea(first) < epsilon || polygonArea(second) < epsilon) return null
  return [first, second]
}

const validateCutForPiece = (piece, start, end) => {
  if (!isAllowedGridEdge(start, end)) {
    return { valid: false, message: 'Cuts must follow a horizontal, vertical, or diagonal grid line.' }
  }
  if (!pointOnPolygonBoundary(start, piece.points) || !pointOnPolygonBoundary(end, piece.points)) {
    return { valid: false, message: 'Start and finish the cut on this piece\'s boundary.' }
  }

  const expanded = insertBoundaryPoint(insertBoundaryPoint(piece.points, start), end)
  const startIndex = expanded.findIndex((point) => samePoint(point, start))
  const endIndex = expanded.findIndex((point) => samePoint(point, end))
  const indexGap = Math.abs(startIndex - endIndex)
  if (indexGap === 1 || indexGap === expanded.length - 1) {
    return { valid: false, message: 'That line follows an outside edge. Draw through the inside.' }
  }

  for (let index = 0; index < expanded.length; index += 1) {
    const edgeStart = expanded[index]
    const edgeEnd = expanded[(index + 1) % expanded.length]
    if (
      samePoint(edgeStart, start) ||
      samePoint(edgeEnd, start) ||
      samePoint(edgeStart, end) ||
      samePoint(edgeEnd, end)
    ) {
      continue
    }
    if (segmentsIntersect(start, end, edgeStart, edgeEnd)) {
      return { valid: false, message: 'The cut crosses the outside boundary before it finishes.' }
    }
  }

  for (let step = 1; step < 10; step += 1) {
    const amount = step / 10
    const sample = {
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
    }
    if (!pointInPolygon(sample, piece.points) || pointOnPolygonBoundary(sample, piece.points)) {
      return { valid: false, message: 'Keep the entire cut inside one piece.' }
    }
  }

  const result = splitPolygon(piece.points, start, end)
  if (!result) return { valid: false, message: 'This cut does not make two usable pieces.' }
  return { valid: true, result }
}

const enumerateBoundaryPoints = (points) => {
  const boundary = new Map()
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]
    const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y))
    for (let step = 0; step <= steps; step += 1) {
      const amount = steps === 0 ? 0 : step / steps
      const point = {
        x: Math.round(start.x + (end.x - start.x) * amount),
        y: Math.round(start.y + (end.y - start.y) * amount),
      }
      boundary.set(pointKey(point), point)
    }
  })
  return [...boundary.values()]
}

const gridToSvg = (point) => ({
  x: grid.left + point.x * grid.cell,
  y: grid.top + (grid.rows - point.y) * grid.cell,
})

const polygonSvgPoints = (points) => points.map(gridToSvg).map((point) => `${point.x},${point.y}`).join(' ')

const polygonCenter = (points) => {
  const sum = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 }
  )
  return gridToSvg({ x: sum.x / points.length, y: sum.y / points.length })
}

const createPiece = (id, points, toneIndex = 0, motion = { x: 0, y: 0 }) => ({
  id,
  points,
  toneIndex,
  motion,
})

const clonePieces = (pieces) => pieces.map((piece) => ({ ...piece, points: piece.points.map((point) => ({ ...point })) }))

const formulaForPiece = (classification) => {
  if (classification.kind === 'rectangle') {
    return `${formatNumber(classification.width)} × ${formatNumber(classification.height)} = ${formatNumber(classification.area)}`
  }
  if (classification.kind === 'triangle') {
    return `½ × ${formatNumber(classification.base)} × ${formatNumber(classification.height)} = ${formatNumber(classification.area)}`
  }
  return 'Keep decomposing'
}

function DimensionLabels({ classification, tone }) {
  if (classification.kind === 'compound') return null
  const points = classification.points
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))

  if (classification.kind === 'rectangle') {
    const widthPoint = gridToSvg({ x: (minX + maxX) / 2, y: minY })
    const heightPoint = gridToSvg({ x: minX, y: (minY + maxY) / 2 })
    return (
      <g className="compound-dimension-label" fill={tone.text} fontSize="10" fontWeight="900">
        <text textAnchor="middle" x={widthPoint.x} y={widthPoint.y - 6}>{formatNumber(classification.width)} units</text>
        <text textAnchor="middle" transform={`rotate(-90 ${heightPoint.x + 11} ${heightPoint.y})`} x={heightPoint.x + 11} y={heightPoint.y}>{formatNumber(classification.height)} units</text>
      </g>
    )
  }

  const baseMidpoint = {
    x: (classification.baseStart.x + classification.baseEnd.x) / 2,
    y: (classification.baseStart.y + classification.baseEnd.y) / 2,
  }
  const basePoint = gridToSvg(baseMidpoint)
  const heightPoint = gridToSvg({ x: minX, y: (minY + maxY) / 2 })
  return (
    <g className="compound-dimension-label" fill={tone.text} fontSize="10" fontWeight="900">
      <text
        textAnchor="middle"
        x={basePoint.x + (classification.baseAxis === 'vertical' ? 13 : 0)}
        y={basePoint.y + (classification.baseAxis === 'horizontal' ? -6 : 3)}
      >
        {formatNumber(classification.base)} units
      </text>
      <text textAnchor="middle" x={heightPoint.x + 17} y={heightPoint.y - 4}>
        h {formatNumber(classification.height)}
      </text>
    </g>
  )
}

function FormulaPanel({ pieces }) {
  return (
    <aside className="grid min-h-0 grid-rows-[auto_1fr] rounded border border-slate-200 bg-white p-2 shadow-sm">
      <div>
        <div className="text-[11px] font-black uppercase text-slate-500">Area pieces</div>
        <div className="text-[10px] font-semibold text-slate-400">Colors match the figure.</div>
      </div>
      <div className="mt-1 grid min-h-0 content-start gap-1">
        {pieces.map((piece, index) => {
          const classification = classifyPiece(piece.points)
          const tone = pieceTones[piece.toneIndex % pieceTones.length]
          return (
            <div
              className={`compound-formula-enter rounded border px-2 py-1 ${classification.kind === 'compound' ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white shadow-sm'}`}
              key={piece.id}
              style={{ '--compound-delay': `${index * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                <span style={{ color: tone.text }}>Piece {index + 1}</span>
                <span className="text-slate-400">{classification.kind}</span>
              </div>
              <div className={`mt-0.5 font-black tabular-nums ${pieces.length > 4 ? 'text-[11px]' : 'text-[13px]'}`} style={{ color: classification.kind === 'compound' ? '#64748b' : tone.text }}>
                {formulaForPiece(classification)}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default function CompoundFiguresDecomposer() {
  const svgRef = useRef(null)
  const nextPieceId = useRef(2)
  const animationTimer = useRef(null)
  const pointerState = useRef(null)
  const [mode, setMode] = useState('preset')
  const [presetId, setPresetId] = useState(presets[0].id)
  const [sourcePolygon, setSourcePolygon] = useState(presets[0].points)
  const [pieces, setPieces] = useState([createPiece('piece-1', presets[0].points)])
  const [cuts, setCuts] = useState([])
  const [history, setHistory] = useState([])
  const [customVertices, setCustomVertices] = useState([])
  const [customClosed, setCustomClosed] = useState(false)
  const [cutStart, setCutStart] = useState(null)
  const [previewPoint, setPreviewPoint] = useState(null)
  const [keyboardPoint, setKeyboardPoint] = useState({ x: 1, y: 1 })
  const [feedback, setFeedback] = useState('Draw a cut from one boundary point to another.')
  const [animation, setAnimation] = useState(null)
  const [previousStrategy, setPreviousStrategy] = useState(null)

  const classifications = useMemo(() => pieces.map((piece) => classifyPiece(piece.points)), [pieces])
  const complete = pieces.length > 0 && classifications.every((item) => item.kind !== 'compound')
  const totalArea = classifications.reduce((sum, item) => sum + item.area, 0)
  const boundaryPoints = useMemo(() => {
    const points = new Map()
    pieces.forEach((piece) => {
      enumerateBoundaryPoints(piece.points).forEach((point) => points.set(pointKey(point), point))
    })
    return [...points.values()]
  }, [pieces])
  const interactionReady = (mode === 'preset' || customClosed) && !animation

  useEffect(() => () => window.clearTimeout(animationTimer.current), [])

  const resetDecomposition = (polygon, message = 'Draw a cut from one boundary point to another.') => {
    nextPieceId.current = 2
    setSourcePolygon(polygon)
    setPieces([createPiece('piece-1', polygon)])
    setCuts([])
    setHistory([])
    setCutStart(null)
    setPreviewPoint(null)
    setAnimation(null)
    setPreviousStrategy(null)
    setFeedback(message)
  }

  const selectPreset = (id) => {
    const preset = presets.find((item) => item.id === id) ?? presets[0]
    setPresetId(preset.id)
    resetDecomposition(preset.points)
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode || animation) return
    setMode(nextMode)
    if (nextMode === 'preset') {
      selectPreset(presetId)
      return
    }
    setCustomVertices([])
    setCustomClosed(false)
    setSourcePolygon([])
    setPieces([])
    setCuts([])
    setHistory([])
    setPreviousStrategy(null)
    setCutStart(null)
    setFeedback('Click grid points to outline a compound figure.')
  }

  const screenToGrid = (clientX, clientY) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const local = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    return {
      x: Math.max(0, Math.min(grid.columns, Math.round((local.x - grid.left) / grid.cell))),
      y: Math.max(0, Math.min(grid.rows, Math.round(grid.rows - (local.y - grid.top) / grid.cell))),
    }
  }

  const addCustomVertex = (point) => {
    if (customClosed || animation) return
    if (customVertices.length >= 3 && samePoint(point, customVertices[0])) {
      closeCustomFigure()
      return
    }
    if (customVertices.some((vertex) => samePoint(vertex, point))) {
      setFeedback('Choose a new grid point, or click the first point to close the figure.')
      return
    }
    if (customVertices.length > 0) {
      const last = customVertices[customVertices.length - 1]
      if (!isAllowedGridEdge(last, point)) {
        setFeedback('Edges must be horizontal, vertical, or diagonal grid lines.')
        return
      }
      for (let index = 0; index < customVertices.length - 2; index += 1) {
        if (segmentsIntersect(last, point, customVertices[index], customVertices[index + 1])) {
          setFeedback('That edge crosses the figure. Choose a different point.')
          return
        }
      }
    }
    setCustomVertices((current) => [...current, point])
    setFeedback('Add another vertex, then click the first point to close the figure.')
  }

  const closeCustomFigure = () => {
    if (customVertices.length < 3) {
      setFeedback('Add at least three vertices before closing the figure.')
      return
    }
    const first = customVertices[0]
    const last = customVertices[customVertices.length - 1]
    if (!isAllowedGridEdge(last, first)) {
      setFeedback('The closing edge must be horizontal, vertical, or diagonal.')
      return
    }
    for (let index = 1; index < customVertices.length - 2; index += 1) {
      if (segmentsIntersect(last, first, customVertices[index], customVertices[index + 1])) {
        setFeedback('The closing edge crosses the figure. Move or undo a vertex.')
        return
      }
    }
    if (polygonArea(customVertices) < epsilon) {
      setFeedback('This outline has no area. Spread the vertices across the grid.')
      return
    }
    setCustomClosed(true)
    resetDecomposition(customVertices, 'Figure ready. Draw a cut between two boundary points.')
  }

  const nearestBoundaryPoint = (point) => {
    if (!point) return null
    const exact = boundaryPoints.find((candidate) => samePoint(candidate, point))
    return exact ?? null
  }

  const applyCut = (start, end) => {
    if (!interactionReady || samePoint(start, end)) {
      setFeedback('Choose two different boundary points for the cut.')
      return
    }
    if (pieces.length >= maximumPieces) {
      setFeedback('Six pieces is the readability limit. Undo a cut or try another strategy.')
      return
    }

    const candidates = pieces
      .map((piece, index) => ({ piece, index, validation: validateCutForPiece(piece, start, end) }))
      .filter((candidate) => candidate.validation.valid)

    if (candidates.length !== 1) {
      setFeedback(
        candidates.length > 1
          ? 'This cut crosses more than one piece. Cut one piece at a time.'
          : 'Keep the cut inside one piece and finish on its boundary.'
      )
      setAnimation({ type: 'invalid', cut: { start, end } })
      animationTimer.current = window.setTimeout(() => setAnimation(null), 480)
      return
    }

    const { piece, index, validation } = candidates[0]
    const [firstPoints, secondPoints] = validation.result
    const startSvg = gridToSvg(start)
    const endSvg = gridToSvg(end)
    const length = Math.hypot(endSvg.x - startSvg.x, endSvg.y - startSvg.y) || 1
    const normal = { x: (-(endSvg.y - startSvg.y) / length) * 9, y: ((endSvg.x - startSvg.x) / length) * 9 }
    const firstId = `piece-${nextPieceId.current++}`
    const secondId = `piece-${nextPieceId.current++}`
    const firstPiece = createPiece(firstId, firstPoints, piece.toneIndex, normal)
    const secondPiece = createPiece(secondId, secondPoints, (piece.toneIndex + pieces.length) % pieceTones.length, {
      x: -normal.x,
      y: -normal.y,
    })
    const nextPieces = [...pieces]
    nextPieces.splice(index, 1, firstPiece, secondPiece)

    setHistory((current) => [...current, { pieces: clonePieces(pieces), cuts: [...cuts] }])
    setPieces(nextPieces)
    setCuts((current) => [...current, { id: `cut-${nextPieceId.current}`, start, end }])
    setCutStart(null)
    setPreviewPoint(null)
    setFeedback('The pieces separated. Continue until every piece is a rectangle or triangle.')
    setAnimation({ type: 'valid', cut: { start, end }, pieceIds: [firstId, secondId] })
    animationTimer.current = window.setTimeout(() => setAnimation(null), 780)
  }

  const handleBoundarySelection = (point) => {
    if (!interactionReady) return
    if (!cutStart) {
      setCutStart(point)
      setFeedback('Now choose another boundary point on the same piece.')
      return
    }
    applyCut(cutStart, point)
  }

  const handleSvgPointerDown = (event) => {
    if (animation) return
    const point = screenToGrid(event.clientX, event.clientY)
    if (!point) return
    if (mode === 'build' && !customClosed) {
      addCustomVertex(point)
      return
    }
    const boundaryPoint = nearestBoundaryPoint(point)
    if (!boundaryPoint || !interactionReady) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerState.current = { pointerId: event.pointerId, start: boundaryPoint, clientX: event.clientX, clientY: event.clientY, moved: false }
    setPreviewPoint(boundaryPoint)
  }

  const handleSvgPointerMove = (event) => {
    const active = pointerState.current
    if (!active || active.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) > 5) active.moved = true
    const point = screenToGrid(event.clientX, event.clientY)
    setPreviewPoint(nearestBoundaryPoint(point) ?? point)
  }

  const handleSvgPointerUp = (event) => {
    const active = pointerState.current
    if (!active || active.pointerId !== event.pointerId) return
    const point = screenToGrid(event.clientX, event.clientY)
    const boundaryPoint = nearestBoundaryPoint(point)
    pointerState.current = null
    setPreviewPoint(null)
    if (active.moved) {
      if (boundaryPoint) applyCut(active.start, boundaryPoint)
      else setFeedback('Finish the cut on a visible boundary point.')
      return
    }
    handleBoundarySelection(active.start)
  }

  const handleGridKeyDown = (event) => {
    if (animation) return
    const movement = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: -1 },
    }[event.key]
    if (movement) {
      event.preventDefault()
      setKeyboardPoint((current) => ({
        x: Math.max(0, Math.min(grid.columns, current.x + movement.x)),
        y: Math.max(0, Math.min(grid.rows, current.y + movement.y)),
      }))
      return
    }
    if (event.key === 'Escape') {
      setCutStart(null)
      setFeedback('Cut cancelled. Choose a new boundary point.')
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (mode === 'build' && !customClosed) addCustomVertex(keyboardPoint)
      else {
        const point = nearestBoundaryPoint(keyboardPoint)
        if (point) handleBoundarySelection(point)
        else setFeedback('Move the keyboard cursor onto a boundary point first.')
      }
    }
  }

  const undoCut = () => {
    if (history.length === 0 || animation) return
    const previous = history[history.length - 1]
    setPieces(clonePieces(previous.pieces))
    setCuts(previous.cuts)
    setHistory((current) => current.slice(0, -1))
    setCutStart(null)
    setFeedback('The latest cut was undone.')
  }

  const tryAnotherCut = () => {
    if (history.length === 0 || animation) return
    if (complete) {
      setPreviousStrategy({ pieces: pieces.length, total: totalArea })
    }
    nextPieceId.current = 2
    setPieces([createPiece('piece-1', sourcePolygon)])
    setCuts([])
    setHistory([])
    setCutStart(null)
    setFeedback('Try a different cut. The total area should stay the same.')
  }

  const resetAll = () => {
    if (animation) return
    setMode('preset')
    setPresetId(presets[0].id)
    setCustomVertices([])
    setCustomClosed(false)
    setKeyboardPoint({ x: 1, y: 1 })
    resetDecomposition(presets[0].points)
  }

  const equation = complete
    ? `${classifications.map((item) => formatNumber(item.area)).join(' + ')} = ${formatNumber(totalArea)} square units`
    : pieces.length > 1
      ? `${classifications.filter((item) => item.kind !== 'compound').map((item) => formatNumber(item.area)).join(' + ') || '?'} + …`
      : 'Decompose the figure into rectangles and triangles.'

  const cutPreview = cutStart && previewPoint && !samePoint(cutStart, previewPoint)
    ? { start: gridToSvg(cutStart), end: gridToSvg(previewPoint) }
    : null

  return (
    <div className="box-border flex h-[498px] flex-col overflow-hidden bg-slate-50 p-3 text-slate-800">
      <header className="grid h-[48px] shrink-0 grid-cols-[146px_160px_minmax(0,1fr)] items-center gap-2 rounded border border-slate-200 bg-white px-2 shadow-sm">
        <div className="grid grid-cols-2 overflow-hidden rounded border border-slate-300">
          {[
            { id: 'preset', label: 'Presets' },
            { id: 'build', label: 'Build' },
          ].map((item) => (
            <button
              className={`h-8 text-[12px] font-black ${mode === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              disabled={Boolean(animation)}
              key={item.id}
              onClick={() => switchMode(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === 'preset' ? (
          <label className="text-[9px] font-black uppercase text-slate-500">
            Figure
            <select
              aria-label="Choose a compound figure"
              className="mt-0.5 h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] font-black text-slate-800"
              disabled={Boolean(animation)}
              onChange={(event) => selectPreset(event.target.value)}
              value={presetId}
            >
              {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            <button className="h-8 rounded border border-slate-300 bg-white text-[10px] font-black disabled:opacity-40" disabled={customVertices.length === 0 || customClosed} onClick={() => setCustomVertices((current) => current.slice(0, -1))} type="button">Undo vertex</button>
            <button className="h-8 rounded border border-emerald-300 bg-emerald-50 text-[10px] font-black text-emerald-800 disabled:opacity-40" disabled={customVertices.length < 3 || customClosed} onClick={closeCustomFigure} type="button">Close</button>
            <button className="h-8 rounded border border-slate-300 bg-white text-[10px] font-black disabled:opacity-40" disabled={customVertices.length === 0 || customClosed} onClick={() => { setCustomVertices([]); setFeedback('Click grid points to outline a compound figure.') }} type="button">Clear</button>
          </div>
        )}

        <div className="flex min-w-0 items-center justify-end gap-1">
          <div className={`mr-auto rounded px-2 py-1 text-[10px] font-black ${interactionReady ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'}`}>
            {interactionReady ? 'Cut tool active' : 'Build the outline'}
          </div>
          <button className="h-8 rounded border border-slate-300 bg-white px-2 text-[10px] font-black disabled:opacity-35" disabled={history.length === 0 || Boolean(animation)} onClick={undoCut} type="button">Undo cut</button>
          <button className={`h-8 rounded border px-2 text-[10px] font-black disabled:opacity-35 ${complete && history.length > 0 ? 'compound-ready-button border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-300 bg-white text-slate-600'}`} disabled={history.length === 0 || Boolean(animation)} onClick={tryAnotherCut} type="button">Try another</button>
          <button className="h-8 rounded bg-slate-900 px-2 text-[10px] font-black text-white disabled:opacity-40" disabled={Boolean(animation)} onClick={resetAll} type="button">Reset</button>
        </div>
      </header>

      <main className="mt-2 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_210px] gap-2">
        <section className="relative min-h-0 overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <svg
            aria-label={mode === 'build' && !customClosed ? 'Custom compound figure builder grid' : 'Compound figure cutting grid'}
            className="h-full w-full touch-none outline-none focus:ring-2 focus:ring-sky-400"
            onKeyDown={handleGridKeyDown}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            ref={svgRef}
            role="application"
            tabIndex="0"
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          >
            <rect fill="#f8fafc" height="320" rx="8" width="400" x="48" y="16" />
            {Array.from({ length: grid.columns + 1 }, (_, value) => {
              const x = grid.left + value * grid.cell
              return <line className="compound-grid-reveal" key={`x-${value}`} stroke="#cbd5e1" strokeWidth="1" x1={x} x2={x} y1={grid.top} y2={grid.top + grid.rows * grid.cell} style={{ '--compound-delay': `${value * 24}ms` }} />
            })}
            {Array.from({ length: grid.rows + 1 }, (_, value) => {
              const y = grid.top + value * grid.cell
              return <line className="compound-grid-reveal" key={`y-${value}`} stroke="#cbd5e1" strokeWidth="1" x1={grid.left} x2={grid.left + grid.columns * grid.cell} y1={y} y2={y} style={{ '--compound-delay': `${value * 24}ms` }} />
            })}
            {Array.from({ length: grid.columns + 1 }, (_, value) => (
              <text fill="#64748b" fontSize="9" fontWeight="800" key={`x-label-${value}`} textAnchor="middle" x={grid.left + value * grid.cell} y="350">{value}</text>
            ))}
            {Array.from({ length: grid.rows + 1 }, (_, value) => (
              <text fill="#64748b" fontSize="9" fontWeight="800" key={`y-label-${value}`} textAnchor="end" x="40" y={grid.top + (grid.rows - value) * grid.cell + 3}>{value}</text>
            ))}

            {mode === 'build' && !customClosed && customVertices.length > 0 && (
              <g>
                <polyline className="compound-builder-line" fill="none" points={customVertices.map(gridToSvg).map((point) => `${point.x},${point.y}`).join(' ')} stroke="#0284c7" strokeWidth="4" />
                {customVertices.map((point, index) => {
                  const svgPoint = gridToSvg(point)
                  return <circle className="compound-vertex-pop" cx={svgPoint.x} cy={svgPoint.y} fill={index === 0 ? '#f59e0b' : '#0284c7'} key={`${pointKey(point)}-${index}`} r={index === 0 ? 6 : 5} />
                })}
              </g>
            )}

            {pieces.map((piece, index) => {
              const tone = pieceTones[piece.toneIndex % pieceTones.length]
              const classification = classifications[index]
              const center = polygonCenter(piece.points)
              const isAnimating = animation?.type === 'valid' && animation.pieceIds.includes(piece.id)
              return (
                <g
                  className={isAnimating ? 'compound-piece-separate' : ''}
                  key={piece.id}
                  style={{
                    '--compound-move-x': `${piece.motion.x}px`,
                    '--compound-move-y': `${piece.motion.y}px`,
                    '--compound-return-x': `${piece.motion.x * -0.14}px`,
                    '--compound-return-y': `${piece.motion.y * -0.14}px`,
                  }}
                >
                  <polygon fill={tone.fill} points={polygonSvgPoints(piece.points)} stroke={tone.stroke} strokeLinejoin="round" strokeWidth="3" />
                  <text fill={tone.text} fontSize="13" fontWeight="900" paintOrder="stroke" stroke="white" strokeWidth="4" textAnchor="middle" x={center.x} y={center.y + 4}>P{index + 1}</text>
                  <DimensionLabels classification={classification} tone={tone} />
                </g>
              )
            })}

            {cuts.map((cut) => {
              const start = gridToSvg(cut.start)
              const end = gridToSvg(cut.end)
              return <line key={cut.id} stroke="#0f172a" strokeDasharray="6 4" strokeWidth="2" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
            })}

            {animation?.cut && (() => {
              const start = gridToSvg(animation.cut.start)
              const end = gridToSvg(animation.cut.end)
              return <line className={animation.type === 'valid' ? 'compound-cut-draw' : 'compound-cut-invalid'} stroke={animation.type === 'valid' ? '#f59e0b' : '#ef4444'} strokeLinecap="round" strokeWidth="5" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
            })()}

            {cutPreview && <line stroke="#f59e0b" strokeDasharray="7 5" strokeWidth="4" x1={cutPreview.start.x} x2={cutPreview.end.x} y1={cutPreview.start.y} y2={cutPreview.end.y} />}

            {interactionReady && boundaryPoints.map((point) => {
              const svgPoint = gridToSvg(point)
              const selected = cutStart && samePoint(cutStart, point)
              return (
                <g aria-label={`Boundary point ${point.x}, ${point.y}`} key={pointKey(point)} role="button">
                  <circle cx={svgPoint.x} cy={svgPoint.y} fill="transparent" r="11" />
                  <circle className={selected ? 'compound-boundary-selected' : 'compound-boundary-point'} cx={svgPoint.x} cy={svgPoint.y} fill={selected ? '#f59e0b' : '#ffffff'} r={selected ? 5 : 3} stroke={selected ? '#b45309' : '#475569'} strokeWidth="2" />
                </g>
              )
            })}

            <g className="pointer-events-none">
              <circle cx={gridToSvg(keyboardPoint).x} cy={gridToSvg(keyboardPoint).y} fill="none" r="9" stroke="#0284c7" strokeDasharray="3 2" strokeWidth="2" />
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/95 px-2 py-1 text-[9px] font-bold text-slate-500 shadow-sm">
            Arrow keys move the cursor · Enter selects · Esc cancels
          </div>
        </section>

        <FormulaPanel pieces={pieces} />
      </main>

      <footer className="mt-2 grid h-[64px] shrink-0 grid-cols-[minmax(0,1fr)_250px] gap-2">
        <section className={`grid min-w-0 content-center rounded border px-4 shadow-sm ${complete ? 'compound-total-reveal border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
          <div className="text-[9px] font-black uppercase text-slate-400">Decomposition equation</div>
          <div className={`truncate font-black tabular-nums ${complete ? 'text-[20px] text-sky-700' : 'text-[15px] text-slate-700'}`}>{equation}</div>
          {previousStrategy && <div className="text-[9px] font-black text-violet-700">Previous: {previousStrategy.pieces} pieces = {formatNumber(previousStrategy.total)} square units</div>}
        </section>
        <section className={`grid content-center rounded border px-3 text-[11px] font-bold leading-4 ${complete ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`} aria-live="polite">
          {complete ? `All ${pieces.length} pieces are measurable. Try another decomposition.` : feedback}
        </section>
      </footer>
    </div>
  )
}
