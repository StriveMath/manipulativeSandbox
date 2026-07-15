import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  grid: '#DEDAD1',
  slope: '#2660C4',
  intercept: '#1E7A5E',
  line: '#7B3F9E',
  target: '#D4879E',
  highlight: '#7B3F9E',
  border: '#E0DDD6',
}

const xRows = [-2, -1, 0, 1, 2]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function snapSlope(value) {
  return clamp(Math.round(value * 2) / 2, -4, 4)
}

function snapIntercept(value) {
  return clamp(Math.round(value), -6, 6)
}

function formatNumber(value) {
  if (Object.is(value, -0)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function signed(value) {
  if (value === 0) return ''
  return value > 0 ? `+ ${formatNumber(value)}` : `- ${formatNumber(Math.abs(value))}`
}

function equationParts(m, b) {
  let mx
  if (m === 0) mx = ''
  else if (m === 1) mx = 'x'
  else if (m === -1) mx = '-x'
  else mx = `${formatNumber(m)}x`
  const bPart = signed(b)
  return { mx, bPart, constantOnly: m === 0 }
}

function makeTarget() {
  const slopes = [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
  const m = slopes[Math.floor(Math.random() * slopes.length)]
  const b = Math.floor(Math.random() * 13) - 6
  return { m, b }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-black transition"
      style={{
        borderColor: active ? colors.line : colors.border,
        background: active ? colors.line : '#ffffff',
        color: active ? '#ffffff' : colors.ink,
      }}
    >
      {children}
    </button>
  )
}

function SliderCard({ label, value, color, min, max, step, onChange }) {
  return (
    <div className="rounded-[14px] border bg-white px-3 py-1.5" style={{ borderColor: color }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wide" style={{ color }}>{label}</span>
        <span className="rounded-full px-3 py-0.5 font-mono text-[15px] font-black text-white" style={{ background: color }}>
          {formatNumber(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  )
}

function EquationBar({ m, b, activeLink, setActiveLink }) {
  const { mx, bPart, constantOnly } = equationParts(m, b)
  return (
    <div className="rounded-[14px] border bg-white px-3 py-2 text-center font-mono text-[21px] font-black leading-tight" style={{ borderColor: colors.border }}>
      <span>y = </span>
      {constantOnly ? (
        <button
          type="button"
          onPointerEnter={() => setActiveLink('intercept')}
          onPointerLeave={() => setActiveLink(null)}
          onClick={() => setActiveLink(activeLink === 'intercept' ? null : 'intercept')}
          className="rounded-lg px-2 py-1"
          style={{ color: colors.intercept, background: activeLink === 'intercept' ? '#E9F5EF' : 'transparent' }}
        >
          {formatNumber(b)}
        </button>
      ) : (
        <>
          <button
            type="button"
            onPointerEnter={() => setActiveLink('slope')}
            onPointerLeave={() => setActiveLink(null)}
            onClick={() => setActiveLink(activeLink === 'slope' ? null : 'slope')}
            className="rounded-lg px-2 py-1"
            style={{ color: colors.slope, background: activeLink === 'slope' ? '#E8F1FC' : 'transparent' }}
          >
            {mx}
          </button>
          {b !== 0 && (
            <button
              type="button"
              onPointerEnter={() => setActiveLink('intercept')}
              onPointerLeave={() => setActiveLink(null)}
              onClick={() => setActiveLink(activeLink === 'intercept' ? null : 'intercept')}
              className="rounded-lg px-2 py-1"
              style={{ color: colors.intercept, background: activeLink === 'intercept' ? '#E9F5EF' : 'transparent' }}
            >
              {bPart}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function LinearEquationGrapher() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 540, height: 468 })
  const [mode, setMode] = useState('Explore')
  const [m, setM] = useState(1)
  const [b, setB] = useState(0)
  const [target, setTarget] = useState(() => makeTarget())
  const [showTriangle, setShowTriangle] = useState(false)
  const [showPoints] = useState(false)
  const [activeLink, setActiveLink] = useState(null)

  const constants = useMemo(() => {
    const pad = 46
    const plotW = canvasSize.width - pad * 2
    const plotH = canvasSize.height - pad * 2
    const cell = Math.min(plotW, plotH) / 16
    const originX = canvasSize.width / 2
    const originY = canvasSize.height / 2
    return { pad, cell, originX, originY, left: originX - cell * 8, right: originX + cell * 8, top: originY - cell * 8, bottom: originY + cell * 8 }
  }, [canvasSize])

  const toPx = useCallback((x, y) => ({
    x: constants.originX + x * constants.cell,
    y: constants.originY - y * constants.cell,
  }), [constants])

  const toGrid = useCallback((x, y) => ({
    x: clamp((x - constants.originX) / constants.cell, -8, 8),
    y: clamp((constants.originY - y) / constants.cell, -8, 8),
  }), [constants])

  const yFor = useCallback((x, slope = m, intercept = b) => slope * x + intercept, [b, m])
  const tableRows = xRows.map((x) => ({ x, y: yFor(x) }))
  const matched = mode === 'Match' && m === target.m && b === target.b

  const slopeHandleX = useMemo(() => {
    const options = [2, -2, 1, -1, 3, -3, 4, -4]
    return options.find((x) => yFor(x) >= -8 && yFor(x) <= 8) ?? 2
  }, [yFor])

  const drawLine = useCallback((ctx, slope, intercept, color, dashed = false, width = 2.5) => {
    const intersections = []
    ;[-8, 8].forEach((x) => {
      const y = slope * x + intercept
      if (y >= -8 && y <= 8) intersections.push({ x, y })
    })
    if (slope !== 0) {
      ;[-8, 8].forEach((y) => {
        const x = (y - intercept) / slope
        if (x >= -8 && x <= 8) intersections.push({ x, y })
      })
    }
    const unique = intersections.filter((point, index) => intersections.findIndex((item) => Math.abs(item.x - point.x) < 0.001 && Math.abs(item.y - point.y) < 0.001) === index)
    if (unique.length < 2) return
    const p1 = toPx(unique[0].x, unique[0].y)
    const p2 = toPx(unique[1].x, unique[1].y)
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    if (dashed) ctx.setLineDash([8, 7])
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
    ctx.restore()
  }, [toPx])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 0, 0, canvasSize.width, canvasSize.height, 14)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.rect(constants.left, constants.top, constants.right - constants.left, constants.bottom - constants.top)
    ctx.clip()

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    for (let i = -8; i <= 8; i += 1) {
      const v = toPx(i, 0).x
      const h = toPx(0, i).y
      ctx.beginPath()
      ctx.moveTo(v, constants.top)
      ctx.lineTo(v, constants.bottom)
      ctx.moveTo(constants.left, h)
      ctx.lineTo(constants.right, h)
      ctx.stroke()
    }

    if (mode === 'Match') drawLine(ctx, target.m, target.b, colors.target, true, 3)
    drawLine(ctx, m, b, colors.line, false, 3)

    if (showTriangle) {
      const p0 = toPx(0, b)
      const p1 = toPx(1, b)
      const p2 = toPx(1, b + m)
      ctx.strokeStyle = colors.intercept
      ctx.lineWidth = 3
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
      ctx.strokeStyle = colors.slope
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = colors.intercept
      ctx.font = '900 12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('run 1', (p0.x + p1.x) / 2, p0.y + 18)
      ctx.fillStyle = colors.slope
      ctx.fillText(`rise ${formatNumber(m)}`, p2.x + 32, (p1.y + p2.y) / 2)
    }

    if (showPoints || activeLink?.startsWith('row-')) {
      tableRows.forEach((row) => {
        if (row.y < -8 || row.y > 8) return
        const p = toPx(row.x, row.y)
        const active = activeLink === `row-${row.x}`
        if (active) return
        if (!showPoints && !active) return
        ctx.fillStyle = active ? colors.highlight : colors.slope
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = active ? 4 : 2.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, active ? 8.5 : 5.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
    }

    ctx.restore()

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(constants.left, constants.originY)
    ctx.lineTo(constants.right, constants.originY)
    ctx.moveTo(constants.originX, constants.top)
    ctx.lineTo(constants.originX, constants.bottom)
    ctx.stroke()

    ctx.fillStyle = '#5F5E5A'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = -8; x <= 8; x += 2) {
      const px = toPx(x, 0)
      if (x === -8) ctx.textAlign = 'left'
      else if (x === 8) ctx.textAlign = 'right'
      else ctx.textAlign = 'center'
      ctx.fillText(String(x), px.x, constants.originY + 5)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = -8; y <= 8; y += 2) {
      if (y === 0) continue
      const py = toPx(0, y)
      const labelY = clamp(py.y, constants.top + 8, constants.bottom - 8)
      ctx.fillText(String(y), constants.originX - 6, labelY)
    }

    const interceptPoint = toPx(0, b)
    const slopePoint = toPx(slopeHandleX, yFor(slopeHandleX))
    ;[
      { point: interceptPoint, color: colors.intercept, active: activeLink === 'intercept', label: 'b' },
      { point: slopePoint, color: colors.slope, active: activeLink === 'slope', label: 'm' },
    ].forEach((item) => {
      ctx.fillStyle = item.color
      ctx.strokeStyle = item.active ? colors.highlight : '#ffffff'
      ctx.lineWidth = item.active ? 5 : 3
      ctx.beginPath()
      ctx.arc(item.point.x, item.point.y, item.active ? 11 : 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.label, item.point.x, item.point.y)
    })

    if (activeLink?.startsWith('row-')) {
      const activeRow = tableRows.find((row) => activeLink === `row-${row.x}`)
      if (activeRow && activeRow.y >= -8 && activeRow.y <= 8) {
        const point = toPx(activeRow.x, activeRow.y)
        const touchesHandle = [interceptPoint, slopePoint].some((handle) => Math.hypot(handle.x - point.x, handle.y - point.y) < 16)
        ctx.save()
        ctx.strokeStyle = colors.highlight
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(point.x, point.y, touchesHandle ? 15 : 10, 0, Math.PI * 2)
        if (!touchesHandle) {
          ctx.fillStyle = colors.highlight
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 3
        }
        ctx.stroke()
        ctx.restore()
      }
    }

    if (matched) {
      const badgeW = 114
      const badgeH = 34
      const badgeX = constants.originX - badgeW / 2
      const badgeY = constants.top + 12
      ctx.save()
      ctx.shadowColor = 'rgba(123, 63, 158, 0.22)'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = colors.line
      ctx.lineWidth = 2
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 17)
      ctx.fill()
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = colors.line
      ctx.font = '900 15px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Matched!', constants.originX, badgeY + badgeH / 2)
      ctx.restore()
    }
  }, [activeLink, b, canvasSize, constants, drawLine, m, matched, mode, showPoints, showTriangle, slopeHandleX, tableRows, target, toPx, yFor])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setCanvasSize({
      width: Math.max(420, Math.floor(node.clientWidth)),
      height: Math.max(420, Math.floor(node.clientHeight)),
    })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  const canvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const point = canvasPoint(event)
    const interceptPoint = toPx(0, b)
    const slopePoint = toPx(slopeHandleX, yFor(slopeHandleX))
    if (Math.hypot(point.x - interceptPoint.x, point.y - interceptPoint.y) <= 18) {
      dragRef.current = 'intercept'
      setActiveLink('intercept')
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (Math.hypot(point.x - slopePoint.x, point.y - slopePoint.y) <= 18) {
      dragRef.current = 'slope'
      setActiveLink('slope')
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const point = canvasPoint(event)
    const grid = toGrid(point.x, point.y)
    if (dragRef.current === 'intercept') {
      setB(snapIntercept(grid.y))
      return
    }
    const divisor = Math.abs(grid.x) < 0.35 ? slopeHandleX : grid.x
    setM(snapSlope((grid.y - b) / divisor))
  }

  const stopDragging = () => {
    dragRef.current = null
  }

  const setModeSafely = (nextMode) => {
    setMode(nextMode)
    setActiveLink(null)
    if (nextMode === 'Match') setTarget(makeTarget())
  }

  const hint = mode === 'Explore'
    ? `m = ${formatNumber(m)} controls steepness. b = ${formatNumber(b)} is where the line crosses the y-axis. Hover the equation or table to see the links.`
    : matched
      ? 'Matched. The slope and y-intercept are exactly the same as the target line.'
      : `Match the pink line: adjust steepness with m and move the crossing point with b.`

  return (
    <div className="grid h-[500px] w-[800px] grid-cols-[552px_1fr] gap-2 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <section ref={wrapRef} className="min-h-0 overflow-hidden rounded-[14px] border bg-white shadow-sm" style={{ borderColor: colors.border }}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none cursor-grab"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          aria-label="Linear equation graph"
        />
      </section>

      <aside className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
        <section className="flex shrink-0 items-center gap-1 rounded-[14px] border bg-white p-1 shadow-sm" style={{ borderColor: colors.border }}>
          <ToggleButton active={mode === 'Explore'} onClick={() => setModeSafely('Explore')}>Explore</ToggleButton>
          <ToggleButton active={mode === 'Match'} onClick={() => setModeSafely('Match')}>Match</ToggleButton>
        </section>

        {mode === 'Match' && (
          <button type="button" onClick={() => setTarget(makeTarget())} className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-xs font-black" style={{ borderColor: colors.target, color: colors.target }}>
            New line to match
          </button>
        )}

        <section className="grid shrink-0 grid-cols-1 gap-1.5">
          <SliderCard label="Slope m" value={m} color={colors.slope} min={-4} max={4} step={0.5} onChange={(value) => setM(snapSlope(value))} />
          <SliderCard label="Y-intercept b" value={b} color={colors.intercept} min={-6} max={6} step={1} onChange={(value) => setB(snapIntercept(value))} />
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <EquationBar m={m} b={b} activeLink={activeLink} setActiveLink={setActiveLink} />
          <div className="rounded-[14px] border bg-white px-2 py-1.5" style={{ borderColor: colors.border }}>
            <button
              type="button"
              onClick={() => setShowTriangle((value) => !value)}
              className="w-full rounded-full border px-2 py-1 text-[11px] font-black transition"
              style={{
                borderColor: showTriangle ? colors.line : colors.border,
                background: showTriangle ? colors.line : '#ffffff',
                color: showTriangle ? '#ffffff' : '#5F5E5A',
              }}
            >
              Slope triangle
            </button>
          </div>

          <div className="shrink-0 overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: colors.border }}>
            <div className="grid grid-cols-2 border-b px-3 py-1 text-center text-xs font-black uppercase tracking-wide text-neutral-500" style={{ borderColor: colors.border }}>
              <span>x</span>
              <span>y</span>
            </div>
            {tableRows.map((row) => (
              <button
                key={row.x}
                type="button"
                onPointerEnter={() => setActiveLink(`row-${row.x}`)}
                onPointerLeave={() => setActiveLink(null)}
                onClick={() => setActiveLink(activeLink === `row-${row.x}` ? null : `row-${row.x}`)}
                className="grid w-full grid-cols-2 px-3 py-[5px] text-center font-mono text-[13px] font-black transition"
                style={{
                  color: activeLink === `row-${row.x}` ? colors.highlight : colors.ink,
                  background: row.x === 0 ? '#E9F5EF' : activeLink === `row-${row.x}` ? '#EFE7F5' : '#ffffff',
                }}
              >
                <span>{row.x}</span>
                <span>{formatNumber(row.y)}</span>
              </button>
            ))}
          </div>

          <p className="min-h-[46px] shrink-0 rounded-[14px] border bg-white px-3 py-1.5 text-[12px] font-semibold leading-snug text-neutral-600" style={{ borderColor: colors.border }}>
            {hint}
          </p>
        </section>
      </aside>
    </div>
  )
}
