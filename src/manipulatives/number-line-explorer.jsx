import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const axisColor = '#1A1A2E'
const purple = '#534AB7'
const teal = '#1D9E75'
const orange = '#D85A30'
const blue = '#185FA5'

const tabs = [
  { id: 'plot', label: 'Plot & compare' },
  { id: 'add', label: 'Add & subtract' },
  { id: 'rational', label: 'Rational & irrational' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundDisplay(value, digits = 2) {
  const rounded = Number(value.toFixed(digits))
  return Object.is(rounded, -0) ? 0 : rounded
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function drawArrowHead(ctx, x, y, direction, size) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - direction * size, y - size * 0.62)
  ctx.lineTo(x - direction * size, y + size * 0.62)
  ctx.closePath()
  ctx.fill()
}

function drawAxis(ctx, width, height, min = -10, max = 10, labelStep = 2, tickStep = 1) {
  const PAD = 40
  const CELL = (width - PAD * 2) / (max - min)
  const ORIGIN_X = PAD + (0 - min) * CELL
  const AXIS_Y = height * 0.64
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
    ctx.moveTo(x, AXIS_Y - 6)
    ctx.lineTo(x, AXIS_Y + 6)
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
  const [showAbs, setShowAbs] = useState(false)

  const [valueA, setValueA] = useState(3)
  const [valueB, setValueB] = useState(-5)
  const [operator, setOperator] = useState('+')
  const [animationProgress, setAnimationProgress] = useState(0)
  const [animationDone, setAnimationDone] = useState(false)

  const [zoom, setZoom] = useState(4)
  const [pan, setPan] = useState(0)
  const [irrational, setIrrational] = useState('sqrt2')

  const result = operator === '+' ? valueA + valueB : valueA - valueB
  const irrationalValue = irrational === 'sqrt2' ? Math.sqrt(2) : Math.sqrt(3)
  const irrationalLabel = irrational === 'sqrt2' ? '√2' : '√3'
  const canvasHeight = 140

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
    const value = clamp(Math.round(Number(pointInput)), -12, 12)
    setPoints((current) => current.includes(value) ? current : [...current, value].sort((a, b) => a - b))
  }

  const removePoint = (value) => {
    setPoints((current) => current.filter((point) => point !== value))
  }

  const animate = () => {
    stopAnimation()
    let frame = 0
    const totalFrames = 60
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
      return valueB < 0 ? 'Adding a negative moves left.' : 'Adding a positive moves right.'
    }
    return valueB < 0 ? 'Subtracting a negative moves right.' : 'Subtracting a positive moves left.'
  }, [operator, valueB])

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
      const { AXIS_Y, ORIGIN_X, toX } = drawAxis(ctx, width, height)

      points.forEach((point, index) => {
        const x = toX(point)
        const y = AXIS_Y - 36 - (index % 2) * 8
        const color = point < 0 ? orange : purple

        if (showAbs) {
          ctx.save()
          ctx.setLineDash([6, 5])
          ctx.strokeStyle = teal
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(ORIGIN_X, y - 18)
          ctx.lineTo(x, y - 18)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = teal
          ctx.font = '700 12px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(`|${point}| = ${Math.abs(point)}`, (ORIGIN_X + x) / 2, y - 22)
          ctx.restore()
        }

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
    }

    if (currentTab === 'add') {
      const { AXIS_Y, toX } = drawAxis(ctx, width, height)
      const startX = toX(valueA)
      const endX = toX(result)
      const dotY = AXIS_Y - 24
      const arcLift = Math.max(34, Math.abs(endX - startX) * 0.18)
      const controlX = (startX + endX) / 2
      const controlY = AXIS_Y - arcLift
      const progress = animationProgress

      ctx.fillStyle = purple
      ctx.beginPath()
      ctx.arc(startX, dotY, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(valueA), startX, dotY)

      if (progress > 0) {
        const arrowColor = operator === '+' ? teal : orange
        const currentX = (1 - progress) * (1 - progress) * startX + 2 * (1 - progress) * progress * controlX + progress * progress * endX
        const currentY = (1 - progress) * (1 - progress) * dotY + 2 * (1 - progress) * progress * controlY + progress * progress * dotY

        ctx.strokeStyle = arrowColor
        ctx.fillStyle = arrowColor
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(startX, dotY)
        ctx.quadraticCurveTo(controlX, controlY, currentX, currentY)
        ctx.stroke()

        const direction = endX >= startX ? 1 : -1
        drawArrowHead(ctx, currentX, currentY, direction, 8)

        ctx.font = '800 13px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        const label = operator === '+' ? signed(valueB) : `-${valueB < 0 ? `(${valueB})` : valueB}`
        ctx.fillText(label, controlX, controlY - 8)
      }

      if (animationDone) {
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
        ctx.fillText(`${valueA} ${operator} ${valueB} = ${result}`, width / 2, AXIS_Y + 34)
      }
    }

    if (currentTab === 'rational') {
      const span = 20 / zoom
      const min = pan - span / 2
      const max = pan + span / 2
      const tickStep = zoom <= 2 ? 1 : zoom <= 8 ? 0.5 : 0.1
      const labelStep = zoom <= 2 ? 2 : zoom <= 8 ? 1 : 0.5
      const { AXIS_Y, toX } = drawAxis(ctx, width, height, min, max, labelStep, tickStep)
      const valueX = toX(irrationalValue)
      const color = irrational === 'sqrt2' ? orange : blue

      ctx.fillStyle = '#5F5E5A'
      ctx.font = '700 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(`${zoom}x`, width - 12, 10)

      if (irrational === 'sqrt2' && zoom >= 4) {
        const x1 = toX(1)
        const x2 = toX(2)
        const baseY = AXIS_Y - 10
        const topY = AXIS_Y - 54
        ctx.strokeStyle = 'rgba(216, 90, 48, 0.65)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, baseY)
        ctx.lineTo(x2, baseY)
        ctx.lineTo(x2, topY)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = orange
        ctx.font = '700 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('1', (x1 + x2) / 2, baseY + 5)
        ctx.textAlign = 'left'
        ctx.fillText('1', x2 + 5, (baseY + topY) / 2)
      }

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(valueX, AXIS_Y - 28, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = '800 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(irrationalLabel, valueX, AXIS_Y - 44)
      ctx.textBaseline = 'top'
      ctx.fillText(roundDisplay(irrationalValue, 3), valueX, AXIS_Y + 28)
    }
  }, [animationDone, animationProgress, canvasWidth, currentTab, irrational, irrationalLabel, irrationalValue, operator, pan, points, result, showAbs, valueA, valueB, zoom])

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

      <div ref={wrapRef} className="h-[140px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className="h-full w-full" />
      </div>

      <section className="rounded-xl border border-[#E0DDD6] bg-white p-4">
        {currentTab === 'plot' && (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={pointInput}
                min="-12"
                max="12"
                type="number"
                onChange={(event) => setPointInput(clamp(Number(event.target.value), -12, 12))}
                className="h-11 rounded-lg border border-[#E0DDD6] px-3 text-base"
              />
              <button type="button" onClick={addPoint} className="rounded-full bg-[#534AB7] px-5 py-2 font-black text-white">Add point</button>
              <button type="button" onClick={() => setPoints([])} className="rounded-full border border-[#E0DDD6] px-5 py-2 font-black text-[#5F5E5A]">Clear</button>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-[#5F5E5A]">
              <input type="checkbox" checked={showAbs} onChange={(event) => setShowAbs(event.target.checked)} />
              Show absolute value
            </label>
            <div className="flex flex-wrap gap-2">
              {points.map((point) => (
                <button
                  key={point}
                  type="button"
                  onClick={() => removePoint(point)}
                  className="rounded-full border border-[#E0DDD6] bg-[#F8F6F0] px-3 py-1 text-sm font-black"
                >
                  {point} ×
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'add' && (
          <div className="grid gap-4">
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <input
                value={valueA}
                type="number"
                min="-10"
                max="10"
                onChange={(event) => {
                  stopAnimation()
                  setValueA(clamp(Math.round(Number(event.target.value)), -10, 10))
                }}
                className="h-11 rounded-lg border border-[#E0DDD6] px-3 text-base"
                aria-label="A"
              />
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => { stopAnimation(); setOperator('+') }} className={pillClass(operator === '+', 'bg-[#534AB7]')}>+</button>
                <button type="button" onClick={() => { stopAnimation(); setOperator('-') }} className={pillClass(operator === '-', 'bg-[#D85A30]')}>−</button>
              </div>
              <input
                value={valueB}
                type="number"
                min="-10"
                max="10"
                onChange={(event) => {
                  stopAnimation()
                  setValueB(clamp(Math.round(Number(event.target.value)), -10, 10))
                }}
                className="h-11 rounded-lg border border-[#E0DDD6] px-3 text-base"
                aria-label="B"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={animate} className="h-12 rounded-full bg-[#534AB7] font-black text-white">Animate</button>
              <button type="button" onClick={stopAnimation} className="h-12 rounded-full border border-[#E0DDD6] px-4 font-black text-[#5F5E5A]">Reset</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[#5F5E5A]">
              <span>{hintText}</span>
              {animationDone && <span className="text-[#1D9E75]">{valueA} {operator} {valueB} = {result}</span>}
            </div>
          </div>
        )}

        {currentTab === 'rational' && (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-bold text-[#5F5E5A]">
              Zoom: {zoom}x
              <input type="range" min="1" max="20" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#5F5E5A]">
              Pan: {pan}
              <input type="range" min="-8" max="8" value={pan} onChange={(event) => setPan(Number(event.target.value))} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIrrational('sqrt2')} className={pillClass(irrational === 'sqrt2', 'bg-[#D85A30]')}>√2 ≈ 1.414</button>
              <button type="button" onClick={() => setIrrational('sqrt3')} className={pillClass(irrational === 'sqrt3', 'bg-[#185FA5]')}>√3 ≈ 1.732</button>
            </div>
            <p className="text-sm font-semibold text-[#5F5E5A]">
              Zoom in between 1 and 2, then show √2. No matter how far you zoom it never lands exactly on a tick - that&apos;s what makes it irrational.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
