import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const chipPurple = '#7C3AED'
const trueGreen = '#1D9E75'
const axisColor = '#1A1A2E'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Dice/coin events with exact probabilities (0..1).
const EVENTS = [
  { id: 'e0', label: 'Roll a 7', p: 0, disp: '0' },
  { id: 'e6', label: 'Roll a 6', p: 1 / 6, disp: '1/6' },
  { id: 'eh', label: 'Flip heads', p: 1 / 2, disp: '1/2' },
  { id: 'eg', label: 'Roll > 2', p: 4 / 6, disp: '4/6' },
  { id: 'ec', label: 'Roll 1–6', p: 1, disp: '1' },
]

const LANDMARKS = [
  { p: 0, label: 'Impossible' },
  { p: 0.25, label: 'Unlikely' },
  { p: 0.5, label: 'Even chance' },
  { p: 0.75, label: 'Likely' },
  { p: 1, label: 'Certain' },
]

export default function ProbabilityScale() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [placed, setPlaced] = useState({}) // id -> guess prob (0..1), else in tray
  const [revealed, setRevealed] = useState(false)
  const [drag, setDrag] = useState(null) // { id, offX, offY, x, y }
  const dispRef = useRef({}) // id -> {x,y} current displayed center (for ease)
  const rafRef = useRef(null)

  const canvasHeight = 320

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
    const PAD = 60
    const scaleY = 132
    const trayY = 250
    const spanX = canvasWidth - PAD * 2
    const xFor = (p) => PAD + p * spanX
    const pFor = (x) => clamp((x - PAD) / spanX, 0, 1)
    const chipW = Math.min(120, (canvasWidth - PAD * 2 - (EVENTS.length - 1) * 10) / EVENTS.length)
    const trayX = (i) => PAD + chipW / 2 + i * (chipW + 10)
    return { PAD, scaleY, trayY, spanX, xFor, pFor, chipW }
  }, [canvasWidth])

  // Target center for each chip given state.
  const targets = useMemo(() => {
    const t = {}
    EVENTS.forEach((e, i) => {
      if (revealed) t[e.id] = { x: geo.xFor(e.p), y: geo.scaleY - 42, on: true }
      else if (placed[e.id] != null) t[e.id] = { x: geo.xFor(placed[e.id]), y: geo.scaleY - 42, on: true }
      else t[e.id] = { x: geo.PAD + geo.chipW / 2 + i * (geo.chipW + 10), y: geo.trayY, on: false }
    })
    return t
  }, [geo, placed, revealed])

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

    const { PAD, scaleY, xFor, chipW } = geo

    // Scale bar 0..1 with a soft gradient (impossible -> certain).
    const grad = ctx.createLinearGradient(xFor(0), 0, xFor(1), 0)
    grad.addColorStop(0, '#FBE3D8')
    grad.addColorStop(0.5, '#FDF3D6')
    grad.addColorStop(1, '#D6F0E4')
    ctx.fillStyle = grad
    ctx.fillRect(xFor(0), scaleY - 7, xFor(1) - xFor(0), 14)
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 2
    ctx.strokeRect(xFor(0), scaleY - 7, xFor(1) - xFor(0), 14)

    // Landmark ticks + labels + fraction/percent scale.
    ctx.textAlign = 'center'
    LANDMARKS.forEach((lm) => {
      const x = xFor(lm.p)
      ctx.strokeStyle = '#9AA0AA'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, scaleY - 12)
      ctx.lineTo(x, scaleY + 12)
      ctx.stroke()
      ctx.fillStyle = muted
      ctx.font = '700 12px Inter, system-ui, sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(lm.label, x, scaleY + 16)
      ctx.fillStyle = ink
      ctx.font = '800 13px Inter, system-ui, sans-serif'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${Math.round(lm.p * 100)}%`, x, scaleY - 16)
    })
    // Endpoint number labels 0 and 1.
    ctx.fillStyle = ink
    ctx.font = '900 15px Inter, system-ui, sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.fillText('0', xFor(0), scaleY - 34)
    ctx.fillText('1', xFor(1), scaleY - 34)

    // Tray label.
    if (Object.keys(placed).length < EVENTS.length && !revealed) {
      ctx.fillStyle = muted
      ctx.font = '700 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Drag each event onto the scale:', PAD, geo.trayY - 26)
    }

    // Chips.
    const drawChip = (e, cx, cy, on, lifted) => {
      const w = chipW
      const h = 34
      ctx.save()
      ctx.fillStyle = lifted ? 'rgba(26,26,46,0.20)' : 'rgba(26,26,46,0.10)'
      ctx.beginPath()
      ctx.roundRect(cx - w / 2 + 2, cy - h / 2 + 3, w, h, 9)
      ctx.fill()
      ctx.fillStyle = revealed ? trueGreen : chipPurple
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 9)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(e.label, cx, cy - (revealed ? 5 : 0))
      if (revealed) {
        ctx.font = '900 11px Inter, system-ui, sans-serif'
        ctx.fillText(`= ${e.disp}`, cx, cy + 8)
      }
      // pointer to the line when on the scale
      if (on) {
        ctx.fillStyle = revealed ? trueGreen : chipPurple
        ctx.beginPath()
        ctx.moveTo(cx - 6, cy + h / 2)
        ctx.lineTo(cx + 6, cy + h / 2)
        ctx.lineTo(cx, cy + h / 2 + 8)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    EVENTS.forEach((e) => {
      if (drag && drag.id === e.id) return
      const d = dispRef.current[e.id] || targets[e.id]
      drawChip(e, d.x, d.y, targets[e.id].on, false)
    })
    if (drag) {
      const e = EVENTS.find((x) => x.id === drag.id)
      drawChip(e, drag.x, drag.y, false, true)
    }
  }, [canvasWidth, geo, placed, revealed, drag, targets])

  // Always draw on state change (the ease loop below only handles animation).
  useEffect(() => {
    draw()
  }, [draw])

  // Ease displayed chip positions toward targets.
  useEffect(() => {
    const start = () => {
      cancelAnimationFrame(rafRef.current)
      const tick = () => {
        let moving = false
        EVENTS.forEach((e) => {
          const tgt = targets[e.id]
          const cur = dispRef.current[e.id] || { ...tgt }
          const nx = cur.x + (tgt.x - cur.x) * 0.25
          const ny = cur.y + (tgt.y - cur.y) * 0.25
          if (Math.hypot(tgt.x - nx, tgt.y - ny) > 0.5) moving = true
          dispRef.current[e.id] = { x: Math.abs(tgt.x - nx) < 0.5 ? tgt.x : nx, y: Math.abs(tgt.y - ny) < 0.5 ? tgt.y : ny }
        })
        draw()
        if (moving) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    start()
    return () => cancelAnimationFrame(rafRef.current)
  }, [targets, draw])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    if (revealed) return
    const pt = getPoint(event)
    for (let i = EVENTS.length - 1; i >= 0; i -= 1) {
      const e = EVENTS[i]
      const d = dispRef.current[e.id] || targets[e.id]
      if (Math.abs(pt.x - d.x) <= geo.chipW / 2 && Math.abs(pt.y - d.y) <= 20) {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDrag({ id: e.id, offX: pt.x - d.x, offY: pt.y - d.y, x: d.x, y: d.y })
        return
      }
    }
  }
  const handlePointerMove = (event) => {
    if (!drag) return
    const pt = getPoint(event)
    setDrag((d) => (d ? { ...d, x: pt.x - d.offX, y: pt.y - d.offY } : d))
  }
  const handlePointerUp = () => {
    if (!drag) return
    const onScale = drag.y < geo.scaleY + 30
    setPlaced((prev) => {
      const next = { ...prev }
      if (onScale) next[drag.id] = geo.pFor(drag.x)
      else delete next[drag.id]
      return next
    })
    setDrag(null)
  }

  const reset = () => {
    setPlaced({})
    setRevealed(false)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="text-center text-xl font-black">
        Place each event: <span style={{ color: '#D85A30' }}>0 = impossible</span>, <span style={{ color: trueGreen }}>1 = certain</span>
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
        Probability is a number from <b>0 (impossible)</b> to <b>1 (certain)</b>. Drag each event, then reveal the true spot.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => setRevealed(true)} className="rounded-full px-6 py-2.5 text-sm font-black text-white" style={{ background: trueGreen }}>
          Reveal answers
        </button>
        <button type="button" onClick={reset} className="rounded-full border px-5 py-2.5 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Reset
        </button>
      </div>
    </div>
  )
}
