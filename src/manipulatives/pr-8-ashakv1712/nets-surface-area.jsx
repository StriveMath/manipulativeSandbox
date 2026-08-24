import { useEffect, useMemo, useRef, useState } from 'react'

const faceStyles = {
  top: { fill: '#CECBF6', stroke: '#534AB7', text: '#3C3489', dims: 'l x w' },
  bottom: { fill: '#CECBF6', stroke: '#534AB7', text: '#3C3489', dims: 'l x w' },
  front: { fill: '#9FE1CB', stroke: '#0F6E56', text: '#085041', dims: 'l x h' },
  back: { fill: '#9FE1CB', stroke: '#0F6E56', text: '#085041', dims: 'l x h' },
  left: { fill: '#F5C4B3', stroke: '#993C1D', text: '#712B13', dims: 'w x h' },
  right: { fill: '#F5C4B3', stroke: '#993C1D', text: '#712B13', dims: 'w x h' },
}

const dimConfig = [
  { key: 'length', label: 'Length', color: '#534AB7' },
  { key: 'width', label: 'Width', color: '#0F6E56' },
  { key: 'height', label: 'Height', color: '#993C1D' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index]
    const b = polygon[previous]
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-6) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

function rotateAroundAxis(point, axisPoint, axisDir, angle) {
  const length = Math.hypot(axisDir.x, axisDir.y, axisDir.z) || 1
  const u = { x: axisDir.x / length, y: axisDir.y / length, z: axisDir.z / length }
  const p = {
    x: point.x - axisPoint.x,
    y: point.y - axisPoint.y,
    z: point.z - axisPoint.z,
  }
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dot = u.x * p.x + u.y * p.y + u.z * p.z
  const cross = {
    x: u.y * p.z - u.z * p.y,
    y: u.z * p.x - u.x * p.z,
    z: u.x * p.y - u.y * p.x,
  }

  return {
    x: axisPoint.x + p.x * cos + cross.x * sin + u.x * dot * (1 - cos),
    y: axisPoint.y + p.y * cos + cross.y * sin + u.y * dot * (1 - cos),
    z: axisPoint.z + p.z * cos + cross.z * sin + u.z * dot * (1 - cos),
  }
}

function rotateScene(point, viewX, viewY) {
  const cosX = Math.cos(viewX)
  const sinX = Math.sin(viewX)
  const y1 = point.y * cosX - point.z * sinX
  const z1 = point.y * sinX + point.z * cosX

  const cosY = Math.cos(viewY)
  const sinY = Math.sin(viewY)
  return {
    x: point.x * cosY + z1 * sinY,
    y: y1,
    z: -point.x * sinY + z1 * cosY,
  }
}

function buildFaces({ length, width, height }, angle) {
  const l = length
  const w = width
  const h = height
  const topZ = h / 2
  const bottomZ = -h / 2
  const x0 = -l / 2
  const x1 = l / 2
  const y0 = -w / 2
  const y1 = w / 2

  const a = { x: x0, y: y0, z: topZ }
  const b = { x: x1, y: y0, z: topZ }
  const c = { x: x1, y: y1, z: topZ }
  const d = { x: x0, y: y1, z: topZ }
  const a0 = { x: x0, y: y0, z: bottomZ }
  const b0 = { x: x1, y: y0, z: bottomZ }
  const c0 = { x: x1, y: y1, z: bottomZ }
  const d0 = { x: x0, y: y1, z: bottomZ }

  const rotateFront = (point) => rotateAroundAxis(point, a, { x: 1, y: 0, z: 0 }, -angle)
  const front = [a, b, b0, a0].map(rotateFront)
  const back = [d, c, c0, d0].map((point) => rotateAroundAxis(point, d, { x: 1, y: 0, z: 0 }, angle))
  const left = [d, a, a0, d0].map((point) => rotateAroundAxis(point, a, { x: 0, y: 1, z: 0 }, angle))
  const right = [b, c, c0, b0].map((point) => rotateAroundAxis(point, b, { x: 0, y: 1, z: 0 }, -angle))

  const bottomAfterFront = [a0, b0, c0, d0].map(rotateFront)
  const hingeA = bottomAfterFront[0]
  const hingeB = bottomAfterFront[1]
  const bottomAxis = {
    x: hingeB.x - hingeA.x,
    y: hingeB.y - hingeA.y,
    z: hingeB.z - hingeA.z,
  }
  const bottom = bottomAfterFront.map((point) => rotateAroundAxis(point, hingeA, bottomAxis, -angle))

  return [
    { name: 'top', points: [a, b, c, d] },
    { name: 'front', points: front },
    { name: 'back', points: back },
    { name: 'left', points: left },
    { name: 'right', points: right },
    { name: 'bottom', points: bottom },
  ]
}

function projectFaces(faces, unfoldPercent) {
  const flatten = unfoldPercent / 100
  const viewX = (Math.PI / 6) * (1 - flatten)
  const viewY = (-25 * Math.PI / 180) * (1 - flatten)

  return faces.map((face) => {
    const projected = face.points.map((point) => {
      const rotated = rotateScene(point, viewX, viewY)
      return { x: rotated.x, y: -rotated.y, depth: rotated.z }
    })
    return {
      ...face,
      projected,
      avgDepth: projected.reduce((sum, point) => sum + point.depth, 0) / projected.length,
    }
  })
}

function boundsFor(projectedFaces) {
  const all = projectedFaces.flatMap((face) => face.projected)
  return all.reduce((box, point) => ({
    minX: Math.min(box.minX, point.x),
    maxX: Math.max(box.maxX, point.x),
    minY: Math.min(box.minY, point.y),
    maxY: Math.max(box.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
}

function faceArea(name, dims) {
  if (name === 'top' || name === 'bottom') return dims.length * dims.width
  if (name === 'front' || name === 'back') return dims.length * dims.height
  return dims.width * dims.height
}

function Stepper({ label, value, color, onChange }) {
  return (
    <div className="rounded-xl border-[1.5px] bg-white px-2 py-1" style={{ borderColor: color }}>
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color }}>{label}</p>
      <div className="mt-0.5 flex items-center justify-center gap-1.5">
        <button type="button" onClick={() => onChange(clamp(value - 1, 1, 6))} className="h-6 w-6 rounded-full text-sm font-black text-white" style={{ backgroundColor: color }}>-</button>
        <span className="w-6 text-center text-base font-black" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(clamp(value + 1, 1, 6))} className="h-6 w-6 rounded-full text-sm font-black text-white" style={{ backgroundColor: color }}>+</button>
      </div>
    </div>
  )
}

export default function NetsSurfaceArea() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const hitFacesRef = useRef([])
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 360 })
  const [dims, setDims] = useState({ length: 4, width: 3, height: 2 })
  const [unfold, setUnfold] = useState(0)
  const [activeFace, setActiveFace] = useState(null)

  const angle = (unfold / 100) * (Math.PI / 2)
  const surfaceArea = 2 * (dims.length * dims.width) + 2 * (dims.length * dims.height) + 2 * (dims.width * dims.height)
  const stateText = unfold === 0 ? 'folded' : unfold === 100 ? 'flat net' : 'unfolding'

  const faceData = useMemo(() => buildFaces(dims, angle), [angle, dims])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const update = () => setCanvasSize({
      width: Math.max(320, Math.floor(node.clientWidth)),
      height: Math.max(260, Math.floor(node.clientHeight)),
    })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    const projected = projectFaces(faceData, unfold)
    const fitSamples = [
      projectFaces(buildFaces(dims, 0), 0),
      projectFaces(buildFaces(dims, Math.PI / 2), 100),
      projected,
    ].map(boundsFor)
    const maxWidth = Math.max(...fitSamples.map((box) => box.maxX - box.minX), Math.hypot(dims.length, dims.width))
    const maxHeight = Math.max(...fitSamples.map((box) => box.maxY - box.minY), Math.hypot(dims.width, dims.height))
    const scale = Math.min(62, (canvasSize.width - 42) / maxWidth, (canvasSize.height - 42) / maxHeight)
    const currentBounds = boundsFor(projected)
    const centerX = (currentBounds.minX + currentBounds.maxX) / 2
    const centerY = (currentBounds.minY + currentBounds.maxY) / 2
    const toScreen = (point) => ({
      x: canvasSize.width / 2 + (point.x - centerX) * scale,
      y: canvasSize.height / 2 + (point.y - centerY) * scale,
    })

    const hitFaces = []

    projected
      .slice()
      .sort((a, b) => a.avgDepth - b.avgDepth)
      .forEach((face) => {
        const style = faceStyles[face.name]
        const screenPoints = face.projected.map(toScreen)
        const isHighlighted = activeFace === face.name
        hitFaces.push({ name: face.name, points: screenPoints, depth: face.avgDepth })
        ctx.save()
        ctx.beginPath()
        screenPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.closePath()
        ctx.fillStyle = style.fill
        ctx.strokeStyle = style.stroke
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        ctx.fill()
        if (isHighlighted) {
          ctx.save()
          ctx.shadowColor = 'rgba(255, 255, 255, 0.95)'
          ctx.shadowBlur = 14
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
          ctx.lineWidth = 7
          ctx.lineJoin = 'round'
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.restore()
        }
        ctx.stroke()

        const center = screenPoints.reduce((total, point) => ({
          x: total.x + point.x / screenPoints.length,
          y: total.y + point.y / screenPoints.length,
        }), { x: 0, y: 0 })
        const calc = style.dims
          .replace('l', dims.length)
          .replace('w', dims.width)
          .replace('h', dims.height)
        ctx.font = '900 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.strokeText(calc, center.x, center.y)
        ctx.fillStyle = style.text
        ctx.fillText(calc, center.x, center.y)
        ctx.restore()
      })
    hitFacesRef.current = hitFaces.sort((a, b) => b.depth - a.depth)
  }, [activeFace, canvasSize, dims, faceData, unfold])

  const updateDim = (key, value) => setDims((current) => ({ ...current, [key]: value }))

  const toggleFace = (face) => {
    setActiveFace((current) => current === face ? null : face)
  }

  const handleCanvasPointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * canvasSize.width,
      y: ((event.clientY - rect.top) / rect.height) * canvasSize.height,
    }
    const hit = hitFacesRef.current.find((face) => pointInPolygon(point, face.points))
    if (!hit) {
      setActiveFace(null)
      return
    }
    toggleFace(hit.name)
  }

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <div className="grid min-h-0 flex-1 grid-cols-[1.55fr_1fr] gap-2">
        <div className="flex min-h-0 flex-col gap-1.5">
          <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
            <canvas ref={canvasRef} className="block h-full w-full touch-none cursor-pointer" onPointerDown={handleCanvasPointerDown} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            {dimConfig.map((item) => (
              <Stepper
                key={item.key}
                label={item.label}
                value={dims[item.key]}
                color={item.color}
                onChange={(value) => updateDim(item.key, value)}
              />
            ))}
          </div>

          <div className="rounded-xl border-[1.5px] border-[#534AB7] bg-white px-3 py-1.5">
            <div className="flex items-center justify-between text-[11px] font-black uppercase text-[#534AB7]">
              <span>Box</span>
              <span>{stateText}</span>
              <span>Net</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={unfold}
              onChange={(event) => setUnfold(Number(event.target.value))}
              className="mt-1 w-full cursor-pointer"
              style={{ accentColor: '#534AB7' }}
            />
          </div>

          <p className="rounded-xl border border-[#E0DDD6] bg-white px-3 py-1.5 text-center text-xs font-semibold text-[#5F5E5A]">
            Tap a face to highlight it.
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {['top', 'bottom', 'front', 'back', 'left', 'right'].map((name) => {
              const style = faceStyles[name]
              const area = faceArea(name, dims)
              const calc = style.dims
                .replace('l', dims.length)
                .replace('w', dims.width)
                .replace('h', dims.height)
                .replaceAll(' x ', ' x ')
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleFace(name)}
                  className="h-[58px] rounded-xl border-[1.5px] bg-white px-2 py-1 text-left transition-shadow duration-150"
                  style={{
                    borderColor: style.stroke,
                    boxShadow: activeFace === name ? `inset 0 0 0 3px rgba(255,255,255,0.96), 0 0 0 2px ${style.stroke}, 0 8px 20px ${style.stroke}33` : 'none',
                  }}
                >
                  <p className="text-[10px] font-black uppercase" style={{ color: style.text }}>{name}</p>
                  <p className="text-[11px] font-black leading-tight" style={{ color: style.text }}>{calc}</p>
                  <p className="text-[11px] font-black leading-tight" style={{ color: style.text }}>= {area}</p>
                </button>
              )
            })}
          </div>

          <p className="rounded-xl border border-[#E0DDD6] bg-white px-3 py-2 text-center text-[11px] font-semibold text-[#5F5E5A]">
            Matching faces come in 3 pairs: top-bottom, front-back, left-right.
          </p>
        </div>
      </div>

      <div className="shrink-0 rounded-xl border-[1.5px] border-[#534AB7] bg-white px-3 py-1.5 text-center text-sm font-black text-[#3C3489]">
        2({dims.length}x{dims.width}) + 2({dims.length}x{dims.height}) + 2({dims.width}x{dims.height}) = {surfaceArea} sq units
      </div>
    </div>
  )
}
