import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cream, ink, muted, border, blue as friendBlue, green as quotientGreen, orange as remOrange } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'
import GhostButton from './shared/GhostButton'
import Stepper from './shared/Stepper'

const crust = '#E0A458'
const cheese = '#FBD45B'
const sauce = '#E8893B'
const pepperoni = '#C23B22'
const plateFill = '#EDEAE2'

const MIN_PIZZAS = 1
const MAX_PIZZAS = 12
const MIN_FRIENDS = 1
const MAX_FRIENDS = 6

const PEPS = [
  [-0.32, -0.3],
  [0.3, -0.24],
  [0.02, 0.04],
  [-0.28, 0.32],
  [0.34, 0.3],
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const pileArray = (n) => Array.from({ length: n }, () => ({ loc: 'pile' }))

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
    ctx.strokeStyle = remOrange
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
  const { w: canvasWidth } = useCanvasBox(wrapRef, { minW: 360 })
  const [pizzas, setPizzas] = useState(7)
  const [friends, setFriends] = useState(3)
  const [place, setPlace] = useState(() => pileArray(7))
  const [hideAnswer, setHideAnswer] = useState(false)

  const canvasHeight = 360

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
    const PAD = 28
    const width = canvasWidth
    const maxRem = Math.max(1, friends - 1)
    const colW = (width - PAD * 2) / friends
    const friendX = (f) => PAD + colW * (f + 0.5)
    const plateBaseY = canvasHeight - 58

    // Fixed pizza size (never shrinks as a stack grows); tall stacks wrap into columns.
    const r = clamp(Math.min(colW * 0.32, 20), 12, 20)
    const spacing = 2 * r + 3
    const availV = plateBaseY - 26 - 122
    const perCol = Math.max(1, Math.floor(availV / spacing))
    const colGap = 2 * r + 5

    const pileCols = Math.min(pizzas, 6)
    const pileGap = 2 * r + 6
    const pileX0 = PAD + r + 2
    const pileY0 = 46 + r
    const gap = 2 * r + 4

    const trayInner = maxRem * gap + 16
    const trayW = Math.min(width * 0.34, Math.max(78, trayInner))
    const trayX2 = width - PAD
    const trayX1 = trayX2 - trayW
    const trayY1 = 28
    const trayY2 = trayY1 + Math.max(2 * r + 26, 68)
    const tray = { x1: trayX1, y1: trayY1, x2: trayX2, y2: trayY2, cx: (trayX1 + trayX2) / 2, cy: (trayY1 + trayY2) / 2 + 4 }

    // Count per plate so a wrapped (multi-column) stack can be centered.
    const plateCounts = Array(friends).fill(0)
    place.forEach((p) => { if (p.loc === 'plate' && p.f < friends) plateCounts[p.f] += 1 })

    // Compute a resting position for every pizza from its placement.
    const perPlateIdx = Array(friends).fill(0)
    // Counters live on an object rather than as `let`s: the callback below
    // reassigning a captured variable is a React-rules violation, while
    // stepping a property (as perPlateIdx already does) is not.
    const next = { pile: 0, tray: 0 }
    const positions = place.map((p) => {
      if (p.loc === 'plate' && p.f < friends) {
        const idx = perPlateIdx[p.f]
        perPlateIdx[p.f] += 1
        const numCols = Math.ceil(plateCounts[p.f] / perCol)
        const subCol = Math.floor(idx / perCol)
        const rowInCol = idx % perCol
        return {
          x: friendX(p.f) + (subCol - (numCols - 1) / 2) * colGap,
          y: plateBaseY - 26 - rowInCol * spacing,
          loc: 'plate',
        }
      }
      if (p.loc === 'tray') {
        const k = next.tray
        next.tray += 1
        const startX = tray.cx - (status.trayCount - 1) * gap * 0.5
        return { x: startX + k * gap, y: tray.cy, loc: 'tray' }
      }
      const col = next.pile % pileCols
      const row = Math.floor(next.pile / pileCols)
      next.pile += 1
      return { x: pileX0 + col * pileGap, y: pileY0 + row * pileGap, loc: 'pile' }
    })

    return { PAD, width, colW, friendX, plateBaseY, r, spacing, tray, pileX0, pileY0, positions }
  }, [canvasWidth, pizzas, friends, place, status.trayCount])

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

    const { r, friendX, plateBaseY, colW, tray, positions } = layout

    // Plates + friend labels.
    for (let f = 0; f < friends; f += 1) {
      const cx = friendX(f)
      ctx.fillStyle = plateFill
      ctx.strokeStyle = '#C9D4EA'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(cx, plateBaseY, Math.min(colW * 0.42, r * 2.4), r * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = friendBlue
      ctx.font = `700 ${colW > 96 ? 14 : 12}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(colW > 96 ? `Friend ${f + 1}` : `#${f + 1}`, cx, plateBaseY + r * 0.7 + 6)
    }

    // Remainder tray.
    ctx.save()
    ctx.setLineDash([7, 6])
    ctx.strokeStyle = remOrange
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(tray.x1, tray.y1, tray.x2 - tray.x1, tray.y2 - tray.y1, 12)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = remOrange
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
      ctx.fillStyle = remOrange
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
      ctx.fillText('Pizzas to share — drag them out', layout.pileX0 - r, layout.pileY0 - r - 4)
    }

    // Pizzas (skip the dragged one; draw it last, lifted).
    const dragIndex = dragRef.current?.index ?? -1
    for (let i = 0; i < positions.length; i += 1) {
      if (i === dragIndex) continue
      const p = positions[i]
      drawPizza(ctx, p.x, p.y, r, p.loc === 'tray', false)
    }
    if (dragIndex >= 0 && dragPosRef.current) {
      drawPizza(ctx, dragPosRef.current.x, dragPosRef.current.y, r * 1.1, false, true)
    }
  }, [canvasWidth, layout, friends, status.pileCount, status.trayCount])

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
    const { positions, r } = layout
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      const p = positions[i]
      if (Math.hypot(p.x - pt.x, p.y - pt.y) <= r * 1.25) {
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { index: i, offX: pt.x - p.x, offY: pt.y - p.y }
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

  const reset = (n = pizzas) => {
    setPlace(pileArray(n))
    setHideAnswer(false)
  }
  const changePizzas = (nextN) => {
    const n = clamp(nextN, MIN_PIZZAS, MAX_PIZZAS)
    setPizzas(n)
    reset(n)
  }
  const changeFriends = (nextF) => {
    setFriends(clamp(nextF, MIN_FRIENDS, MAX_FRIENDS))
    reset()
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
    ? `Shared! Each friend got ${status.counts[0]}. Remainder = ${remainderVal}.`
    : !status.allEqual
      ? 'Not fair yet — every friend must have the same number.'
      : status.pileCount === 0 && status.trayCount >= friends
        ? 'Everyone could still get one more — keep sharing.'
        : status.pileCount > 0 && status.pileCount < friends && status.maxC > 0
          ? `Only ${status.pileCount} left — they can't be shared equally. Drag them to the Remainder tray.`
          : 'Drag a pizza onto each friend’s plate. Everyone gets the same.'

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      {/* Equation */}
      <div className="flex items-center justify-center gap-3">
        <p className="text-3xl font-black tabular-nums">
          <span>{pizzas}</span>
          <span style={{ color: muted }}> ÷ </span>
          <span style={{ color: friendBlue }}>{friends}</span>
          {status.solved && (
            hideAnswer ? (
              <span style={{ color: muted }}> = ?</span>
            ) : (
              <>
                <span style={{ color: muted }}> = </span>
                <span style={{ color: quotientGreen }}>{status.counts[0]} each</span>
                {remainderVal > 0 ? (
                  <>
                    <span style={{ color: muted }}>, </span>
                    <span style={{ color: remOrange }}>remainder {remainderVal}</span>
                  </>
                ) : (
                  <span style={{ color: muted }}>, no remainder</span>
                )}
              </>
            )
          )}
        </p>
        {status.solved && (
          <button type="button" onClick={() => setHideAnswer((h) => !h)} className="rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
            {hideAnswer ? 'Show answer' : 'Hide answer'}
          </button>
        )}
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

      <p className="text-center text-sm font-semibold" style={{ color: status.solved ? quotientGreen : muted }}>
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Stepper label="Pizzas" value={pizzas} color={ink} onDec={() => changePizzas(pizzas - 1)} onInc={() => changePizzas(pizzas + 1)} decLabel="Fewer Pizzas" incLabel="More Pizzas" />
        <Stepper label="Friends" value={friends} color={friendBlue} onDec={() => changeFriends(friends - 1)} onInc={() => changeFriends(friends + 1)} decLabel="Fewer Friends" incLabel="More Friends" />
        <button type="button" onClick={dealRound} disabled={!canDeal} className="rounded-full px-4 py-2.5 text-sm font-black text-white disabled:opacity-40" style={{ background: friendBlue }}>
          Deal a round
        </button>
        <GhostButton onClick={() => reset()} ariaLabel="Reset pizza placement">Reset</GhostButton>
      </div>
    </div>
  )
}
