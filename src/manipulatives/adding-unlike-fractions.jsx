import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  ruby: '#B23050',
  rubyLight: '#F6D5DC',
  teal: '#1E5F74',
  tealLight: '#CDE4EB',
  purple: '#7B3F9E',
  amber: '#8A4A12',
  amberLight: '#FBEEDD',
  border: '#E0DDD6',
  muted: '#5F5E5A',
}

const canvasHeight = 286

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

function lcm(a, b) {
  return (a * b) / gcd(a, b)
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function makeSafePair(nextA, nextB, changed) {
  const a = { ...nextA, d: clamp(nextA.d, 2, 12) }
  const b = { ...nextB, d: clamp(nextB.d, 2, 12) }
  a.n = clamp(a.n, 1, a.d - 1)
  b.n = clamp(b.n, 1, b.d - 1)

  while (a.n / a.d + b.n / b.d > 1) {
    if (changed === 'a' && a.n > 1) a.n -= 1
    else if (changed === 'b' && b.n > 1) b.n -= 1
    else if (a.n >= b.n && a.n > 1) a.n -= 1
    else if (b.n > 1) b.n -= 1
    else break
  }
  return { a, b }
}

function reduceFraction(n, d) {
  if (n === d) return { n: 1, d: 1 }
  const factor = gcd(n, d)
  return { n: n / factor, d: d / factor }
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

function drawBar(ctx, x, y, width, height, denominator, filled, fill, light, progress = 1) {
  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 2
  ctx.stroke()

  const visibleDenominator = Math.max(1, Math.round(denominator * progress))
  const pieceW = width / denominator
  for (let i = 0; i < denominator; i += 1) {
    ctx.fillStyle = i < filled ? fill : light
    ctx.fillRect(x + i * pieceW, y, pieceW, height)
  }

  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.clip()
  ctx.strokeStyle = 'rgba(26, 26, 46, 0.25)'
  ctx.lineWidth = 1
  for (let i = 1; i < visibleDenominator; i += 1) {
    const lineX = x + (i / visibleDenominator) * width
    ctx.beginPath()
    ctx.moveTo(lineX, y)
    ctx.lineTo(lineX, y + height)
    ctx.stroke()
  }
  ctx.restore()

  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawResliceBar(ctx, x, y, width, height, originalDenominator, originalFilled, finalDenominator, fill, light, progress) {
  const drawPhase = easeInOut(clamp(progress / 0.38, 0, 1))
  const holdPhase = clamp((progress - 0.38) / 0.38, 0, 1)
  const shrinkPhase = easeInOut(clamp((progress - 0.76) / 0.24, 0, 1))
  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.clip()

  ctx.fillStyle = light
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = fill
  ctx.fillRect(x, y, (originalFilled / originalDenominator) * width, height)

  ctx.strokeStyle = 'rgba(26, 26, 46, 0.34)'
  ctx.lineWidth = 1.3
  for (let i = 1; i < originalDenominator; i += 1) {
    const lineX = x + (i / originalDenominator) * width
    ctx.beginPath()
    ctx.moveTo(lineX, y)
    ctx.lineTo(lineX, y + height)
    ctx.stroke()
  }

  ctx.lineCap = 'round'
  for (let i = 1; i < finalDenominator; i += 1) {
    const isOriginalCut = (i * originalDenominator) % finalDenominator === 0
    if (isOriginalCut) continue
    const stagger = (i / finalDenominator) * 0.22
    const lineProgress = clamp((drawPhase - stagger) / 0.28, 0, 1)
    if (lineProgress <= 0) continue
    const lineX = x + (i / finalDenominator) * width
    const pulse = lineProgress >= 1
      ? 0.5 + 0.5 * Math.sin(holdPhase * Math.PI * 2)
      : 0.5 + 0.5 * Math.sin(lineProgress * Math.PI * 6)
    const holdGlow = (lineProgress >= 1 ? 0.45 + pulse * 0.55 : pulse) * (1 - shrinkPhase)
    const thickWidth = 3.6 + holdGlow * 3.2
    ctx.globalAlpha = Math.max(0.3, 0.9 * (1 - shrinkPhase))
    ctx.strokeStyle = colors.amber
    ctx.lineWidth = thickWidth
    ctx.shadowColor = colors.amber
    ctx.shadowBlur = 12 * Math.max(holdGlow, 0.35)
    ctx.beginPath()
    ctx.moveTo(lineX, y)
    ctx.lineTo(lineX, y + height * lineProgress)
    ctx.stroke()

    ctx.globalAlpha = lineProgress * (0.22 + 0.68 * shrinkPhase)
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.45)'
    ctx.lineWidth = 1.2 + 0.2 * shrinkPhase
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(lineX, y)
    ctx.lineTo(lineX, y + height * lineProgress)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.restore()

  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawGridOverlay(ctx, x, y, width, height, denominator, stroke = colors.ink) {
  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.clip()
  ctx.strokeStyle = 'rgba(26, 26, 46, 0.24)'
  ctx.lineWidth = 1
  for (let i = 1; i < denominator; i += 1) {
    const lineX = x + (i / denominator) * width
    ctx.beginPath()
    ctx.moveTo(lineX, y)
    ctx.lineTo(lineX, y + height)
    ctx.stroke()
  }
  ctx.restore()

  drawRoundRect(ctx, x, y, width, height, 10)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawPartitionedSegment(ctx, x, y, width, height, pieces, fill) {
  if (pieces <= 0 || width <= 0) return
  ctx.fillStyle = fill
  ctx.fillRect(x, y, width, height)

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 1.4
  const pieceW = width / pieces
  for (let i = 1; i < pieces; i += 1) {
    const lineX = x + i * pieceW
    ctx.beginPath()
    ctx.moveTo(lineX, y + 2)
    ctx.lineTo(lineX, y + height - 2)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(26, 26, 46, 0.32)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(x, y, width, height)
  ctx.restore()
}

function drawCanvas(ctx, width, data, step, progress) {
  const { a, b, L, mA, mB, total } = data
  ctx.clearRect(0, 0, width, canvasHeight)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, canvasHeight)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const barX = 58
  const barW = width - 116
  const barH = 50

  if (step === 1) {
    drawBar(ctx, barX, 66, barW, barH, a.d, a.n, colors.ruby, colors.rubyLight)
    drawBar(ctx, barX, 166, barW, barH, b.d, b.n, colors.teal, colors.tealLight)
    ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.fillStyle = colors.ruby
    ctx.fillText(`${a.n}/${a.d}`, barX - 30, 91)
    ctx.fillStyle = colors.teal
    ctx.fillText(`${b.n}/${b.d}`, barX - 30, 191)
    return
  }

  if (step === 2) {
    drawResliceBar(ctx, barX, 66, barW, barH, a.d, a.n, L, colors.ruby, colors.rubyLight, progress)
    drawResliceBar(ctx, barX, 166, barW, barH, b.d, b.n, L, colors.teal, colors.tealLight, progress)

    ctx.save()
    ctx.globalAlpha = 0.35 + easeInOut(progress) * 0.65
    ctx.fillStyle = colors.amber
    ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.fillText(`x${mA}`, width - 76, 38)
    ctx.fillText(`x${mB}`, width - 76, 138)
    ctx.fillStyle = colors.ruby
    ctx.fillText(`${a.n}/${a.d} = ${a.n * mA}/${L}`, width / 2, 38)
    ctx.fillStyle = colors.teal
    ctx.fillText(`${b.n}/${b.d} = ${b.n * mB}/${L}`, width / 2, 138)

    ctx.fillStyle = colors.amberLight
    drawRoundRect(ctx, 112, 244, width - 224, 28, 14)
    ctx.fill()
    ctx.fillStyle = colors.amber
    ctx.font = '800 14px Inter, system-ui, sans-serif'
    ctx.fillText(`Smallest common denominator: ${L}`, width / 2, 258)
    ctx.restore()
    return
  }

  const rubyPieces = a.n * mA
  const tealPieces = b.n * mB
  const stepTwoA = 66
  const stepTwoB = 166
  const stepTwoH = 50
  const sourceA = 52
  const sourceB = 112
  const finalY = 194
  const moveH = 44
  const pieceW = barW / L
  const prep = easeInOut(clamp(progress / 0.28, 0, 1))
  const glide = easeInOut(clamp((progress - 0.28) / 0.55, 0, 1))
  const finalReveal = easeInOut(clamp((progress - 0.83) / 0.17, 0, 1))

  ctx.fillStyle = colors.purple
  ctx.font = '900 19px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.fillText(`${rubyPieces}/${L} + ${tealPieces}/${L} = ${total}/${L}`, width / 2, 26)

  if (prep < 1) {
    const yA = stepTwoA + (sourceA - stepTwoA) * prep
    const yB = stepTwoB + (sourceB - stepTwoB) * prep
    const h = stepTwoH + (moveH - stepTwoH) * prep
    drawBar(ctx, barX, yA, barW, h, L, rubyPieces, colors.ruby, colors.rubyLight)
    drawBar(ctx, barX, yB, barW, h, L, tealPieces, colors.teal, colors.tealLight)
    return
  }

  if (glide < 0.98) {
    ctx.save()
    ctx.globalAlpha = 1 - glide * 0.72
    drawBar(ctx, barX, sourceA, barW, moveH, L, rubyPieces, colors.ruby, colors.rubyLight)
    drawBar(ctx, barX, sourceB, barW, moveH, L, tealPieces, colors.teal, colors.tealLight)
    ctx.restore()
  }

  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, barX, 40, barW, finalY + moveH - 40, 10)
  ctx.clip()
  drawPartitionedSegment(
    ctx,
    barX,
    sourceA + (finalY - sourceA) * glide,
    rubyPieces * pieceW,
    moveH,
    rubyPieces,
    colors.ruby,
  )
  drawPartitionedSegment(
    ctx,
    barX + rubyPieces * pieceW * glide,
    sourceB + (finalY - sourceB) * glide,
    tealPieces * pieceW,
    moveH,
    tealPieces,
    colors.teal,
  )
  ctx.restore()

  if (finalReveal > 0) {
    ctx.save()
    ctx.globalAlpha = finalReveal
    drawGridOverlay(ctx, barX, finalY, barW, moveH, L, colors.purple)
    ctx.restore()
  }

  ctx.fillStyle = colors.purple
  ctx.font = '900 17px Inter, system-ui, sans-serif'
  ctx.fillText(total === L ? '= 1 whole' : `= ${reduceFraction(total, L).n}/${reduceFraction(total, L).d}`, width / 2, 264)
}

export default function AddingUnlikeFractions() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [a, setA] = useState({ n: 1, d: 2 })
  const [b, setB] = useState({ n: 1, d: 3 })
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(1)

  const data = useMemo(() => {
    const L = lcm(a.d, b.d)
    const mA = L / a.d
    const mB = L / b.d
    const total = a.n * mA + b.n * mB
    const reduced = reduceFraction(total, L)
    return { a, b, L, mA, mB, total, reduced }
  }, [a, b])

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
    drawCanvas(ctx, canvasWidth, data, step, progress)
  }, [canvasWidth, data, progress, step])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(Math.max(340, Math.floor(entry.contentRect.width))))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  const resetToStepOne = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    setStep(1)
    setProgress(1)
  }

  const changeFraction = (which, field, delta) => {
    const nextA = which === 'a' ? { ...a, [field]: a[field] + delta } : a
    const nextB = which === 'b' ? { ...b, [field]: b[field] + delta } : b
    const safe = makeSafePair(nextA, nextB, which)
    setA(safe.a)
    setB(safe.b)
    resetToStepOne()
  }

  const goStep = (nextStep) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    setStep(nextStep)
    if (nextStep === 1) {
      setProgress(1)
      return
    }
    setProgress(0)
    const duration = nextStep === 2 ? 2600 : nextStep === 3 ? 1920 : 1200
    let start = null
    const tick = (now) => {
      if (start === null) start = now
      const nextProgress = Math.min(1, (now - start) / duration)
      setProgress(nextProgress)
      if (nextProgress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const resultText = step < 3 ? '?/?' : data.total === data.L ? '1' : `${data.reduced.n}/${data.reduced.d}`
  const hint =
    step === 1
      ? 'First compare the two bars: the pieces are not the same size yet.'
      : step === 2
        ? `Re-slice into ${data.L} equal pieces: multiply top and bottom by the same number.`
        : data.total === data.L
          ? `Now the pieces match: ${data.total}/${data.L} equals 1 whole.`
          : `Count the matching pieces, then simplify if possible: ${data.total}/${data.L} becomes ${data.reduced.n}/${data.reduced.d}.`

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-3" style={{ background: colors.page, color: colors.ink }}>
      <div className="flex items-center justify-center gap-3 rounded-xl border bg-white px-3 py-2" style={{ borderColor: colors.border }}>
        <FractionControl label="A" fraction={a} color={colors.ruby} onChange={(field, delta) => changeFraction('a', field, delta)} />
        <span className="text-2xl font-black">+</span>
        <FractionControl label="B" fraction={b} color={colors.teal} onChange={(field, delta) => changeFraction('b', field, delta)} />
        <span className="text-2xl font-black">=</span>
        <div className="rounded-xl px-5 py-2 text-center font-mono text-2xl font-black text-white" style={{ background: colors.purple }}>
          {resultText}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => goStep(item)}
            className="rounded-full border px-3 py-2 text-sm font-black transition"
            style={{
              borderColor: step === item ? colors.purple : colors.border,
              background: step === item ? colors.purple : '#ffffff',
              color: step === item ? '#ffffff' : colors.ink,
            }}
          >
            Step {item}: {item === 1 ? 'Different pieces' : item === 2 ? 'Re-slice' : 'Combine'}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.border }}>
        <canvas ref={canvasRef} className="block" aria-label="Adding fractions model" />
      </div>

      <div className="rounded-xl border bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-700" style={{ borderColor: colors.border }}>
        {hint}
      </div>
    </div>
  )
}

function FractionControl({ label, fraction, color, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-black uppercase" style={{ color }}>
        {label}
      </span>
      <div className="grid grid-cols-[24px_48px_24px] items-center gap-1 rounded-xl px-2 py-1" style={{ background: `${color}18` }}>
        <StepButton color={color} onClick={() => onChange('n', -1)}>-</StepButton>
        <div className="text-center font-mono text-lg font-black" style={{ color }}>
          {fraction.n}
        </div>
        <StepButton color={color} onClick={() => onChange('n', 1)}>+</StepButton>
        <div />
        <div className="h-[2px] bg-current" style={{ color }} />
        <div />
        <StepButton color={color} onClick={() => onChange('d', -1)}>-</StepButton>
        <div className="text-center font-mono text-lg font-black" style={{ color }}>
          {fraction.d}
        </div>
        <StepButton color={color} onClick={() => onChange('d', 1)}>+</StepButton>
      </div>
    </div>
  )
}

function StepButton({ color, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="grid h-6 w-6 place-items-center rounded-full text-sm font-black text-white" style={{ background: color }}>
      {children}
    </button>
  )
}
