import { useCallback, useEffect, useRef, useState } from 'react'

const fruits = [
  { id: 'strawberry', name: 'Strawberry', color: '#E23B4E', dark: '#A3132A', weight: 1 },
  { id: 'orange', name: 'Orange', color: '#E88A2E', dark: '#B25A1E', weight: 2 },
  { id: 'apple', name: 'Apple', color: '#D63A3A', dark: '#A01F1F', weight: 3 },
  { id: 'pear', name: 'Pear', color: '#9BC13C', dark: '#5B7A22', weight: 4 },
]

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  border: '#E0DDD6',
  left: '#B25A1E',
  right: '#1E7A5E',
  balanced: '#3B6D11',
  ratio: '#7B3F9E',
  muted: '#5F5E5A',
}

const canvasHeight = 330
const challenges = [
  { left: 'orange', right: 'apple', count: 3 },
  { left: 'apple', right: 'pear', count: 4 },
  { left: 'pear', right: 'orange', count: 2 },
  { left: 'strawberry', right: 'orange', count: 4 },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = y
    y = x % y
    x = next
  }
  return x || 1
}

function fruitById(id) {
  return fruits.find((fruit) => fruit.id === id) ?? fruits[0]
}

function plural(name, count) {
  return `${name}${count === 1 ? '' : 's'}`
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawFruit(ctx, fruit, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  const s = size

  if (fruit.id === 'orange') {
    ctx.fillStyle = fruit.color
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff66'
    ctx.beginPath()
    ctx.arc(-s * 0.16, -s * 0.16, s * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4E8D35'
    ctx.beginPath()
    ctx.ellipse(s * 0.07, -s * 0.48, s * 0.16, s * 0.08, -0.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (fruit.id === 'apple') {
    ctx.fillStyle = fruit.color
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.36)
    ctx.bezierCurveTo(-s * 0.38, -s * 0.58, -s * 0.66, -s * 0.1, -s * 0.38, s * 0.37)
    ctx.bezierCurveTo(-s * 0.17, s * 0.58, s * 0.17, s * 0.58, s * 0.38, s * 0.37)
    ctx.bezierCurveTo(s * 0.66, -s * 0.1, s * 0.38, -s * 0.58, 0, -s * 0.36)
    ctx.fill()
    ctx.strokeStyle = fruit.dark
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.strokeStyle = '#6B3A16'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.36)
    ctx.lineTo(s * 0.05, -s * 0.58)
    ctx.stroke()
    ctx.fillStyle = '#5B9A38'
    ctx.beginPath()
    ctx.ellipse(s * 0.2, -s * 0.49, s * 0.16, s * 0.08, -0.45, 0, Math.PI * 2)
    ctx.fill()
  } else if (fruit.id === 'pear') {
    ctx.fillStyle = fruit.color
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.52)
    ctx.bezierCurveTo(-s * 0.26, -s * 0.52, -s * 0.3, -s * 0.2, -s * 0.18, -s * 0.02)
    ctx.bezierCurveTo(-s * 0.55, s * 0.07, -s * 0.55, s * 0.52, 0, s * 0.52)
    ctx.bezierCurveTo(s * 0.55, s * 0.52, s * 0.55, s * 0.07, s * 0.18, -s * 0.02)
    ctx.bezierCurveTo(s * 0.3, -s * 0.2, s * 0.26, -s * 0.52, 0, -s * 0.52)
    ctx.fill()
    ctx.strokeStyle = fruit.dark
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.strokeStyle = '#6B3A16'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.52)
    ctx.lineTo(s * 0.06, -s * 0.7)
    ctx.stroke()
  } else {
    ctx.fillStyle = fruit.color
    ctx.beginPath()
    ctx.moveTo(0, s * 0.55)
    ctx.bezierCurveTo(-s * 0.54, s * 0.2, -s * 0.5, -s * 0.45, 0, -s * 0.48)
    ctx.bezierCurveTo(s * 0.5, -s * 0.45, s * 0.54, s * 0.2, 0, s * 0.55)
    ctx.fill()
    ctx.strokeStyle = fruit.dark
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#FBEAEE'
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        ctx.beginPath()
        ctx.arc((col - 1) * s * 0.17 + (row % 2) * s * 0.07, -s * 0.12 + row * s * 0.18, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#2F8B3B'
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.42)
      ctx.lineTo(i * s * 0.11, -s * 0.62)
      ctx.lineTo(i * s * 0.06, -s * 0.38)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawCheck(ctx, cx, cy, progress) {
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - 11, cy)
  if (progress <= 0.5) {
    const t = progress / 0.5
    ctx.lineTo(cx - 11 + 8 * t, cy + 8 * t)
  } else {
    ctx.lineTo(cx - 3, cy + 8)
    const t = (progress - 0.5) / 0.5
    ctx.lineTo(cx - 3 + 17 * t, cy + 8 - 20 * t)
  }
  ctx.stroke()
  ctx.restore()
}

function makePanPath(ctx, cx, cy, width, height) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2)
}

export default function RatioBalanceScale() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const fruitHitsRef = useRef([])
  const panHitsRef = useRef({})
  const [canvasWidth, setCanvasWidth] = useState(510)
  const [leftFruitId, setLeftFruitId] = useState('orange')
  const [rightFruitId, setRightFruitId] = useState('apple')
  const [leftCount, setLeftCount] = useState(0)
  const [rightCount, setRightCount] = useState(0)
  const [dragging, setDragging] = useState(null)
  const [balanceProgress, setBalanceProgress] = useState(0)
  const [ratioRows, setRatioRows] = useState([])
  const [recentKey, setRecentKey] = useState(null)
  const [challenge, setChallenge] = useState(null)

  const leftFruit = fruitById(leftFruitId)
  const rightFruit = fruitById(rightFruitId)
  const leftWeight = leftCount * leftFruit.weight
  const rightWeight = rightCount * rightFruit.weight
  const isBalanced = leftCount > 0 && rightCount > 0 && leftWeight === rightWeight
  const countGcd = gcd(leftCount, rightCount)
  const simplest = leftCount && rightCount ? `${leftCount / countGcd}:${rightCount / countGcd}` : '-'
  const liveRatio = `${leftCount}:${rightCount}`
  const challengeSolved = challenge && isBalanced && leftCount === challenge.count && leftFruitId === challenge.left && rightFruitId === challenge.right

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    drawRoundRect(ctx, 0, 0, canvasWidth, canvasHeight, 14)
    ctx.fill()

    const cx = canvasWidth / 2
    const baseY = canvasHeight - 30
    const hubY = 122
    const arm = Math.min(canvasWidth * 0.34, 190)
    const diff = leftWeight - rightWeight
    const angle = clamp(-diff * 0.035, -0.18, 0.18)
    const leftEnd = { x: cx - Math.cos(angle) * arm, y: hubY - Math.sin(angle) * arm }
    const rightEnd = { x: cx + Math.cos(angle) * arm, y: hubY + Math.sin(angle) * arm }
    const panDrop = 72
    const leftPan = { x: leftEnd.x, y: leftEnd.y + panDrop, w: 148, h: 38 }
    const rightPan = { x: rightEnd.x, y: rightEnd.y + panDrop, w: 148, h: 38 }
    panHitsRef.current = {
      left: { x: leftPan.x - leftPan.w / 2, y: leftPan.y - leftPan.h / 2 - 22, w: leftPan.w, h: leftPan.h + 34 },
      right: { x: rightPan.x - rightPan.w / 2, y: rightPan.y - rightPan.h / 2 - 22, w: rightPan.w, h: rightPan.h + 34 },
    }

    const baseTopY = baseY - 16
    ctx.save()
    ctx.fillStyle = '#1A1A2E18'
    ctx.beginPath()
    ctx.ellipse(cx, baseY + 9, 86, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 4
    drawRoundRect(ctx, cx - 78, baseTopY, 156, 28, 14)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = colors.ink
    drawRoundRect(ctx, cx - 34, baseTopY - 12, 68, 18, 9)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, baseTopY - 6)
    ctx.lineTo(cx, hubY + 6)
    ctx.stroke()

    ctx.strokeStyle = isBalanced ? colors.balanced : colors.ink
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(leftEnd.x, leftEnd.y)
    ctx.lineTo(rightEnd.x, rightEnd.y)
    ctx.stroke()

    ctx.lineWidth = 2.5
    ;[
      [leftEnd, leftPan],
      [rightEnd, rightPan],
    ].forEach(([end, pan]) => {
      const rimLeft = pan.x - pan.w * 0.38
      const rimRight = pan.x + pan.w * 0.38
      const rimY = pan.y - pan.h * 0.18
      ctx.strokeStyle = colors.ink
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(end.x, end.y + 4)
      ctx.lineTo(rimLeft, rimY)
      ctx.moveTo(end.x, end.y + 4)
      ctx.lineTo(rimRight, rimY)
      ctx.moveTo(rimLeft, rimY)
      ctx.lineTo(rimRight, rimY)
      ctx.stroke()
      ctx.fillStyle = '#F8F6F0'
      ctx.strokeStyle = colors.ink
      ctx.lineWidth = 3
      makePanPath(ctx, pan.x, pan.y, pan.w, pan.h)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#59606E'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(pan.x, pan.y - 1, pan.w / 2 - 8, pan.h / 2 - 5, 0, 0, Math.PI)
      ctx.stroke()
    })

    const hubRadius = 22
    ctx.beginPath()
    ctx.arc(cx, hubY, hubRadius, 0, Math.PI * 2)
    ctx.fillStyle = isBalanced ? colors.balanced : colors.ink
    ctx.shadowColor = isBalanced ? '#3B6D1166' : 'transparent'
    ctx.shadowBlur = isBalanced ? 14 : 0
    ctx.fill()
    ctx.shadowBlur = 0
    if (isBalanced) drawCheck(ctx, cx, hubY, balanceProgress)

    fruitHitsRef.current = []
    const drawStack = (side, fruit, count, pan) => {
      const size = 27
      const perRow = 5
      for (let index = 0; index < count; index += 1) {
        if (dragging?.side === side && dragging.index === index) continue
        const row = Math.floor(index / perRow)
        const col = index % perRow
        const rowCount = Math.min(perRow, count - row * perRow)
        const startX = pan.x - ((rowCount - 1) * 26) / 2
        const x = startX + col * 26
        const y = pan.y - 23 - row * 25
        drawFruit(ctx, fruit, x, y, size)
        fruitHitsRef.current.push({ side, index, x, y, radius: 17 })
      }
    }
    drawStack('left', leftFruit, leftCount, leftPan)
    drawStack('right', rightFruit, rightCount, rightPan)
    if (dragging) drawFruit(ctx, fruitById(dragging.fruitId), dragging.x, dragging.y, 28)

    ctx.fillStyle = '#FBEEDD'
    drawRoundRect(ctx, cx - 142, 12, 284, 25, 13)
    ctx.fill()
    ctx.fillStyle = colors.ink
    ctx.font = '800 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('tap a pan to add · drag a fruit off to remove', cx, 25)
  }, [balanceProgress, canvasWidth, dragging, isBalanced, leftCount, leftFruit, leftWeight, rightCount, rightFruit, rightWeight])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(Math.max(320, Math.floor(entry.contentRect.width))))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    if (!isBalanced) {
      frameRef.current = requestAnimationFrame(() => setBalanceProgress(0))
      return undefined
    }
    let start = null
    const tick = (now) => {
      if (start === null) start = now
      const progress = clamp((now - start) / 300, 0, 1)
      setBalanceProgress(progress)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [isBalanced, leftCount, rightCount, leftFruitId, rightFruitId])

  useEffect(() => {
    if (!isBalanced) return
    const key = `${leftFruitId}-${rightFruitId}-${leftCount}-${rightCount}`
    const logTimer = setTimeout(() => {
      setRatioRows((rows) => {
        if (rows.some((row) => row.key === key)) return rows
        const next = [{ key, left: leftCount, right: rightCount, simplest }, ...rows]
        return next.slice(0, 6)
      })
      setRecentKey(key)
    }, 0)
    const clearTimer = setTimeout(() => setRecentKey(null), 900)
    return () => {
      clearTimeout(logTimer)
      clearTimeout(clearTimer)
    }
  }, [isBalanced, leftCount, leftFruitId, rightCount, rightFruitId, simplest])

  const clearScale = () => {
    setLeftCount(0)
    setRightCount(0)
    setChallenge(null)
  }

  const makeChallenge = () => {
    const item = challenges[Math.floor(Math.random() * challenges.length)]
    setLeftFruitId(item.left)
    setRightFruitId(item.right)
    setLeftCount(item.count)
    setRightCount(0)
    setChallenge(item)
  }

  const handleFruitChoice = (side, id) => {
    if (side === 'left') {
      setLeftFruitId(id)
      setLeftCount(0)
    } else {
      setRightFruitId(id)
      setRightCount(0)
    }
    setChallenge(null)
  }

  const canvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    }
  }

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const point = canvasPoint(event)
    canvas.setPointerCapture(event.pointerId)
    const fruitHit = fruitHitsRef.current.find((hit) => Math.hypot(hit.x - point.x, hit.y - point.y) <= hit.radius)
    if (fruitHit) {
      setDragging({
        ...fruitHit,
        fruitId: fruitHit.side === 'left' ? leftFruitId : rightFruitId,
        x: point.x,
        y: point.y,
        moved: false,
      })
      return
    }
    const panSide = Object.entries(panHitsRef.current).find(([, pan]) => point.x >= pan.x && point.x <= pan.x + pan.w && point.y >= pan.y && point.y <= pan.y + pan.h)?.[0]
    if (panSide === 'left') setLeftCount((count) => count + 1)
    if (panSide === 'right') setRightCount((count) => count + 1)
  }

  const handlePointerMove = (event) => {
    if (!dragging) return
    const point = canvasPoint(event)
    setDragging((current) => current ? { ...current, x: point.x, y: point.y, moved: true } : current)
  }

  const handlePointerUp = (event) => {
    if (!dragging) return
    const point = canvasPoint(event)
    const pan = panHitsRef.current[dragging.side]
    const outside = point.x < pan.x || point.x > pan.x + pan.w || point.y < pan.y || point.y > pan.y + pan.h
    if (dragging.moved && outside) {
      if (dragging.side === 'left') setLeftCount((count) => Math.max(0, count - 1))
      else setRightCount((count) => Math.max(0, count - 1))
    }
    setDragging(null)
  }

  const status = isBalanced ? '✓ balanced' : leftCount + rightCount === 0 ? 'empty' : leftWeight > rightWeight ? 'tips left' : rightWeight > leftWeight ? 'tips right' : 'empty'
  const hint = (() => {
    if (challengeSolved) {
      return `Challenge solved: ${leftCount} ${plural(leftFruit.name, leftCount)} balance ${rightCount} ${plural(rightFruit.name, rightCount)}.`
    }
    if (challenge) {
      return `Challenge: balance exactly ${challenge.count} ${plural(fruitById(challenge.left).name, challenge.count)} using ${plural(fruitById(challenge.right).name, 2)}.`
    }
    if (leftCount + rightCount === 0) return 'Tap a pan to add fruit. Drag a fruit away from a pan to remove it.'
    if (!isBalanced) return `${leftWeight > rightWeight ? 'Left' : 'Right'} is heavier. Add fruit to the lighter side or remove from the heavier side.`
    return `${leftCount}:${rightCount} balances, and the simplest ratio is ${simplest}. Multiplying both sides keeps an equivalent ratio.`
  })()
  const visibleRatioRows = ratioRows.slice(-5)

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-3" style={{ background: colors.page, color: colors.ink }}>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_245px] gap-2">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <FruitPicker title="Left pan" active={leftFruitId} accent={colors.left} onPick={(id) => handleFruitChoice('left', id)} />
            <FruitPicker title="Right pan" active={rightFruitId} accent={colors.right} onPick={(id) => handleFruitChoice('right', id)} />
          </div>
          <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.border }}>
            <canvas
              ref={canvasRef}
              className="block touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Ratio balance scale"
            />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="grid shrink-0 grid-cols-[1.55fr_0.9fr_0.9fr] gap-1">
            <Stat label="Scale" value={status} color={isBalanced ? colors.balanced : colors.ink} wide />
            <Stat label="Ratio" value={liveRatio} color={colors.ratio} />
            <Stat label="Simplest" value={simplest} color={colors.ratio} />
          </div>
          <div className="shrink-0 rounded-xl border bg-white p-2" style={{ borderColor: colors.ratio }}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-black" style={{ color: colors.ratio }}>Equivalent ratios</h2>
              <button type="button" onClick={() => setRatioRows([])} className="rounded-full border px-2 py-1 text-[11px] font-black" style={{ borderColor: colors.border }}>
                clear
              </button>
            </div>
            <div className="grid grid-cols-3 border-b pb-1 text-[11px] font-black text-neutral-500" style={{ borderColor: colors.border }}>
              <span>Left</span>
              <span>Right</span>
              <span>Simplest</span>
            </div>
            <div className="mt-1 h-[118px] space-y-1 overflow-hidden">
              {visibleRatioRows.length === 0 ? (
                <p className="pt-10 text-center text-xs font-semibold text-neutral-500">Balance the scale to start the table.</p>
              ) : visibleRatioRows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-3 rounded-lg px-2 py-1 font-mono text-[13px] font-black transition"
                  style={{ background: row.key === recentKey ? '#EFEAF7' : '#ffffff', color: colors.ratio }}
                >
                  <span>{row.left}</span>
                  <span>{row.right}</span>
                  <span>{row.simplest}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid shrink-0 gap-1.5">
            <button type="button" onClick={clearScale} className="rounded-full border bg-white px-3 py-1.5 text-sm font-black" style={{ borderColor: colors.border }}>
              Clear scale
            </button>
            <button type="button" onClick={makeChallenge} className="rounded-full px-3 py-1.5 text-sm font-black text-white" style={{ background: colors.ratio }}>
              Give me a balance to find
            </button>
          </div>
        </aside>
      </div>

      <div className="rounded-xl border bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-700" style={{ borderColor: colors.border }}>
        {hint}
      </div>
    </div>
  )
}

function FruitPicker({ title, active, accent, onPick }) {
  return (
    <div className="rounded-xl border bg-white px-2.5 py-1.5" style={{ borderColor: accent }}>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
        <span>{title}</span>
        <span className="text-[9px] text-neutral-500">tap fruit</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {fruits.map((fruit) => (
          <button
            key={fruit.id}
            type="button"
            onClick={() => onPick(fruit.id)}
            className="flex min-w-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] font-black transition"
            style={{
              borderColor: active === fruit.id ? fruit.color : colors.border,
              background: active === fruit.id ? `${fruit.color}22` : '#ffffff',
              color: active === fruit.id ? fruit.dark : colors.ink,
            }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: fruit.color }} />
            <span className="truncate">{fruit.name}</span>
            <span className="ml-auto font-mono text-[9px] text-neutral-500">{fruit.weight}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, color, wide = false }) {
  return (
    <div className="min-w-0 rounded-xl border bg-white px-2 py-1" style={{ borderColor: color }}>
      <div className="truncate text-[8px] font-black uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`${wide ? 'whitespace-normal leading-tight' : 'truncate'} font-mono text-[12px] font-black`} style={{ color }}>{value}</div>
    </div>
  )
}
