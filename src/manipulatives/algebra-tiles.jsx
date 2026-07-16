import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const posX = '#1D9E75'
const negX = '#D8402F'
const pos1 = '#2563EB'
const neg1 = '#D97706'

const TYPES = {
  x: { color: posX, label: 'x', w: 30, h: 64, opp: 'nx' },
  nx: { color: negX, label: '−x', w: 30, h: 64, opp: 'x' },
  u: { color: pos1, label: '1', w: 32, h: 32, opp: 'nu' },
  nu: { color: neg1, label: '−1', w: 32, h: 32, opp: 'u' },
}

let seq = 0

export default function AlgebraTiles() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 720, h: 300 })
  const [tiles, setTiles] = useState([])
  const [drag, setDrag] = useState(null) // { id, offX, offY, x, y }
  const [flash, setFlash] = useState(null) // { x, y, t } zero-pair spot
  const flashRafRef = useRef(null)

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    let raf = 0
    const commit = (box) => {
      const w = Math.max(420, Math.round(box.width))
      const h = Math.max(220, Math.round(box.height))
      setSize((prev) => (Math.abs(prev.w - w) >= 1 || Math.abs(prev.h - h) >= 1 ? { w, h } : prev))
    }
    commit(node.getBoundingClientRect())
    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => commit(cr))
    })
    observer.observe(node)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  // Tiles left of the divider form one side of the equation, right the other.
  const midX = size.w / 2
  const fmt = (ts) => {
    const xC = ts.filter((t) => t.type === 'x').length - ts.filter((t) => t.type === 'nx').length
    const c = ts.filter((t) => t.type === 'u').length - ts.filter((t) => t.type === 'nu').length
    let e = ''
    if (xC !== 0) e += (xC < 0 ? '−' : '') + (Math.abs(xC) === 1 ? 'x' : `${Math.abs(xC)}x`)
    if (c !== 0) e += (e ? (c < 0 ? ' − ' : ' + ') : c < 0 ? '−' : '') + Math.abs(c)
    return e || '0'
  }
  const leftExpr = fmt(tiles.filter((t) => t.x < midX))
  const rightExpr = fmt(tiles.filter((t) => t.x >= midX))

  const addTile = (type) => {
    const n = tiles.length
    // Spawn on the left of the equals; drag across to build the other side.
    const span = Math.max(110, size.w / 2 - 70)
    setTiles((prev) => [
      ...prev,
      { id: (seq += 1), type, x: 40 + ((n * 46) % span), y: 56 + Math.floor((n * 46) / span) * 74 },
    ])
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cw = Math.round(size.w * dpr)
    const ch = Math.round(size.h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    // Equals divider: tiles either side form the two sides of an equation.
    const mid = size.w / 2
    ctx.save()
    ctx.strokeStyle = '#C9CDD6'
    ctx.setLineDash([7, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(mid, 14)
    ctx.lineTo(mid, size.h - 14)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(mid, size.h / 2, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8B8F99'
    ctx.font = '900 22px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('=', mid, size.h / 2)
    ctx.restore()

    if (tiles.length === 0) {
      ctx.fillStyle = '#B9BDC6'
      ctx.font = '600 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Add tiles, drag them either side of the =, and drop an x onto a −x to zero-pair.', size.w / 2, 30)
    }

    const drawTile = (t, lifted) => {
      const info = TYPES[t.type]
      ctx.save()
      ctx.fillStyle = lifted ? 'rgba(26,26,46,0.20)' : 'rgba(26,26,46,0.10)'
      ctx.beginPath()
      ctx.roundRect(t.x - info.w / 2 + 2, t.y - info.h / 2 + 4, info.w, info.h, 7)
      ctx.fill()
      ctx.fillStyle = info.color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(t.x - info.w / 2, t.y - info.h / 2, info.w, info.h, 7)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${t.type === 'x' || t.type === 'nx' ? 16 : 13}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(info.label, t.x, t.y)
      ctx.restore()
    }

    tiles.forEach((t) => {
      if (drag && t.id === drag.id) return
      drawTile(t, false)
    })
    if (drag) {
      const t = tiles.find((x) => x.id === drag.id)
      if (t) drawTile({ ...t, x: drag.x, y: drag.y }, true)
    }

    // Zero-pair flash.
    if (flash) {
      ctx.save()
      ctx.globalAlpha = 1 - flash.t
      ctx.strokeStyle = '#9AA0AA'
      ctx.fillStyle = '#6B7280'
      ctx.font = '900 15px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('= 0', flash.x, flash.y - 30 * flash.t)
      ctx.restore()
    }
  }, [size, tiles, drag, flash])

  useEffect(() => {
    draw()
  }, [draw])

  const runFlash = (x, y) => {
    if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 500)
      setFlash({ x, y, t })
      if (t < 1) flashRafRef.current = requestAnimationFrame(tick)
      else setFlash(null)
    }
    flashRafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => {
    if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current)
  }, [])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (size.w / rect.width),
      y: (event.clientY - rect.top) * (size.h / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const pt = getPoint(event)
    for (let i = tiles.length - 1; i >= 0; i -= 1) {
      const t = tiles[i]
      const info = TYPES[t.type]
      if (Math.abs(pt.x - t.x) <= info.w / 2 + 2 && Math.abs(pt.y - t.y) <= info.h / 2 + 2) {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDrag({ id: t.id, offX: pt.x - t.x, offY: pt.y - t.y, x: t.x, y: t.y })
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
    const dragged = tiles.find((t) => t.id === drag.id)
    if (!dragged) {
      setDrag(null)
      return
    }
    const opp = TYPES[dragged.type].opp
    // Zero pairs only cancel on the SAME side of the equals.
    const hit = tiles.find(
      (t) =>
        t.id !== dragged.id &&
        t.type === opp &&
        Math.hypot(t.x - drag.x, t.y - drag.y) <= 34 &&
        (t.x < midX) === (drag.x < midX),
    )
    if (hit) {
      setTiles((prev) => prev.filter((t) => t.id !== dragged.id && t.id !== hit.id))
      runFlash((drag.x + hit.x) / 2, (drag.y + hit.y) / 2)
    } else {
      setTiles((prev) => prev.map((t) => (t.id === dragged.id ? { ...t, x: drag.x, y: drag.y } : t)))
    }
    setDrag(null)
  }

  const AddBtn = ({ type }) => {
    const info = TYPES[type]
    return (
      <button
        type="button"
        onClick={() => addTile(type)}
        className="rounded-lg px-4 py-2 text-sm font-black text-white"
        style={{ background: info.color }}
      >
        + {info.label}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-3xl font-black">
        <span style={{ color: ink }}>{leftExpr}</span>
        <span style={{ color: muted }}>=</span>
        <span style={{ color: ink }}>{rightExpr}</span>
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
        Like tiles combine; an <b style={{ color: posX }}>x</b> and a <b style={{ color: negX }}>−x</b> make <b>zero</b> (same for <b style={{ color: pos1 }}>1</b> and <b style={{ color: neg1 }}>−1</b>).
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <AddBtn type="x" />
        <AddBtn type="nx" />
        <AddBtn type="u" />
        <AddBtn type="nu" />
        <button type="button" onClick={() => setTiles([])} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Clear
        </button>
      </div>
    </div>
  )
}
