import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  grid: 'rgba(26, 26, 46, 0.14)',
  point: '#B5651D',
  line: '#5B6BD6',
  lineDark: '#3A47A8',
  lineTint: '#EEF0FB',
  best: '#1E9E6E',
  bestDark: '#1E7D56',
  bestTint: '#E9F5EF',
  residual: '#E39D7C',
  border: '#E0DDD6',
  muted: '#5F5E5A',
}

const canvasHeight = 300
const PAD = 36

const presets = {
  positive: [
    [1, 1.5],
    [2, 2],
    [3, 3.5],
    [4, 4],
    [5, 5.5],
    [6, 6],
    [7, 7],
    [8, 7.5],
    [9, 8.5],
  ],
  negative: [
    [1, 8.5],
    [2, 8],
    [3, 7],
    [4, 6],
    [5, 5.5],
    [6, 4],
    [7, 3.5],
    [8, 2],
    [9, 1.5],
  ],
  none: [
    [1, 6],
    [2, 2],
    [3, 8],
    [4, 4],
    [5, 7],
    [6, 3],
    [7, 6],
    [8, 2.5],
    [9, 7.5],
  ],
  strong: [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5.5],
    [6, 6],
    [7, 7],
    [8, 8],
    [9, 9],
  ],
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function snapHalf(value) {
  return clamp(Math.round(value * 2) / 2, 0, 10)
}

function makePoint(x, y) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    x,
    y,
  }
}

function pointList(raw) {
  return raw.map(([x, y]) => makePoint(x, y))
}

function getStats(points) {
  if (points.length < 2) {
    return {
      r: null,
      direction: 'none',
      strength: 'add points',
      bestFit: null,
    }
  }

  const n = points.length
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / n
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / n
  let sxx = 0
  let syy = 0
  let sxy = 0

  points.forEach((point) => {
    const dx = point.x - xMean
    const dy = point.y - yMean
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  })

  const r = sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy)
  const absR = Math.abs(r ?? 0)
  const direction = r === null || absR < 0.3 ? 'none' : r > 0 ? 'positive' : 'negative'
  const strength = r === null || absR < 0.3 ? 'none' : absR < 0.7 ? 'moderate' : 'strong'
  const bestFit = sxx === 0 ? { vertical: true, x: xMean } : { vertical: false, m: sxy / sxx, b: yMean - (sxy / sxx) * xMean }

  return { r, direction, strength, bestFit }
}

function lineFromHandles(line) {
  const dx = line.x2 - line.x1
  if (Math.abs(dx) < 0.001) return { vertical: true, x: line.x1 }
  const m = (line.y2 - line.y1) / dx
  return { vertical: false, m, b: line.y1 - m * line.x1 }
}

function yOnLine(line, x) {
  if (line.vertical) return null
  return line.m * x + line.b
}

function getRmse(points, line) {
  if (points.length < 2 || line.vertical) return null
  const mse = points.reduce((sum, point) => {
    const expected = yOnLine(line, point.x)
    return sum + (point.y - expected) ** 2
  }, 0) / points.length
  return Math.sqrt(mse)
}

function fitRating(rmse, bestRmse) {
  if (rmse === null || bestRmse === null) return 'move line'
  const extraError = rmse - bestRmse
  if (extraError <= 0.35) return 'excellent'
  if (extraError <= 0.9) return 'good'
  if (extraError <= 1.7) return 'okay'
  return 'poor'
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.clientWidth,
    y: ((event.clientY - rect.top) / rect.height) * canvas.clientHeight,
  }
}

function drawCircle(ctx, x, y, radius, fill, stroke = '#ffffff', lineWidth = 2) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

export default function ScatterLineFit() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const pointHitsRef = useRef([])
  const handleHitsRef = useRef([])
  const transformRef = useRef(null)
  const dragRef = useRef(null)
  const lastTapRef = useRef({ id: null, time: 0 })
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [points, setPoints] = useState(() => pointList(presets.positive))
  const [trendLine, setTrendLine] = useState({ x1: 1, y1: 2, x2: 9, y2: 8 })
  const [showMyLine, setShowMyLine] = useState(true)
  const [showBestFit, setShowBestFit] = useState(false)
  const [showDistances, setShowDistances] = useState(false)
  const [hoverKind, setHoverKind] = useState('grid')

  const stats = useMemo(() => getStats(points), [points])
  const userLine = useMemo(() => lineFromHandles(trendLine), [trendLine])
  const rmse = useMemo(() => getRmse(points, userLine), [points, userLine])
  const bestRmse = useMemo(() => getRmse(points, stats.bestFit), [points, stats.bestFit])
  const rating = fitRating(rmse, bestRmse)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const width = canvasWidth
    const height = canvasHeight
    const gridW = width - PAD * 2
    const gridH = height - PAD * 2
    const toPx = (gx, gy) => ({
      x: PAD + (gx / 10) * gridW,
      y: height - PAD - (gy / 10) * gridH,
    })
    const toGrid = (px, py) => ({
      x: snapHalf(((px - PAD) / gridW) * 10),
      y: snapHalf(((height - PAD - py) / gridH) * 10),
    })
    transformRef.current = { toPx, toGrid, width, height }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    for (let tick = 0; tick <= 10; tick += 1) {
      const x = toPx(tick, 0).x
      const y = toPx(0, tick).y
      ctx.beginPath()
      ctx.moveTo(x, PAD)
      ctx.lineTo(x, height - PAD)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PAD, y)
      ctx.lineTo(width - PAD, y)
      ctx.stroke()
    }

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(PAD, height - PAD)
    ctx.lineTo(width - PAD + 6, height - PAD)
    ctx.moveTo(PAD, height - PAD)
    ctx.lineTo(PAD, PAD - 6)
    ctx.stroke()

    ctx.fillStyle = colors.muted
    ctx.font = '700 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    for (let tick = 0; tick <= 10; tick += 1) {
      const x = toPx(tick, 0).x
      const y = toPx(0, tick).y
      ctx.fillText(String(tick), x, height - PAD - 7)
      if (tick > 0 && tick % 2 === 0) {
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(tick), PAD - 9, y)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
      }
    }
    ctx.fillStyle = colors.ink
    ctx.font = '800 13px Inter, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('x', width - PAD + 16, height - PAD)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('y', PAD - 7, PAD - 13)

    const drawLineAcross = (line, color, dash = []) => {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = color === colors.line ? 3 : 2.5
      ctx.setLineDash(dash)
      ctx.beginPath()
      if (line.vertical) {
        const start = toPx(line.x, 0)
        const end = toPx(line.x, 10)
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
      } else {
        const yLeft = line.m * 0 + line.b
        const yRight = line.m * 10 + line.b
        const start = toPx(0, yLeft)
        const end = toPx(10, yRight)
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
      }
      ctx.stroke()
      ctx.restore()
    }

    if (showDistances && showMyLine && !userLine.vertical) {
      ctx.save()
      ctx.strokeStyle = colors.residual
      ctx.lineWidth = 1.6
      ctx.setLineDash([5, 5])
      points.forEach((point) => {
        const expected = clamp(yOnLine(userLine, point.x), -2, 12)
        const pointPx = toPx(point.x, point.y)
        const linePx = toPx(point.x, expected)
        ctx.beginPath()
        ctx.moveTo(pointPx.x, pointPx.y)
        ctx.lineTo(linePx.x, linePx.y)
        ctx.stroke()
      })
      ctx.restore()
    }

    if (showBestFit && stats.bestFit) {
      drawLineAcross(stats.bestFit, colors.best, [9, 7])
    }

    if (showMyLine) {
      drawLineAcross(userLine, colors.line)
      const a = toPx(trendLine.x1, trendLine.y1)
      const b = toPx(trendLine.x2, trendLine.y2)
      handleHitsRef.current = [
        { id: 'start', x: a.x, y: a.y },
        { id: 'end', x: b.x, y: b.y },
      ]
      drawCircle(ctx, a.x, a.y, 10, colors.lineDark, '#ffffff', 2)
      drawCircle(ctx, b.x, b.y, 10, colors.lineDark, '#ffffff', 2)
    } else {
      handleHitsRef.current = []
    }

    pointHitsRef.current = points.map((point) => {
      const px = toPx(point.x, point.y)
      drawCircle(ctx, px.x, px.y, 8.5, colors.point, '#ffffff', 2.25)
      return { id: point.id, x: px.x, y: px.y }
    })
  }, [canvasWidth, points, showBestFit, showDistances, showMyLine, stats.bestFit, trendLine, userLine])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setCanvasWidth(Math.max(320, Math.floor(entry.contentRect.width)))
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  const hitPoint = (x, y) =>
    pointHitsRef.current.find((point) => Math.hypot(point.x - x, point.y - y) <= 14)

  const hitHandle = (x, y) =>
    handleHitsRef.current.find((handle) => Math.hypot(handle.x - x, handle.y - y) <= 17)

  const updateHover = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCanvasPoint(event, canvas)
    if (hitPoint(x, y) || hitHandle(x, y)) {
      setHoverKind('grab')
      return
    }
    setHoverKind('grid')
  }

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current
    const transform = transformRef.current
    if (!canvas || !transform) return
    const { x, y } = getCanvasPoint(event, canvas)
    const pointHit = hitPoint(x, y)
    const handleHit = hitHandle(x, y)
    canvas.setPointerCapture(event.pointerId)
    if (pointHit) {
      dragRef.current = { type: 'point', id: pointHit.id, startX: x, startY: y, moved: false }
      setHoverKind('grabbing')
      return
    }
    if (handleHit) {
      dragRef.current = { type: 'handle', id: handleHit.id, startX: x, startY: y, moved: false }
      setHoverKind('grabbing')
      return
    }
    if (x >= PAD && x <= transform.width - PAD && y >= PAD && y <= transform.height - PAD) {
      const grid = transform.toGrid(x, y)
      setPoints((current) => [...current, makePoint(grid.x, grid.y)])
    }
  }

  const handlePointerMove = (event) => {
    const canvas = canvasRef.current
    const transform = transformRef.current
    if (!canvas || !transform) return
    const { x, y } = getCanvasPoint(event, canvas)
    const drag = dragRef.current
    if (!drag) {
      updateHover(event)
      return
    }
    if (Math.hypot(x - drag.startX, y - drag.startY) > 3) drag.moved = true
    const grid = transform.toGrid(x, y)
    if (drag.type === 'point') {
      setPoints((current) =>
        current.map((point) => (point.id === drag.id ? { ...point, x: grid.x, y: grid.y } : point)),
      )
    } else {
      setTrendLine((current) => {
        if (drag.id === 'start') return { ...current, x1: grid.x, y1: grid.y }
        return { ...current, x2: grid.x, y2: grid.y }
      })
    }
  }

  const handlePointerUp = (event) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.type === 'point' && !drag.moved) {
      const now = performance.now()
      if (lastTapRef.current.id === drag.id && now - lastTapRef.current.time < 360) {
        setPoints((current) => current.filter((point) => point.id !== drag.id))
        lastTapRef.current = { id: null, time: 0 }
      } else {
        lastTapRef.current = { id: drag.id, time: now }
      }
    }
    dragRef.current = null
    setHoverKind('grid')
    updateHover(event)
  }

  const loadPreset = (key) => {
    setPoints(pointList(presets[key]))
    if (key === 'negative') setTrendLine({ x1: 1, y1: 8, x2: 9, y2: 2 })
    else if (key === 'none') setTrendLine({ x1: 1, y1: 5, x2: 9, y2: 5 })
    else setTrendLine({ x1: 1, y1: 2, x2: 9, y2: 8 })
  }

  const fitText = rmse === null ? 'Move the line' : rating
  const correlationText = stats.r === null ? 'Need 2 points' : `${stats.strength} ${stats.direction}`

  const hint =
    stats.r === null
      ? 'Add at least two points, then drag the indigo line handles to fit the pattern.'
      : `This data has ${stats.strength} ${stats.direction} correlation. The green best-fit line minimises the total vertical distances from all points.`

  return (
    <div
      className="flex h-[500px] flex-col gap-2 overflow-hidden p-3"
      style={{ background: colors.page, color: colors.ink }}
    >
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Points" value={points.length} color={colors.point} />
        <StatCard label="Correlation" value={correlationText} color={colors.best} />
        <StatCard label="Your line's fit" value={fitText} color={colors.line} />
      </div>

      <div ref={wrapRef} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.border }}>
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{ cursor: hoverKind === 'grabbing' ? 'grabbing' : hoverKind === 'grab' ? 'grab' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={(event) => {
            const canvas = canvasRef.current
            if (!canvas) return
            const { x, y } = getCanvasPoint(event, canvas)
            const pointHit = hitPoint(x, y)
            if (pointHit) setPoints((current) => current.filter((point) => point.id !== pointHit.id))
          }}
          aria-label="Scatter plot grid"
        />
      </div>

      <div className="flex min-h-[38px] flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Toggle active={showMyLine} onClick={() => setShowMyLine((value) => !value)} color={colors.line}>
            My trend line
          </Toggle>
          <Toggle active={showBestFit} onClick={() => setShowBestFit((value) => !value)} color={colors.best}>
            Show best-fit line
          </Toggle>
          <Toggle active={showDistances} onClick={() => setShowDistances((value) => !value)} color={colors.residual}>
            Show distances
          </Toggle>
        </div>
        <button
          type="button"
          onClick={() => setPoints([])}
          className="rounded-full border bg-white px-4 py-2 text-sm font-black"
          style={{ borderColor: colors.border, color: colors.ink }}
        >
          Clear points
        </button>
      </div>

      <div className="flex min-h-[32px] flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-neutral-500">Presets</span>
        {[
          ['positive', 'Positive trend'],
          ['negative', 'Negative trend'],
          ['none', 'No trend'],
          ['strong', 'Strong trend'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => loadPreset(key)}
            className="rounded-full border bg-white px-3 py-1.5 text-xs font-black text-neutral-700"
            style={{ borderColor: colors.border }}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto max-w-[310px] truncate text-xs font-semibold text-neutral-500">
          Click to add. Drag points or handles. Double-click a point to remove.
        </span>
      </div>

      <div className="h-[42px] overflow-hidden rounded-xl border bg-white px-3 py-2 text-sm font-semibold leading-tight text-neutral-700" style={{ borderColor: colors.border }}>
        {hint}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2" style={{ borderColor: color }}>
      <div className="text-[10px] font-black uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="truncate text-sm font-black" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function Toggle({ active, onClick, color, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-2 text-xs font-black transition"
      style={{
        borderColor: color,
        background: active ? color : '#ffffff',
        color: active ? '#ffffff' : color,
      }}
    >
      {children}
    </button>
  )
}
