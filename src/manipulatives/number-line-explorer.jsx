import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const axisColor = '#1A1A2E'
const purple = '#534AB7'
const teal = '#1D9E75'
const orange = '#D85A30'
const tabs = [
  { id: 'plot', label: 'Plot & compare' },
  { id: 'add', label: 'Add & subtract' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundDisplay(value, digits = 2) {
  const rounded = Number(value.toFixed(digits))
  return Object.is(rounded, -0) ? 0 : rounded
}

function parseIntegerInput(value, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(Math.round(parsed), -10, 10)
}

function normalizeIntegerInput(value, fallback = 0) {
  return String(parseIntegerInput(value, fallback))
}

function drawArrowHead(ctx, x, y, direction, size) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - direction * size, y - size * 0.62)
  ctx.lineTo(x - direction * size, y + size * 0.62)
  ctx.closePath()
  ctx.fill()
}

function easeOutBack(value) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

function drawWalker(ctx, x, y, facing) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = axisColor
  ctx.fillStyle = '#F1EFE8'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.arc(0, -16, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(0, 12)
  ctx.moveTo(0, -2)
  ctx.lineTo(facing * 17, -9)
  ctx.moveTo(0, 12)
  ctx.lineTo(-8, 24)
  ctx.moveTo(0, 12)
  ctx.lineTo(8, 24)
  ctx.stroke()

  ctx.fillStyle = facing > 0 ? teal : orange
  drawArrowHead(ctx, facing * 25, -9, facing, 7)
  ctx.restore()
}

function drawAxis(ctx, width, height, min = -10, max = 10, labelStep = 2, tickStep = 1) {
  const PAD = 40
  const CELL = (width - PAD * 2) / (max - min)
  const ORIGIN_X = PAD + (0 - min) * CELL
  const AXIS_Y = height * 0.66
  const toX = (value) => PAD + (value - min) * CELL

  ctx.strokeStyle = axisColor
  ctx.fillStyle = axisColor
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(PAD, AXIS_Y)
  ctx.lineTo(width - PAD, AXIS_Y)
  ctx.stroke()
  drawArrowHead(ctx, PAD, AXIS_Y, -1, 8)
  drawArrowHead(ctx, width - PAD, AXIS_Y, 1, 8)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#5F5E5A'
  ctx.strokeStyle = axisColor
  ctx.lineWidth = 1

  const firstTick = Math.ceil(min / tickStep) * tickStep
  for (let value = firstTick; value <= max + 1e-8; value += tickStep) {
    const rounded = roundDisplay(value, 2)
    const x = toX(rounded)
    ctx.beginPath()
    ctx.moveTo(x, AXIS_Y - 10)
    ctx.lineTo(x, AXIS_Y + 10)
    ctx.stroke()

    const labelMultiple = Math.abs(rounded / labelStep - Math.round(rounded / labelStep)) < 1e-8
    if (labelMultiple) ctx.fillText(String(roundDisplay(rounded, 1)), x, AXIS_Y + 12)
  }

  return { PAD, CELL, ORIGIN_X, AXIS_Y, toX }
}

function pillClass(active, activeColor = 'bg-[#534AB7]') {
  return `rounded-full px-4 py-2 text-sm font-black transition ${
    active ? `${activeColor} text-white` : 'bg-white text-[#5F5E5A] ring-1 ring-[#E0DDD6]'
  }`
}

export default function NumberLineExplorer() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const animationStateRef = useRef({ progress: 0, done: false })
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [currentTab, setCurrentTab] = useState('plot')

  const [pointInput, setPointInput] = useState(3)
  const [points, setPoints] = useState([-4, 3])
  const [draggingPoint, setDraggingPoint] = useState(null)

  const [valueA, setValueA] = useState('3')
  const [valueB, setValueB] = useState('-5')
  const [operator, setOperator] = useState('+')
  const [animationProgress, setAnimationProgress] = useState(0)
  const [animationDone, setAnimationDone] = useState(false)

  const numberA = parseIntegerInput(valueA, 0)
  const numberB = parseIntegerInput(valueB, 0)
  const result = operator === '+' ? numberA + numberB : numberA - numberB
  const canvasHeight = 180

  const stopAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    animationStateRef.current = { progress: 0, done: false }
    setAnimationProgress(0)
    setAnimationDone(false)
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

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const addPoint = () => {
    const value = clamp(Math.round(Number(pointInput)), -10, 10)
    setPoints((current) => current.includes(value) ? current : [...current, value].sort((a, b) => a - b))
    setPointInput(value)
  }

  const adjustPointInput = (amount) => {
    setPointInput((current) => clamp(Math.round(Number(current) || 0) + amount, -10, 10))
  }

  const getCanvasPoint = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }, [canvasHeight, canvasWidth])

  const getPlotPointScreen = useCallback((value) => {
    const PAD = 40
    const CELL = (canvasWidth - PAD * 2) / 20
    const AXIS_Y = canvasHeight * 0.66
    return {
      x: PAD + (value + 10) * CELL,
      y: AXIS_Y - 36,
    }
  }, [canvasHeight, canvasWidth])

  const handleCanvasPointerDown = (event) => {
    if (currentTab !== 'plot') return

    const pointer = getCanvasPoint(event)
    const hit = points.find((point) => {
      const screen = getPlotPointScreen(point)
      return Math.hypot(screen.x - pointer.x, screen.y - pointer.y) <= 22
    })

    if (hit === undefined) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingPoint({ value: hit, x: pointer.x, y: pointer.y })
  }

  const handleCanvasPointerMove = (event) => {
    if (!draggingPoint) return
    const pointer = getCanvasPoint(event)
    setDraggingPoint((current) => current ? { ...current, x: pointer.x, y: pointer.y } : null)
  }

  const handleCanvasPointerUp = (event) => {
    if (!draggingPoint) return

    const pointer = getCanvasPoint(event)
    const PAD = 40
    const AXIS_Y = canvasHeight * 0.66
    const offLine = pointer.y < AXIS_Y - 78 || pointer.y > AXIS_Y + 34 || pointer.x < PAD || pointer.x > canvasWidth - PAD

    if (offLine) {
      setPoints((current) => current.filter((point) => point !== draggingPoint.value))
    }

    setDraggingPoint(null)
  }

  const animate = () => {
    setValueA(normalizeIntegerInput(valueA, 0))
    setValueB(normalizeIntegerInput(valueB, 0))
    stopAnimation()
    let frame = 0
    const totalFrames = 90
    const tick = () => {
      frame += 1
      const progress = Math.min(1, frame / totalFrames)
      animationStateRef.current = { progress, done: progress >= 1 }
      setAnimationProgress(progress)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setAnimationDone(true)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const hintText = useMemo(() => {
    if (operator === '+') {
      return numberB < 0 ? 'Adding a negative moves left.' : 'Adding a positive moves right.'
    }
    return numberB < 0 ? 'Subtracting a negative moves right.' : 'Subtracting a positive moves left.'
  }, [numberB, operator])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const width = canvasWidth
    const height = canvasHeight
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (currentTab === 'plot') {
      const { AXIS_Y, toX } = drawAxis(ctx, width, height)

      points.forEach((point) => {
        if (draggingPoint?.value === point) return

        const x = toX(point)
        const y = AXIS_Y - 36
        const color = point < 0 ? orange : purple

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = '800 13px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(point), x, y)
      })

      if (draggingPoint) {
        const offLine = draggingPoint.y < AXIS_Y - 78 || draggingPoint.y > AXIS_Y + 34 || draggingPoint.x < 40 || draggingPoint.x > width - 40

        ctx.save()
        ctx.globalAlpha = offLine ? 0.45 : 0.95
        ctx.fillStyle = draggingPoint.value < 0 ? orange : purple
        ctx.beginPath()
        ctx.arc(draggingPoint.x, draggingPoint.y, 18, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = '800 13px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(draggingPoint.value), draggingPoint.x, draggingPoint.y)
        if (offLine) {
          ctx.fillStyle = '#A32D2D'
          ctx.font = '800 12px Inter, system-ui, sans-serif'
          ctx.fillText('release to remove', draggingPoint.x, draggingPoint.y - 26)
        }
        ctx.restore()
      }
    }

    if (currentTab === 'add') {
      const { AXIS_Y, toX } = drawAxis(ctx, width, height)
      const movement = operator === '+' ? numberB : -numberB
      const walkDirection = movement === 0 ? 1 : Math.sign(movement)
      const operatorDirection = operator === '+' ? 1 : -1
      const stepCount = Math.abs(movement)
      const startX = toX(numberA)
      const endX = toX(result)
      const dotY = AXIS_Y - 8
      const progress = animationProgress
      const startReveal = progress === 0 ? 1 : clamp(progress / 0.22, 0, 1)
      const operatorReveal = clamp((progress - 0.18) / 0.22, 0, 1)
      const walkProgress = clamp((progress - 0.42) / 0.58, 0, 1)
      const walkedValue = numberA + movement * walkProgress
      const walkedX = toX(walkedValue)

      ctx.fillStyle = axisColor
      ctx.font = '800 22px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${numberA} ${operator} ${numberB} = ?`, width / 2, 24)

      if (operatorReveal > 0) {
        const badgeSize = 24 + easeOutBack(operatorReveal) * 8
        ctx.fillStyle = operator === '+' ? purple : orange
        ctx.beginPath()
        ctx.arc(startX + operatorDirection * 46, AXIS_Y - 48, badgeSize / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 22px Inter, system-ui, sans-serif'
        ctx.fillText(operator, startX + operatorDirection * 46, AXIS_Y - 48)

        drawWalker(ctx, startX, AXIS_Y - 32, operatorDirection)
      }

      const startRadius = 13 * easeOutBack(startReveal)
      ctx.fillStyle = purple
      ctx.beginPath()
      ctx.arc(startX, dotY, startRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (startReveal > 0.55) ctx.fillText(String(numberA), startX, dotY)

      if (walkProgress > 0) {
        const walkColor = movement >= 0 ? teal : orange

        ctx.strokeStyle = walkColor
        ctx.fillStyle = walkColor
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(startX, dotY)
        ctx.lineTo(walkedX, dotY)
        ctx.stroke()

        for (let step = 1; step <= Math.floor(stepCount * walkProgress + 1e-8); step += 1) {
          const stepX = toX(numberA + walkDirection * step)
          ctx.beginPath()
          ctx.arc(stepX, dotY, 4, 0, Math.PI * 2)
          ctx.fill()
        }

        drawArrowHead(ctx, walkedX, dotY, walkDirection, 8)

        ctx.font = '800 14px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${stepCount} step${stepCount === 1 ? '' : 's'} ${movement >= 0 ? 'right' : 'left'}`, (startX + endX) / 2, AXIS_Y - 18)

        ctx.fillStyle = teal
        ctx.beginPath()
        ctx.arc(walkedX, dotY, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = '800 11px Inter, system-ui, sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(Math.round(walkedValue)), walkedX, dotY)
      }

      if (animationDone) {
        ctx.clearRect(0, 0, width, 46)
        ctx.fillStyle = axisColor
        ctx.font = '800 22px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${numberA} ${operator} ${numberB} = ${result}`, width / 2, 24)

        ctx.fillStyle = teal
        ctx.beginPath()
        ctx.arc(endX, dotY, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = '800 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(result), endX, dotY + 0.5)

        ctx.fillStyle = teal
        ctx.font = '800 15px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${numberA} ${operator} ${numberB} = ${result}`, width / 2, AXIS_Y + 34)
      }
    }
  }, [animationDone, animationProgress, canvasWidth, currentTab, draggingPoint, numberA, numberB, operator, points, result])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto bg-[#F8F6F0] p-4 font-['Inter'] text-[#1A1A2E]">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              stopAnimation()
              setCurrentTab(tab.id)
            }}
            className={pillClass(currentTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="h-[180px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`h-full w-full ${currentTab === 'plot' ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={() => setDraggingPoint(null)}
        />
      </div>

      <section className="rounded-xl border border-[#E0DDD6] bg-white p-4">
        {currentTab === 'plot' && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="grid w-44 grid-cols-[44px_1fr_44px] items-center overflow-hidden rounded-full border border-[#E0DDD6] bg-[#F8F6F0]">
                <button
                  type="button"
                  onClick={() => adjustPointInput(-1)}
                  className="h-12 text-2xl font-black text-[#D85A30]"
                  aria-label="Decrease point"
                >
                  -
                </button>
                <input
                  value={pointInput}
                  min="-10"
                  max="10"
                  type="number"
                  onChange={(event) => setPointInput(clamp(Number(event.target.value), -10, 10))}
                  className="h-12 w-full border-x border-[#E0DDD6] bg-white px-1 text-center text-xl font-black text-[#1A1A2E]"
                  aria-label="Point value"
                />
                <button
                  type="button"
                  onClick={() => adjustPointInput(1)}
                  className="h-12 text-2xl font-black text-[#1D9E75]"
                  aria-label="Increase point"
                >
                  +
                </button>
              </div>
              <button type="button" onClick={addPoint} className="rounded-full bg-[#534AB7] px-5 py-2 font-black text-white">Add point</button>
              <button type="button" onClick={() => setPoints([])} className="rounded-full border border-[#E0DDD6] px-5 py-2 font-black text-[#5F5E5A]">Clear</button>
            </div>
          </div>
        )}

        {currentTab === 'add' && (
          <div className="grid gap-4">
            <div className="flex items-stretch justify-center gap-3">
              <input
                value={valueA}
                type="text"
                inputMode="numeric"
                maxLength={3}
                onChange={(event) => {
                  stopAnimation()
                  if (/^-?\d{0,2}$/.test(event.target.value)) setValueA(event.target.value)
                }}
                onBlur={() => setValueA(normalizeIntegerInput(valueA, 0))}
                className="h-24 w-20 rounded-xl border border-[#E0DDD6] px-2 text-center text-3xl font-black text-[#1A1A2E]"
                aria-label="A"
              />
              <div className="grid h-24 w-16 grid-rows-2 gap-2">
                <button
                  type="button"
                  onClick={() => { stopAnimation(); setOperator('+') }}
                  className={`rounded-xl text-2xl font-black transition ${operator === '+' ? 'bg-[#534AB7] text-white' : 'border border-[#E0DDD6] bg-white text-[#5F5E5A]'}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => { stopAnimation(); setOperator('-') }}
                  className={`rounded-xl text-2xl font-black transition ${operator === '-' ? 'bg-[#D85A30] text-white' : 'border border-[#E0DDD6] bg-white text-[#5F5E5A]'}`}
                >
                  -
                </button>
              </div>
              <input
                value={valueB}
                type="text"
                inputMode="numeric"
                maxLength={3}
                onChange={(event) => {
                  stopAnimation()
                  if (/^-?\d{0,2}$/.test(event.target.value)) setValueB(event.target.value)
                }}
                onBlur={() => setValueB(normalizeIntegerInput(valueB, 0))}
                className="h-24 w-20 rounded-xl border border-[#E0DDD6] px-2 text-center text-3xl font-black text-[#1A1A2E]"
                aria-label="B"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={animate} className="h-12 rounded-full bg-[#534AB7] font-black text-white">Animate</button>
              <button type="button" onClick={stopAnimation} className="h-12 rounded-full border border-[#E0DDD6] px-4 font-black text-[#5F5E5A]">Reset</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[#5F5E5A]">
              <span>{hintText}</span>
              {animationDone && <span className="text-[#1D9E75]">{numberA} {operator} {numberB} = {result}</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
