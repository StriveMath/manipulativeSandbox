import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  rise: '#0F6E56',
  run: '#185FA5',
  slope: '#534AB7',
  pointA: '#534AB7',
  pointB: '#993556',
  grid: '#DEDAD1',
  cardBorder: '#E0DDD6',
}

const presets = [
  { label: 'Positive', a: { x: -4, y: -2 }, b: { x: 3, y: 3 } },
  { label: 'Negative', a: { x: -4, y: 4 }, b: { x: 4, y: -2 } },
  { label: 'Zero', a: { x: -5, y: 2 }, b: { x: 5, y: 2 } },
  { label: 'Undefined', a: { x: 2, y: -4 }, b: { x: 2, y: 4 } },
  { label: 'Steep', a: { x: -2, y: -5 }, b: { x: 0, y: 5 } },
  { label: 'Gentle', a: { x: -6, y: -1 }, b: { x: 6, y: 2 } },
]

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function signed(value) {
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : `${value}`
}

function slopeText(rise, run) {
  if (run === 0) return 'undefined'
  const value = rise / run
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function drawPointLabel(ctx, point, screen, label, color, canvasWidth) {
  const text = `${label} (${point.x}, ${point.y})`
  ctx.save()
  ctx.font = '800 13px Inter, sans-serif'
  const width = ctx.measureText(text).width + 18
  const x = clamp(screen.x, width / 2 + 8, canvasWidth - width / 2 - 8)
  const y = Math.max(18, screen.y - 30)
  ctx.fillStyle = `${color}22`
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  roundRect(ctx, x - width / 2, y - 15, width, 30, 15)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawArrowLine(ctx, from, to, color, label, progress = 1) {
  const x = from.x + (to.x - from.x) * progress
  const y = from.y + (to.y - from.y) * progress

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2.25
  ctx.lineCap = 'round'
  ctx.setLineDash([1, 7])
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.setLineDash([])

  if (progress > 0.92) {
    ctx.fillStyle = color
    ctx.font = '900 14px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lx = (from.x + to.x) / 2
    const ly = (from.y + to.y) / 2
    const vertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x)
    ctx.fillText(label, lx + (vertical ? 22 : 0), ly + (vertical ? 0 : -22))
  }
  ctx.restore()
}

function StatCard({ title, value, color, active, hideValue = false }) {
  return (
    <div
      className={`rounded-xl border-[1.5px] bg-white px-3 py-2 transition-all ${active ? 'opacity-100' : 'opacity-35'}`}
      style={{ borderColor: color }}
    >
      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color }}>
        {title}
      </p>
      <p className="mt-0.5 text-xl font-black" style={{ color }}>
        <span className={hideValue ? 'opacity-0 select-none' : 'opacity-100'}>{value}</span>
      </p>
    </div>
  )
}

export default function SlopeExplorer() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 760, height: 280 })
  const [points, setPoints] = useState([])
  const [riseT, setRiseT] = useState(1)
  const [runT, setRunT] = useState(1)
  const [revealed, setRevealed] = useState({ rise: false, run: false, slope: false })
  const [liveMode, setLiveMode] = useState(false)
  const [hideMeasurements, setHideMeasurements] = useState(true)

  const hasBoth = points.length === 2
  const a = points[0]
  const b = points[1]
  const rise = hasBoth ? b.y - a.y : 0
  const run = hasBoth ? b.x - a.x : 0
  const slope = slopeText(rise, run)
  const showRise = hasBoth && (liveMode || revealed.rise)
  const showRun = hasBoth && (liveMode || revealed.run)
  const showSlope = hasBoth && (liveMode || revealed.slope)

  const constants = useMemo(() => {
    const cell = (canvasSize.height - 56) / 14
    const originX = canvasSize.width / 2
    const originY = canvasSize.height / 2
    const minX = Math.floor((0 - originX) / cell)
    const maxX = Math.ceil((canvasSize.width - originX) / cell)
    return { cell, originX, originY, minX, maxX, minY: -7, maxY: 7 }
  }, [canvasSize])

  const toPx = useCallback((point) => ({
    x: constants.originX + point.x * constants.cell,
    y: constants.originY - point.y * constants.cell,
  }), [constants])

  const toGrid = useCallback((x, y) => ({
    x: clamp(Math.round((x - constants.originX) / constants.cell), constants.minX, constants.maxX),
    y: clamp(Math.round((constants.originY - y) / constants.cell), constants.minY, constants.maxY),
  }), [constants])

  const cancelAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const startAnimation = useCallback(() => {
    cancelAnimation()
    setLiveMode(false)
    setRiseT(0)
    setRunT(0)
    setRevealed({ rise: false, run: false, slope: false })

    const start = performance.now()
    const riseDuration = 780
    const runDuration = 780
    const slopeDuration = 630

    const tick = (now) => {
      const elapsed = now - start
      if (elapsed < riseDuration) {
        setRiseT(easeInOut(elapsed / riseDuration))
        setRunT(0)
      } else if (elapsed < riseDuration + runDuration) {
        setRiseT(1)
        setRunT(easeInOut((elapsed - riseDuration) / runDuration))
        setRevealed((current) => current.rise ? current : { ...current, rise: true })
      } else if (elapsed < riseDuration + runDuration + slopeDuration) {
        setRiseT(1)
        setRunT(1)
        setRevealed((current) => current.run ? current : { ...current, rise: true, run: true })
      } else {
        frameRef.current = null
        setRiseT(1)
        setRunT(1)
        setRevealed({ rise: true, run: true, slope: true })
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [cancelAnimation])

  const switchToLive = useCallback(() => {
    cancelAnimation()
    setLiveMode(true)
    setRiseT(1)
    setRunT(1)
    setRevealed({ rise: true, run: true, slope: true })
  }, [cancelAnimation])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const update = () => setCanvasSize({ width: Math.max(340, Math.floor(node.clientWidth)), height: 280 })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => cancelAnimation(), [cancelAnimation])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const draw = (rProgress = 1, runProgress = 1) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

      ctx.strokeStyle = colors.grid
      ctx.lineWidth = 1
      for (let x = constants.minX; x <= constants.maxX; x += 1) {
        const px = constants.originX + x * constants.cell
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, canvasSize.height)
        ctx.stroke()
      }
      for (let y = constants.minY; y <= constants.maxY; y += 1) {
        const py = constants.originY - y * constants.cell
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(canvasSize.width, py)
        ctx.stroke()
      }

      ctx.strokeStyle = colors.ink
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, constants.originY)
      ctx.lineTo(canvasSize.width, constants.originY)
      ctx.moveTo(constants.originX, 0)
      ctx.lineTo(constants.originX, canvasSize.height)
      ctx.stroke()

      ctx.fillStyle = '#5F5E5A'
      ctx.font = '11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let x = constants.minX; x <= constants.maxX; x += 2) {
        const px = constants.originX + x * constants.cell
        if (px > 12 && px < canvasSize.width - 12) ctx.fillText(String(x), px, constants.originY + 5)
      }
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let y = constants.minY; y <= constants.maxY; y += 2) {
        if (y !== 0) ctx.fillText(String(y), constants.originX - 6, constants.originY - y * constants.cell)
      }

      if (hasBoth) {
        const pa = toPx(a)
        const pb = toPx(b)
        const corner = { x: pb.x, y: pb.y }

        if (!hideMeasurements) {
          const dx = pb.x - pa.x
          const dy = pb.y - pa.y
          const leftEdge = { x: 0, y: pa.y - (dy / (dx || 1)) * pa.x }
          const rightEdge = { x: canvasSize.width, y: pa.y + (dy / (dx || 1)) * (canvasSize.width - pa.x) }
          if (run === 0) {
            ctx.strokeStyle = colors.slope
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(pa.x, 0)
            ctx.lineTo(pa.x, canvasSize.height)
            ctx.stroke()
          } else {
            ctx.strokeStyle = colors.slope
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(leftEdge.x, leftEdge.y)
            ctx.lineTo(rightEdge.x, rightEdge.y)
            ctx.stroke()
          }
        }

        if (showRise || rProgress > 0) {
          drawArrowLine(ctx, pa, { x: pa.x, y: pb.y }, colors.rise, hideMeasurements ? '' : signed(rise), rProgress)
        }
        if (showRun || runProgress > 0) {
          drawArrowLine(ctx, { x: pa.x, y: pb.y }, corner, colors.run, hideMeasurements ? '' : signed(run), runProgress)
        }
      }

      points.forEach((point, index) => {
        const screen = toPx(point)
        const color = index === 0 ? colors.pointA : colors.pointB
        ctx.save()
        ctx.fillStyle = color
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(screen.x, screen.y, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        drawPointLabel(ctx, point, screen, index === 0 ? 'A' : 'B', color, canvasSize.width)
        ctx.restore()
      })
    }

    draw(riseT, runT)
  }, [a, b, canvasSize, constants, hasBoth, hideMeasurements, points, rise, riseT, run, runT, showRise, showRun, toPx])

  const canvasPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const point = canvasPoint(event)
    const hitIndex = points.findIndex((gridPoint) => {
      const screen = toPx(gridPoint)
      return Math.hypot(screen.x - point.x, screen.y - point.y) <= 16
    })

    if (hitIndex !== -1) {
      switchToLive()
      dragRef.current = hitIndex
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (points.length < 2) {
      const next = [...points, toGrid(point.x, point.y)]
      setPoints(next)
      setHideMeasurements(true)
      if (next.length === 2) setTimeout(startAnimation, 0)
    }
  }

  const handlePointerMove = (event) => {
    if (dragRef.current === null) return
    const point = canvasPoint(event)
    const gridPoint = toGrid(point.x, point.y)
    setPoints((current) => current.map((item, index) => (index === dragRef.current ? gridPoint : item)))
  }

  const stopDragging = () => {
    dragRef.current = null
  }

  const clearPoints = () => {
    cancelAnimation()
    setPoints([])
    setLiveMode(false)
    setHideMeasurements(true)
    setRiseT(1)
    setRunT(1)
    setRevealed({ rise: false, run: false, slope: false })
  }

  const applyPreset = (preset) => {
    cancelAnimation()
    setHideMeasurements(false)
    setPoints([preset.a, preset.b])
    setTimeout(startAnimation, 0)
  }

  const hint = (() => {
    if (!hasBoth) return points.length === 0 ? 'Click the grid to place point A, then click again for point B.' : 'Now click a second point to make a line.'
    if (run === 0) return "Undefined slope means the run is 0, so you can't divide by zero."
    if (rise === 0) return 'Zero slope means there is no rise, so the line is horizontal.'
    if (rise / run > 0) return 'Positive slope rises as you move from left to right.'
    return 'Negative slope falls as you move from left to right.'
  })()

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <div className="grid grid-cols-3 gap-2">
        <StatCard title="Rise" value={hasBoth ? signed(rise) : '-'} color={colors.rise} active={showRise} hideValue={hideMeasurements} />
        <StatCard title="Run" value={hasBoth ? signed(run) : '-'} color={colors.run} active={showRun} hideValue={hideMeasurements} />
        <StatCard title="Slope" value={hasBoth ? (run === 0 ? 'undefined' : slope) : '-'} color={colors.slope} active={showSlope} hideValue={hideMeasurements} />
      </div>

      <div ref={wrapRef} className="relative overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <button
          type="button"
          onClick={() => setHideMeasurements((current) => !current)}
          className={`absolute right-2 top-2 z-10 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${hideMeasurements ? 'bg-[#1A1A2E] text-white' : 'bg-white text-[#1A1A2E]'}`}
          style={{ borderColor: colors.ink }}
        >
          {hideMeasurements ? 'Show values' : 'Hide values'}
        </button>
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        />
      </div>

      <div className="flex h-[48px] shrink-0 items-center justify-center rounded-xl border border-[#E0DDD6] bg-white px-3 text-center text-lg font-black">
        {!hideMeasurements ? (
          <div className="leading-tight">
            <span style={{ color: colors.slope }}>slope</span>
            <span className={hasBoth ? 'opacity-100' : 'opacity-30'}> = </span>
            <span className={showRise ? 'opacity-100' : 'opacity-25'}>
              <span style={{ color: colors.rise }}>rise</span>
              <span>/</span>
              <span style={{ color: colors.run }}>run</span>
            </span>
            <span className={showRun ? 'opacity-100' : 'opacity-25'}>
              {' = '}
              <span style={{ color: colors.rise }}>{hasBoth ? rise : '?'}</span>
              <span>/</span>
              <span style={{ color: colors.run }}>{hasBoth ? run : '?'}</span>
            </span>
            <span className={showSlope ? 'opacity-100' : 'opacity-25'}>
              {' = '}
              <span style={{ color: colors.slope }}>{hasBoth ? slope : '?'}</span>
            </span>
          </div>
        ) : (
          <div className="text-sm leading-tight text-[#5F5E5A]">
            Work out the slope yourself, then show the values to check.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={clearPoints} className="rounded-full border border-[#D9D6CF] bg-white px-3 py-1.5 text-xs font-black text-[#5F5E5A]">
          Place new points
        </button>
        <button type="button" onClick={hasBoth ? startAnimation : undefined} className="rounded-full bg-[#534AB7] px-3 py-1.5 text-xs font-black text-white disabled:opacity-40" disabled={!hasBoth}>
          Replay
        </button>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-full border border-[#E0DDD6] bg-white px-3 py-1.5 text-xs font-black text-[#1A1A2E]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-[#5F5E5A]">{hint}</p>
    </div>
  )
}
