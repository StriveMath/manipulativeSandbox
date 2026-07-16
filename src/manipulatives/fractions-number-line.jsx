import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  card: '#ffffff',
  border: '#E0DDD6',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  blue: '#2A7DE1',
  blueTint: '#E8F1FC',
  green: '#3B9E4E',
  red: '#D64550',
  amber: '#E0872E',
  purple: '#7B3F9E',
  purpleTint: '#EFE7F5',
}

const compareColors = ['#2A7DE1', '#D64550', '#3B9E4E']
const modes = ['Place it', 'Compare']
const maxDenominator = 12
const canvasHeight = 248

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

function fractionValue(frac) {
  return frac.n / frac.d
}

function fractionText(frac) {
  return `${frac.n}/${frac.d}`
}

function properFractions(maxDen, simplestOnly = false) {
  const list = []
  for (let d = 2; d <= maxDen; d += 1) {
    for (let n = 1; n < d; n += 1) {
      if (!simplestOnly || gcd(n, d) === 1) list.push({ n, d })
    }
  }
  return list
}

function pickFraction(maxDen, simplestOnly = false) {
  const list = properFractions(maxDen, simplestOnly)
  return list[Math.floor(Math.random() * list.length)] ?? { n: 1, d: 2 }
}

function pickCompareFractions(maxDen) {
  const count = maxDen >= 8 ? 3 : 2
  const list = properFractions(maxDen)
  const picked = []
  const used = new Set()
  while (picked.length < count && list.length) {
    const frac = list[Math.floor(Math.random() * list.length)]
    const key = fractionValue(frac).toFixed(5)
    if (!used.has(key)) {
      used.add(key)
      picked.push(frac)
    }
  }
  return picked
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
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

function Fraction({ frac, color = colors.ink, size = 'large' }) {
  const textSize = size === 'small' ? 'text-base' : size === 'medium' ? 'text-2xl' : 'text-3xl'
  return (
    <span className={`inline-flex translate-y-1 flex-col items-center font-mono font-black leading-none ${textSize}`} style={{ color }}>
      <span>{frac.n}</span>
      <span className="my-0.5 h-[1px] w-full min-w-4" style={{ background: color }} />
      <span>{frac.d}</span>
    </span>
  )
}

function Pill({ active, children, onClick, activeColor = colors.blue }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-2 text-sm font-black transition"
      style={{
        borderColor: active ? activeColor : colors.border,
        background: active ? activeColor : '#ffffff',
        color: active ? '#ffffff' : colors.ink,
      }}
    >
      {children}
    </button>
  )
}

export default function FractionsNumberLine() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [mode, setMode] = useState('Place it')
  const [target, setTarget] = useState(() => pickFraction(maxDenominator))
  const [compare, setCompare] = useState(() => pickCompareFractions(maxDenominator))
  const [comparePositions, setComparePositions] = useState(() => [0, 0, 0])
  const [comparePlaced, setComparePlaced] = useState(() => [false, false, false])
  const [compareChecked, setCompareChecked] = useState(false)
  const [compareClose, setCompareClose] = useState([])
  const [compareOrderCorrect, setCompareOrderCorrect] = useState(null)
  const [compareMessage, setCompareMessage] = useState('')
  const [dotValue, setDotValue] = useState(0.35)
  const [dragging, setDragging] = useState(false)
  const [compareDragging, setCompareDragging] = useState(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [showTicks, setShowTicks] = useState(false)
  const [streak, setStreak] = useState(0)

  const resetRound = useCallback((nextMode = mode) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    if (nextMode === 'Place it') {
      const next = pickFraction(maxDenominator)
      setTarget(next)
      setDotValue(Math.random() * 0.7 + 0.15)
      setChecked(false)
      setCorrect(null)
    } else {
      const nextCompare = pickCompareFractions(maxDenominator)
      setCompare(nextCompare)
      setComparePositions(nextCompare.map(() => 0))
      setComparePlaced(nextCompare.map(() => false))
      setCompareChecked(false)
      setCompareClose([])
      setCompareOrderCorrect(null)
      setCompareMessage('')
    }
  }, [mode])

  const orderedCompare = useMemo(() => [...compare].sort((a, b) => fractionValue(a) - fractionValue(b)), [compare])

  const drawFractionLabel = useCallback((ctx, frac, x, y, color, align = 'center') => {
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(String(frac.n), x, y - 8)
    ctx.lineWidth = 2
    const width = Math.max(20, ctx.measureText(String(Math.max(frac.n, frac.d))).width + 8)
    ctx.beginPath()
    ctx.moveTo(x - width / 2, y)
    ctx.lineTo(x + width / 2, y)
    ctx.stroke()
    ctx.fillText(String(frac.d), x, y + 12)
    ctx.restore()
  }, [])

  const drawLine = useCallback((ctx, y, pad, lineW, tickDen = null, muted = false, labelTicks = false) => {
    ctx.strokeStyle = muted ? '#1A1A2E55' : colors.ink
    ctx.lineWidth = muted ? 1.5 : 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(pad + lineW, y)
    ctx.stroke()
    ctx.font = '800 15px Inter, system-ui, sans-serif'
    ctx.fillStyle = colors.ink
    ctx.textAlign = 'center'
    ctx.fillText('0', pad, y + 24)
    ctx.fillText('1', pad + lineW, y + 24)
    if (tickDen) {
      ctx.strokeStyle = '#1A1A2E66'
      ctx.lineWidth = 1.2
      for (let i = 1; i < tickDen; i += 1) {
        const x = pad + (i / tickDen) * lineW
        ctx.beginPath()
        ctx.moveTo(x, y - 9)
        ctx.lineTo(x, y + 9)
        ctx.stroke()
        if (labelTicks) {
          drawFractionLabel(ctx, { n: i, d: tickDen }, x, y + 51, colors.muted)
        }
      }
    }
  }, [drawFractionLabel])

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
    ctx.fillStyle = colors.card
    drawRoundRect(ctx, 0, 0, canvasWidth, canvasHeight, 14)
    ctx.fill()

    const pad = Math.max(42, Math.min(58, canvasWidth * 0.075))
    const lineW = canvasWidth - pad * 2
    const lineX = (value) => pad + value * lineW

    if (mode === 'Place it') {
      const y = 95
      drawLine(ctx, y, pad, lineW, showTicks ? target.d : null, false, checked && showTicks)
      const exactX = lineX(fractionValue(target))
      if (checked && !correct) {
        const guessX = lineX(dotValue)
        ctx.save()
        ctx.strokeStyle = colors.red
        ctx.globalAlpha = 0.65
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(Math.min(guessX, exactX), y - 31)
        ctx.lineTo(Math.max(guessX, exactX), y - 31)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = colors.red
        ctx.font = '800 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('gap', (guessX + exactX) / 2, y - 40)
        ctx.restore()
        ctx.strokeStyle = colors.green
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(exactX, y - 30)
        ctx.lineTo(exactX, y + 30)
        ctx.stroke()
        drawFractionLabel(ctx, target, exactX, y - 48, colors.green)
      }
      const dotX = lineX(checked && correct ? fractionValue(target) : dotValue)
      ctx.fillStyle = checked ? (correct ? colors.green : colors.red) : colors.blue
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(dotX, y, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      const y = 118
      drawLine(ctx, y, pad, lineW)
      if (compareChecked) {
        const denominators = [...new Set(compare.map((frac) => frac.d))]
        ctx.save()
        denominators.forEach((denominator) => {
          ctx.strokeStyle = '#1A1A2E2e'
          ctx.lineWidth = 1
          for (let i = 1; i < denominator; i += 1) {
            const x = lineX(i / denominator)
            ctx.beginPath()
            ctx.moveTo(x, y - 16)
            ctx.lineTo(x, y + 16)
            ctx.stroke()
          }
        })
        ctx.restore()
      }
      compare.forEach((frac, index) => {
        const placed = comparePlaced[index]
        const trayX = pad + ((index + 1) / (compare.length + 1)) * lineW
        const x = placed || compareChecked ? lineX(comparePositions[index] ?? 0) : trayX
        const dotY = placed || compareChecked ? y : 206
        const color = compareColors[index % compareColors.length]
        const checkedColor = compareChecked ? (compareClose[index] ? colors.green : colors.amber) : color
        ctx.fillStyle = checkedColor
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(x, dotY, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        const labelY = placed || compareChecked
          ? dotY + (index % 2 === 0 ? -60 : 66)
          : dotY - 48
        drawFractionLabel(ctx, frac, x, labelY, color)
      })
    }
  }, [canvasWidth, compare, compareChecked, compareClose, comparePlaced, comparePositions, correct, dotValue, drawFractionLabel, drawLine, mode, showTicks, target, checked])

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

  const canvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    }
  }

  const updateDrag = (event) => {
    const pad = Math.max(42, Math.min(58, canvasWidth * 0.075))
    const lineW = canvasWidth - pad * 2
    const point = canvasPoint(event)
    setDotValue(clamp((point.x - pad) / lineW, 0, 1))
  }

  const handlePointerDown = (event) => {
    if (mode === 'Compare') {
      if (compareChecked) return
      const pad = Math.max(42, Math.min(58, canvasWidth * 0.075))
      const lineW = canvasWidth - pad * 2
      const point = canvasPoint(event)
      const lineY = 118
      const hit = compare.findIndex((_, index) => {
        const placed = comparePlaced[index]
        const x = placed ? pad + (comparePositions[index] ?? 0) * lineW : pad + ((index + 1) / (compare.length + 1)) * lineW
        const y = placed ? lineY : 206
        return Math.hypot(point.x - x, point.y - y) <= 23
      })
      if (hit >= 0) {
        setCompareDragging(hit)
        setComparePlaced((placed) => placed.map((value, index) => index === hit ? true : value))
        setComparePositions((positions) => positions.map((value, index) => index === hit ? clamp((point.x - pad) / lineW, 0, 1) : value))
      }
      return
    }
    if (mode !== 'Place it' || checked) return
    setDragging(true)
    updateDrag(event)
  }

  const handlePointerMove = (event) => {
    if (mode === 'Compare' && compareDragging !== null) {
      const pad = Math.max(42, Math.min(58, canvasWidth * 0.075))
      const lineW = canvasWidth - pad * 2
      const point = canvasPoint(event)
      setComparePositions((positions) => positions.map((value, index) => index === compareDragging ? clamp((point.x - pad) / lineW, 0, 1) : value))
      return
    }
    if (!dragging) return
    updateDrag(event)
  }

  const handlePointerUp = () => {
    setDragging(false)
    setCompareDragging(null)
  }

  const checkPlace = () => {
    const targetValue = fractionValue(target)
    const tolerance = 0.6 * (1 / target.d / 2)
    const ok = Math.abs(dotValue - targetValue) <= tolerance
    setChecked(true)
    setCorrect(ok)
    if (!ok) {
      setStreak(0)
      return
    }
    setStreak((value) => value + 1)
    const from = dotValue
    const startedAt = performance.now()
    const duration = 520
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const tick = (now) => {
      const t = clamp((now - startedAt) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDotValue(from + (targetValue - from) * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      setDotValue(targetValue)
      frameRef.current = null
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const changeMode = (next) => {
    setMode(next)
    resetRound(next)
  }

  const checkCompare = () => {
    const trueValues = compare.map(fractionValue)
    const guessedOrder = comparePositions
      .map((position, index) => ({ index, position }))
      .sort((a, b) => a.position - b.position)
      .map((item) => item.index)
    const trueOrder = trueValues
      .map((position, index) => ({ index, position }))
      .sort((a, b) => a.position - b.position)
      .map((item) => item.index)
    const orderCorrect = guessedOrder.join(',') === trueOrder.join(',')
    const rankCorrect = compare.map((_, index) => guessedOrder.indexOf(index) === trueOrder.indexOf(index))
    let message = 'Correct order — least to greatest!'
    if (!orderCorrect) {
      for (let rank = 0; rank < guessedOrder.length - 1; rank += 1) {
        const left = guessedOrder[rank]
        const right = guessedOrder[rank + 1]
        if (trueValues[left] > trueValues[right]) {
          message = `Not in order yet — ${fractionText(compare[right])} should be to the left of ${fractionText(compare[left])}.`
          break
        }
      }
    }

    setCompareChecked(true)
    setCompareClose(rankCorrect)
    setCompareOrderCorrect(orderCorrect)
    setCompareMessage(message)
    const from = [...comparePositions]
    const startedAt = performance.now()
    const duration = 520
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const tick = (now) => {
      const t = clamp((now - startedAt) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setComparePositions(from.map((position, index) => position + (trueValues[index] - position) * eased))
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      setComparePositions(trueValues)
      frameRef.current = null
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const prompt = (() => {
    if (mode === 'Place it') {
      return <>Drag the dot to place <Fraction frac={target} color={colors.blue} size="medium" /> on the line.</>
    }
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span>Drag each fraction to its place, then check.</span>
        {compare.map((frac, index) => (
            <span key={`${frac.n}-${frac.d}`} className="rounded-2xl px-4 py-2" style={{ background: `${compareColors[index % compareColors.length]}18` }}>
              <Fraction frac={frac} color={compareColors[index % compareColors.length]} size="medium" />
            </span>
        ))}
      </div>
    )
  })()

  const hint = (() => {
    if (mode === 'Place it') {
      if (!checked) return 'Move the blue dot, then check. Tick marks can help you split the line into equal parts.'
      if (correct) return 'Correct. The dot slides to the exact fraction location, and the labelled ticks show the equal parts.'
      return 'Not quite. The dashed gap shows how far your estimate was from the correct point.'
    }
    if (!compareChecked) return 'Think about whether each fraction is closer to 0, 1/2, or 1. Drag every dot onto the line before checking.'
    return compareOrderCorrect
      ? 'Correct order — least to greatest! Further right means bigger, so the line lets you compare without common denominators.'
      : `${compareMessage} The dots moved to their true positions so you can see why.`
  })()

  const allComparePlaced = comparePlaced.slice(0, compare.length).every(Boolean)

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-1.5 overflow-hidden p-2.5 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <section className="flex shrink-0 items-center justify-center rounded-[14px] border bg-white p-2 shadow-sm" style={{ borderColor: colors.border }}>
        <div className="flex gap-1.5 rounded-full bg-slate-100 p-1">
          {modes.map((item) => (
            <Pill key={item} active={mode === item} onClick={() => changeMode(item)}>{item}</Pill>
          ))}
        </div>
      </section>

      <section className="flex shrink-0 items-center justify-center rounded-[14px] border bg-white px-3 py-2 text-center text-base font-black shadow-sm" style={{ borderColor: colors.border }}>
        {prompt}
      </section>

      <section ref={wrapRef} className="shrink-0 overflow-hidden rounded-[14px] border bg-white shadow-sm" style={{ borderColor: colors.border }}>
        <canvas
          ref={canvasRef}
          className="block touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Fractions on a number line"
        />
      </section>

      <section className="flex shrink-0 flex-wrap items-center justify-center gap-2">
        {mode === 'Place it' && (
          <>
            <button type="button" onClick={checkPlace} disabled={checked} className="rounded-full px-5 py-2 text-sm font-black text-white disabled:opacity-50" style={{ background: colors.blue }}>
              Check
            </button>
            <button type="button" onClick={() => setShowTicks((value) => !value)} className="rounded-full border bg-white px-4 py-2 text-sm font-black" style={{ borderColor: showTicks ? colors.blue : colors.border, color: showTicks ? colors.blue : colors.ink }}>
              Show tick marks
            </button>
            <button type="button" onClick={() => resetRound('Place it')} className="rounded-full border bg-white px-4 py-2 text-sm font-black" style={{ borderColor: colors.border }}>
              New fraction
            </button>
            <div className="rounded-full border bg-white px-4 py-2 text-sm font-black" style={{ borderColor: streak > 0 ? colors.green : colors.border, color: streak > 0 ? colors.green : colors.muted }}>
              {streak} in a row
            </div>
          </>
        )}
        {mode !== 'Place it' && (
          <>
            <button type="button" onClick={checkCompare} disabled={!allComparePlaced || compareChecked} className="rounded-full px-5 py-2 text-sm font-black text-white disabled:opacity-45" style={{ background: colors.blue }}>
              Check my order
            </button>
            <button type="button" onClick={() => resetRound(mode)} className="rounded-full border bg-white px-5 py-2 text-sm font-black" style={{ borderColor: colors.border }}>
              New comparison
            </button>
          </>
        )}
      </section>

      <section className="min-h-[38px] shrink-0 rounded-[14px] border bg-white px-4 py-2 text-center text-xs font-bold text-neutral-600 shadow-sm" style={{ borderColor: colors.border }}>
        {mode === 'Compare' && compareChecked && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            {orderedCompare.map((frac, index) => (
              <div key={`${frac.n}-${frac.d}`} className="flex items-center gap-2">
                <span
                  className="rounded-xl px-3 py-1.5"
                  style={{
                    background: `${compareColors[compare.findIndex((item) => item.n === frac.n && item.d === frac.d) % compareColors.length]}18`,
                  }}
                >
                  <Fraction frac={frac} color={compareColors[compare.findIndex((item) => item.n === frac.n && item.d === frac.d) % compareColors.length]} size="small" />
                </span>
                {index < orderedCompare.length - 1 && <span className="font-mono text-lg text-neutral-400">&lt;</span>}
              </div>
            ))}
          </div>
        )}
        <div>{hint}</div>
      </section>
    </div>
  )
}
