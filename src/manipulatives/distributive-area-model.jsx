import { useCallback, useEffect, useRef, useState } from 'react'

const palette = {
  page: '#F8F6F0',
  active: '#5B2A86',
  ruby: '#B23050',
  emerald: { fill: '#C8EBDC', stroke: '#22916A', text: '#1B7A54' },
  sapphire: { fill: '#CADCF5', stroke: '#3E6FC4', text: '#2A4F94' },
  amethyst: { fill: '#E7CFF5', stroke: '#8B3FB5', text: '#6B2E92' },
}

const canvasHeight = 230

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function Stepper({ title, value, color, onChange, min, max, children }) {
  return (
    <section className="h-[78px] min-w-0 rounded-[14px] border-[1.5px] bg-white px-3 py-2" style={{ borderColor: color.stroke }}>
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: color.text }}>{title}</p>
      {children ?? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChange(clamp(value - 1, min, max))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ backgroundColor: color.stroke }}
          >
            -
          </button>
          <span className="min-w-10 text-center font-mono text-2xl font-black" style={{ color: color.text }}>{value}</span>
          <button
            type="button"
            onClick={() => onChange(clamp(value + 1, min, max))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ backgroundColor: color.stroke }}
          >
            +
          </button>
        </div>
      )}
    </section>
  )
}

function ColouredFormula({ mode, a, b, c, distributed = false, total = false }) {
  const first = mode === 'variable' ? 'x' : b
  return (
    <span className="font-mono font-black">
      {distributed ? (
        <>
          <span style={{ color: palette.emerald.text }}>{a}</span>
          {' * '}
          <span style={{ color: palette.sapphire.text }}>{first}</span>
          {' + '}
          <span style={{ color: palette.emerald.text }}>{a}</span>
          {' * '}
          <span style={{ color: palette.amethyst.text }}>{c}</span>
          {total && mode === 'numbers' ? <span style={{ color: palette.ruby }}> = {a * (b + c)}</span> : null}
        </>
      ) : (
        <>
          <span style={{ color: palette.emerald.text }}>{a}</span>
          {' * ('}
          <span style={{ color: palette.sapphire.text }}>{first}</span>
          {' + '}
          <span style={{ color: palette.amethyst.text }}>{c}</span>
          {')'}
        </>
      )}
    </span>
  )
}

function areaLabel(mode, a, part, isVariablePart) {
  if (isVariablePart) return `${a}*x`
  return `${a}*${part} = ${a * part}`
}

export default function DistributiveAreaModel() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const gapRef = useRef(0)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [mode, setMode] = useState('numbers')
  const [a, setA] = useState(4)
  const [b, setB] = useState(3)
  const [c, setC] = useState(2)
  const [apart, setApart] = useState(false)
  const [gap, setGap] = useState(0)

  const bVisual = b
  const leftArea = mode === 'variable' ? `${a} * x` : a * b
  const rightArea = a * c

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
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const padX = Math.max(36, canvasWidth * 0.08)
    const topSpace = 42
    const bottomSpace = 34
    const availableW = canvasWidth - padX * 2
    const availableH = canvasHeight - topSpace - bottomSpace
    const totalUnits = bVisual + c
    const unit = Math.min((availableW * 1.15) / totalUnits, availableH / a, 48)
    const rectW = totalUnits * unit
    const rectH = a * unit
    const maxGap = Math.min(56, Math.max(28, unit * 0.9))
    const currentGap = gap * maxGap
    const heightLabelText = `a = ${a}`
    ctx.font = '900 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const heightLabelOffset = 58
    const heightLineOffset = 24
    const visualLeftSpace = Math.max(heightLineOffset + 8, heightLabelOffset + ctx.measureText(heightLabelText).width / 2 + 8)
    const startX = (canvasWidth - visualLeftSpace - rectW - currentGap) / 2 + visualLeftSpace
    const startY = topSpace + (availableH - rectH) / 2
    const leftW = bVisual * unit
    const rightW = c * unit
    const rightX = startX + leftW + currentGap

    const drawPart = (x, y, width, height, style, label, gridUnits) => {
      ctx.save()
      ctx.fillStyle = style.fill
      ctx.strokeStyle = style.stroke
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.rect(x, y, width, height)
      ctx.fill()
      ctx.stroke()

      if (gridUnits) {
        ctx.strokeStyle = `${style.stroke}55`
        ctx.lineWidth = 1
        for (let col = 1; col < gridUnits.x; col += 1) {
          const gx = x + col * unit
          ctx.beginPath()
          ctx.moveTo(gx, y)
          ctx.lineTo(gx, y + height)
          ctx.stroke()
        }
        for (let row = 1; row < gridUnits.y; row += 1) {
          const gy = y + row * unit
          ctx.beginPath()
          ctx.moveTo(x, gy)
          ctx.lineTo(x + width, gy)
          ctx.stroke()
        }
      }

      ctx.fillStyle = style.text
      ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const [expression, result] = label.split(' = ')
      const shouldSplit = result && ctx.measureText(label).width > width - 14
      if (shouldSplit) {
        ctx.fillText(expression, x + width / 2, y + height / 2 - 11)
        ctx.fillText(`= ${result}`, x + width / 2, y + height / 2 + 12)
      } else {
        ctx.fillText(label, x + width / 2, y + height / 2)
      }
      ctx.restore()
    }

    drawPart(
      startX,
      startY,
      leftW,
      rectH,
      palette.sapphire,
      areaLabel(mode, a, b, mode === 'variable'),
      mode === 'numbers' ? { x: b, y: a } : null,
    )
    drawPart(
      rightX,
      startY,
      rightW,
      rectH,
      palette.amethyst,
      areaLabel(mode, a, c, false),
      { x: c, y: a },
    )

    ctx.font = '900 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.emerald.text
    ctx.fillText(heightLabelText, startX - heightLabelOffset, startY + rectH / 2)
    ctx.strokeStyle = palette.emerald.stroke
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(startX - heightLineOffset, startY)
    ctx.lineTo(startX - heightLineOffset, startY + rectH)
    ctx.stroke()

    ctx.fillStyle = palette.sapphire.text
    ctx.fillText(mode === 'variable' ? 'x' : `b = ${b}`, startX + leftW / 2, startY - 18)
    ctx.fillStyle = palette.amethyst.text
    ctx.fillText(`c = ${c}`, rightX + rightW / 2, startY - 18)

    if (currentGap > 12) {
      ctx.fillStyle = '#8A8A8A'
      ctx.font = '900 24px Inter, system-ui, sans-serif'
      ctx.fillText('+', startX + leftW + currentGap / 2, startY + rectH / 2)
    }
  }, [a, b, bVisual, c, canvasWidth, gap, mode])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setCanvasWidth(Math.max(320, Math.round(node.getBoundingClientRect().width)))
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

  const animateGap = (target) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const start = gapRef.current
    const startedAt = performance.now()
    const duration = 520
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration)
      const next = start + (target - start) * easeInOut(t)
      gapRef.current = next
      setGap(next)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
      else frameRef.current = null
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const toggleApart = () => {
    setApart((current) => {
      animateGap(current ? 0 : 1)
      return !current
    })
  }

  const setModeAndReset = (nextMode) => {
    setMode(nextMode)
    setApart(false)
    gapRef.current = 0
    setGap(0)
  }

  const hint = mode === 'variable'
    ? `The height ${a} multiplies into both parts: ${a} * x and ${a} * ${c}.`
    : `The height ${a} multiplies into both parts: ${a} * ${b} = ${leftArea} and ${a} * ${c} = ${rightArea}, which add to ${a * (b + c)}.`

  return (
    <div className="box-border flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <section className="w-full shrink-0 rounded-[14px] border border-[#E0DDD6] bg-[#F1E9F7] px-4 py-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#5B2A86]">The distributive property</p>
        <p className="mt-0.5 font-mono text-xl font-black text-[#32164D]">
          <ColouredFormula mode={mode} a="a" b="b" c="c" /> = <ColouredFormula mode={mode} a="a" b="b" c="c" distributed />
        </p>
      </section>

      <div className="grid w-full shrink-0 grid-cols-[190px_1fr] gap-2">
        <div className="grid h-[78px] grid-cols-2 overflow-hidden rounded-full border border-[#E0DDD6] bg-white p-1 text-xs font-black">
          {[
            ['numbers', 'Numbers'],
            ['variable', 'With x'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModeAndReset(id)}
              className="rounded-full px-3 py-2 transition-colors"
              style={{
                backgroundColor: mode === id ? palette.active : 'transparent',
                color: mode === id ? '#ffffff' : '#5F5E5A',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stepper title="Height" value={a} color={palette.emerald} onChange={setA} min={1} max={8} />
          <Stepper title="Width part 1" value={b} color={palette.sapphire} onChange={setB} min={1} max={6}>
            {mode === 'variable' ? (
              <div className="mt-1 text-center">
                <p className="font-mono text-3xl font-black" style={{ color: palette.sapphire.text }}>x</p>
                <p className="text-[10px] font-bold text-[#5F5E5A]">unknown width</p>
              </div>
            ) : null}
          </Stepper>
          <Stepper title="Width part 2" value={c} color={palette.amethyst} onChange={setC} min={1} max={9} />
        </div>
      </div>

      <section ref={wrapRef} className="w-full shrink-0 overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} className="block h-[230px] w-full" />
      </section>

      <button
        type="button"
        onClick={toggleApart}
        className="mx-auto h-9 shrink-0 rounded-full px-6 text-sm font-black text-white shadow-sm"
        style={{ backgroundColor: palette.active }}
      >
        {apart ? 'Push the parts together' : 'Pull the parts apart'}
      </button>

      <section className="grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <div
          className="flex min-h-14 items-center justify-center rounded-[14px] border bg-white px-3 text-center text-xl shadow-sm transition-all"
          style={{
            borderColor: apart ? '#E0DDD6' : palette.active,
            boxShadow: apart ? 'none' : '0 0 0 2px rgba(91,42,134,0.12)',
          }}
        >
          <ColouredFormula mode={mode} a={a} b={b} c={c} />
        </div>
        <div className="flex items-center justify-center font-mono text-2xl font-black text-[#5F5E5A]">=</div>
        <div
          className="flex min-h-14 items-center justify-center rounded-[14px] border bg-white px-3 text-center text-xl shadow-sm transition-all"
          style={{
            borderColor: apart ? palette.active : '#E0DDD6',
            boxShadow: apart ? '0 0 0 2px rgba(91,42,134,0.12)' : 'none',
          }}
        >
          <ColouredFormula mode={mode} a={a} b={b} c={c} distributed total />
        </div>
      </section>

      <p className="min-h-8 w-full shrink-0 rounded-[14px] border border-[#E0DDD6] bg-white px-3 py-2 text-center text-xs font-semibold text-[#5F5E5A]">
        {hint}
      </p>
    </div>
  )
}
