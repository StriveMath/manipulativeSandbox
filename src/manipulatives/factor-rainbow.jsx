import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const rainbow = ['#E23B3B', '#E8822E', '#E8C020', '#4CAF50', '#2AA9E0', '#3F51B5', '#8E44AD']
const navy = '#1A1A2E'
const cream = '#F8F6F0'
const canvasHeight = 280

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeOutBack(t) {
  const c1 = 1.25
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function alpha(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${amount})`
}

function getFactors(number) {
  const result = []
  for (let value = 1; value <= number; value += 1) {
    if (number % value === 0) result.push(value)
  }
  return result
}

function getPairs(number) {
  const result = []
  for (let value = 1; value * value <= number; value += 1) {
    if (number % value === 0) result.push([value, number / value])
  }
  return result
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

function typeInfo(number, factors) {
  const root = Math.sqrt(number)
  const isSquare = Number.isInteger(root)
  const isPrime = factors.length === 2
  return {
    isPrime,
    isSquare,
    root,
    label: isPrime ? 'Prime' : 'Composite',
  }
}

export default function FactorRainbow() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [number, setNumber] = useState(36)
  const [animation, setAnimation] = useState(1)

  const factors = useMemo(() => getFactors(number), [number])
  const pairs = useMemo(() => getPairs(number), [number])
  const info = useMemo(() => typeInfo(number, factors), [factors, number])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined

    const update = () => setCanvasWidth(Math.max(320, Math.round(node.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const startArcAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const startedAt = performance.now()
    const duration = 620
    setAnimation(0)

    const tick = (now) => {
      const progress = clamp((now - startedAt) / duration, 0, 1)
      setAnimation(progress)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
      else frameRef.current = null
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
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

    const pad = Math.max(30, Math.min(38, canvasWidth * 0.045))
    const baseY = canvasHeight - 45
    const usable = canvasWidth - pad * 2
    const toX = (value) => pad + (value / number) * usable
    const leftFactorCount = number % 2 === 0 ? factors.filter((factor) => factor <= number / 2).length : factors.length
    const halfSpacing = number % 2 === 0 && leftFactorCount > 1 ? (usable / 2) / (leftFactorCount - 1) : 30
    const dotRadius = clamp(halfSpacing / 2 - 1.5, 10.5, 13)
    const fontSize = clamp(dotRadius + 1, 12, 14)
    const labelY = baseY + dotRadius + 10

    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(ctx, 0, 0, canvasWidth, canvasHeight, 14)
    ctx.fill()

    ctx.strokeStyle = alpha(navy, 0.16)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pad - 10, baseY)
    ctx.lineTo(canvasWidth - pad + 10, baseY)
    ctx.stroke()

    const centerX = pad + usable / 2
    const rightX = canvasWidth - pad
    const positionedFactors = factors.map((factor) => {
      let x = toX(factor)
      if (factor === 1) x = pad
      if (factor === number) x = rightX
      if (number % 2 === 0 && factor === number / 2) x = centerX
      return { factor, x }
    })
    const minSpacing = Math.max(20, dotRadius * 2 + 2)
    const spreadSegment = (items, startX, endX) => {
      if (items.length <= 1) return
      items[0].x = startX
      items[items.length - 1].x = endX
      const availableSpacing = (endX - startX) / (items.length - 1)
      const segmentSpacing = Math.min(minSpacing, availableSpacing)
      for (let i = 1; i < items.length - 1; i += 1) {
        items[i].x = clamp(items[i].x, startX + i * segmentSpacing, endX - (items.length - 1 - i) * segmentSpacing)
        if (items[i].x - items[i - 1].x < segmentSpacing) items[i].x = items[i - 1].x + segmentSpacing
      }
      for (let i = items.length - 2; i > 0; i -= 1) {
        if (items[i + 1].x - items[i].x < segmentSpacing) items[i].x = items[i + 1].x - segmentSpacing
      }
    }
    if (number % 2 === 0 && factors.includes(number / 2)) {
      spreadSegment(positionedFactors.filter((item) => item.factor <= number / 2), pad, centerX)
      spreadSegment(positionedFactors.filter((item) => item.factor >= number / 2), centerX, rightX)
    } else {
      spreadSegment(positionedFactors, pad, rightX)
    }
    const positions = new Map()
    positionedFactors.forEach(({ factor, x }) => {
      positions.set(factor, { x, y: baseY })
    })

    const arcStroke = 6.25
    const maxArcHeight = Math.min(205, baseY - 32)
    const minArcHeight = 34
    const arcBandStep = pairs.length > 1 ? (maxArcHeight - minArcHeight) / (pairs.length - 1) : 0

    pairs.forEach(([left, right], index) => {
      const from = positions.get(left)
      const to = positions.get(right)
      if (!from || !to) return
      const color = rainbow[index % rainbow.length]
      const delay = index * 0.085
      const local = clamp((animation - delay) / 0.46, 0, 1)
      if (local <= 0) return
      const spring = clamp(easeOutBack(local), 0, 1.08)

      ctx.save()
      ctx.globalAlpha = clamp(local * 1.15, 0, 1)
      ctx.strokeStyle = color
      ctx.lineWidth = arcStroke
      ctx.lineCap = 'round'
      ctx.shadowColor = alpha(color, 0.55)
      ctx.shadowBlur = 6

      if (left === right) {
        const loopHeight = 56 * spring
        const loopWidth = Math.max(24, dotRadius * 2.1)
        ctx.beginPath()
        ctx.moveTo(from.x - loopWidth / 2, from.y)
        ctx.bezierCurveTo(from.x - loopWidth / 2, from.y - loopHeight, from.x + loopWidth / 2, from.y - loopHeight, from.x + loopWidth / 2, from.y)
        ctx.stroke()
      } else {
        const arcLift = number === 120 && index === 0 ? 18 : 0
        const arcHeight = Math.min(baseY - 14, maxArcHeight + arcLift - index * arcBandStep) * spring
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.bezierCurveTo(from.x, from.y - arcHeight, to.x, from.y - arcHeight, to.x, to.y)
        ctx.stroke()
      }
      ctx.restore()
    })

    factors.forEach((factor) => {
      const point = positions.get(factor)
      ctx.fillStyle = cream
      ctx.strokeStyle = navy
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = navy
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
      ctx.fillText(String(factor), point.x, point.y + 0.5)
    })

    ctx.fillStyle = '#5F5E5A'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '700 11px Inter, system-ui, sans-serif'
    ctx.fillText(`${pairs.length} factor ${pairs.length === 1 ? 'pair' : 'pairs'} for ${number}`, canvasWidth / 2, labelY)
  }, [animation, canvasWidth, factors, number, pairs])

  useEffect(() => {
    draw()
  }, [draw])

  const setPickedNumber = (next) => {
    const picked = clamp(Math.round(next), 2, 120)
    setNumber(picked)
    startArcAnimation()
  }

  const hint = (() => {
    if (info.isPrime) return `${number} is prime - only one arc (1 * ${number}). Primes always look this bare.`
    if (info.isSquare) return `${number} is a perfect square - sqrt(${number}) = ${info.root} pairs with itself, making the lone middle loop.`
    return `${number} has ${pairs.length} factor pairs, so ${pairs.length} arcs. Each arc joins two numbers that multiply to ${number}.`
  })()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <div className="flex h-full w-full flex-col gap-2">
        <div className="mx-auto shrink-0 rounded-[14px] border border-[#E0DDD6] bg-white px-4 py-2 text-center shadow-sm">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#5F5E5A]">Pick a number</p>
          <div className="flex items-center justify-center gap-2 font-mono">
            <button
              type="button"
              onClick={() => setPickedNumber(number - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#534AB7] text-xl font-black text-white"
            >
              -
            </button>
            <div className="flex h-11 min-w-20 items-center justify-center rounded-2xl bg-[#EEEDFE] px-5 text-2xl font-black text-[#534AB7]">
              {number}
            </div>
            <button
              type="button"
              onClick={() => setPickedNumber(number + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#534AB7] text-xl font-black text-white"
            >
              +
            </button>
          </div>
        </div>

        <div ref={wrapRef} className="h-[280px] shrink-0 overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white">
          <canvas ref={canvasRef} className="block h-[280px] w-full" />
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2">
          <div className="rounded-[14px] border border-[#E0DDD6] bg-[#FFF6EA] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#BA7517]">Factors</p>
            <p className="mt-1 truncate font-mono text-sm font-black text-[#1A1A2E]">{factors.join(', ')}</p>
          </div>
          <div className="rounded-[14px] border border-[#E0DDD6] bg-[#EAF7F3] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#0F6E56]">How many</p>
            <p className="mt-1 font-mono text-sm font-black text-[#1A1A2E]">{factors.length} factors · {pairs.length} pairs</p>
          </div>
          <div className="rounded-[14px] border border-[#E0DDD6] bg-[#EEEDFE] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#534AB7]">Type</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#534AB7]">{info.label}</span>
              {info.isSquare ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#D85A30]">Square</span> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-center gap-1.5">
          {[7, 12, 17, 36, 48, 100].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPickedNumber(preset)}
              className={`rounded-full border px-3 py-1 font-mono text-xs font-black transition ${
                number === preset ? 'border-[#534AB7] bg-[#534AB7] text-white' : 'border-[#E0DDD6] bg-white text-[#1A1A2E]'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="min-h-9 shrink-0 rounded-[14px] border border-[#E0DDD6] bg-white px-3 py-2 text-center text-xs font-semibold text-[#5F5E5A]">
          {hint}
        </div>
      </div>
    </div>
  )
}
