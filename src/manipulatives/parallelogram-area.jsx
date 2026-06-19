import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const canvasWidth = 760
const canvasHeight = 345
const minBase = 80
const maxBase = 220
const minHeight = 40
const maxHeight = 130
const minSkew = 10
const maxSkew = 70
const animationMs = 1150
const drawingScale = 1.2

const sliderAccent = {
  blue: '#2563eb',
  orange: '#f97316',
  emerald: '#10b981',
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const pointInTriangle = (point, a, b, c) => {
  const area =
    0.5 *
    (-b.y * c.x +
      a.y * (-b.x + c.x) +
      a.x * (b.y - c.y) +
      b.x * c.y)
  const s =
    (1 / (2 * area)) *
    (a.y * c.x - a.x * c.y + (c.y - a.y) * point.x + (a.x - c.x) * point.y)
  const t =
    (1 / (2 * area)) *
    (a.x * b.y - a.y * b.x + (a.y - b.y) * point.x + (b.x - a.x) * point.y)

  return s >= 0 && t >= 0 && 1 - s - t >= 0
}

function Slider({ label, value, min, max, color, onChange }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-700">
      <span className="flex items-center justify-between">
        {label}
        <span className="tabular-nums text-slate-500">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer"
        style={{ accentColor: sliderAccent[color] }}
      />
    </label>
  )
}

export default function ParallelogramArea() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const progressRef = useRef(0)
  const [base, setBase] = useState(150)
  const [height, setHeight] = useState(85)
  const [skew, setSkew] = useState(40)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('ready')

  const area = base * height

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const resetAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    dragRef.current = null
    setProgress(0)
    setPhase('ready')
  }, [])

  const updateBase = (nextBase) => {
    resetAnimation()
    setBase(nextBase)
  }

  const updateHeight = (nextHeight) => {
    resetAnimation()
    setHeight(nextHeight)
  }

  const updateSkew = (nextSkew) => {
    resetAnimation()
    setSkew(nextSkew)
  }

  const geometry = useMemo(() => {
    const visualBase = base * drawingScale
    const visualHeight = height * drawingScale
    const visualSkew = skew * drawingScale
    const left = Math.round((canvasWidth - visualBase - visualSkew) / 2)
    const top = 64
    const bottom = top + visualHeight
    const rectangleLeft = left + visualSkew
    const rectangleRight = rectangleLeft + visualBase

    return {
      left,
      top,
      bottom,
      rectangleLeft,
      rectangleRight,
      visualBase,
      visualHeight,
      visualSkew,
      points: {
        a: { x: left, y: bottom },
        b: { x: left + visualSkew, y: top },
        c: { x: left + visualSkew + visualBase, y: top },
        d: { x: left + visualBase, y: bottom },
        e: { x: left + visualSkew, y: bottom },
      },
    }
  }, [base, height, skew])

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { points, top, bottom, rectangleLeft, visualBase, visualHeight } = geometry
    const triangleShift = progressRef.current * visualBase
    const triangle = [
      { x: points.a.x + triangleShift, y: points.a.y },
      { x: points.b.x + triangleShift, y: points.b.y },
      { x: points.e.x + triangleShift, y: points.e.y },
    ]
    const drawTrianglePath = () => {
      ctx.beginPath()
      ctx.moveTo(triangle[0].x, triangle[0].y)
      ctx.lineTo(triangle[1].x, triangle[1].y)
      ctx.lineTo(triangle[2].x, triangle[2].y)
      ctx.closePath()
    }

    const drawStripeOverlay = () => {
      ctx.save()
      drawTrianglePath()
      ctx.clip()
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)'
      ctx.lineWidth = 3

      for (let x = triangle[0].x - visualHeight - 25; x < triangle[2].x + visualHeight; x += 13) {
        ctx.beginPath()
        ctx.moveTo(x, bottom + 18)
        ctx.lineTo(x + visualHeight + 48, top - 18)
        ctx.stroke()
      }

      ctx.restore()
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    ctx.fillStyle = '#bfdbfe'
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 3

    if (progress >= 1) {
      ctx.beginPath()
      ctx.rect(rectangleLeft, top, visualBase, visualHeight)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(points.b.x, points.b.y)
      ctx.lineTo(points.c.x, points.c.y)
      ctx.lineTo(points.d.x, points.d.y)
      ctx.lineTo(points.e.x, points.e.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    drawTrianglePath()
    ctx.fillStyle = '#bfdbfe'
    ctx.strokeStyle = '#1d4ed8'
    ctx.fill()
    ctx.stroke()
    drawStripeOverlay()

    ctx.setLineDash([7, 6])
    ctx.lineWidth = 2

    const heightLineX = points.b.x - 62
    ctx.strokeStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(heightLineX, top)
    ctx.lineTo(heightLineX, bottom)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(heightLineX - 9, top)
    ctx.lineTo(heightLineX + 9, top)
    ctx.moveTo(heightLineX - 9, bottom)
    ctx.lineTo(heightLineX + 9, bottom)
    ctx.stroke()

    ctx.fillStyle = '#ea580c'
    ctx.font = '700 17px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`h = ${height}`, heightLineX - 10, top + height / 2 + 6)

    const baseLineStart = points.a.x
    const baseLineEnd = points.d.x
    const baseLineCenter = baseLineStart + visualBase / 2

    ctx.setLineDash([7, 6])
    ctx.strokeStyle = '#2563eb'
    ctx.beginPath()
    ctx.moveTo(baseLineStart, bottom + 28)
    ctx.lineTo(baseLineEnd, bottom + 28)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(baseLineStart, bottom + 19)
    ctx.lineTo(baseLineStart, bottom + 37)
    ctx.moveTo(baseLineEnd, bottom + 19)
    ctx.lineTo(baseLineEnd, bottom + 37)
    ctx.stroke()

    ctx.fillStyle = '#1d4ed8'
    ctx.font = '700 17px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`b = ${base}`, baseLineCenter, bottom + 54)

    const centerX = (points.a.x + points.c.x) / 2
    const formulaY = canvasHeight - 18
    const formulaParts = [
      { text: 'Area = ', color: '#0f172a' },
      { text: 'b', color: '#1d4ed8' },
      { text: ' x ', color: '#0f172a' },
      { text: 'h', color: '#ea580c' },
      { text: ` = ${area.toLocaleString()}`, color: '#0f172a' },
    ]

    ctx.font = '800 22px Inter, system-ui, sans-serif'
    const formulaWidth = formulaParts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0)
    let formulaX = centerX - formulaWidth / 2
    formulaParts.forEach((part) => {
      ctx.fillStyle = part.color
      ctx.textAlign = 'left'
      ctx.fillText(part.text, formulaX, formulaY)
      formulaX += ctx.measureText(part.text).width
    })
  }, [area, base, geometry, height, phase, progress])

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const slideTriangle = () => {
    if (phase === 'sliding' || progress >= 1) return
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    setPhase('sliding')
    const start = performance.now()
    const startProgress = progress
    const remaining = 1 - startProgress

    const tick = (now) => {
      const elapsed = Math.min(1, (now - start) / animationMs)
      const nextProgress = startProgress + remaining * easeInOut(elapsed)
      setProgress(nextProgress)

      if (elapsed < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setProgress(1)
        setPhase('done')
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const resetValues = () => {
    setBase(150)
    setHeight(85)
    setSkew(40)
    resetAnimation()
  }

  const beginDrag = (event) => {
    const canvas = canvasRef.current
    const point = getCanvasPoint(event)
    const { points, visualBase } = geometry
    const triangleShift = progress * visualBase
    const triangle = [
      { x: points.a.x + triangleShift, y: points.a.y },
      { x: points.b.x + triangleShift, y: points.b.y },
      { x: points.e.x + triangleShift, y: points.e.y },
    ]

    if (!pointInTriangle(point, triangle[0], triangle[1], triangle[2])) return
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    canvas.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      currentProgress: progressRef.current,
      startProgress: progressRef.current,
    }
    setPhase('dragging')
  }

  const dragTriangle = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const point = getCanvasPoint(event)
    const delta = point.x - dragRef.current.startX
    const nextProgress = clamp(
      dragRef.current.startProgress + delta / geometry.visualBase,
      0,
      1,
    )
    dragRef.current.currentProgress = nextProgress
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }

  const endDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const finalProgress = dragRef.current.currentProgress
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (finalProgress > 0.96) {
      setProgress(1)
      setPhase('done')
    } else if (finalProgress < 0.04) {
      setProgress(0)
      setPhase('ready')
    } else {
      setPhase('ready')
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 px-5 py-4 text-slate-900">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={beginDrag}
        onPointerMove={dragTriangle}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="touch-none cursor-grab rounded border border-slate-200 bg-slate-50 active:cursor-grabbing"
        aria-label="Animated area model for a parallelogram transforming into a rectangle"
      />

      <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
        <Slider
          label="Base"
          value={base}
          min={minBase}
          max={maxBase}
          color="blue"
          onChange={updateBase}
        />
        <Slider
          label="Height"
          value={height}
          min={minHeight}
          max={maxHeight}
          color="orange"
          onChange={updateHeight}
        />
        <Slider
          label="Slant"
          value={skew}
          min={minSkew}
          max={maxSkew}
          color="emerald"
          onChange={updateSkew}
        />
        <div className="flex gap-2">
          {phase === 'done' ? (
            <button
              type="button"
              onClick={resetAnimation}
              className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              Slide back
            </button>
          ) : (
            <button
              type="button"
              onClick={slideTriangle}
              disabled={phase === 'sliding'}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              Slide triangle
            </button>
          )}
          <button
            type="button"
            onClick={resetValues}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
