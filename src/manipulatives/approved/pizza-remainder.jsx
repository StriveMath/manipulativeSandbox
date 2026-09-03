import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const border = '#E0DDD6'
const friendBlue = '#2563EB'
const quotientGreen = '#1D9E75'
const remainderColor = '#7C3AED'

// Measures the element `ref` points at so the canvas can draw at its real
// size. Two details matter: measure in useLayoutEffect (or the canvas paints
// once at its default size and visibly snaps), and read `contentRect` in the
// observer, because the shared ManipulativeCanvas frame scales its children
// with a CSS transform and getBoundingClientRect would feed the scaled box
// back into the observer.
function useCanvasBox(ref, { minW = 420, minH = 220 } = {}) {
  const [box, setBox] = useState({ w: 720, h: minH })

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined
    let raf = 0
    const commit = (rect) => {
      const w = Math.max(minW, Math.round(rect.width))
      const h = Math.max(minH, Math.round(rect.height))
      setBox((prev) => (Math.abs(prev.w - w) >= 1 || Math.abs(prev.h - h) >= 1 ? { w, h } : prev))
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
  }, [ref, minW, minH])

  return box
}

// Quiet pill for controls that set the scene up rather than ones a student
// reaches for while thinking.
function GhostButton({ children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-full border bg-white px-4 py-2 text-sm font-bold"
      style={{ borderColor: border, color: muted }}
    >
      {children}
    </button>
  )
}

const crust = '#E0A458'
const pizzaInk = '#B45309'
const cheese = '#FBD45B'
const sauce = '#E8893B'
const pepperoni = '#C23B22'
const plateFill = '#EDEAE2'

const MIN_PIZZAS = 1
const MAX_PIZZAS = 100
const MIN_FRIENDS = 1
const MAX_FRIENDS = 10

const PEPS = [
  [-0.32, -0.3],
  [0.3, -0.24],
  [0.02, 0.04],
  [-0.28, 0.32],
  [0.34, 0.3],
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const pileArray = (n) => Array.from({ length: n }, () => ({ loc: 'pile' }))

function fitGrid(count, width, height, maxRadius = 20) {
  if (count <= 0) return { cols: 1, rows: 0, cellW: width, cellH: height, radius: maxRadius }

  let best = { cols: 1, rows: count, radius: 0 }
  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols)
    const radius = Math.min(maxRadius, (width / cols - 2) / 2, (height / rows - 2) / 2)
    if (radius > best.radius) best = { cols, rows, radius }
  }

  return {
    ...best,
    cellW: width / best.cols,
    cellH: height / best.rows,
    radius: Math.max(2.5, best.radius),
    stepX: Math.min(width / best.cols, Math.max(7, best.radius * 2 + 4)),
    stepY: Math.min(height / best.rows, Math.max(7, best.radius * 2 + 4)),
  }
}

function Chevron({ up }) {
  return (
    <svg width="18" height="11" viewBox="0 0 18 11" fill="none" aria-hidden="true">
      <path
        d={up ? 'M2 9L9 2l7 7' : 'M2 2l7 7 7-7'}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// The editable number IS the term in the equation. Increase/decrease sit
// directly above and below it so the operation reads as one object, with a
// quiet label underneath.
function NumberDial({ label, value, min, max, color, onChange }) {
  const dialWidth = `${Math.max(2, String(max).length)}ch`
  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        className="flex h-6 w-10 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700 disabled:pointer-events-none disabled:opacity-20"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Chevron up />
      </button>
      <input
        aria-label={label}
        className="bg-transparent text-center text-4xl font-black leading-none tabular-nums outline-none"
        style={{ width: dialWidth, color }}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          if (event.target.value !== '') onChange(Number(event.target.value))
        }}
      />
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        className="flex h-6 w-10 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700 disabled:pointer-events-none disabled:opacity-20"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Chevron up={false} />
      </button>
    </span>
  )
}

function drawPizza(ctx, x, y, r, leftover, lifted) {
  ctx.save()
  ctx.fillStyle = lifted ? 'rgba(26,26,46,0.22)' : 'rgba(26,26,46,0.10)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * (lifted ? 0.9 : 0.62), r * 0.78, r * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = crust
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = sauce
  ctx.beginPath()
  ctx.arc(x, y, r * 0.86, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = cheese
  ctx.beginPath()
  ctx.arc(x, y, r * 0.76, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pepperoni
  PEPS.forEach(([px, py]) => {
    ctx.beginPath()
    ctx.arc(x + px * r, y + py * r, r * 0.13, 0, Math.PI * 2)
    ctx.fill()
  })
  if (leftover) {
    ctx.strokeStyle = remainderColor
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.beginPath()
    ctx.arc(x, y, r + ctx.lineWidth, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export default function PizzaRemainder() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  // Height comes from the measured box, not a constant: the canvas is
  // stretched to fill its container, so a fixed drawing height would squash
  // the pizzas into ovals.
  const { w: canvasWidth, h: canvasHeight } = useCanvasBox(wrapRef, { minW: 360, minH: 240 })
  const [pizzas, setPizzas] = useState(7)
  const [friends, setFriends] = useState(3)
  const [place, setPlace] = useState(() => pileArray(7))
  const [hideAnswer, setHideAnswer] = useState(false)

  const dragRef = useRef(null) // { index, offX, offY }
  const dragPosRef = useRef(null) // { x, y }

  // Counts / status derived from the current placement.
  const status = useMemo(() => {
    const counts = Array(friends).fill(0)
    let pileCount = 0
    let trayCount = 0
    place.forEach((p) => {
      if (p.loc === 'plate' && p.f < friends) counts[p.f] += 1
      else if (p.loc === 'tray') trayCount += 1
      else pileCount += 1
    })
    const maxC = Math.max(...counts)
    const minC = Math.min(...counts)
    const allEqual = maxC === minC
    const solved = pileCount === 0 && allEqual && trayCount < friends
    return { counts, pileCount, trayCount, maxC, allEqual, solved }
  }, [place, friends])

  // The canvas is the whole point of this manipulative, so it needs a text
  // equivalent — otherwise a screen-reader user gets an unlabelled rectangle.
  const summary = (() => {
    const plateDesc = status.counts.map((c, i) => `friend ${i + 1} has ${c}`).join(', ')
    const pileDesc = status.pileCount > 0 ? `, ${status.pileCount} pizza${status.pileCount === 1 ? '' : 's'} still in the pile` : ''
    const trayDesc = status.trayCount > 0 ? `, ${status.trayCount} in the remainder tray` : ''
    return `${pizzas} pizzas divided among ${friends} friends: ${plateDesc}${pileDesc}${trayDesc}. ${
      status.solved ? `Solved — ${status.counts[0]} each, remainder ${status.trayCount}.` : 'Not yet solved.'
    }`
  })()

  const layout = useMemo(() => {
    const PAD = 24
    const width = canvasWidth
    const colW = (width - PAD * 2) / friends
    const friendX = (f) => PAD + colW * (f + 0.5)
    const plateBaseY = canvasHeight - 42
    const plateTop = 120
    const plateRadius = clamp(Math.min(colW * 0.42, 46), 18, 46)

    const maxRem = Math.max(1, friends - 1)
    const trayW = clamp(92 + maxRem * 13, 108, Math.min(210, width * 0.38))
    const trayX2 = width - PAD
    const trayX1 = trayX2 - trayW
    const trayY1 = 30
    const trayY2 = 108
    const tray = {
      x1: trayX1,
      y1: trayY1,
      x2: trayX2,
      y2: trayY2,
      cx: (trayX1 + trayX2) / 2,
      cy: (trayY1 + trayY2) / 2,
    }
    const pileBounds = {
      x1: PAD,
      y1: 34,
      x2: Math.max(PAD + 54, tray.x1 - 20),
      y2: 108,
    }

    const plateCounts = Array(friends).fill(0)
    place.forEach((p) => { if (p.loc === 'plate' && p.f < friends) plateCounts[p.f] += 1 })
    const plateGrids = plateCounts.map((count) => (
      fitGrid(count, Math.max(18, colW - 8), plateBaseY - 18 - plateTop)
    ))
    const pileGrid = fitGrid(
      status.pileCount,
      pileBounds.x2 - pileBounds.x1,
      pileBounds.y2 - pileBounds.y1,
    )
    // Spread the pile evenly across the whole band instead of leaving the
    // tight cluster fitGrid produces, so the top row uses the full width.
    const pileSpanW = pileBounds.x2 - pileBounds.x1
    const pileStepX = Math.min(pileSpanW / pileGrid.cols, pileGrid.radius * 2 + 44)
    const trayGrid = fitGrid(
      status.trayCount,
      tray.x2 - tray.x1 - 12,
      tray.y2 - tray.y1 - 12,
      16,
    )

    const perPlateIdx = Array(friends).fill(0)
    const next = { pile: 0, tray: 0 }
    const positions = place.map((p) => {
      if (p.loc === 'plate' && p.f < friends) {
        const idx = perPlateIdx[p.f]
        perPlateIdx[p.f] += 1
        const grid = plateGrids[p.f]
        const row = Math.floor(idx / grid.cols)
        const col = idx % grid.cols
        const rowCount = Math.min(grid.cols, plateCounts[p.f] - row * grid.cols)
        return {
          x: friendX(p.f) + (col - (rowCount - 1) / 2) * grid.stepX,
          y: plateBaseY - 18 - grid.radius - row * grid.stepY,
          r: grid.radius,
          loc: 'plate',
        }
      }
      if (p.loc === 'tray') {
        const idx = next.tray
        next.tray += 1
        const row = Math.floor(idx / trayGrid.cols)
        const col = idx % trayGrid.cols
        const rowCount = Math.min(trayGrid.cols, status.trayCount - row * trayGrid.cols)
        return {
          x: tray.cx + (col - (rowCount - 1) / 2) * trayGrid.stepX,
          y: tray.cy + (row - (trayGrid.rows - 1) / 2) * trayGrid.stepY,
          r: trayGrid.radius,
          loc: 'tray',
        }
      }
      const idx = next.pile
      next.pile += 1
      const row = Math.floor(idx / pileGrid.cols)
      const col = idx % pileGrid.cols
      const rowCount = Math.min(pileGrid.cols, status.pileCount - row * pileGrid.cols)
      return {
        x: (pileBounds.x1 + pileBounds.x2) / 2 + (col - (rowCount - 1) / 2) * pileStepX,
        y: pileBounds.y1 + pileGrid.radius + row * pileGrid.stepY,
        r: pileGrid.radius,
        loc: 'pile',
      }
    })

    return {
      PAD,
      width,
      colW,
      friendX,
      plateBaseY,
      plateRadius,
      tray,
      pileBounds,
      positions,
    }
  }, [canvasWidth, canvasHeight, friends, place, status.pileCount, status.trayCount])

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

    const { friendX, plateBaseY, plateRadius, colW, tray, pileBounds, positions } = layout

    // Plates + friend labels.
    for (let f = 0; f < friends; f += 1) {
      const cx = friendX(f)
      ctx.fillStyle = plateFill
      ctx.strokeStyle = '#C9D4EA'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(cx, plateBaseY, Math.min(colW * 0.42, plateRadius), 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = friendBlue
      ctx.font = `700 ${colW > 96 ? 14 : 12}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(colW > 96 ? `Friend ${f + 1}` : `#${f + 1}`, cx, plateBaseY + 14)
    }

    // Remainder tray.
    ctx.save()
    ctx.setLineDash([7, 6])
    ctx.strokeStyle = remainderColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(tray.x1, tray.y1, tray.x2 - tray.x1, tray.y2 - tray.y1, 12)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = remainderColor
    ctx.font = '800 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Remainder', tray.cx, tray.y1 - 4)
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.fillStyle = muted
    ctx.textBaseline = 'top'
    ctx.fillText("what's left over", tray.cx, tray.y2 + 4)
    // Show a bold 0 when nothing is left over.
    if (status.trayCount === 0) {
      ctx.fillStyle = remainderColor
      ctx.font = '900 24px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('0', tray.cx, tray.cy)
    }

    // Pile label.
    if (status.pileCount > 0) {
      ctx.fillStyle = muted
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Pizzas to share', pileBounds.x1, pileBounds.y1 - 6)
    }

    // Pizzas (skip the dragged one; draw it last, lifted).
    const dragIndex = dragRef.current?.index ?? -1
    for (let i = 0; i < positions.length; i += 1) {
      if (i === dragIndex) continue
      const p = positions[i]
      drawPizza(ctx, p.x, p.y, p.r, p.loc === 'tray', false)
    }
    if (dragIndex >= 0 && dragPosRef.current) {
      drawPizza(ctx, dragPosRef.current.x, dragPosRef.current.y, dragRef.current.r * 1.08, false, true)
    }
  }, [canvasWidth, canvasHeight, layout, friends, status.pileCount, status.trayCount])

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
    const { positions } = layout
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      const p = positions[i]
      if (Math.hypot(p.x - pt.x, p.y - pt.y) <= Math.max(12, p.r * 1.35)) {
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { index: i, offX: pt.x - p.x, offY: pt.y - p.y, r: p.r }
        dragPosRef.current = { x: p.x, y: p.y }
        draw()
        return
      }
    }
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const pt = getPoint(event)
    dragPosRef.current = { x: pt.x - dragRef.current.offX, y: pt.y - dragRef.current.offY }
    draw()
  }

  const handlePointerUp = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const pt = getPoint(event)
    const { tray, PAD, colW } = layout

    let next = { loc: 'pile' }
    if (pt.x >= tray.x1 - 12 && pt.x <= tray.x2 + 12 && pt.y >= tray.y1 - 12 && pt.y <= tray.y2 + 12) {
      next = { loc: 'tray' }
    } else if (pt.y > canvasHeight * 0.42) {
      next = { loc: 'plate', f: clamp(Math.round((pt.x - PAD) / colW - 0.5), 0, friends - 1) }
    }

    setPlace((prev) => prev.map((p, i) => (i === drag.index ? next : p)))
    dragRef.current = null
    dragPosRef.current = null
  }

  const resetPlacement = (n = pizzas) => {
    setPlace(pileArray(n))
  }
  const changePizzas = (nextN) => {
    const n = clamp(Math.round(nextN), MIN_PIZZAS, MAX_PIZZAS)
    setPizzas(n)
    resetPlacement(n)
  }
  const changeFriends = (nextF) => {
    setFriends(clamp(Math.round(nextF), MIN_FRIENDS, MAX_FRIENDS))
    resetPlacement()
  }

  const dealRound = () => {
    setPlace((prev) => {
      if (prev.filter((p) => p.loc === 'pile').length < friends) return prev
      const next = [...prev]
      for (let f = 0; f < friends; f += 1) {
        const idx = next.findIndex((p) => p.loc === 'pile')
        next[idx] = { loc: 'plate', f }
      }
      return next
    })
  }
  const canDeal = status.pileCount >= friends
  const remainderVal = status.trayCount
  const message = status.solved
    ? 'Shared equally.'
    : !status.allEqual
      ? 'Make every plate equal before setting aside the remainder.'
      : status.pileCount === 0 && status.trayCount >= friends
        ? 'There are enough pizzas in the remainder tray for another round.'
        : status.pileCount > 0 && status.pileCount < friends && status.maxC > 0
          ? `Only ${status.pileCount} left — they can't be shared equally. Drag them to the Remainder tray.`
          : 'Drag pizzas to the plates, or deal one equal round.'

  return (
    <div className="flex h-[500px] w-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      {/* Operation — the interactive division is the primary element */}
      <div className="relative flex shrink-0 items-center justify-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: muted }}>Pizzas</span>
        <NumberDial
          label="Pizzas"
          value={pizzas}
          min={MIN_PIZZAS}
          max={MAX_PIZZAS}
          color={pizzaInk}
          onChange={changePizzas}
        />
        <span className="px-1 text-4xl font-black" style={{ color: ink }}>÷</span>
        <NumberDial
          label="Friends"
          value={friends}
          min={MIN_FRIENDS}
          max={MAX_FRIENDS}
          color={friendBlue}
          onChange={changeFriends}
        />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: muted }}>Friends</span>

        {status.solved && (
          <span className="ml-1 flex items-baseline gap-2 text-4xl font-black tabular-nums" aria-live="polite">
            <span style={{ color: ink }}>=</span>
            {hideAnswer ? (
              <span style={{ color: muted }}>—</span>
            ) : (
              <>
                <span style={{ color: quotientGreen }}>{status.counts[0]}</span>
                <span className="text-base font-bold" style={{ color: muted }}>each</span>
                {remainderVal > 0 && (
                  <>
                    <span className="text-base font-bold" style={{ color: muted }}>remainder</span>
                    <span style={{ color: remainderColor }}>{remainderVal}</span>
                  </>
                )}
              </>
            )}
          </span>
        )}

        <button
          type="button"
          aria-pressed={!hideAnswer}
          onClick={() => setHideAnswer((hidden) => !hidden)}
          className="absolute right-0 top-0 rounded-full border bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm hover:text-slate-900"
          style={{ borderColor: border }}
        >
          {hideAnswer ? 'Show answer' : 'Hide answer'}
        </button>
      </div>

      {/* Canvas */}
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

      <p className="min-h-5 shrink-0 text-center text-sm font-semibold" style={{ color: status.solved ? quotientGreen : muted }}>
        {message}
      </p>

      <div className="flex shrink-0 items-center justify-center gap-3">
        <button type="button" onClick={dealRound} disabled={!canDeal} className="rounded-full px-4 py-2.5 text-sm font-black text-white disabled:opacity-40" style={{ background: friendBlue }}>
          Deal a round
        </button>
        <GhostButton onClick={() => resetPlacement()} ariaLabel="Reset pizza placement">Reset placement</GhostButton>
      </div>
    </div>
  )
}
