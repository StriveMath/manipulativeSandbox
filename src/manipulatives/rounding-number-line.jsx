import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const numberPurple = '#7C3AED'
const roundGreen = '#1D9E75'
const midGray = '#9AA0AA'
const axisColor = '#1A1A2E'

const GHOST_MS = 680
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

// Range and defaults per rounding place.
const CONFIG = {
  1: { max: 5, step: 0.1, def: 2.7 },
  10: { max: 50, step: 1, def: 27 },
  100: { max: 500, step: 1, def: 270 },
}

export default function RoundingNumberLine() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [base, setBase] = useState(10)
  const [n, setN] = useState(27)
  const [hideAnswer, setHideAnswer] = useState(false)
  const draggingRef = useRef(false)
  const nRef = useRef(27)
  const ghostRef = useRef(null)
  const ghostRafRef = useRef(null)

  const canvasHeight = 260
  const min = 0
  const max = CONFIG[base].max
  const step = CONFIG[base].step

  const fmt = (v) => (base === 1 ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v))
  const roundOf = useCallback(
    (v) => {
      const lower = Math.floor(v / base) * base
      return v - lower >= base / 2 ? lower + base : lower
    },
    [base],
  )

  const lower = Math.floor(n / base) * base
  const upper = Math.min(max, lower + base)
  const mid = lower + base / 2
  const rounded = roundOf(n)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setCanvasWidth(Math.max(420, Math.round(node.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const geo = useMemo(() => {
    const PAD = 56
    const axisY = canvasHeight * 0.56
    const spanX = canvasWidth - PAD * 2
    const xFor = (v) => PAD + ((v - min) / (max - min)) * spanX
    const vFor = (x) => {
      const raw = ((x - PAD) / spanX) * (max - min) + min
      const snapped = Math.round(raw / step) * step
      return clamp(base === 1 ? Math.round(snapped * 10) / 10 : snapped, min, max)
    }
    return { PAD, axisY, spanX, xFor, vFor }
  }, [canvasWidth, max, step, base])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cw = Math.round(canvasWidth * dpr)
    const ch = Math.round(canvasHeight * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const { PAD, axisY, xFor } = geo
    const minorStep = base / 10

    // Highlight band for the bracketing interval.
    ctx.fillStyle = 'rgba(29, 158, 117, 0.08)'
    ctx.fillRect(xFor(lower), axisY - 54, xFor(upper) - xFor(lower), 108)

    // Axis + arrowheads.
    ctx.strokeStyle = axisColor
    ctx.fillStyle = axisColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(PAD - 14, axisY)
    ctx.lineTo(canvasWidth - PAD + 14, axisY)
    ctx.stroke()
    ;[[PAD - 14, -1], [canvasWidth - PAD + 14, 1]].forEach(([x, dir]) => {
      ctx.beginPath()
      ctx.moveTo(x, axisY)
      ctx.lineTo(x - dir * 9, axisY - 5)
      ctx.lineTo(x - dir * 9, axisY + 5)
      ctx.closePath()
      ctx.fill()
    })

    // Ticks.
    ctx.textAlign = 'center'
    for (let v = min; v <= max + 1e-6; v += minorStep) {
      const x = xFor(v)
      const isMajor = Math.abs(v / base - Math.round(v / base)) < 1e-6
      ctx.strokeStyle = '#B9BDC6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, axisY - (isMajor ? 10 : 5))
      ctx.lineTo(x, axisY + (isMajor ? 10 : 5))
      ctx.stroke()
      if (isMajor) {
        ctx.fillStyle = '#8B8F99'
        ctx.font = '600 12px Inter, system-ui, sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(fmt(Math.round(v / base) * base), x, axisY + 14)
      }
    }

    // Midpoint (the tiebreaker).
    ctx.strokeStyle = midGray
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(xFor(mid), axisY - 52)
    ctx.lineTo(xFor(mid), axisY + 24)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = midGray
    ctx.font = '700 12px Inter, system-ui, sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`halfway ${fmt(mid)}`, xFor(mid), axisY - 54)

    // Bracketing benchmarks.
    ;[lower, upper].forEach((v) => {
      const isTarget = !hideAnswer && v === rounded
      const x = xFor(v)
      ctx.fillStyle = isTarget ? roundGreen : '#C4C8D0'
      ctx.beginPath()
      ctx.arc(x, axisY, isTarget ? 9 : 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = isTarget ? roundGreen : '#6B7280'
      ctx.font = `${isTarget ? '900' : '700'} 15px Inter, system-ui, sans-serif`
      ctx.textBaseline = 'bottom'
      ctx.fillText(fmt(v), x, axisY + 42)
    })

    // Straight "rounds to" arrow: a horizontal green line ending in an
    // arrowhead whose tip sits over the target benchmark.
    if (!hideAnswer && rounded !== n) {
      const x1 = xFor(n)
      const x2 = xFor(rounded)
      const y = axisY - 30
      const dir = x2 >= x1 ? 1 : -1
      ctx.strokeStyle = roundGreen
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(x1, y)
      ctx.lineTo(x2 - dir * 8, y)
      ctx.stroke()
      ctx.fillStyle = roundGreen
      ctx.beginPath()
      ctx.moveTo(x2, y)
      ctx.lineTo(x2 - dir * 10, y - 6)
      ctx.lineTo(x2 - dir * 10, y + 6)
      ctx.closePath()
      ctx.fill()
    }

    // Ghost point floating from the number to its rounded value.
    if (ghostRef.current) {
      const g = ghostRef.current
      const t = clamp((performance.now() - g.start) / GHOST_MS, 0, 1)
      const gx = g.fromX + (g.toX - g.fromX) * easeOut(t)
      const gy = axisY - 26 * Math.sin(Math.PI * t)
      ctx.globalAlpha = 0.6 * (1 - t)
      ctx.fillStyle = numberPurple
      ctx.beginPath()
      ctx.arc(gx, gy, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Draggable number marker + pill.
    const nx = xFor(n)
    ctx.strokeStyle = numberPurple
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(nx, axisY - 6)
    ctx.lineTo(nx, axisY + 6)
    ctx.stroke()
    ctx.fillStyle = numberPurple
    ctx.beginPath()
    ctx.arc(nx, axisY, 8, 0, Math.PI * 2)
    ctx.fill()
    const label = fmt(n)
    ctx.font = '900 16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    const w = ctx.measureText(label).width + 16
    ctx.beginPath()
    ctx.roundRect(nx - w / 2, axisY - 78, w, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, nx, axisY - 64)
    ctx.fillStyle = numberPurple
    ctx.beginPath()
    ctx.moveTo(nx - 5, axisY - 52)
    ctx.lineTo(nx + 5, axisY - 52)
    ctx.lineTo(nx, axisY - 46)
    ctx.closePath()
    ctx.fill()
  }, [canvasWidth, geo, base, n, lower, upper, mid, rounded, hideAnswer])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => () => {
    if (ghostRafRef.current) cancelAnimationFrame(ghostRafRef.current)
  }, [])

  const runGhost = useCallback(() => {
    if (ghostRafRef.current) cancelAnimationFrame(ghostRafRef.current)
    const tick = () => {
      const g = ghostRef.current
      if (!g) return
      if (performance.now() - g.start >= GHOST_MS) {
        ghostRef.current = null
        draw()
        return
      }
      draw()
      ghostRafRef.current = requestAnimationFrame(tick)
    }
    ghostRafRef.current = requestAnimationFrame(tick)
  }, [draw])

  const spawnGhost = (v) => {
    const rv = roundOf(v)
    if (rv === v) return
    ghostRef.current = { fromX: geo.xFor(v), toX: geo.xFor(rv), start: performance.now() }
    runGhost()
  }

  const setNumber = (v) => {
    nRef.current = v
    setN(v)
  }

  const getVal = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) * (canvasWidth / rect.width)
    return geo.vFor(x)
  }

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    ghostRef.current = null
    setNumber(getVal(event))
  }
  const handlePointerMove = (event) => {
    if (!draggingRef.current) return
    setNumber(getVal(event))
  }
  const handlePointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    spawnGhost(nRef.current) // ghost floats to the rounded value on release
  }

  const switchBase = (b) => {
    ghostRef.current = null
    setBase(b)
    setNumber(CONFIG[b].def)
  }

  const stepNumber = (dir) => {
    const v = clamp(Math.round((n + dir * step) / step) * step, min, max)
    setNumber(base === 1 ? Math.round(v * 10) / 10 : v)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
        <span style={{ color: numberPurple }}>{fmt(n)}</span>
        <span style={{ color: muted }}>rounds to</span>
        {hideAnswer ? <span style={{ color: muted }}>?</span> : <span style={{ color: roundGreen }}>{fmt(rounded)}</span>}
        <span className="text-base font-bold" style={{ color: muted }}>(nearest {base})</span>
      </div>

      <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <p className="text-center text-sm font-semibold" style={{ color: muted }}>
        Drag the number. Is it before or after the <b style={{ color: midGray }}>halfway</b> mark? That decides
        {base === 1 ? ' which whole number' : ` which ${base}`} it’s closer to.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-[#E0DDD6]">
          {[1, 10, 100].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => switchBase(b)}
              className="px-4 py-2 text-sm font-black"
              style={{ background: base === b ? numberPurple : '#ffffff', color: base === b ? '#ffffff' : muted }}
            >
              Nearest {b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: numberPurple }}>Number</span>
          <div className="grid grid-cols-[40px_58px_40px] items-center overflow-hidden rounded-full border border-[#E0DDD6] bg-white">
            <button type="button" onClick={() => stepNumber(-1)} className="h-10 text-2xl font-black" style={{ color: '#D85A30' }} aria-label="Decrease number">−</button>
            <span className="border-x border-[#E0DDD6] py-2 text-center text-lg font-black tabular-nums">{fmt(n)}</span>
            <button type="button" onClick={() => stepNumber(1)} className="h-10 text-2xl font-black" style={{ color: roundGreen }} aria-label="Increase number">+</button>
          </div>
        </div>
        <button type="button" onClick={() => setHideAnswer((h) => !h)} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          {hideAnswer ? 'Show answer' : 'Hide answer'}
        </button>
      </div>
    </div>
  )
}
