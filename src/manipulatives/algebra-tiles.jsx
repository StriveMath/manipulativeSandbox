import { useCallback, useEffect, useRef, useState } from 'react'
import { cream, ink, muted, border, hairline, green as posX, red as negX, blue as pos1, amber as neg1 } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'
import { skipMotion } from './shared/motion'
import GhostButton from './shared/GhostButton'

const TYPES = {
  x: { color: posX, label: 'x', w: 30, h: 64, opp: 'nx', kind: 'x' },
  nx: { color: negX, label: '−x', w: 30, h: 64, opp: 'x', kind: 'x' },
  u: { color: pos1, label: '1', w: 32, h: 32, opp: 'nu', kind: 'u' },
  nu: { color: neg1, label: '−1', w: 32, h: 32, opp: 'u', kind: 'u' },
}

const ADD_LABELS = {
  x: 'Add an x tile',
  nx: 'Add a negative x tile',
  u: 'Add a 1 tile',
  nu: 'Add a negative 1 tile',
}

let seq = 0

// At module scope, not inside the component: a component declared during
// render is a new type on every render, so React unmounts and remounts it
// each time instead of updating it.
function AddBtn({ type, onAdd }) {
  const info = TYPES[type]
  return (
    <button
      type="button"
      onClick={() => onAdd(type)}
      className="rounded-lg px-4 py-2 text-sm font-black text-white"
      style={{ background: info.color }}
      aria-label={ADD_LABELS[type]}
    >
      + {info.label}
    </button>
  )
}

// Where a tile belongs, given what is on its side of the equals. Tiles are
// laid in two lanes — x tiles above, units below — and ordered by `ord`,
// which is just the x the tile was last dropped at. Dropping a tile between
// two others therefore slots it in between them.
//
// An expression you can't read is an expression you can't reason about, so
// the mat tidies itself: dropped tiles snap into their lane rather than
// staying wherever the hand let go. Spacing tightens instead of wrapping, so
// a side stays one readable row however many tiles are on it.
function packTargets(tiles, size) {
  const targets = new Map()
  const mid = size.w / 2
  const laneY = { x: size.h * 0.36, u: size.h * 0.72 }
  const pad = 26

  ;['L', 'R'].forEach((side) => {
    const x0 = side === 'L' ? pad : mid + pad
    const x1 = side === 'L' ? mid - pad : size.w - pad
    ;['x', 'u'].forEach((kind) => {
      const row = tiles
        .filter((t) => t.side === side && TYPES[t.type].kind === kind)
        .sort((a, b) => a.ord - b.ord)
      if (!row.length) return
      const tileW = TYPES[row[0].type].w
      const ideal = tileW + 8
      const room = x1 - x0
      // Tighten rather than wrap or overflow the side.
      const step = row.length > 1 ? Math.min(ideal, (room - tileW) / (row.length - 1)) : 0
      const used = step * (row.length - 1) + tileW
      const startX = x0 + (room - used) / 2 + tileW / 2
      row.forEach((t, i) => {
        targets.set(t.id, { x: startX + i * step, y: laneY[kind] })
      })
    })
  })
  return targets
}

export default function AlgebraTiles() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const size = useCanvasBox(wrapRef, { minW: 420, minH: 220 })
  const [tiles, setTiles] = useState([]) // { id, type, side, ord } — position is derived
  const [flash, setFlash] = useState(null) // { x, y, t } zero-pair spot

  // Rendered positions live in a ref, not state: they change every frame while
  // tiles ease into their snapped slots, and re-rendering React 60 times a
  // second to move a rectangle would be silly.
  const posRef = useRef(new Map())
  const dragRef = useRef(null) // { id, offX, offY, x, y }
  const rafRef = useRef(0)
  const drawRef = useRef(() => {})
  const [, forceDraw] = useState(0) // nudges the effect that owns the canvas

  const midX = size.w / 2

  const fmt = (ts) => {
    const xC = ts.filter((t) => t.type === 'x').length - ts.filter((t) => t.type === 'nx').length
    const c = ts.filter((t) => t.type === 'u').length - ts.filter((t) => t.type === 'nu').length
    let e = ''
    if (xC !== 0) e += (xC < 0 ? '−' : '') + (Math.abs(xC) === 1 ? 'x' : `${Math.abs(xC)}x`)
    if (c !== 0) e += (e ? (c < 0 ? ' − ' : ' + ') : c < 0 ? '−' : '') + Math.abs(c)
    return e || '0'
  }
  const leftExpr = fmt(tiles.filter((t) => t.side === 'L'))
  const rightExpr = fmt(tiles.filter((t) => t.side === 'R'))

  // The canvas is the whole point of this manipulative, so it needs a text
  // equivalent — otherwise a screen-reader user gets an unlabelled rectangle.
  const summary = tiles.length
    ? `Algebra tile mat. Left side of the equation: ${leftExpr}. Right side: ${rightExpr}.`
    : 'Empty algebra tile mat. Add x, negative x, 1, or negative 1 tiles and drag them either side of the equals sign to build both sides of an equation.'

  // `ord` is normally the x a tile was dropped at, so a fresh tile takes an ord
  // above any possible x to land at the end of its lane. New tiles start on the
  // left; drag across the equals to build the other side.
  const addTile = (type) => {
    setTiles((prev) => [...prev, { id: (seq += 1), type, side: 'L', ord: 1e6 + seq }])
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
    ctx.strokeStyle = hairline
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

    const drag = dragRef.current
    const drawTile = (t, px, py, lifted) => {
      const info = TYPES[t.type]
      ctx.save()
      ctx.fillStyle = lifted ? 'rgba(26,26,46,0.20)' : 'rgba(26,26,46,0.10)'
      ctx.beginPath()
      ctx.roundRect(px - info.w / 2 + 2, py - info.h / 2 + (lifted ? 6 : 4), info.w, info.h, 7)
      ctx.fill()
      ctx.fillStyle = info.color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(px - info.w / 2, py - info.h / 2, info.w, info.h, 7)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${info.kind === 'x' ? 16 : 13}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(info.label, px, py)
      ctx.restore()
    }

    tiles.forEach((t) => {
      if (drag && t.id === drag.id) return
      const p = posRef.current.get(t.id)
      if (p) drawTile(t, p.x, p.y, false)
    })
    if (drag) {
      const t = tiles.find((x) => x.id === drag.id)
      if (t) drawTile(t, drag.x, drag.y, true)
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
  }, [size, tiles, flash])

  // Assigned in an effect, not during render: the animation loop below calls
  // whatever draw() was current at its last commit, and writing a ref while
  // rendering is a React-rules violation the linter (rightly) rejects.
  useEffect(() => {
    drawRef.current = draw
  })

  // Ease every tile toward its snapped slot. New tiles enter from above the
  // mat so it reads as the tile arriving, not blinking into existence.
  useEffect(() => {
    const targets = packTargets(tiles, size)
    const pos = posRef.current
    const still = skipMotion()
    tiles.forEach((t) => {
      if (!pos.has(t.id)) {
        const tgt = targets.get(t.id)
        // Enter from above the mat, unless we are not animating at all.
        pos.set(t.id, { x: tgt ? tgt.x : size.w / 4, y: still && tgt ? tgt.y : -40 })
      }
    })
    // Drop entries for tiles that no longer exist (zero-paired or cleared).
    pos.forEach((_, id) => {
      if (!tiles.some((t) => t.id === id)) pos.delete(id)
    })

    if (still) {
      targets.forEach((tgt, id) => {
        if (dragRef.current && dragRef.current.id === id) return
        const p = pos.get(id)
        if (p) {
          p.x = tgt.x
          p.y = tgt.y
        }
      })
      drawRef.current()
      return undefined
    }

    const step = () => {
      let moving = false
      targets.forEach((tgt, id) => {
        if (dragRef.current && dragRef.current.id === id) return
        const p = pos.get(id)
        if (!p) return
        const dx = tgt.x - p.x
        const dy = tgt.y - p.y
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
          p.x = tgt.x
          p.y = tgt.y
          return
        }
        p.x += dx * 0.22
        p.y += dy * 0.22
        moving = true
      })
      drawRef.current()
      rafRef.current = moving ? requestAnimationFrame(step) : 0
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tiles, size])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const runFlash = (x, y) => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 500)
      setFlash({ x, y, t })
      if (t < 1) requestAnimationFrame(tick)
      else setFlash(null)
    }
    requestAnimationFrame(tick)
  }

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
      const p = posRef.current.get(t.id)
      if (!p) continue
      if (Math.abs(pt.x - p.x) <= info.w / 2 + 2 && Math.abs(pt.y - p.y) <= info.h / 2 + 2) {
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { id: t.id, offX: pt.x - p.x, offY: pt.y - p.y, x: p.x, y: p.y }
        forceDraw((n) => n + 1)
        return
      }
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const pt = getPoint(event)
    drag.x = pt.x - drag.offX
    drag.y = pt.y - drag.offY
    const p = posRef.current.get(drag.id)
    if (p) {
      p.x = drag.x
      p.y = drag.y
    }
    drawRef.current()
  }

  const handlePointerUp = () => {
    const drag = dragRef.current
    if (!drag) return
    const dragged = tiles.find((t) => t.id === drag.id)
    if (!dragged) {
      dragRef.current = null
      return
    }
    const side = drag.x < midX ? 'L' : 'R'
    const opp = TYPES[dragged.type].opp
    // Zero pairs only cancel on the SAME side of the equals.
    const hit = tiles.find((t) => {
      if (t.id === dragged.id || t.type !== opp || t.side !== side) return false
      const p = posRef.current.get(t.id)
      return p && Math.hypot(p.x - drag.x, p.y - drag.y) <= 34
    })
    dragRef.current = null
    if (hit) {
      const p = posRef.current.get(hit.id)
      runFlash((drag.x + p.x) / 2, (drag.y + p.y) / 2)
      setTiles((prev) => prev.filter((t) => t.id !== dragged.id && t.id !== hit.id))
    } else {
      // ord is the drop x, so a tile dropped between two others lands between them.
      setTiles((prev) => prev.map((t) => (t.id === dragged.id ? { ...t, side, ord: drag.x } : t)))
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-3xl font-black">
        <span style={{ color: ink }}>{leftExpr}</span>
        <span style={{ color: muted }}>=</span>
        <span style={{ color: ink }}>{rightExpr}</span>
      </div>

      <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={summary}
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
        <AddBtn type="x" onAdd={addTile} />
        <AddBtn type="nx" onAdd={addTile} />
        <AddBtn type="u" onAdd={addTile} />
        <AddBtn type="nu" onAdd={addTile} />
        <GhostButton onClick={() => setTiles([])} ariaLabel="Clear all tiles">
          Clear
        </GhostButton>
      </div>
    </div>
  )
}
