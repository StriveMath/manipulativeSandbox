import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  grid: '#DEDAD1',
  line1: '#2660C4',
  line1Tint: '#EAF0FB',
  line1Border: '#8AA8DD',
  line2: '#1E7A5E',
  line2Tint: '#E9F5EF',
  line2Border: '#7FCBAC',
  solution: '#7B3F9E',
  solutionTint: '#F3EEFA',
  none: '#8A4A12',
  noneTint: '#FBEEDD',
  infinite: '#134858',
  infiniteTint: '#E4F3F7',
  border: '#E0DDD6',
  muted: '#5F5E5A',
}

const presets = [
  { label: 'One solution', l1: { m: 1, b: 1 }, l2: { m: -1, b: 5 } },
  { label: 'Parallel', l1: { m: 1, b: -2 }, l2: { m: 1, b: 3 } },
  { label: 'Same line', l1: { m: -0.5, b: 4 }, l2: { m: -0.5, b: 4 } },
  { label: 'Steep vs shallow', l1: { m: 3, b: -5 }, l2: { m: 0.5, b: 2 } },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function snapSlope(value) {
  return clamp(Math.round(value * 2) / 2, -4, 4)
}

function snapIntercept(value) {
  return clamp(Math.round(value), -8, 8)
}

function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100
  if (Object.is(rounded, -0)) return '0'
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function signed(value) {
  if (value === 0) return ''
  return value > 0 ? ` + ${formatNumber(value)}` : ` - ${formatNumber(Math.abs(value))}`
}

function equationText({ m, b }) {
  let mx
  if (m === 0) return `y = ${formatNumber(b)}`
  if (m === 1) mx = 'x'
  else if (m === -1) mx = '-x'
  else mx = `${formatNumber(m)}x`
  return `y = ${mx}${signed(b)}`
}

function lineY(line, x) {
  return line.m * x + line.b
}

function solveSystem(line1, line2) {
  if (line1.m === line2.m && line1.b === line2.b) return { type: 'infinite' }
  if (line1.m === line2.m) return { type: 'none' }
  const x = (line2.b - line1.b) / (line1.m - line2.m)
  const y = lineY(line1, x)
  return { type: 'one', x, y }
}

function SliderRow({ label, value, color, min, max, step, onChange }) {
  return (
    <label className="grid grid-cols-[22px_1fr_42px] items-center gap-2 text-[13px] font-black">
      <span style={{ color }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: color }}
      />
      <span className="rounded-full px-2 py-0.5 text-center font-mono text-sm text-white" style={{ background: color }}>
        {formatNumber(value)}
      </span>
    </label>
  )
}

function EquationCard({ title, line, color, tint, border, onSlope, onIntercept }) {
  return (
    <section className="min-w-0 rounded-[14px] border bg-white p-2" style={{ borderColor: border }}>
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <p className="shrink-0 text-[13px] font-black uppercase tracking-wide" style={{ color }}>{title}</p>
        <p className="min-w-0 shrink rounded-xl px-2.5 py-1 text-center font-mono text-base font-black whitespace-nowrap" style={{ color, background: tint }}>
          {equationText(line)}
        </p>
      </div>
      <div className="grid gap-1">
        <SliderRow label="m" value={line.m} color={color} min={-4} max={4} step={0.5} onChange={(value) => onSlope(snapSlope(value))} />
        <SliderRow label="b" value={line.b} color={color} min={-8} max={8} step={1} onChange={(value) => onIntercept(snapIntercept(value))} />
      </div>
    </section>
  )
}

function SolutionChip({ solution, showSolution }) {
  if (!showSolution) {
    return (
      <div className="rounded-full px-4 py-2 text-center text-base font-black" style={{ color: colors.solution, background: colors.solutionTint }}>
        Solution hidden
      </div>
    )
  }
  if (solution.type === 'none') {
    return (
      <div className="rounded-full px-4 py-2 text-center text-base font-black" style={{ color: colors.none, background: colors.noneTint }}>
        No solution
      </div>
    )
  }
  if (solution.type === 'infinite') {
    return (
      <div className="rounded-full px-4 py-2 text-center text-base font-black" style={{ color: colors.infinite, background: colors.infiniteTint }}>
        Infinitely many solutions
      </div>
    )
  }
  return (
    <div className="rounded-full px-4 py-2 text-center text-base font-black" style={{ color: colors.solution, background: colors.solutionTint }}>
      Solution: ({formatNumber(solution.x)}, {formatNumber(solution.y)})
    </div>
  )
}

function Verification({ line1, line2, solution, showSolution }) {
  if (solution.type !== 'one') {
    return (
      <section className="min-h-[104px] rounded-[14px] border bg-white px-3 py-2" style={{ borderColor: colors.border }} />
    )
  }
  const x = formatNumber(solution.x)
  const y1 = formatNumber(lineY(line1, solution.x))
  const y2 = formatNumber(lineY(line2, solution.x))
  return (
    <section className="min-h-[104px] rounded-[14px] border bg-white px-3 py-2 text-[14px] font-black" style={{ borderColor: colors.solution }}>
      {showSolution ? (
        <>
          <p className="mb-1 text-[12px] uppercase tracking-wide" style={{ color: colors.solution }}>Verify in both equations</p>
          <div className="grid gap-1 font-mono leading-tight">
            <p style={{ color: colors.line1 }}>
              Line 1: {formatNumber(line1.m)}(<span style={{ color: colors.solution }}>{x}</span>){signed(line1.b)} = <span style={{ color: colors.solution }}>{y1}</span>
            </p>
            <p style={{ color: colors.line2 }}>
              Line 2: {formatNumber(line2.m)}(<span style={{ color: colors.solution }}>{x}</span>){signed(line2.b)} = <span style={{ color: colors.solution }}>{y2}</span>
            </p>
            <p className="text-[#3B6D11]">✓ Both give y = {y1}</p>
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-[84px] items-center justify-center text-center text-sm font-black text-[#8A8780]">
          Press Show solution to reveal the check.
        </div>
      )}
    </section>
  )
}

export default function SystemsOfEquations() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 442 })
  const [line1, setLine1] = useState({ m: 1, b: 1 })
  const [line2, setLine2] = useState({ m: -1, b: 5 })
  const [pulse, setPulse] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const solution = useMemo(() => solveSystem(line1, line2), [line1, line2])

  const constants = useMemo(() => {
    const padX = 22
    const padY = 24
    const xScale = (canvasSize.width - padX * 2) / 20
    const yScale = (canvasSize.height - padY * 2) / 20
    const originX = canvasSize.width / 2
    const originY = canvasSize.height / 2
    return {
      padX,
      padY,
      xScale,
      yScale,
      originX,
      originY,
      left: padX,
      right: canvasSize.width - padX,
      top: padY,
      bottom: canvasSize.height - padY,
    }
  }, [canvasSize])

  const toPx = useCallback((x, y) => ({
    x: constants.originX + x * constants.xScale,
    y: constants.originY - y * constants.yScale,
  }), [constants])

  const toGrid = useCallback((x, y) => ({
    x: clamp((x - constants.originX) / constants.xScale, -10, 10),
    y: clamp((constants.originY - y) / constants.yScale, -10, 10),
  }), [constants])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setCanvasSize({
      width: Math.max(330, Math.floor(node.clientWidth)),
      height: Math.max(330, Math.floor(node.clientHeight)),
    })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const tick = (now) => {
      setPulse((Math.sin(now / 360) + 1) / 2)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const drawLine = useCallback((ctx, line, color, width = 2.5, dashed = false) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(constants.left, constants.top, constants.right - constants.left, constants.bottom - constants.top)
    ctx.clip()
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    if (dashed) ctx.setLineDash([8, 7])
    const p1 = toPx(-10, lineY(line, -10))
    const p2 = toPx(10, lineY(line, 10))
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
    ctx.restore()
  }, [constants, toPx])

  useEffect(() => {
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
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    for (let x = -10; x <= 10; x += 1) {
      const px = toPx(x, 0).x
      ctx.beginPath()
      ctx.moveTo(px, constants.top)
      ctx.lineTo(px, constants.bottom)
      ctx.stroke()
    }
    for (let y = -10; y <= 10; y += 1) {
      const py = toPx(0, y).y
      ctx.beginPath()
      ctx.moveTo(constants.left, py)
      ctx.lineTo(constants.right, py)
      ctx.stroke()
    }

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(constants.left, constants.originY)
    ctx.lineTo(constants.right, constants.originY)
    ctx.moveTo(constants.originX, constants.top)
    ctx.lineTo(constants.originX, constants.bottom)
    ctx.stroke()

    ctx.fillStyle = colors.muted
    ctx.font = '700 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = -10; x <= 10; x += 2) {
      const px = toPx(x, 0).x
      ctx.fillText(String(x), px, constants.originY + 5)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = -10; y <= 10; y += 2) {
      if (y !== 0) ctx.fillText(String(y), constants.originX - 6, toPx(0, y).y)
    }

    if (solution.type === 'infinite') {
      drawLine(ctx, line1, colors.solution, 3.5)
    } else {
      drawLine(ctx, line1, colors.line1)
      drawLine(ctx, line2, colors.line2)
    }

    const intercepts = [
      { line: line1, color: colors.line1, point: toPx(0, line1.b), id: 'line1' },
      { line: line2, color: colors.line2, point: toPx(0, line2.b), id: 'line2' },
    ]
    intercepts.forEach(({ color, point }) => {
      ctx.fillStyle = color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })

    if (solution.type === 'one' && solution.x >= -10 && solution.x <= 10 && solution.y >= -10 && solution.y <= 10) {
      const point = toPx(solution.x, solution.y)
      const halo = 13 + pulse * 8
      ctx.fillStyle = `rgba(123,63,158,${0.16 + pulse * 0.12})`
      ctx.beginPath()
      ctx.arc(point.x, point.y, halo, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = colors.solution
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (showSolution) {
        const label = `(${formatNumber(solution.x)}, ${formatNumber(solution.y)})`
        ctx.font = '900 15px Inter, system-ui, sans-serif'
        const width = ctx.measureText(label).width + 18
        const lx = clamp(point.x, constants.left + width / 2 + 4, constants.right - width / 2 - 4)
        const ly = clamp(point.y - 30, constants.top + 15, constants.bottom - 15)
        ctx.fillStyle = colors.solutionTint
        ctx.strokeStyle = colors.solution
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(lx - width / 2, ly - 15, width, 30, 15)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = colors.solution
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx, ly)
      }
    }
  }, [canvasSize, constants, drawLine, line1, line2, pulse, showSolution, solution, toPx])

  const canvasPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const point = canvasPoint(event)
    const h1 = toPx(0, line1.b)
    const h2 = toPx(0, line2.b)
    if (Math.hypot(point.x - h1.x, point.y - h1.y) <= 18) dragRef.current = 'line1'
    else if (Math.hypot(point.x - h2.x, point.y - h2.y) <= 18) dragRef.current = 'line2'
    else return
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const point = canvasPoint(event)
    const grid = toGrid(point.x, point.y)
    const b = snapIntercept(grid.y)
    if (dragRef.current === 'line1') setLine1((current) => ({ ...current, b }))
    if (dragRef.current === 'line2') setLine2((current) => ({ ...current, b }))
  }

  const stopDrag = () => {
    dragRef.current = null
  }

  const applyPreset = (preset) => {
    setLine1(preset.l1)
    setLine2(preset.l2)
  }

  return (
    <div className="grid h-[500px] w-[800px] grid-cols-[520px_1fr] gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E] max-[680px]:grid-cols-1">
      <div ref={wrapRef} className="relative min-h-0 w-full overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white">
        <button
          type="button"
          onClick={() => setShowSolution((current) => !current)}
          className="absolute left-3 top-3 z-10 rounded-full border px-3 py-1.5 text-sm font-black shadow-sm transition"
          style={{
            borderColor: colors.solution,
            color: showSolution ? '#ffffff' : colors.solution,
            background: showSolution ? colors.solution : 'rgba(255,255,255,0.94)',
          }}
        >
          {showSolution ? 'Hide solution' : 'Show solution'}
        </button>
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          aria-label="Systems of equations coordinate grid"
        />
      </div>

      <aside className="flex min-h-0 w-full flex-col gap-1.5 overflow-hidden">
        <EquationCard
          title="Line 1"
          line={line1}
          color={colors.line1}
          tint={colors.line1Tint}
          border={colors.line1Border}
          onSlope={(m) => setLine1((current) => ({ ...current, m }))}
          onIntercept={(b) => setLine1((current) => ({ ...current, b }))}
        />
        <EquationCard
          title="Line 2"
          line={line2}
          color={colors.line2}
          tint={colors.line2Tint}
          border={colors.line2Border}
          onSlope={(m) => setLine2((current) => ({ ...current, m }))}
          onIntercept={(b) => setLine2((current) => ({ ...current, b }))}
        />

        <SolutionChip solution={solution} showSolution={showSolution} />
        <Verification line1={line1} line2={line2} solution={solution} showSolution={showSolution} />

        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-[#E0DDD6] bg-white px-2 py-1.5 text-[12px] font-black text-[#1A1A2E]"
            >
              {preset.label}
            </button>
          ))}
        </div>

      </aside>
    </div>
  )
}
