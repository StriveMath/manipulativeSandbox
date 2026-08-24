import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  ruby: '#B23050',
  rubyFill: '#FBEAEE',
  teal: '#1E5F74',
  tealFill: '#E4F3F7',
  purple: '#5B2A86',
  purpleFill: '#EFEAF7',
  border: '#E0DDD6',
}

const canvasHeight = 225

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function safeB(value) {
  if (value === 0) return 1
  return value
}

function snapDividend(a, b) {
  const divisor = safeB(b)
  return clamp(Math.round(a / divisor) * divisor, -81, 81)
}

function ChipStepper({ label, value, color, fill, onChange, min = -9, max = 9, forbidZero = false, step = 1 }) {
  const change = (delta) => {
    let next = clamp(value + delta * step, min, max)
    if (forbidZero && next === 0) next = delta > 0 ? 1 : -1
    onChange(next)
  }

  return (
    <div className="flex items-center gap-1 rounded-[14px] border-[1.5px] px-2 py-1.5" style={{ borderColor: color, backgroundColor: fill }}>
      <button type="button" onClick={() => change(-1)} className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: color }}>▼</button>
      <div className="min-w-14 text-center">
        <p className="text-[9px] font-black uppercase tracking-wide" style={{ color }}>{label}</p>
        <p className="font-mono text-2xl font-black leading-none" style={{ color }}>{value}</p>
      </div>
      <button type="button" onClick={() => change(1)} className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: color }}>▲</button>
    </div>
  )
}

function getScale(values, width) {
  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  const span = Math.max(8, rawMax - rawMin)
  const min = Math.floor(rawMin - span * 0.15)
  const max = Math.ceil(rawMax + span * 0.15)
  const left = 38
  const right = width - 30
  const toX = (value) => left + ((value - min) / (max - min || 1)) * (right - left)
  return { min, max, left, right, toX }
}

function tickStep(min, max) {
  return max - min > 24 ? 5 : 1
}

function quadPoint(fromX, toX, baseY, arcHeight, t) {
  const controlX = (fromX + toX) / 2
  return {
    x: ((1 - t) ** 2) * fromX + 2 * (1 - t) * t * controlX + (t ** 2) * toX,
    y: ((1 - t) ** 2) * baseY + 2 * (1 - t) * t * (baseY - arcHeight) + (t ** 2) * baseY,
  }
}

function drawJumpArc(ctx, fromX, toX, baseY, arcHeight, progress, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.beginPath()
  const steps = Math.max(3, Math.ceil(24 * progress))
  for (let step = 0; step <= steps; step += 1) {
    const point = quadPoint(fromX, toX, baseY, arcHeight, (step / steps) * progress)
    if (step === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()
}

function getMultiplicationJumps(a, b) {
  const count = Math.abs(b)
  const direction = b < 0 ? -1 : 1
  const jumps = []
  let current = 0
  for (let index = 0; index < count; index += 1) {
    const next = current + a * direction
    jumps.push({ from: current, to: next, size: a, color: a < 0 ? colors.ruby : colors.teal })
    current = next
  }
  return jumps
}

function getDivisionJumps(a, b) {
  const divisor = safeB(b)
  const quotient = a / divisor
  const count = Math.abs(quotient)
  const step = quotient < 0 ? -1 : 1
  const jumps = []
  let current = 0
  for (let index = 0; index < count; index += 1) {
    const next = current + step
    jumps.push({ from: current, to: next, size: step, color: quotient < 0 ? colors.ruby : colors.teal })
    current = next
  }
  return jumps
}

function arrowHead(ctx, x, y, direction, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - direction * 8, y - 4)
  ctx.lineTo(x - direction * 8, y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function signHint(mode, a, b, result) {
  if (mode === 'divide') {
    return Math.sign(a) === Math.sign(b)
      ? 'Same signs divide to a positive answer.'
      : 'Different signs divide to a negative answer.'
  }
  if (a < 0 && b < 0) return 'A negative second number flips the negative jumps back, so the answer is positive. The pattern table keeps climbing past zero.'
  if (a < 0 && b > 0) return 'Positive groups of a negative number move left, so the answer is negative.'
  if (a > 0 && b < 0) return 'A negative second number means take the jumps the opposite way.'
  if (result === 0) return 'Any multiplication with zero lands at zero.'
  return 'Positive groups of a positive number move right, so the answer is positive.'
}

function readingLine(mode, a, b) {
  if (mode === 'divide') return `${a} ÷ ${b}: count the jumps to find the answer.`
  if (b < 0) return `${b} means jump ${Math.abs(b)} groups of ${a} the opposite way.`
  return `${b} groups of ${a}.`
}

export default function IntegerMultiplyDivide() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [mode, setMode] = useState('multiply')
  const [a, setA] = useState(-3)
  const [b, setB] = useState(-2)
  const [animation, setAnimation] = useState({ playing: false, jumpIndex: 0, progress: 0 })
  const [resultVisible, setResultVisible] = useState(false)
  const [patternVisible, setPatternVisible] = useState(false)

  const cleanB = mode === 'divide' ? safeB(b) : b
  const result = mode === 'multiply' ? a * b : a / cleanB
  const jumps = useMemo(() => (
    mode === 'multiply' ? getMultiplicationJumps(a, b) : getDivisionJumps(a, cleanB)
  ), [a, b, cleanB, mode])

  const resetAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setAnimation({ playing: false, jumpIndex: 0, progress: 0 })
    setResultVisible(false)
    setPatternVisible(false)
  }, [])

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

    const values = [a, b, result, ...jumps.flatMap((jump) => [jump.from, jump.to])]
    const scale = getScale(values, canvasWidth)
    const baseY = 150

    ctx.strokeStyle = '#1A1A2E'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(scale.left, baseY)
    ctx.lineTo(scale.right, baseY)
    ctx.stroke()

    const step = tickStep(scale.min, scale.max)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let value = Math.ceil(scale.min / step) * step; value <= scale.max; value += step) {
      const x = scale.toX(value)
      const isZero = value === 0
      ctx.strokeStyle = isZero ? '#1A1A2E' : '#9CA3AF'
      ctx.lineWidth = isZero ? 3 : 1.2
      ctx.beginPath()
      ctx.moveTo(x, baseY - (isZero ? 12 : 8))
      ctx.lineTo(x, baseY + (isZero ? 12 : 8))
      ctx.stroke()
      ctx.fillStyle = isZero ? '#1A1A2E' : '#4B5563'
      ctx.font = '600 14px Inter, system-ui, sans-serif'
      ctx.fillText(String(value), x, baseY + 16)
    }

    jumps.forEach((jump, index) => {
      if (index > animation.jumpIndex || (index === animation.jumpIndex && animation.progress <= 0)) return
      const fromX = scale.toX(jump.from)
      const toX = scale.toX(jump.to)
      const visibleProgress = index < animation.jumpIndex ? 1 : easeInOut(animation.progress)
      const arcHeight = Math.min(52, Math.max(24, Math.abs(toX - fromX) * 0.28))
      drawJumpArc(ctx, fromX, toX, baseY, arcHeight, visibleProgress, jump.color)
      if (visibleProgress === 1) arrowHead(ctx, toX, baseY, Math.sign(toX - fromX) || 1, jump.color)
    })

    const currentJump = jumps[animation.jumpIndex]
    let markerX = scale.toX(0)
    let markerY = baseY
    if (animation.playing && currentJump) {
      const t = easeInOut(animation.progress)
      const fromX = scale.toX(currentJump.from)
      const toX = scale.toX(currentJump.to)
      const arcHeight = Math.min(52, Math.max(24, Math.abs(toX - fromX) * 0.28))
      const marker = quadPoint(fromX, toX, baseY, arcHeight, t)
      markerX = marker.x
      markerY = marker.y
    } else if (animation.jumpIndex >= jumps.length && jumps.length) {
      markerX = scale.toX(jumps[jumps.length - 1].to)
    }

    ctx.fillStyle = colors.purple
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(markerX, markerY, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [a, animation, b, canvasWidth, jumps, result])

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

  const showJumps = () => {
    resetAnimation()
    if (!jumps.length) {
      setResultVisible(true)
      setPatternVisible(true)
      return
    }
    let jumpIndex = 0
    let startedAt = performance.now()
    const duration = 700
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setAnimation({ playing: true, jumpIndex, progress })
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else if (jumpIndex < jumps.length - 1) {
        jumpIndex += 1
        startedAt = performance.now()
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setAnimation({ playing: false, jumpIndex: jumps.length, progress: 1 })
        setResultVisible(true)
        setPatternVisible(true)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const setModeSafe = (nextMode) => {
    resetAnimation()
    setMode(nextMode)
    if (nextMode === 'divide') {
      const divisor = safeB(b)
      setB(divisor)
      setA((current) => snapDividend(current, divisor))
    }
  }

  const setASafe = (next) => {
    resetAnimation()
    setA(mode === 'divide' ? snapDividend(next, cleanB) : next)
  }

  const setBSafe = (next) => {
    resetAnimation()
    const nextB = mode === 'divide' ? safeB(next) : next
    setB(nextB)
    if (mode === 'divide') setA((current) => snapDividend(current, nextB))
  }

  const tableRows = useMemo(() => {
    if (mode === 'multiply') {
      const direction = b < 0 ? -1 : 1
      return Array.from({ length: Math.abs(b) }, (_, index) => {
        const group = (index + 1) * direction
        return {
          key: group,
          first: a,
          operator: '×',
          second: group,
          answer: a * group,
          active: index === Math.abs(b) - 1,
        }
      })
    }
    const divisor = cleanB
    const direction = result < 0 ? -1 : 1
    return Array.from({ length: Math.abs(result) }, (_, index) => {
      const quotient = (index + 1) * direction
      return {
      key: quotient,
      first: divisor * quotient,
      operator: '÷',
      second: divisor,
      answer: quotient,
      active: index === Math.abs(result) - 1,
      }
    })
  }, [a, b, cleanB, mode, result])

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <section className="flex shrink-0 items-center justify-center gap-2 rounded-[14px] border border-[#E0DDD6] bg-white p-1.5">
        <div className="grid grid-cols-2 overflow-hidden rounded-full border border-[#E0DDD6] bg-[#F8F6F0] p-1 text-xs font-black">
          {[
            ['multiply', 'Multiply'],
            ['divide', 'Divide'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModeSafe(id)}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: mode === id ? colors.teal : 'transparent', color: mode === id ? '#ffffff' : '#5F5E5A' }}
            >
              {label}
            </button>
          ))}
        </div>
        <ChipStepper label="First" value={a} color={colors.ruby} fill={colors.rubyFill} min={mode === 'divide' ? -81 : -9} max={mode === 'divide' ? 81 : 9} step={mode === 'divide' ? Math.abs(cleanB) : 1} onChange={setASafe} />
        <span className="font-mono text-3xl font-black text-[#1A1A2E]">{mode === 'multiply' ? '×' : '÷'}</span>
        <ChipStepper label="Second" value={cleanB} color={colors.teal} fill={colors.tealFill} forbidZero={mode === 'divide'} onChange={setBSafe} />
        <span className="font-mono text-3xl font-black text-[#1A1A2E]">=</span>
        <div className="rounded-[14px] border-[1.5px] px-4 py-2 text-center" style={{ borderColor: colors.purple, backgroundColor: colors.purpleFill }}>
          <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: colors.purple }}>Result</p>
          <p className="font-mono text-2xl font-black leading-none" style={{ color: colors.purple }}>{resultVisible ? result : '?'}</p>
        </div>
      </section>

      <section ref={wrapRef} className="shrink-0 overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} className="block h-[225px] w-full" />
      </section>

      <section className="grid shrink-0 grid-cols-[1fr_auto_auto] items-center gap-2">
        <p className="rounded-[14px] border border-[#E0DDD6] bg-white px-3 py-2 text-sm font-bold text-[#5F5E5A]">
          {readingLine(mode, a, cleanB)}
        </p>
        <button type="button" onClick={showJumps} className="h-10 rounded-full px-5 text-sm font-black text-white" style={{ backgroundColor: colors.purple }}>Show the jumps</button>
        <button type="button" onClick={resetAnimation} className="h-10 rounded-full border border-[#E0DDD6] bg-white px-4 text-sm font-black text-[#5F5E5A]">Reset</button>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-[1fr_260px] gap-2 overflow-hidden">
        <div className="overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white p-2">
          {patternVisible ? (
            <>
              <p className="mb-1 text-center text-[11px] font-black text-[#5F5E5A]">Watch the pattern: same step each row</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[tableRows.filter((_, index) => index % 2 === 0), tableRows.filter((_, index) => index % 2 === 1)].map((column, columnIndex) => (
                  <div key={columnIndex} className="grid grid-cols-1 gap-1">
                    {column.map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[13px] font-black"
                        style={{ backgroundColor: row.active ? colors.purpleFill : '#F8F6F0' }}
                      >
                        <span style={{ color: colors.ruby }}>{row.first}</span>
                        <span className="text-[#5F5E5A]">{row.operator}</span>
                        <span style={{ color: colors.teal }}>{row.second}</span>
                        <span className="text-[#5F5E5A]">=</span>
                        <span style={{ color: colors.purple }}>{row.answer}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-28 items-center justify-center rounded-xl bg-[#F8F6F0] px-4 text-center text-sm font-bold text-[#5F5E5A]">
              Press Show the jumps to reveal the pattern.
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-2">
          <div className="rounded-[14px] border border-[#E0DDD6] bg-white p-3 text-sm font-bold text-[#5F5E5A]">
            {signHint(mode, a, cleanB, result)}
          </div>
          {mode === 'divide' && cleanB === 0 ? (
            <div className="rounded-[14px] border border-[#DC2626] bg-white p-3 text-sm font-black text-[#DC2626]">Cannot divide by zero.</div>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
