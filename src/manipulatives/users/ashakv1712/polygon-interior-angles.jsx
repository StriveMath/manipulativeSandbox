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
  const raw = Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
  const ys = raw.map((p) => p.y)
  const offsetY = (Math.min(...ys) + Math.max(...ys)) / 2
  return raw.map((p) => ({
    x: (width / 2 + p.x) / width,
    y: (height / 2 + p.y - offsetY) / height,
  }))
}

function formatAngleValue(value) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
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

function drawTriangles(ctx, points, showLabels = true) {
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
    ctx.font = '800 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (showLabels) ctx.fillText('180°', centroid.x, centroid.y)
    ctx.restore()
  }
}

function drawAngles(ctx, points, answerGlow = false, showLabels = true) {
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
    ctx.font = answerGlow ? '900 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : '800 20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (showLabels) ctx.fillText(`${angle.degrees}°`, point.x + Math.cos(labelAngle) * 46, point.y + Math.sin(labelAngle) * 46)
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

function drawExterior(ctx, points, showLabels = true) {
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

    const color = triangleColors[index % triangleColors.length]
    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
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
    ctx.fillStyle = `${color}40`
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (showLabels) ctx.fillText(`${formatAngleValue(exterior)}°`, labelX, labelY)

    ctx.globalAlpha = 1
    ctx.fillStyle = color
    ctx.restore()
  })
}

function drawExteriorCircle(ctx, points, canvasWidth, canvasHeight, showLabels = true) {
  const exteriorAngles = getExteriorAngles(points)
  const total = exteriorAngles.reduce((acc, angle) => acc + angle, 0)
  const closes = Math.abs(total - 360) < 0.5
  const radius = Math.min(canvasHeight * 0.3, 84)
  const centerX = canvasWidth * 0.75
  const centerY = canvasHeight / 2 + 12
  let start = -Math.PI / 2

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
    ctx.font = '800 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (showLabels) ctx.fillText(`${formatAngleValue(angle)}°`, centerX + Math.cos(middle) * labelRadius, centerY + Math.sin(middle) * labelRadius)
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
  ctx.fillText('Sum of exterior angles', centerX, centerY - radius - 10)
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
  const shapeRef = useRef({ regularMode: true, sides: 4 })
  const [canvasWidth, setCanvasWidth] = useState(720)
  const canvasHeight = 300
  const [sides, setSides] = useState(4)
  const [points, setPoints] = useState(() => regularPolygon(4, 720, canvasHeight))
  const [dragIndex, setDragIndex] = useState(null)
  const [selectedView, setSelectedView] = useState('exterior')
  const [regularMode, setRegularMode] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    shapeRef.current = { regularMode, sides }
  }, [regularMode, sides])

  const triangleCount = sides - 2
  const sum = triangleCount * 180
  const regularAngle = sum / sides

  const isExterior = selectedView === 'exterior'
  const shiftX = isExterior ? -canvasWidth / 4 : 0
  const canvasPoints = useMemo(
    () => toCanvasPoints(points, canvasWidth, canvasHeight).map((point) => ({ x: point.x + shiftX, y: point.y })),
    [canvasWidth, points, shiftX],
  )

  const resetPolygon = useCallback((nextSides) => {
    setSides(nextSides)
    setPoints(regularPolygon(nextSides, canvasWidth, canvasHeight))
    setDragIndex(null)
    setRegularMode(true)
  }, [canvasWidth])

  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const update = () => {
      const width = Math.max(320, Math.round(wrapper.clientWidth))
      setCanvasWidth(width)
      const { regularMode: isRegular, sides: sideCount } = shapeRef.current
      if (isRegular) setPoints(regularPolygon(sideCount, width, canvasHeight))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (selectedView === 'triangles') drawTriangles(ctx, canvasPoints, showAnswers)
    drawPolygon(ctx, canvasPoints)
    if (selectedView === 'exterior') {
      drawExterior(ctx, canvasPoints, showAnswers)
      drawExteriorCircle(ctx, canvasPoints, canvasWidth, canvasHeight, showAnswers)
    }
    if (selectedView === 'angles') drawAngles(ctx, canvasPoints, false, showAnswers)
    drawHandles(ctx, canvasPoints)
  }, [canvasPoints, canvasWidth, selectedView, showAnswers])

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
    const minX = isExterior ? 0.27 : 0.04
    const maxX = isExterior ? 0.73 : 0.96
    setPoints((current) => current.map((vertex, index) => (
      index === dragIndex
        ? {
          x: clamp((point.x - shiftX) / canvasWidth, minX, maxX),
          y: clamp(point.y / canvasHeight, 0.06, 0.94),
        }
        : vertex
    )))
  }

  const stopDragging = () => setDragIndex(null)

  const exteriorAngle = 360 / sides
  const blank = '—'
  const N = '#0F6E56'
  const TURN = colors.orange
  const STRAIGHT = colors.teal
  const SUM = colors.purple
  const OP = '#5F5E5A'
  const p = (t, c = OP) => ({ t, c })
  const hidden = [p('?', '#8A8780')]
  const answer = (value) => (showAnswers ? value : blank)

  const summaryCards = selectedView === 'exterior'
    ? [
      {
        label: 'Formula',
        pills: [
          [p('360°', TURN), p(' ÷ '), p('n', N)],
          showAnswers ? [p('360°', TURN), p(' ÷ '), p(sides, N)] : hidden,
        ],
      },
      { label: 'Each exterior angle', value: regularMode ? answer(`${formatAngleValue(exteriorAngle)}°`) : blank, color: TURN },
    ]
    : selectedView === 'triangles'
      ? [
        { label: 'Sides (n)', value: answer(sides), color: N, compact: true },
        {
          label: 'Triangles',
          grow: 2,
          pills: [
            [p('n', N), p(' − 2')],
            showAnswers ? [p(sides, N), p(' − 2 = '), p(triangleCount, STRAIGHT)] : hidden,
          ],
        },
        {
          label: 'Sum of angles',
          grow: 3,
          pills: [
            [p('(', OP), p('n', N), p(' − 2) × '), p('180°', STRAIGHT)],
            showAnswers ? [p(triangleCount, STRAIGHT), p(' × '), p('180°', STRAIGHT)] : hidden,
          ],
        },
        { label: 'Sum', value: answer(`${sum}°`), color: SUM, compact: true },
      ]
      : [
        { label: 'Sides (n)', value: answer(sides), color: N, compact: true },
        { label: 'Sum', value: answer(`${sum}°`), color: SUM, compact: true },
        {
          label: 'Formula',
          pills: [
            [p('Sum', SUM), p(' ÷ '), p('n', N)],
            showAnswers ? [p(`${sum}°`, SUM), p(' ÷ '), p(sides, N)] : hidden,
          ],
        },
        { label: 'Each interior angle', value: regularMode ? answer(`${formatAngleValue(regularAngle)}°`) : blank, color: SUM },
      ]

  return (
    <div ref={rootRef} className="relative flex h-full flex-col gap-2 overflow-auto bg-[#F8F6F0] p-3 font-['Inter'] text-[#1A1A2E]">
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
        <button
          type="button"
          onClick={() => setShowAnswers((value) => !value)}
          className={`ml-auto rounded-lg border px-4 py-2 text-sm font-semibold ${
            showAnswers
              ? 'border-[#E0DDD6] bg-white text-[#5F5E5A] hover:border-[#1E2D5A]'
              : 'border-[#D85A30] bg-[#FFF1EB] text-[#A43F1D]'
          }`}
          aria-pressed={!showAnswers}
        >
          {showAnswers ? 'Hide answers' : 'Show answers'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#5F5E5A]">Choose a formula:</span>
        {[
          ['exterior', 'Exterior angles'],
          ['triangles', 'Sum of interior angles'],
          ['angles', 'Interior angle'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedView(id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
              selectedView === id
                ? 'border-[#1E2D5A] bg-[#1E2D5A] text-white'
                : 'border-[#E0DDD6] bg-white text-[#5F5E5A] hover:border-[#1E2D5A]'
            }`}
            aria-pressed={selectedView === id}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="relative h-[300px] w-full overflow-visible rounded-xl border border-[#E0DDD6] bg-white">
        {regularMode ? (
          <div
            className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[#9ED8C5] bg-[#E7F7F1] px-3 py-1 text-xs font-black text-[#0F6E56] shadow-sm"
            role="status"
            aria-live="polite"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#1D9E75]" />
            Regular polygon
          </div>
        ) : (
          <button
            type="button"
            onClick={() => resetPolygon(sides)}
            className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[#F2B8A2] bg-[#FFF1EB] px-3 py-1 text-xs font-black text-[#A43F1D] shadow-sm hover:bg-[#FFE4D9]"
            title="Reset to a regular polygon"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#D85A30]" />
            Irregular polygon · reset
          </button>
        )}
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

      <div className="flex gap-2">
        {summaryCards.map((card, index) => (
          <div
            key={`${card.label}-${index}`}
            className={`rounded-xl border border-[#E0DDD6] bg-white p-3 text-center ${card.compact ? 'shrink-0' : card.pills ? 'min-w-0 basis-0' : 'w-[168px] shrink-0'}`}
            style={card.pills ? { flexGrow: card.grow ?? 1 } : undefined}
          >
            <p className="text-[11px] font-black uppercase text-[#8A8780]">{card.label}</p>
            {card.pills ? (
              <div className="mt-1 flex flex-col items-center text-lg font-black leading-tight">
                {card.pills.map((parts, pillIndex) => (
                  <p
                    key={pillIndex}
                    className={`w-full whitespace-nowrap ${pillIndex > 0 ? 'mt-1.5 border-t border-dashed border-[#E0DDD6] pt-1.5' : ''}`}
                  >
                    {parts.map((part, partIndex) => (
                      <span key={partIndex} style={{ color: part.c }}>{part.t}</span>
                    ))}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-lg font-black leading-tight" style={{ color: card.color }}>{card.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
