import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  fill: '#EEEDFE',
  stroke: '#1E2D5A',
  purple: '#534AB7',
  orange: '#D85A30',
  teal: '#1D9E75',
  blue: '#185FA5',
  brown: '#BA7517',
  border: '#E0DDD6',
  muted: '#6B7280',
}

const triangleColors = [colors.purple, colors.orange, colors.teal, colors.blue, colors.brown]
const sideOptions = [
  { sides: 3, label: 'Triangle' },
  { sides: 4, label: 'Quad' },
  { sides: 5, label: 'Pentagon' },
  { sides: 6, label: 'Hexagon' },
  { sides: 7, label: 'Heptagon' },
  { sides: 8, label: 'Octagon' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function modAngle(angle) {
  let next = angle
  while (next < -Math.PI) next += Math.PI * 2
  while (next > Math.PI) next -= Math.PI * 2
  return next
}

function regularPolygon(sides, width, height) {
  const radius = Math.min(width, height) * 0.36
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return {
      x: (width / 2 + Math.cos(angle) * radius) / width,
      y: (height / 2 + Math.sin(angle) * radius) / height,
    }
  })
}

function formatAngleValue(value) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function toCanvasPoints(points, width, height) {
  return points.map((point) => ({ x: point.x * width, y: point.y * height }))
}

function interiorAngle(prev, current, next) {
  const a1 = Math.atan2(prev.y - current.y, prev.x - current.x)
  const a2 = Math.atan2(next.y - current.y, next.x - current.x)
  const sweep = modAngle(a2 - a1)
  const degrees = Math.round(Math.abs(sweep) * 180 / Math.PI)
  return { start: a1, sweep, degrees: clamp(degrees, 1, 179) }
}

function drawPolygon(ctx, points) {
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.closePath()
  ctx.fillStyle = `${colors.fill}80`
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 2.5
  ctx.fill()
  ctx.stroke()
}

function drawTriangles(ctx, points) {
  if (points.length < 3) return

  for (let index = 1; index < points.length - 1; index += 1) {
    const triangle = [points[0], points[index], points[index + 1]]
    const color = triangleColors[(index - 1) % triangleColors.length]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(triangle[0].x, triangle[0].y)
    ctx.lineTo(triangle[1].x, triangle[1].y)
    ctx.lineTo(triangle[2].x, triangle[2].y)
    ctx.closePath()
    ctx.fillStyle = `${color}33`
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.setLineDash([7, 5])
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    const centroid = {
      x: (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
      y: (triangle[0].y + triangle[1].y + triangle[2].y) / 3,
    }
    ctx.fillStyle = color
    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('180°', centroid.x, centroid.y)
    ctx.restore()
  }
}

function drawAngles(ctx, points, answerGlow = false) {
  points.forEach((point, index) => {
    const prev = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const angle = interiorAngle(prev, point, next)
    const radius = 22

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.arc(point.x, point.y, radius, angle.start, angle.start + angle.sweep, angle.sweep < 0)
    ctx.closePath()
    ctx.fillStyle = `${colors.purple}2e`
    ctx.strokeStyle = colors.purple
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

    const labelAngle = angle.start + angle.sweep / 2
    ctx.fillStyle = answerGlow ? colors.orange : colors.purple
    ctx.shadowColor = answerGlow ? `${colors.orange}aa` : 'transparent'
    ctx.shadowBlur = answerGlow ? 12 : 0
    ctx.font = answerGlow ? '900 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : '800 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${angle.degrees}°`, point.x + Math.cos(labelAngle) * 38, point.y + Math.sin(labelAngle) * 38)
    ctx.restore()
  })
}

function getExteriorAngles(points) {
  return points.map((point, index) => {
    const prev = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const incoming = Math.atan2(point.y - prev.y, point.x - prev.x)
    const outgoing = Math.atan2(next.y - point.y, next.x - point.x)
    return Math.abs(modAngle(outgoing - incoming) * 180 / Math.PI)
  })
}

function irregularPolygon(sides, width, height) {
  return regularPolygon(sides, width, height).map((point, index) => {
    const scale = 0.78 + (index % 3) * 0.1
    return {
      x: 0.5 + (point.x - 0.5) * scale,
      y: 0.5 + (point.y - 0.5) * (index % 2 === 0 ? scale : scale + 0.08),
    }
  })
}

function drawExterior(ctx, points) {
  const exteriorAngles = getExteriorAngles(points)
  points.forEach((point, index) => {
    const prev = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const exterior = exteriorAngles[index]
    const dx = point.x - prev.x
    const dy = point.y - prev.y
    const length = Math.hypot(dx, dy) || 1
    const ux = dx / length
    const uy = dy / length
    const extensionAngle = Math.atan2(uy, ux)
    const nextAngle = Math.atan2(next.y - point.y, next.x - point.x)
    let sweep = modAngle(extensionAngle - nextAngle)
    if (sweep < 0) sweep += Math.PI * 2
    if (sweep > Math.PI) sweep -= Math.PI * 2

    ctx.save()
    ctx.strokeStyle = colors.orange
    ctx.fillStyle = colors.orange
    ctx.lineCap = 'round'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.95
    ctx.beginPath()
    ctx.moveTo(point.x - ux * 36, point.y - uy * 36)
    ctx.lineTo(point.x + ux * 48, point.y + uy * 48)
    ctx.stroke()

    const labelAngle = nextAngle + sweep / 2
    const labelX = point.x + Math.cos(labelAngle) * 46
    const labelY = point.y + Math.sin(labelAngle) * 46

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.arc(point.x, point.y, 24, nextAngle, nextAngle + sweep, sweep < 0)
    ctx.closePath()
    ctx.fillStyle = `${colors.orange}24`
    ctx.strokeStyle = colors.orange
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = colors.orange
    ctx.font = '900 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${formatAngleValue(exterior)}°`, labelX, labelY)

    ctx.globalAlpha = 1
    ctx.fillStyle = colors.orange
    ctx.restore()
  })
}

function drawExteriorCircle(ctx, points, canvasWidth, canvasHeight) {
  const exteriorAngles = getExteriorAngles(points)
  const total = exteriorAngles.reduce((acc, angle) => acc + angle, 0)
  const closes = Math.abs(total - 360) < 0.5
  const radius = canvasWidth < 620 ? 48 : 64
  const centerX = canvasWidth - radius - 24
  const centerY = canvasHeight / 2 + 22
  let start = -Math.PI / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.strokeStyle = '#C9C5BC'
  ctx.lineWidth = 4
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.restore()

  exteriorAngles.forEach((angle, index) => {
    const sweep = (angle / 360) * Math.PI * 2
    const end = start + sweep
    const color = triangleColors[index % triangleColors.length]

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, start, end)
    ctx.closePath()
    ctx.fillStyle = `${color}40`
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

    const middle = start + sweep / 2
    const labelRadius = radius * 0.62
    ctx.fillStyle = colors.stroke
    ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${formatAngleValue(angle)}°`, centerX + Math.cos(middle) * labelRadius, centerY + Math.sin(middle) * labelRadius)
    ctx.restore()
    start = end
  })

  if (total > 360.5) {
    const overflowSweep = Math.min((total - 360) / 360, 1) * Math.PI * 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 6, -Math.PI / 2, -Math.PI / 2 + overflowSweep)
    ctx.strokeStyle = '#C62828'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.fillStyle = closes ? colors.orange : '#C62828'
  ctx.font = '900 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Exterior angles', centerX, centerY - radius - 8)
  ctx.textBaseline = 'top'
  ctx.fillText(`Total = ${formatAngleValue(total)}°`, centerX, centerY + radius + 7)
  ctx.restore()
}

function drawHandles(ctx, points) {
  points.forEach((point) => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = colors.stroke
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
  })
}

export default function PolygonInteriorAngles() {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const regularTimersRef = useRef([])
  const [canvasWidth, setCanvasWidth] = useState(720)
  const canvasHeight = 270
  const [sides, setSides] = useState(4)
  const [points, setPoints] = useState(() => regularPolygon(4, 720, canvasHeight))
  const [dragIndex, setDragIndex] = useState(null)
  const [selectedView, setSelectedView] = useState('angles')
  const [regularMode, setRegularMode] = useState(true)
  const [regularPhase, setRegularPhase] = useState('done')

  const triangleCount = sides - 2
  const sum = triangleCount * 180
  const regularAngle = sum / sides

  const canvasPoints = useMemo(() => toCanvasPoints(points, canvasWidth, canvasHeight), [canvasWidth, points])
  const exteriorAngles = useMemo(() => getExteriorAngles(canvasPoints), [canvasPoints])
  const exteriorTotal = exteriorAngles.reduce((acc, angle) => acc + angle, 0)
  const exteriorCloses = Math.abs(exteriorTotal - 360) < 0.5

  const clearRegularTimers = useCallback(() => {
    regularTimersRef.current.forEach((timer) => clearTimeout(timer))
    regularTimersRef.current = []
  }, [])

  const playRegularGlow = useCallback(() => {
    clearRegularTimers()
    setRegularPhase('sum')
    regularTimersRef.current = [
      setTimeout(() => setRegularPhase('sides'), 2000),
      setTimeout(() => setRegularPhase('answer'), 4000),
      setTimeout(() => setRegularPhase('done'), 6000),
    ]
  }, [clearRegularTimers])

  const resetPolygon = useCallback((nextSides) => {
    clearRegularTimers()
    setSides(nextSides)
    setPoints(regularPolygon(nextSides, canvasWidth, canvasHeight))
    setDragIndex(null)
    setRegularMode(true)
    setRegularPhase('done')
  }, [canvasWidth, clearRegularTimers])

  const setPolygonMode = (mode) => {
    if (mode === 'regular') {
      setPoints(regularPolygon(sides, canvasWidth, canvasHeight))
      setDragIndex(null)
      playRegularGlow()
    } else {
      setPoints(irregularPolygon(sides, canvasWidth, canvasHeight))
      setDragIndex(null)
      clearRegularTimers()
      setRegularPhase('idle')
    }
    setRegularMode(mode === 'regular')
  }

  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const update = () => setCanvasWidth(Math.max(320, Math.round(wrapper.clientWidth)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    clearRegularTimers()
  }, [clearRegularTimers])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (selectedView === 'triangles') drawTriangles(ctx, canvasPoints)
    drawPolygon(ctx, canvasPoints)
    if (selectedView === 'exterior') {
      drawExterior(ctx, canvasPoints)
      drawExteriorCircle(ctx, canvasPoints, canvasWidth, canvasHeight)
    }
    if (selectedView === 'angles') drawAngles(ctx, canvasPoints, regularMode && regularPhase === 'answer')
    drawHandles(ctx, canvasPoints)
  }, [canvasPoints, canvasWidth, regularMode, regularPhase, selectedView])

  useEffect(() => {
    draw()
  }, [draw])

  const getCanvasPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event)
    const hitIndex = canvasPoints.findIndex((vertex) => Math.hypot(vertex.x - point.x, vertex.y - point.y) <= 20)
    if (hitIndex === -1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragIndex(hitIndex)
  }

  const handlePointerMove = (event) => {
    if (dragIndex === null) return
    const point = getCanvasPoint(event)
    setRegularMode(false)
    clearRegularTimers()
    setRegularPhase('idle')
    setPoints((current) => current.map((vertex, index) => (
      index === dragIndex
        ? {
          x: clamp(point.x / canvasWidth, 0.04, 0.96),
          y: clamp(point.y / canvasHeight, 0.06, 0.94),
        }
        : vertex
    )))
  }

  const stopDragging = () => setDragIndex(null)

  const insight = (() => {
    if (selectedView === 'exterior' && exteriorCloses) return 'The live exterior-angle pieces still make one complete turn: 360°.'
    if (selectedView === 'exterior') return `The pieces no longer make one clean turn (${formatAngleValue(exteriorTotal)}°). The polygon has become concave or crossed.`
    if (selectedView === 'triangles') return `Diagonal lines split the polygon into ${triangleCount} triangles. Each has 180°, so the total is ${triangleCount} × 180° = ${sum}°.`
    return `For a regular ${sides}-sided polygon, each interior angle is ${sum}° ÷ ${sides} = ${formatAngleValue(regularAngle)}°.`
  })()

  const sumGlow = regularMode && regularPhase === 'sum'
  const sidesGlow = regularMode && regularPhase === 'sides'
  const answerGlow = regularMode && regularPhase === 'answer'
  const showSidesStep = regularMode && ['sides', 'answer', 'done'].includes(regularPhase)
  const showAnswerStep = regularMode && ['answer', 'done'].includes(regularPhase)
  const exteriorAngle = 360 / sides

  const summaryCards = selectedView === 'exterior'
    ? [
      { label: 'Sides (N)', value: sides, color: '#0F6E56' },
      { label: 'Live exterior angle sum', value: `${formatAngleValue(exteriorTotal)}°`, color: exteriorCloses ? colors.orange : '#C62828' },
      { label: 'Formula', value: regularMode ? `360° ÷ ${sides}` : 'Add the vertex angles', color: '#5F5E5A' },
      { label: regularMode ? 'Each exterior angle' : 'Shape check', value: regularMode ? `${formatAngleValue(exteriorAngle)}°` : exteriorCloses ? 'Still 360°' : 'Does not close', color: exteriorCloses ? colors.orange : '#C62828' },
    ]
    : selectedView === 'triangles'
      ? [
        { label: 'Sides (N)', value: sides, color: '#0F6E56' },
        { label: 'Triangles', value: triangleCount, color: colors.teal },
        { label: 'Formula', value: `(${sides}−2) × 180°`, color: '#5F5E5A' },
        { label: 'Sum of interior angles', value: `${sum}°`, color: colors.purple },
      ]
      : [
        { label: 'Sides (N)', value: sides, color: '#0F6E56' },
        { label: 'Sum of interior angles', value: `${sum}°`, color: colors.purple },
        { label: 'Formula', value: `${sum}° ÷ ${sides}`, color: '#5F5E5A' },
        { label: 'Each interior angle', value: `${formatAngleValue(regularAngle)}°`, color: colors.purple },
      ]

  return (
    <div ref={rootRef} className="relative flex h-full flex-col gap-2 overflow-auto bg-[#F8F6F0] p-3 font-['Inter'] text-[#1A1A2E]">
      <style>
        {`
          @keyframes polygonCardGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(83, 74, 183, 0); outline: 0 solid rgba(83, 74, 183, 0); transform: scale(1); }
            18%, 54%, 88% { box-shadow: 0 0 0 2px rgba(83, 74, 183, 0.12), 0 0 14px rgba(83, 74, 183, 0.28); outline: 2px solid rgba(83, 74, 183, 0.26); transform: scale(1.01); }
            36%, 72% { box-shadow: 0 0 0 5px rgba(83, 74, 183, 0.2), 0 0 24px rgba(83, 74, 183, 0.42); outline: 5px solid rgba(83, 74, 183, 0.34); transform: scale(1.018); }
          }
          @keyframes polygonValueGlow {
            0%, 100% { text-shadow: 0 0 0 rgba(216, 90, 48, 0); transform: scale(1); }
            18%, 54%, 88% { text-shadow: 0 0 8px rgba(216, 90, 48, 0.55); transform: scale(1.08); }
            36%, 72% { text-shadow: 0 0 14px rgba(216, 90, 48, 0.8); transform: scale(1.14); }
          }
          @keyframes polygonEquationBoxStrobe {
            0%, 100% { box-shadow: 0 2px 8px rgba(83, 74, 183, 0.08); outline: 0 solid rgba(83, 74, 183, 0); transform: scale(1); }
            18%, 54%, 88% { box-shadow: 0 0 0 2px rgba(83, 74, 183, 0.16), 0 0 16px rgba(83, 74, 183, 0.3); outline: 2px solid rgba(83, 74, 183, 0.28); transform: scale(1.01); }
            36%, 72% { box-shadow: 0 0 0 5px rgba(83, 74, 183, 0.2), 0 0 26px rgba(83, 74, 183, 0.42); outline: 5px solid rgba(83, 74, 183, 0.36); transform: scale(1.018); }
          }
          @keyframes polygonEquationReveal {
            0% { transform: scale(0.8); opacity: 0; }
            70% { transform: scale(1.12); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#5F5E5A]">Sides:</span>
        {sideOptions.map((option) => (
          <button
            key={option.sides}
            type="button"
            onClick={() => resetPolygon(option.sides)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              sides === option.sides
                ? 'border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]'
                : 'border-[#E0DDD6] bg-white text-[#1A1A2E]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="relative h-[270px] w-full overflow-visible rounded-xl border border-[#E0DDD6] bg-white">
        <div className="absolute right-3 top-3 z-10 flex w-[300px] max-w-[calc(100%-1.5rem)] flex-col items-stretch gap-1.5">
          <div className="grid grid-cols-2 overflow-hidden rounded-full border border-[#D8D4CE] bg-white/95 shadow-sm">
            {[
              ['regular', 'Regular Polygon'],
              ['irregular', 'Irregular Polygon'],
            ].map(([mode, label]) => {
              const selected = mode === 'regular' ? regularMode : !regularMode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPolygonMode(mode)}
                  className={`px-3 py-1.5 text-sm font-black transition-all ${
                    selected ? 'bg-[#534AB7] text-white' : 'text-[#1A1A2E] hover:text-[#534AB7]'
                  }`}
                  aria-pressed={selected}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div
            className={`relative overflow-hidden rounded-xl border-2 border-[#D7D2F7] bg-[#F7F5FF]/95 px-4 py-3 text-center shadow-sm transition-all duration-300 ${
              regularMode && selectedView === 'angles'
                ? 'opacity-100 translate-y-0 scale-100'
                : 'pointer-events-none opacity-0 -translate-y-1 scale-95'
            }`}
            style={regularMode && regularPhase !== 'idle' && regularPhase !== 'done' ? { animation: 'polygonEquationBoxStrobe 2000ms ease-in-out both' } : undefined}
          >
            <p className="text-[12px] font-black uppercase text-[#6B64B8]">Each interior angle</p>
            <p className="font-mono text-lg font-black leading-tight text-[#1A1A2E]">
              <span
                className="inline-block text-[#534AB7]"
                style={sumGlow ? { animation: 'polygonValueGlow 2000ms ease-in-out both' } : undefined}
              >
                {sum}°
              </span>
              <span className={`inline-block transition-opacity duration-200 ${showSidesStep ? 'opacity-100' : 'opacity-20'}`}> ÷ </span>
              <span
                className={`inline-block text-[#0F6E56] transition-opacity duration-200 ${showSidesStep ? 'opacity-100' : 'opacity-20'}`}
                style={sidesGlow ? { animation: 'polygonValueGlow 2000ms ease-in-out both' } : undefined}
              >
                {sides}
              </span>
              <span className={`inline-block transition-opacity duration-200 ${showAnswerStep ? 'opacity-100' : 'opacity-0'}`}> = </span>
              <span
                className={`inline-block text-[#D85A30] ${showAnswerStep ? 'opacity-100' : 'opacity-0'}`}
                style={answerGlow ? { animation: 'polygonEquationReveal 360ms ease-out both, polygonValueGlow 2000ms ease-in-out both' } : undefined}
              >
                {formatAngleValue(regularAngle)}°
              </span>
            </p>
          </div>
        </div>
        <div
          className={`pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
            regularMode
              ? 'border-[#9ED8C5] bg-[#E7F7F1] text-[#0F6E56]'
              : 'border-[#F2B8A2] bg-[#FFF1EB] text-[#A43F1D]'
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${regularMode ? 'bg-[#1D9E75]' : 'bg-[#D85A30]'}`} />
          {regularMode ? 'Regular polygon — equal sides and angles' : 'Irregular polygon — vertices have moved'}
        </div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`h-full w-full touch-none ${dragIndex === null ? 'cursor-grab' : 'cursor-grabbing'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
        {summaryCards.map((card, index) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#E0DDD6] bg-white p-3"
            style={index === 0 && sidesGlow
              ? { animation: 'polygonCardGlow 2000ms ease-in-out both', borderColor: '#0F6E56' }
              : index === 1 && sumGlow
                ? { animation: 'polygonCardGlow 2000ms ease-in-out both', borderColor: colors.purple }
                : undefined}
          >
            <p className="text-[11px] font-black uppercase text-[#8A8780]">{card.label}</p>
            <p className="text-lg font-black" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['exterior', 'Exterior angles', colors.orange],
          ['triangles', 'Sum of interior angles', colors.teal],
          ['angles', 'Interior angle', colors.purple],
        ].map(([id, label, color]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedView(id)}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${selectedView === id ? 'bg-white' : 'bg-white text-[#5F5E5A]'}`}
            style={{ borderColor: selectedView === id ? color : colors.border, color: selectedView === id ? color : undefined }}
            aria-pressed={selectedView === id}
          >
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: color }} />
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border-l-4 border-[#A8A1FF] bg-[#EEEDFE] px-3 py-2 text-sm font-semibold leading-snug text-[#343070]">
        {insight}
      </section>
    </div>
  )
}
