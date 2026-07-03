import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const numberPurple = '#7C3AED'
const roundGreen = '#1D9E75'
const midGray = '#9AA0AA'
const axisColor = '#1A1A2E'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function RoundingNumberLine() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [base, setBase] = useState(10) // round to nearest 10 or 100
  const [n, setN] = useState(47)
  const [hideAnswer, setHideAnswer] = useState(false)
  const draggingRef = useRef(false)

  const canvasHeight = 260
  const min = 0
  const max = base === 10 ? 100 : 1000

  const lower = Math.floor(n / base) * base
  const upper = Math.min(max, lower + base)
  const mid = lower + base / 2
  const rounded = n - lower >= base / 2 ? lower + base : lower

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
    const vFor = (x) => clamp(Math.round(((x - PAD) / spanX) * (max - min) + min), min, max)
    return { PAD, axisY, spanX, xFor, vFor }
  }, [canvasWidth, max])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== canvasWidth * dpr || canvas.height !== canvasHeight * dpr) {
      canvas.width = canvasWidth * dpr
      canvas.height = canvasHeight * dpr
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const { PAD, axisY, xFor } = geo
    const minorStep = base / 10

    // Highlight band for the bracketing interval [lower, upper].
    ctx.fillStyle = 'rgba(29, 158, 117, 0.08)'
    ctx.fillRect(xFor(lower), axisY - 54, xFor(upper) - xFor(lower), 108)

    // Axis line + arrowheads.
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
      const isMajor = v % base === 0
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
        ctx.fillText(String(v), x, axisY + 14)
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
    ctx.fillText(`halfway ${mid}`, xFor(mid), axisY - 54)

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
      ctx.fillText(String(v), x, axisY + 42)
    })

    // "rounds to" arrow from the number to the target benchmark.
    if (!hideAnswer && rounded !== n) {
      const x1 = xFor(n)
      const x2 = xFor(rounded)
      const topY = axisY - 30
      ctx.strokeStyle = roundGreen
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(x1, topY)
      ctx.quadraticCurveTo((x1 + x2) / 2, topY - 22, x2, topY)
      ctx.stroke()
      const dir = x2 >= x1 ? 1 : -1
      ctx.fillStyle = roundGreen
      ctx.beginPath()
      ctx.moveTo(x2, topY + 1)
      ctx.lineTo(x2 - dir * 9, topY - 6)
      ctx.lineTo(x2 - dir * 9, topY + 6)
      ctx.closePath()
      ctx.fill()
    }

    // The draggable number marker.
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
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // number label in a pill above
    ctx.fillStyle = numberPurple
    const label = String(n)
    ctx.font = '900 16px Inter, system-ui, sans-serif'
    const w = ctx.measureText(label).width + 16
    ctx.beginPath()
    ctx.roundRect(nx - w / 2, axisY - 78, w, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, nx, axisY - 64)
    // little pointer under the pill
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

  const getVal = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) * (canvasWidth / rect.width)
    return geo.vFor(x)
  }

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    setN(getVal(event))
  }
  const handlePointerMove = (event) => {
    if (!draggingRef.current) return
    setN(getVal(event))
  }
  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const switchBase = (b) => {
    setBase(b)
    setN(b === 10 ? 47 : 472)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      {/* Result */}
      <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
        <span style={{ color: numberPurple }}>{n}</span>
        <span style={{ color: muted }}>rounds to</span>
        {hideAnswer ? <span style={{ color: muted }}>?</span> : <span style={{ color: roundGreen }}>{rounded}</span>}
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
        Drag the number. Is it before or after the <b style={{ color: midGray }}>halfway</b> mark? That decides which {base} it’s closer to.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-[#E0DDD6]">
          {[10, 100].map((b) => (
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
          <div className="grid grid-cols-[40px_54px_40px] items-center overflow-hidden rounded-full border border-[#E0DDD6] bg-white">
            <button type="button" onClick={() => setN((v) => clamp(v - 1, min, max))} className="h-10 text-2xl font-black" style={{ color: '#D85A30' }} aria-label="Decrease number">−</button>
            <span className="border-x border-[#E0DDD6] py-2 text-center text-lg font-black tabular-nums">{n}</span>
            <button type="button" onClick={() => setN((v) => clamp(v + 1, min, max))} className="h-10 text-2xl font-black" style={{ color: roundGreen }} aria-label="Increase number">+</button>
          </div>
        </div>
        <button type="button" onClick={() => setHideAnswer((h) => !h)} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          {hideAnswer ? 'Show answer' : 'Hide answer'}
        </button>
      </div>
    </div>
  )
}
