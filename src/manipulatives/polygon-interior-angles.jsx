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

function drawAngles(ctx, points) {
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
    ctx.fillStyle = colors.purple
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${angle.degrees}°`, point.x + Math.cos(labelAngle) * 38, point.y + Math.sin(labelAngle) * 38)
    ctx.restore()
  })
}

function drawExterior(ctx, points) {
  points.forEach((point, index) => {
    const prev = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const angle = interiorAngle(prev, point, next)
    const exterior = 180 - angle.degrees
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
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.lineTo(point.x + ux * 42, point.y + uy * 42)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.arc(point.x, point.y, 24, nextAngle, nextAngle + sweep, sweep < 0)
    ctx.closePath()
    ctx.fillStyle = `${colors.orange}24`
    ctx.strokeStyle = colors.orange
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

    const labelAngle = nextAngle + sweep / 2
    const labelX = point.x + Math.cos(labelAngle) * 42
    const labelY = point.y + Math.sin(labelAngle) * 42
    ctx.fillStyle = colors.orange
    ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.round(exterior)}°`, labelX, labelY)
    ctx.restore()
  })
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
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const canvasHeight = 250
  const [sides, setSides] = useState(5)
  const [points, setPoints] = useState(() => regularPolygon(5, 720, canvasHeight))
  const [dragIndex, setDragIndex] = useState(null)
  const [toggles, setToggles] = useState({
    angles: true,
    triangles: false,
    exterior: false,
  })

  const triangleCount = sides - 2
  const sum = triangleCount * 180

  const canvasPoints = useMemo(() => toCanvasPoints(points, canvasWidth, canvasHeight), [canvasWidth, points])

  const resetPolygon = useCallback((nextSides) => {
    setSides(nextSides)
    setPoints(regularPolygon(nextSides, canvasWidth, canvasHeight))
    setDragIndex(null)
  }, [canvasWidth])

  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const update = () => setCanvasWidth(Math.max(320, Math.round(wrapper.clientWidth)))
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

    if (toggles.triangles) drawTriangles(ctx, canvasPoints)
    drawPolygon(ctx, canvasPoints)
    if (toggles.exterior) drawExterior(ctx, canvasPoints)
    if (toggles.angles) drawAngles(ctx, canvasPoints)
    drawHandles(ctx, canvasPoints)
  }, [canvasPoints, canvasWidth, toggles])

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
    if (toggles.exterior) return 'Exterior angles of any convex polygon always sum to exactly 360° — one full rotation.'
    if (toggles.triangles && toggles.angles) return `No matter how you drag, ${triangleCount} triangles × 180° always equals ${sum}°.`
    if (toggles.triangles) return `Diagonal lines split the polygon into ${triangleCount} triangles from one vertex. Each has 180°, so the total is ${triangleCount} × 180° = ${sum}°.`
    return `Drag any vertex — the angles change but the total stays ${sum}°. Turn on Show triangles to see why.`
  })()

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto bg-[#F8F6F0] p-3 font-['Inter'] text-[#1A1A2E]">
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

      <div ref={wrapRef} className="h-[250px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
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
        <div className="rounded-xl border border-[#E0DDD6] bg-white p-3">
          <p className="text-[11px] font-black uppercase text-[#8A8780]">
            Sides (<span className="text-[#0F6E56]">N</span>)
          </p>
          <p className="text-xl font-black text-[#0F6E56]">{sides}</p>
        </div>
        <div className="rounded-xl border border-[#E0DDD6] bg-white p-3">
          <p className="text-[11px] font-black uppercase text-[#8A8780]">Triangles</p>
          <p className="text-xl font-black text-[#1D9E75]">{triangleCount}</p>
        </div>
        <div className="rounded-xl border border-[#E0DDD6] bg-white p-3">
          <p className="text-[11px] font-black uppercase text-[#8A8780]">Formula</p>
          <p className="text-[13px] font-black text-[#5F5E5A]">
            (<span className="text-[#0F6E56]">N</span>−2)×180°
          </p>
          <p className="mt-1 text-[13px] font-black text-[#1A1A2E]">({sides}−2)×180° = {sum}°</p>
        </div>
        <div className="rounded-xl border border-[#E0DDD6] bg-white p-3">
          <p className="text-[11px] font-black uppercase text-[#8A8780]">Angle sum</p>
          <p className="text-xl font-black text-[#534AB7]">{sum}°</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['angles', 'Show angles', colors.purple],
          ['triangles', 'Show triangles', colors.teal],
          ['exterior', 'Exterior angles', colors.orange],
        ].map(([id, label, color]) => (
          <button
            key={id}
            type="button"
            onClick={() => setToggles((current) => ({ ...current, [id]: !current[id] }))}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${toggles[id] ? 'bg-white' : 'bg-white text-[#5F5E5A]'}`}
            style={{ borderColor: toggles[id] ? color : colors.border, color: toggles[id] ? color : undefined }}
          >
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: color }} />
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border-l-4 border-[#A8A1FF] bg-[#EEEDFE] px-4 py-3 text-sm font-semibold leading-relaxed text-[#343070]">
        {insight}
      </section>
    </div>
  )
}
