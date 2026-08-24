import { useCallback, useEffect, useRef, useState } from 'react'

const axisColor = '#1A1A2E'
const purple = '#534AB7'
const teal = '#1D9E75'
const orange = '#D85A30'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeNumber(value, fallback = 0) {
  if (value === '' || value === '-' || Number.isNaN(Number(value))) return fallback
  return clamp(Math.round(Number(value)), -10, 10)
}

function formatNumber(value) {
  return Object.is(value, -0) ? 0 : value
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
}

function drawArrowHead(ctx, x, y, angle, size = 9) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.55)
  ctx.lineTo(-size, size * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawAxis(ctx, width, height) {
  const PAD = 40
  const CELL = (width - PAD * 2) / 20
  const ORIGIN_X = PAD + CELL * 10
  const AXIS_Y = height * 0.7
  const toX = (value) => ORIGIN_X + value * CELL

  ctx.strokeStyle = axisColor
  ctx.fillStyle = axisColor
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(PAD, AXIS_Y)
  ctx.lineTo(width - PAD, AXIS_Y)
  ctx.stroke()

  drawArrowHead(ctx, PAD, AXIS_Y, Math.PI)
  drawArrowHead(ctx, width - PAD, AXIS_Y, 0)

  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#5F5E5A'
  ctx.strokeStyle = axisColor
  ctx.lineWidth = 1.4

  for (let n = -10; n <= 10; n += 1) {
    const x = toX(n)
    const isLabeled = n % 2 === 0
    ctx.beginPath()
    ctx.moveTo(x, AXIS_Y - 13)
    ctx.lineTo(x, AXIS_Y + 13)
    ctx.stroke()
    if (isLabeled) ctx.fillText(String(n), x, AXIS_Y + 17)
  }

  return { PAD, CELL, ORIGIN_X, AXIS_Y, toX }
}

function drawDot(ctx, x, y, value, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(formatNumber(value)), x, y)
}

function getNumberColor(value) {
  return value < 0 ? orange : purple
}

function drawEquation(ctx, width, y, a, operator, b, phase, rawResult) {
  const parts = [
    { text: String(formatNumber(a)), color: getNumberColor(a) },
    { text: ` ${operator} `, color: operator === '+' ? purple : orange },
    { text: String(formatNumber(b)), color: getNumberColor(b) },
    { text: ' = ', color: axisColor },
    { text: phase === 'done' ? String(formatNumber(rawResult)) : '?', color: phase === 'done' ? getNumberColor(rawResult) : teal },
  ]

  ctx.save()
  ctx.font = '900 25px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const totalWidth = parts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0)
  let x = width / 2 - totalWidth / 2
  parts.forEach((part) => {
    ctx.fillStyle = part.color
    ctx.fillText(part.text, x, y)
    x += ctx.measureText(part.text).width
  })
  ctx.restore()
}

function drawCar(ctx, x, wheelY, operator, movementDirection, progress) {
  const facing = operator === '+' ? -1 : 1
  const bodyColor = facing > 0 ? purple : orange
  const wheelSpin = progress * Math.PI * 8 * (movementDirection >= 0 ? 1 : -1)

  ctx.save()
  ctx.translate(x, wheelY)
  ctx.scale(facing, 1)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.fillStyle = 'rgba(26, 26, 46, 0.12)'
  ctx.beginPath()
  ctx.ellipse(0, 7, 36, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = bodyColor
  ctx.strokeStyle = axisColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-31, -31, 64, 23, 7)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-18, -31)
  ctx.lineTo(-7, -46)
  ctx.lineTo(17, -46)
  ctx.lineTo(29, -31)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(-4, -42)
  ctx.lineTo(14, -42)
  ctx.lineTo(22, -31)
  ctx.lineTo(-4, -31)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#F8F6F0'
  ctx.beginPath()
  ctx.roundRect(27, -26, 8, 7, 3)
  ctx.fill()
  ctx.fillStyle = '#7C2D12'
  ctx.beginPath()
  ctx.roundRect(-34, -25, 6, 8, 3)
  ctx.fill()

  ;[-18, 20].forEach((wheelX) => {
    ctx.save()
    ctx.translate(wheelX, -7)
    ctx.rotate(wheelSpin)
    ctx.fillStyle = axisColor
    ctx.beginPath()
    ctx.arc(0, 0, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(5, 0)
    ctx.moveTo(0, -5)
    ctx.lineTo(0, 5)
    ctx.stroke()
    ctx.restore()
  })

  ctx.restore()
}

function drawStepPath(ctx, toX, axisY, startValue, stepAmount, progress) {
  const totalSteps = Math.abs(stepAmount)
  if (totalSteps === 0 || progress <= 0) return

  const direction = stepAmount >= 0 ? 1 : -1
  const visibleSteps = totalSteps * progress

  ctx.save()
  ctx.strokeStyle = teal
  ctx.fillStyle = teal
  ctx.lineCap = 'round'
  ctx.lineWidth = 7

  for (let index = 0; index < totalSteps; index += 1) {
    const segmentProgress = clamp(visibleSteps - index, 0, 1)
    if (segmentProgress <= 0) continue

    const fromValue = clamp(startValue + direction * index, -10, 10)
    const toValue = clamp(startValue + direction * (index + segmentProgress), -10, 10)
    if (fromValue === toValue) continue

    ctx.globalAlpha = index + 1 <= Math.floor(visibleSteps) ? 0.95 : 0.55
    ctx.beginPath()
    ctx.moveTo(toX(fromValue), axisY)
    ctx.lineTo(toX(toValue), axisY)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  const reachedWholeSteps = Math.min(totalSteps, Math.floor(visibleSteps))
  for (let index = 0; index <= reachedWholeSteps; index += 1) {
    const value = startValue + direction * index
    if (value < -10 || value > 10) continue
    ctx.beginPath()
    ctx.arc(toX(value), axisY, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function NumberLineAddSubtract() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [aInput, setAInput] = useState('3')
  const [bInput, setBInput] = useState('5')
  const [operator, setOperator] = useState('+')
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)

  const canvasHeight = 220
  const a = normalizeNumber(aInput, 0)
  const b = normalizeNumber(bInput, 0)
  const result = clamp(operator === '+' ? a + b : a - b, -10, 10)
  const rawResult = operator === '+' ? a + b : a - b
  const stepAmount = operator === '+' ? b : -b
  const movementDirection = stepAmount >= 0 ? 1 : -1

  const resetAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setPhase('idle')
    setProgress(0)
  }, [])

  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const update = () => {
      const rect = wrapper.getBoundingClientRect()
      setCanvasWidth(Math.max(320, Math.round(rect.width)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => resetAnimation, [resetAnimation])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const width = canvasWidth
    const height = canvasHeight
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    drawEquation(ctx, width, 30, a, operator, b, phase, rawResult)

    const { AXIS_Y, toX } = drawAxis(ctx, width, height)
    const startX = toX(a)
    const endX = toX(result)
    const startY = AXIS_Y - 34
    const carWheelY = AXIS_Y - 62

    drawDot(ctx, startX, startY, a, getNumberColor(a))

    if (phase !== 'idle') {
      const visibleProgress = phase === 'showStart' ? 0 : progress
      drawStepPath(ctx, toX, AXIS_Y, a, stepAmount, visibleProgress)

      const carX = startX + (endX - startX) * visibleProgress
      drawCar(ctx, carX, carWheelY, operator, movementDirection, visibleProgress)
    }

    if (phase === 'done') {
      drawDot(ctx, endX, AXIS_Y - 34, rawResult, getNumberColor(rawResult))
    }
  }, [a, b, canvasWidth, movementDirection, operator, phase, progress, rawResult, result, stepAmount])

  useEffect(() => {
    draw()
  }, [draw])

  const finishNumberInput = (setter, fallback) => {
    setter((current) => String(normalizeNumber(current, fallback)))
    resetAnimation()
  }

  const animate = () => {
    resetAnimation()
    setPhase('showStart')

    const startDelay = 450
    const duration = 3024
    const startedAt = performance.now()

    const tick = (now) => {
      const elapsed = now - startedAt
      if (elapsed < startDelay) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      const nextProgress = Math.min(1, (elapsed - startDelay) / duration)
      setPhase('walking')
      setProgress(easeInOut(nextProgress))

      if (nextProgress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setProgress(1)
        setPhase('done')
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') animate()
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto bg-[#F8F6F0] p-4 font-['Inter'] text-[#1A1A2E]">
      <div ref={wrapRef} className="h-[220px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className="h-full w-full" />
      </div>

      <section className="rounded-xl border border-[#E0DDD6] bg-white p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <input
            value={aInput}
            type="text"
            inputMode="numeric"
            maxLength={3}
            onChange={(event) => {
              setAInput(event.target.value.replace(/[^\d-]/g, '').slice(0, 3))
              resetAnimation()
            }}
            onBlur={() => finishNumberInput(setAInput, a)}
            onKeyDown={handleKeyDown}
            aria-label="Starting number"
            className="h-16 w-16 rounded-xl border border-[#E0DDD6] bg-[#F8F6F0] text-center text-2xl font-black"
            style={{ color: getNumberColor(a) }}
          />

          <div className="grid overflow-hidden rounded-2xl border border-[#E0DDD6] bg-[#F8F6F0]">
            <button
              type="button"
              onClick={() => {
                setOperator('+')
                resetAnimation()
              }}
              className={`h-8 w-14 text-xl font-black ${operator === '+' ? 'bg-[#534AB7] text-white' : 'text-[#534AB7]'}`}
              aria-label="Add"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setOperator('-')
                resetAnimation()
              }}
              className={`h-8 w-14 text-xl font-black ${operator === '-' ? 'bg-[#D85A30] text-white' : 'text-[#D85A30]'}`}
              aria-label="Subtract"
            >
              -
            </button>
          </div>

          <input
            value={bInput}
            type="text"
            inputMode="numeric"
            maxLength={3}
            onChange={(event) => {
              setBInput(event.target.value.replace(/[^\d-]/g, '').slice(0, 3))
              resetAnimation()
            }}
            onBlur={() => finishNumberInput(setBInput, b)}
            onKeyDown={handleKeyDown}
            aria-label="Change amount"
            className="h-16 w-16 rounded-xl border border-[#E0DDD6] bg-[#F8F6F0] text-center text-2xl font-black"
            style={{ color: getNumberColor(b) }}
          />

          <button type="button" onClick={animate} className="h-14 rounded-full bg-[#534AB7] px-8 text-base font-black text-white">
            Animate
          </button>
          <button type="button" onClick={resetAnimation} className="h-14 rounded-full border border-[#E0DDD6] px-6 text-base font-black text-[#5F5E5A]">
            Reset
          </button>
        </div>

        <p className="mt-4 text-center text-sm font-semibold text-[#5F5E5A]">
          The sign chooses the direction the car faces. The car may drive forward or backward to show the result.
        </p>
      </section>
    </div>
  )
}
