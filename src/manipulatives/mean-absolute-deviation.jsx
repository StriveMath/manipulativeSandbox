import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const pointPurple = '#7C3AED'
const meanGreen = '#1D9E75'
const distOrange = '#D85A30'
const axisColor = '#1A1A2E'

const MIN = 0
const MAX = 20
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round1 = (v) => Math.round(v * 10) / 10
let seq = 0

export default function MeanAbsoluteDeviation() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [points, setPoints] = useState(() => [4, 7, 9, 16].map((v) => ({ id: (seq += 1), value: v })))
  const [drag, setDrag] = useState(null) // { id, startX, moved }

  const canvasHeight = 272

  const values = points.map((p) => p.value)
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  const distances = values.map((v) => Math.abs(v - mean))
  const mad = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    let raf = 0
    const commit = (w) => {
      const next = Math.max(420, Math.round(w))
      setCanvasWidth((prev) => (Math.abs(prev - next) >= 1 ? next : prev))
    }
    commit(node.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (!w) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => commit(w))
    })
    observer.observe(node)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const geo = useMemo(() => {
    const PAD = 46
    const axisY = canvasHeight - 74
    const spanX = canvasWidth - PAD * 2
    const xFor = (v) => PAD + ((v - MIN) / (MAX - MIN)) * spanX
    const vFor = (x) => clamp(Math.round(((x - PAD) / spanX) * (MAX - MIN) + MIN), MIN, MAX)
    return { PAD, axisY, spanX, xFor, vFor }
  }, [canvasWidth])

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
    const meanX = xFor(mean)

    // Shaded "typical" band: mean ± MAD (most points fall roughly this close).
    if (points.length && mad > 0.05) {
      const bx0 = xFor(Math.max(MIN, mean - mad))
      const bx1 = xFor(Math.min(MAX, mean + mad))
      ctx.fillStyle = 'rgba(29,158,117,0.12)'
      ctx.fillRect(bx0, axisY - 74, bx1 - bx0, 80)
    }

    // Axis + ticks.
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(PAD - 12, axisY)
    ctx.lineTo(canvasWidth - PAD + 12, axisY)
    ctx.stroke()
    for (let v = MIN; v <= MAX; v += 1) {
      const x = xFor(v)
      const major = v % 5 === 0
      ctx.strokeStyle = '#B9BDC6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, axisY - (major ? 7 : 4))
      ctx.lineTo(x, axisY + (major ? 7 : 4))
      ctx.stroke()
      if (major) {
        ctx.fillStyle = '#8B8F99'
        ctx.font = '600 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(String(v), x, axisY + 12)
      }
    }

    // Mean vertical line.
    ctx.strokeStyle = meanGreen
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(meanX, 40)
    ctx.lineTo(meanX, axisY + 8)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = meanGreen
    ctx.font = '900 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`mean = ${round1(mean)}`, meanX, 36)

    // Distance connectors (staggered), each showing |value - mean|.
    const ordered = points
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => Math.abs(b.value - mean) - Math.abs(a.value - mean))
    ordered.forEach((p, row) => {
      if (drag && drag.id === p.id) return
      const px = xFor(p.value)
      const y = axisY - 22 - row * 20
      const dist = Math.abs(p.value - mean)
      if (dist > 0.05) {
        ctx.strokeStyle = distOrange
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px, y)
        ctx.lineTo(meanX, y)
        ctx.stroke()
        // little drop lines
        ctx.setLineDash([2, 3])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px, y)
        ctx.lineTo(px, axisY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = distOrange
        ctx.font = '800 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(round1(dist).toString(), (px + meanX) / 2, y - 2)
      }
    })

    // MAD shown as a two-sided span (mean − MAD .. mean + MAD) below the axis.
    if (points.length && mad > 0.05) {
      const y2 = axisY + 34
      const lx = xFor(Math.max(MIN, mean - mad))
      const rx = xFor(Math.min(MAX, mean + mad))
      ctx.strokeStyle = meanGreen
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(lx, y2)
      ctx.lineTo(rx, y2)
      ctx.stroke()
      ;[[lx, -1], [rx, 1]].forEach(([x, d]) => {
        ctx.fillStyle = meanGreen
        ctx.beginPath()
        ctx.moveTo(x, y2)
        ctx.lineTo(x - d * 8, y2 - 5)
        ctx.lineTo(x - d * 8, y2 + 5)
        ctx.closePath()
        ctx.fill()
      })
      // tick down from the mean
      ctx.beginPath()
      ctx.moveTo(meanX, axisY + 10)
      ctx.lineTo(meanX, y2)
      ctx.stroke()
      ctx.fillStyle = meanGreen
      ctx.font = '900 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`MAD = ${round1(mad)} on each side of the mean`, meanX, y2 + 7)
    }

    // Data points.
    points.forEach((p) => {
      if (drag && drag.id === p.id) return
      const x = xFor(p.value)
      ctx.fillStyle = pointPurple
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, axisY, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(p.value), x, axisY)
    })
    if (drag) {
      const p = points.find((q) => q.id === drag.id)
      if (p) {
        const x = xFor(p.value)
        ctx.globalAlpha = 0.85
        ctx.fillStyle = pointPurple
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(x, axisY, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 12px Inter, system-ui, sans-serif'
        ctx.fillText(String(p.value), x, axisY)
        ctx.globalAlpha = 1
      }
    }
  }, [canvasWidth, geo, points, mean, mad, drag])

  useEffect(() => {
    draw()
  }, [draw])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const pt = getPoint(event)
    const hit = points.find((p) => Math.hypot(geo.xFor(p.value) - pt.x, geo.axisY - pt.y) <= 15)
    if (hit) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrag({ id: hit.id, startX: pt.x, moved: false })
      return
    }
    // Click on the axis band adds a point.
    if (Math.abs(pt.y - geo.axisY) <= 20 && points.length < 8) {
      setPoints((prev) => [...prev, { id: (seq += 1), value: geo.vFor(pt.x) }])
    }
  }
  const handlePointerMove = (event) => {
    if (!drag) return
    const pt = getPoint(event)
    const v = geo.vFor(pt.x)
    setDrag((d) => ({ ...d, moved: d.moved || Math.abs(pt.x - d.startX) > 4 }))
    setPoints((prev) => prev.map((p) => (p.id === drag.id ? { ...p, value: v } : p)))
  }
  const handlePointerUp = () => {
    if (!drag) return
    if (!drag.moved) setPoints((prev) => prev.filter((p) => p.id !== drag.id)) // click to remove
    setDrag(null)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-2xl font-black tabular-nums">
        {points.length === 0 ? (
          <span className="text-lg font-bold" style={{ color: muted }}>Click the line to add data points</span>
        ) : (
          <>
            <span style={{ color: meanGreen }}>MAD = {round1(mad)}</span>
            <span className="text-base font-bold" style={{ color: muted }}>
              = average distance from the mean ({distances.map((d) => round1(d)).join(' + ')} ÷ {distances.length})
            </span>
          </>
        )}
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
        Drag points to spread them out or bunch them up. Click the line to add a point, click a point to remove it. Spread out → MAD grows.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => setPoints([8, 10, 12].map((v) => ({ id: (seq += 1), value: v })))} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Bunched
        </button>
        <button type="button" onClick={() => setPoints([1, 6, 14, 19].map((v) => ({ id: (seq += 1), value: v })))} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Spread out
        </button>
        <button type="button" onClick={() => setPoints([])} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Clear
        </button>
      </div>
    </div>
  )
}
