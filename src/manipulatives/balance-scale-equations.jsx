import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const xPurple = '#7C3AED'
const unitBlue = '#2563EB'
const beamWood = '#B07A3C'
const balancedGreen = '#1D9E75'
const offRed = '#D85A30'

// ax + b = cx + d, solvable by removing equal tiles (|a - c| = 1).
const PROBLEMS = [
  { left: { x: 1, u: 3 }, right: { x: 0, u: 5 } }, // x + 3 = 5  -> x = 2
  { left: { x: 1, u: 5 }, right: { x: 0, u: 8 } }, // x + 5 = 8  -> x = 3
  { left: { x: 2, u: 1 }, right: { x: 1, u: 4 } }, // 2x + 1 = x + 4 -> x = 3
  { left: { x: 2, u: 3 }, right: { x: 1, u: 7 } }, // 2x + 3 = x + 7 -> x = 4
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

let tileSeq = 0
const buildTiles = ({ x, u }) => [
  ...Array.from({ length: x }, () => ({ id: (tileSeq += 1), type: 'x' })),
  ...Array.from({ length: u }, () => ({ id: (tileSeq += 1), type: 'unit' })),
]

const countType = (tiles, type) => tiles.filter((t) => t.type === type).length

function sideLabel(xc, uc) {
  const parts = []
  if (xc === 1) parts.push('x')
  else if (xc > 1) parts.push(`${xc}x`)
  if (uc > 0 || parts.length === 0) parts.push(String(uc))
  return parts.join(' + ')
}

export default function BalanceScaleEquations() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [problemIndex, setProblemIndex] = useState(0)
  const [left, setLeft] = useState(() => buildTiles(PROBLEMS[0].left))
  const [right, setRight] = useState(() => buildTiles(PROBLEMS[0].right))
  const [drag, setDrag] = useState(null) // { side, id, x, y, offX, offY }

  const canvasHeight = 360

  const leftX = countType(left, 'x')
  const leftU = countType(left, 'unit')
  const rightX = countType(right, 'x')
  const rightU = countType(right, 'unit')
  // x is whatever value makes the equation currently on the pans true, so any
  // equation the teacher builds works — nothing is hardcoded to a preset.
  // If both sides hold the same number of x's there is no unique x; a nominal 1
  // then correctly shows an identity as level and a no-solution as permanently tipped.
  const denom = leftX - rightX
  const solution = denom !== 0 ? (rightU - leftU) / denom : 1
  const leftW = leftX * solution + leftU
  const rightW = rightX * solution + rightU
  const balanced = leftW === rightW
  const solved =
    balanced &&
    ((leftX === 1 && leftU === 0 && rightX === 0 && rightU >= 1) ||
      (rightX === 1 && rightU === 0 && leftX === 0 && leftU >= 1))
  const answer = solved ? (leftX === 1 ? rightU : leftU) : null

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    let raf = 0
    // Measure before first paint; only commit a whole-pixel change, and defer
    // via rAF so the observer can never feed back into itself (ResizeObserver "bounce").
    const commit = (w) => {
      const next = Math.max(420, Math.round(w))
      setCanvasWidth((prev) => (Math.abs(prev - next) >= 1 ? next : prev))
    }
    commit(node.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width // unscaled content box — stable under parent transforms
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

  const addTile = (side, type) => {
    const tile = { id: (tileSeq += 1), type }
    if (side === 'left') setLeft((prev) => [...prev, tile])
    else setRight((prev) => [...prev, tile])
  }

  const clearAll = () => {
    setLeft([])
    setRight([])
    setDrag(null)
  }

  const loadProblem = (index) => {
    setProblemIndex(index)
    setLeft(buildTiles(PROBLEMS[index].left))
    setRight(buildTiles(PROBLEMS[index].right))
    setDrag(null)
  }

  const geo = useMemo(() => {
    const W = canvasWidth
    const cx = W / 2
    const pivotY = 92
    const L = Math.min(W * 0.33, 240)
    const stringLen = 66
    const panW = Math.min(L * 1.15, 190)
    const baseY = 300
    return { W, cx, pivotY, L, stringLen, panW, baseY }
  }, [canvasWidth])

  const targetAngle = clamp((leftW - rightW) * 0.03, -0.19, 0.19)
  const angleRef = useRef(targetAngle)
  const rafRef = useRef(null)

  // Positions of every tile (used for drawing and hit-testing).
  const layout = useMemo(() => {
    const { cx, pivotY, L, stringLen, panW } = geo
    const size = 26
    const gap = 5
    const perRow = Math.max(1, Math.floor(panW / (size + gap)))

    const place = (tiles, angle, dir) => {
      const endX = cx + dir * L * Math.cos(angle)
      const endY = pivotY - dir * L * Math.sin(angle)
      const panCX = endX
      const panTopY = endY + stringLen
      const positions = tiles.map((t, i) => {
        const row = Math.floor(i / perRow)
        const col = i % perRow
        const rowCount = Math.min(perRow, tiles.length - row * perRow)
        const rowW = rowCount * (size + gap) - gap
        return {
          ...t,
          x: panCX - rowW / 2 + col * (size + gap) + size / 2,
          y: panTopY - size / 2 - 6 - row * (size + gap),
          size,
        }
      })
      return { endX, endY, panCX, panTopY, positions }
    }

    return { size, place }
  }, [geo])

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

    const { cx, pivotY, L, baseY } = geo
    const angle = angleRef.current

    // Fulcrum (triangle) + stand.
    ctx.fillStyle = '#9AA0AA'
    ctx.beginPath()
    ctx.moveTo(cx, pivotY)
    ctx.lineTo(cx - 26, baseY)
    ctx.lineTo(cx + 26, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#7C818C'
    ctx.fillRect(cx - 46, baseY, 92, 8)

    const leftInfo = layout.place(left, angle, -1)
    const rightInfo = layout.place(right, angle, 1)

    // Beam.
    ctx.strokeStyle = beamWood
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(leftInfo.endX, leftInfo.endY)
    ctx.lineTo(rightInfo.endX, rightInfo.endY)
    ctx.stroke()
    // Pivot cap.
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(cx, pivotY, 6, 0, Math.PI * 2)
    ctx.fill()

    // Strings + pans.
    const drawPan = (info) => {
      const hw = geo.panW / 2
      // Hanging string.
      ctx.strokeStyle = '#C9C3B6'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(info.endX, info.endY)
      ctx.lineTo(info.panCX, info.panTopY - 2)
      ctx.stroke()
      // Shallow bowl the tiles rest in.
      ctx.strokeStyle = '#8A8478'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(info.panCX - hw, info.panTopY - 2)
      ctx.quadraticCurveTo(info.panCX, info.panTopY + 20, info.panCX + hw, info.panTopY - 2)
      ctx.stroke()
    }
    drawPan(leftInfo)
    drawPan(rightInfo)

    // Tiles.
    const dragId = drag?.id
    const drawTile = (t) => {
      const isX = t.type === 'x'
      ctx.fillStyle = isX ? xPurple : unitBlue
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      roundRect(ctx, t.x - t.size / 2, t.y - t.size / 2, t.size, t.size, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${isX ? 15 : 12}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(isX ? 'x' : '1', t.x, t.y + 0.5)
    }
    ;[...leftInfo.positions, ...rightInfo.positions].forEach((t) => {
      if (t.id === dragId) return
      drawTile(t)
    })
    if (drag) {
      drawTile({ x: drag.x, y: drag.y, size: layout.size, type: drag.type })
    }
  }, [canvasWidth, geo, layout, left, right, drag])

  // Redraw on any state change (keeps the dragged tile following the pointer).
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
    draw()
  }, [draw])

  // Ease the tilt toward its target. Depends only on targetAngle, so a drag
  // (which changes `draw` every frame) never restarts this loop — no shaking.
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = () => {
      const cur = angleRef.current
      const next = cur + (targetAngle - cur) * 0.2
      angleRef.current = Math.abs(next - targetAngle) < 0.0006 ? targetAngle : next
      drawRef.current()
      if (angleRef.current !== targetAngle) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [targetAngle])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const pt = getPoint(event)
    const angle = angleRef.current
    const leftInfo = layout.place(left, angle, -1)
    const rightInfo = layout.place(right, angle, 1)
    const all = [
      ...leftInfo.positions.map((t) => ({ ...t, side: 'left' })),
      ...rightInfo.positions.map((t) => ({ ...t, side: 'right' })),
    ]
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const t = all[i]
      if (Math.abs(pt.x - t.x) <= t.size / 2 + 3 && Math.abs(pt.y - t.y) <= t.size / 2 + 3) {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDrag({ side: t.side, id: t.id, type: t.type, x: t.x, y: t.y, offX: pt.x - t.x, offY: pt.y - t.y, homeX: t.x, homeY: t.y })
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
    // Removed if dragged well away from where it started (off the pan).
    const movedOff = Math.hypot(drag.x - drag.homeX, drag.y - drag.homeY) > 46
    if (movedOff) {
      if (drag.side === 'left') setLeft((ts) => ts.filter((t) => t.id !== drag.id))
      else setRight((ts) => ts.filter((t) => t.id !== drag.id))
    }
    setDrag(null)
  }

  const isEmpty = left.length === 0 && right.length === 0
  const noUniqueX = denom === 0 && !isEmpty
  const message = isEmpty
    ? 'Add x and 1 tiles to either pan to build an equation.'
    : solved
      ? `Solved!  x = ${answer}`
      : noUniqueX
        ? leftU === rightU
          ? 'Both sides are identical — this is true for every value of x.'
          : 'These sides can never balance — no value of x makes this true.'
        : !balanced
          ? 'Unbalanced! Take the same tile off the OTHER side to level it again.'
          : 'Balanced ✓  Drag matching tiles off both sides until one x sits alone.'

  const leftEq = sideLabel(leftX, leftU)
  const rightEq = sideLabel(rightX, rightU)

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      {/* Live equation */}
      <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
        <span style={{ color: solved ? balancedGreen : leftX ? xPurple : ink }}>{leftEq}</span>
        <span style={{ color: solved ? balancedGreen : muted }}>=</span>
        <span style={{ color: solved ? balancedGreen : rightX ? xPurple : ink }}>{rightEq}</span>
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

      <p className="text-center text-sm font-bold" style={{ color: solved ? balancedGreen : balanced ? muted : offRed }}>
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Build any equation: add tiles to either pan. */}
        {['left', 'right'].map((side) => (
          <div key={side} className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase" style={{ color: muted }}>{side}</span>
            <button type="button" onClick={() => addTile(side, 'x')} className="rounded-lg px-3 py-1.5 text-sm font-black text-white" style={{ background: xPurple }}>+ x</button>
            <button type="button" onClick={() => addTile(side, 'unit')} className="rounded-lg px-3 py-1.5 text-sm font-black text-white" style={{ background: unitBlue }}>+ 1</button>
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: muted }}>
          Starter:
          <select
            value={problemIndex}
            onChange={(event) => loadProblem(Number(event.target.value))}
            className="rounded-lg border border-[#E0DDD6] bg-white px-2 py-1.5 text-sm font-black outline-none"
            style={{ color: xPurple }}
          >
            {PROBLEMS.map((p, i) => (
              <option key={i} value={i}>
                {sideLabel(p.left.x, p.left.u)} = {sideLabel(p.right.x, p.right.u)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => loadProblem(problemIndex)} className="rounded-full border px-3 py-1.5 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Reset
        </button>
        <button type="button" onClick={clearAll} className="rounded-full border px-3 py-1.5 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Empty pans
        </button>
      </div>
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
