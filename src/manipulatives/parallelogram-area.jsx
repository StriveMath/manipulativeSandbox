import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const canvasWidth = 760
const canvasHeight = 275
const minBase = 80
const maxBase = 220
const minHeight = 40
const maxHeight = 130
const minSkew = 10
const maxSkew = 70
const animationMs = 1150

const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const sliderAccent = {
  blue: '#2563eb',
  orange: '#f97316',
  emerald: '#10b981',
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
  const [base, setBase] = useState(160)
  const [height, setHeight] = useState(90)
  const [skew, setSkew] = useState(46)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('ready')

  const area = base * height

  const resetAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
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
    const left = Math.round((canvasWidth - base - skew - 90) / 2)
    const top = 58
    const bottom = top + height
    const rectangleLeft = left + skew
    const rectangleRight = rectangleLeft + base

    return {
      left,
      top,
      bottom,
      rectangleLeft,
      rectangleRight,
      points: {
        a: { x: left, y: bottom },
        b: { x: left + skew, y: top },
        c: { x: left + skew + base, y: top },
        d: { x: left + base, y: bottom },
        e: { x: left + skew, y: bottom },
      },
    }
  }, [base, height, skew])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const { points, top, bottom, rectangleLeft, rectangleRight } = geometry
    const triangleShift = easeInOut(progress) * base
    const after = progress >= 1

    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    if (after) {
      ctx.fillStyle = '#dbeafe'
      ctx.strokeStyle = '#1d4ed8'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.rect(rectangleLeft, top, base, height)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#166534'
      ctx.font = '700 22px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Area = b × h ✓', rectangleLeft + base / 2, top - 22)
    } else {
      ctx.fillStyle = '#bfdbfe'
      ctx.strokeStyle = '#1d4ed8'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(points.b.x, points.b.y)
      ctx.lineTo(points.c.x, points.c.y)
      ctx.lineTo(points.d.x, points.d.y)
      ctx.lineTo(points.e.x, points.e.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#86efac'
      ctx.strokeStyle = '#15803d'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(points.a.x + triangleShift, points.a.y)
      ctx.lineTo(points.b.x + triangleShift, points.b.y)
      ctx.lineTo(points.e.x + triangleShift, points.e.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    ctx.setLineDash([7, 6])
    ctx.lineWidth = 2

    ctx.strokeStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(points.b.x - 12, top)
    ctx.lineTo(points.e.x - 12, bottom)
    ctx.stroke()
    ctx.fillStyle = '#ea580c'
    ctx.font = '700 18px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('h', points.b.x - 20, top + height / 2 + 6)

    ctx.strokeStyle = '#2563eb'
    ctx.beginPath()
    ctx.moveTo(rectangleLeft, bottom + 24)
    ctx.lineTo(rectangleRight, bottom + 24)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#1d4ed8'
    ctx.textAlign = 'center'
    ctx.fillText('b', rectangleLeft + base / 2, bottom + 48)

    ctx.fillStyle = '#475569'
    ctx.font = '600 13px Inter, system-ui, sans-serif'
    ctx.fillText('same base, same height, same area', rectangleLeft + base / 2, 250)
  }, [base, geometry, height, progress])

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const slideTriangle = () => {
    if (phase === 'sliding') return
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    setPhase('sliding')
    const start = performance.now()

    const tick = (now) => {
      const nextProgress = Math.min(1, (now - start) / animationMs)
      setProgress(nextProgress)

      if (nextProgress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setPhase('done')
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const resetValues = () => {
    setBase(160)
    setHeight(90)
    setSkew(46)
    resetAnimation()
  }

  const insight =
    phase === 'done'
      ? 'The moved triangle fills the missing corner, making a rectangle with the same base and height.'
      : phase === 'sliding'
        ? 'The green triangle is sliding across without stretching, so the total area stays unchanged.'
        : 'A parallelogram can be split into a center rectangle and a side triangle.'

  const stepLabel =
    phase === 'done'
      ? 'Rectangle formed'
      : phase === 'sliding'
        ? 'Triangle moving'
        : 'Start with a parallelogram'

  return (
    <div className="flex h-full flex-col bg-slate-50 px-5 py-4 text-slate-900">
      <div className="mb-3 grid grid-cols-3 gap-2 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Base</p>
          <p className="text-lg font-bold text-blue-700">{base}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Height</p>
          <p className="text-lg font-bold text-orange-600">{height}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Area = b × h</p>
          <p className="text-lg font-bold text-emerald-700">{area.toLocaleString()}</p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="rounded border border-slate-200 bg-slate-50"
        aria-label="Animated area model for a parallelogram transforming into a rectangle"
      />

      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
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
              ↩ Slide back
            </button>
          ) : (
            <button
              type="button"
              onClick={slideTriangle}
              disabled={phase === 'sliding'}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              Slide the triangle →
            </button>
          )}
          <button
            type="button"
            onClick={resetValues}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="mt-3 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <p className="text-sm font-bold text-slate-900">{stepLabel}</p>
        <p className="mt-1 text-sm text-slate-600">{insight}</p>
      </div>
    </div>
  )
}
