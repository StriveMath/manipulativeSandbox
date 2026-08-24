import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  grid: '#D8D5CE',
  horizontal: '#2660C4',
  horizontalTint: '#EAF0FB',
  vertical: '#1E7A5E',
  verticalTint: '#E9F5EF',
  distance: '#7B3F9E',
  distanceTint: '#F3EEFA',
  pointA: '#7B3F9E',
  pointB: '#B23050',
  border: '#E0DDD6',
}

const minXCoord = -12
const maxXCoord = 12
const minYCoord = -9
const maxYCoord = 9

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
}

function formatDistance(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function samePoint(a, b) {
  return a && b && a.x === b.x && a.y === b.y
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function drawPointLabel(ctx, point, screen, color, canvasWidth, canvasHeight) {
  const text = `(${point.x}, ${point.y})`
  ctx.save()
  ctx.font = '900 12px Inter, sans-serif'
  const width = ctx.measureText(text).width + 16
  const x = clamp(screen.x, width / 2 + 8, canvasWidth - width / 2 - 8)
  const y = clamp(screen.y - 28, 18, canvasHeight - 18)
  ctx.fillStyle = `${color}1f`
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  roundRect(ctx, x - width / 2, y - 13, width, 26, 13)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawSegment(ctx, from, to, color, progress, dashed = false) {
  const x = from.x + (to.x - from.x) * progress
  const y = from.y + (to.y - from.y) * progress
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  if (dashed) ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.restore()
}

function drawSegmentLabel(ctx, text, x, y, color, tint, canvasWidth, canvasHeight) {
  ctx.save()
  ctx.font = '900 14px Inter, sans-serif'
  const width = ctx.measureText(text).width + 18
  const height = 26
  const labelX = clamp(x, width / 2 + 8, canvasWidth - width / 2 - 8)
  const labelY = clamp(y, height / 2 + 8, canvasHeight - height / 2 - 8)
  ctx.fillStyle = tint
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  roundRect(ctx, labelX - width / 2, labelY - height / 2, width, height, 13)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, labelX, labelY)
  ctx.restore()
}

function StatCard({ title, value, color, tint, active }) {
  return (
    <div
      className={`rounded-xl border-[1.5px] bg-white px-2.5 py-1 transition ${active ? 'opacity-100' : 'opacity-35'}`}
      style={{ borderColor: color }}
    >
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color }}>{title}</p>
      <p className="mt-0.5 font-mono text-base font-black" style={{ color, background: tint }}>{value}</p>
    </div>
  )
}

function ColorToken({ color, children }) {
  return <span style={{ color }}>{children}</span>
}

function WorkingLine({ active, children, large = false }) {
  return (
    <div className={`font-mono font-black transition ${active ? 'opacity-100' : 'opacity-20'} ${large ? 'text-lg' : 'text-[15px]'}`}>
      {children}
    </div>
  )
}

function Radical({ value }) {
  return (
    <span className="inline-flex items-end font-mono font-black leading-none">
      <span className="text-[1.18em] leading-none">√</span>
      <span className="inline-block border-t-2 border-current px-1 pt-0.5 leading-none">{value}</span>
    </span>
  )
}

export default function DistanceCoordinatePlane() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const labelTimerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 590, height: 410 })
  const [points, setPoints] = useState([])
  const [progress, setProgress] = useState({ h: 0, v: 0, d: 0 })
  const [revealed, setRevealed] = useState({ h: false, v: false, d: false })
  const [liveMode, setLiveMode] = useState(false)
  const [hoverIndex, setHoverIndex] = useState(null)
  const [coordLabelsVisible, setCoordLabelsVisible] = useState(false)
  const [showWorking, setShowWorking] = useState(false)

  const pointA = points[0]
  const pointB = points[1]
  const hasBoth = points.length === 2
  const dx = hasBoth ? Math.abs(pointB.x - pointA.x) : 0
  const dy = hasBoth ? Math.abs(pointB.y - pointA.y) : 0
  const sumSquares = dx * dx + dy * dy
  const distance = Math.sqrt(sumSquares)
  const corner = useMemo(() => hasBoth ? { x: pointB.x, y: pointA.y } : null, [hasBoth, pointA, pointB])

  const constants = useMemo(() => {
    const pad = Math.max(20, Math.min(28, canvasSize.width * 0.045))
    const cell = Math.min((canvasSize.width - pad * 2) / (maxXCoord - minXCoord), (canvasSize.height - pad * 2) / (maxYCoord - minYCoord))
    const originX = canvasSize.width / 2
    const originY = canvasSize.height / 2
    return {
      pad,
      cell,
      originX,
      originY,
      left: originX + minXCoord * cell,
      right: originX + maxXCoord * cell,
      top: originY - maxYCoord * cell,
      bottom: originY - minYCoord * cell,
    }
  }, [canvasSize])

  const toPx = useCallback((point) => ({
    x: constants.originX + point.x * constants.cell,
    y: constants.originY - point.y * constants.cell,
  }), [constants])

  const toGrid = useCallback((x, y) => ({
    x: clamp(Math.round((x - constants.originX) / constants.cell), minXCoord, maxXCoord),
    y: clamp(Math.round((constants.originY - y) / constants.cell), minYCoord, maxYCoord),
  }), [constants])

  const cancelAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const flashCoordinateLabels = useCallback(() => {
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current)
    setCoordLabelsVisible(true)
    labelTimerRef.current = setTimeout(() => {
      setCoordLabelsVisible(false)
      labelTimerRef.current = null
    }, 2000)
  }, [])

  const startAnimation = useCallback(() => {
    cancelAnimation()
    setLiveMode(false)
    setProgress({ h: 0, v: 0, d: 0 })
    setRevealed({ h: false, v: false, d: false })
    const startedAt = performance.now()
    const legDuration = 520
    const totalDuration = legDuration * 3

    const tick = (now) => {
      const elapsed = now - startedAt
      if (elapsed < legDuration) {
        setProgress({ h: easeInOut(elapsed / legDuration), v: 0, d: 0 })
      } else if (elapsed < legDuration * 2) {
        setRevealed((old) => old.h ? old : { ...old, h: true })
        setProgress({ h: 1, v: easeInOut((elapsed - legDuration) / legDuration), d: 0 })
      } else if (elapsed < totalDuration) {
        setRevealed((old) => old.v ? old : { ...old, v: true })
        setProgress({ h: 1, v: 1, d: easeInOut((elapsed - legDuration * 2) / legDuration) })
      } else {
        setProgress({ h: 1, v: 1, d: 1 })
        setRevealed({ h: true, v: true, d: true })
        frameRef.current = null
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [cancelAnimation])

  const clearPoints = () => {
    cancelAnimation()
    setPoints([])
    setHoverIndex(null)
    setCoordLabelsVisible(false)
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current)
    labelTimerRef.current = null
    setProgress({ h: 0, v: 0, d: 0 })
    setRevealed({ h: false, v: false, d: false })
    setLiveMode(false)
  }

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => {
      setCanvasSize({
        width: Math.max(340, Math.floor(node.clientWidth)),
        height: Math.max(320, Math.floor(node.clientHeight)),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    cancelAnimation()
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current)
  }, [cancelAnimation])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 0, 0, canvasSize.width, canvasSize.height, 14)
    ctx.fill()

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    for (let xValue = minXCoord; xValue <= maxXCoord; xValue += 1) {
      const x = toPx({ x: xValue, y: 0 }).x
      ctx.beginPath()
      ctx.moveTo(x, constants.top)
      ctx.lineTo(x, constants.bottom)
      ctx.stroke()
    }
    for (let yValue = minYCoord; yValue <= maxYCoord; yValue += 1) {
      const y = toPx({ x: 0, y: yValue }).y
      ctx.beginPath()
      ctx.moveTo(constants.left, y)
      ctx.lineTo(constants.right, y)
      ctx.stroke()
    }

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(constants.left, constants.originY)
    ctx.lineTo(constants.right, constants.originY)
    ctx.moveTo(constants.originX, constants.top)
    ctx.lineTo(constants.originX, constants.bottom)
    ctx.stroke()

    ctx.fillStyle = '#5F5E5A'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = minXCoord; x <= maxXCoord; x += 1) {
      ctx.fillText(String(x), toPx({ x, y: 0 }).x, constants.originY + 5)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = minYCoord; y <= maxYCoord; y += 1) {
      if (y !== 0) ctx.fillText(String(y), constants.originX - 6, toPx({ x: 0, y }).y)
    }

    if (hasBoth) {
      const aPx = toPx(pointA)
      const bPx = toPx(pointB)
      const cornerPx = toPx(corner)
      const hProgress = liveMode ? 1 : progress.h
      const vProgress = liveMode ? 1 : progress.v
      const dProgress = liveMode ? 1 : progress.d

      if (dx > 0) drawSegment(ctx, aPx, cornerPx, colors.horizontal, hProgress, true)
      if (dy > 0) drawSegment(ctx, cornerPx, bPx, colors.vertical, vProgress, true)
      if (dProgress > 0) drawSegment(ctx, aPx, bPx, colors.distance, dProgress)

      if ((liveMode || revealed.h || hProgress > 0.98) && dx > 0) {
        drawSegmentLabel(
          ctx,
          `a = ${dx}`,
          (aPx.x + cornerPx.x) / 2,
          (aPx.y + cornerPx.y) / 2 - 24,
          colors.horizontal,
          colors.horizontalTint,
          canvasSize.width,
          canvasSize.height,
        )
      }

      if ((liveMode || revealed.v || vProgress > 0.98) && dy > 0) {
        const side = pointB.x >= pointA.x ? 28 : -28
        drawSegmentLabel(
          ctx,
          `b = ${dy}`,
          (cornerPx.x + bPx.x) / 2 + side,
          (cornerPx.y + bPx.y) / 2,
          colors.vertical,
          colors.verticalTint,
          canvasSize.width,
          canvasSize.height,
        )
      }

      if ((liveMode || revealed.d || dProgress > 0.98) && dProgress > 0) {
        drawSegmentLabel(
          ctx,
          showWorking ? `c = ${formatDistance(distance)}` : 'c',
          (aPx.x + bPx.x) / 2,
          (aPx.y + bPx.y) / 2 + 28,
          colors.distance,
          colors.distanceTint,
          canvasSize.width,
          canvasSize.height,
        )
      }

      if ((liveMode || revealed.v || vProgress > 0.98) && dx > 0 && dy > 0) {
        const sx = pointB.x > pointA.x ? 1 : -1
        const sy = pointB.y > pointA.y ? -1 : 1
        const size = Math.min(16, constants.cell * 0.42)
        ctx.save()
        ctx.strokeStyle = colors.ink
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cornerPx.x, cornerPx.y)
        ctx.lineTo(cornerPx.x - sx * size, cornerPx.y)
        ctx.lineTo(cornerPx.x - sx * size, cornerPx.y + sy * size)
        ctx.lineTo(cornerPx.x, cornerPx.y + sy * size)
        ctx.stroke()
        ctx.restore()
      }
    }

    points.forEach((point, index) => {
      const color = index === 0 ? colors.pointA : colors.pointB
      const screen = toPx(point)
      ctx.fillStyle = color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      if (coordLabelsVisible || hoverIndex === index || dragRef.current === index) {
        drawPointLabel(ctx, point, screen, color, canvasSize.width, canvasSize.height)
      }
    })
  }, [canvasSize, constants, coordLabelsVisible, corner, distance, dx, dy, hasBoth, hoverIndex, liveMode, pointA, pointB, points, progress, revealed.d, revealed.h, revealed.v, showWorking, toPx])

  useEffect(() => {
    draw()
  }, [draw])

  const canvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const pos = canvasPoint(event)
    if (hasBoth) {
      const hit = points.findIndex((point) => {
        const screen = toPx(point)
        return Math.hypot(screen.x - pos.x, screen.y - pos.y) <= 18
      })
      if (hit >= 0) {
        cancelAnimation()
        setLiveMode(true)
        setProgress({ h: 1, v: 1, d: 1 })
        setRevealed({ h: true, v: true, d: true })
        dragRef.current = hit
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      return
    }

    const grid = toGrid(pos.x, pos.y)
    if (points.length === 1 && samePoint(points[0], grid)) return
    const nextPoints = [...points, grid]
    setPoints(nextPoints)
    flashCoordinateLabels()
    if (nextPoints.length === 2) {
      setLiveMode(false)
      startAnimation()
    }
  }

  const handlePointerMove = (event) => {
    const pos = canvasPoint(event)
    if (dragRef.current === null) {
      const hit = points.findIndex((point) => {
        const screen = toPx(point)
        return Math.hypot(screen.x - pos.x, screen.y - pos.y) <= 18
      })
      setHoverIndex(hit >= 0 ? hit : null)
      return
    }
    const grid = toGrid(pos.x, pos.y)
    setPoints((old) => {
      const other = old[dragRef.current === 0 ? 1 : 0]
      if (samePoint(other, grid)) return old
      return old.map((point, index) => index === dragRef.current ? grid : point)
    })
  }

  const stopDragging = () => {
    dragRef.current = null
  }

  const leaveCanvas = () => {
    setHoverIndex(null)
    stopDragging()
  }

  const activeH = liveMode || revealed.h
  const activeV = liveMode || revealed.v
  const activeD = liveMode || revealed.d

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-1.5 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <section className="grid min-h-0 flex-1 grid-cols-[590px_1fr] gap-2">
        <div ref={wrapRef} className="min-h-0 overflow-hidden rounded-[14px] border bg-white shadow-sm" style={{ borderColor: colors.border }}>
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={leaveCanvas}
            aria-label="Coordinate plane distance grid"
          />
        </div>

        <div className="flex min-h-0 flex-col gap-1">
          <div className="grid grid-cols-1 gap-0.5">
            <StatCard title="Horizontal (a)" value={hasBoth ? dx : '-'} color={colors.horizontal} tint={colors.horizontalTint} active={activeH} />
            <StatCard title="Vertical (b)" value={hasBoth ? dy : '-'} color={colors.vertical} tint={colors.verticalTint} active={activeV} />
            <StatCard title="Distance (c)" value={hasBoth && showWorking ? formatDistance(distance) : '-'} color={colors.distance} tint={colors.distanceTint} active={activeD} />
          </div>

          <button
            type="button"
            onClick={() => setShowWorking((current) => !current)}
            className="rounded-full border bg-white px-3 py-1 text-sm font-black"
            style={{ borderColor: colors.distance, color: colors.distance }}
          >
            {showWorking ? 'Hide working' : 'Show working'}
          </button>

          {showWorking && (
            <div className="rounded-[14px] border bg-white p-1.5" style={{ borderColor: colors.border }}>
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-500">Working</p>
              <div className="space-y-0">
                <WorkingLine active={activeH}>
                  <ColorToken color={colors.horizontal}>a</ColorToken><sup>2</sup> + <ColorToken color={colors.vertical}>b</ColorToken><sup>2</sup> = <ColorToken color={colors.distance}>c</ColorToken><sup>2</sup>
                </WorkingLine>
                <WorkingLine active={activeH && activeV}>
                  <ColorToken color={colors.horizontal}>{dx}</ColorToken><sup>2</sup> + <ColorToken color={colors.vertical}>{dy}</ColorToken><sup>2</sup> = <ColorToken color={colors.distance}>c</ColorToken><sup>2</sup>
                </WorkingLine>
                <WorkingLine active={activeH && activeV}>
                  <ColorToken color={colors.horizontal}>{dx * dx}</ColorToken> + <ColorToken color={colors.vertical}>{dy * dy}</ColorToken> = <ColorToken color={colors.distance}>{sumSquares}</ColorToken>
                </WorkingLine>
                <WorkingLine active={activeD} large>
                  <ColorToken color={colors.distance}>c</ColorToken> = <Radical value={sumSquares} /> = <ColorToken color={colors.distance}>{formatDistance(distance)}</ColorToken>
                </WorkingLine>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={clearPoints} className="flex-1 rounded-full border bg-white px-3 py-1 text-sm font-black" style={{ borderColor: colors.border }}>
              New points
            </button>
            <button type="button" onClick={startAnimation} disabled={!hasBoth} className="flex-1 rounded-full px-3 py-1 text-sm font-black text-white disabled:opacity-40" style={{ background: colors.distance }}>
              Replay
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
