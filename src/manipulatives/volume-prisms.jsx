import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  lengthFill: '#FBEEDD',
  lengthBorder: '#D99A4E',
  lengthAccent: '#B5651D',
  lengthText: '#8A4A12',
  widthFill: '#E9F2E4',
  widthBorder: '#7AAE5C',
  widthAccent: '#5E8C3E',
  widthText: '#456B2E',
  heightFill: '#E6EEF6',
  heightBorder: '#5B84B8',
  heightAccent: '#3E6BA8',
  heightText: '#33547E',
  volume: '#7B3F9E',
  cubeTop: '#E8A94E',
  cubeLeft: '#C97B2E',
  cubeRight: '#A85F1E',
  cubeEdge: '#6D3B12',
  border: '#E0DDD6',
}

const canvasHeight = 300

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeOutBack(t) {
  const c1 = 1.15
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function StepperCard({ label, value, min, max, fill, border, accent, text, onChange }) {
  const change = (delta) => onChange(clamp(value + delta, min, max))
  return (
    <div className="rounded-[14px] border-[1.5px] px-3 py-2" style={{ borderColor: border, backgroundColor: fill }}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide" style={{ color: text }}>{label}</p>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => change(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-white" style={{ backgroundColor: accent }}>−</button>
        <span className="min-w-8 text-center font-mono text-3xl font-black" style={{ color: text }}>{value}</span>
        <button type="button" onClick={() => change(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-white" style={{ backgroundColor: accent }}>+</button>
      </div>
    </div>
  )
}

function projectPoint(x, y, z, originX, originY, unit) {
  const xVec = { x: unit * 0.86, y: unit * 0.48 }
  const yVec = { x: -unit * 0.86, y: unit * 0.48 }
  const zVec = { x: 0, y: -unit }
  return {
    x: originX + x * xVec.x + y * yVec.x + z * zVec.x,
    y: originY + x * xVec.y + y * yVec.y + z * zVec.y,
  }
}

function cubePoints(x, y, z, originX, originY, unit) {
  const p = (px, py, pz) => projectPoint(px, py, pz, originX, originY, unit)
  return {
    top: [p(x, y, z + 1), p(x + 1, y, z + 1), p(x + 1, y + 1, z + 1), p(x, y + 1, z + 1)],
    left: [p(x, y + 1, z), p(x, y + 1, z + 1), p(x + 1, y + 1, z + 1), p(x + 1, y + 1, z)],
    right: [p(x + 1, y, z), p(x + 1, y, z + 1), p(x + 1, y + 1, z + 1), p(x + 1, y + 1, z)],
  }
}

function drawFace(ctx, points, fill, alpha = 1, dashed = false) {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = fill
  ctx.strokeStyle = colors.cubeEdge
  ctx.lineWidth = 1
  if (dashed) ctx.setLineDash([4, 5])
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.closePath()
  if (!dashed) ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function getUnit(width, length, prismWidth, height) {
  const xSpan = (length + prismWidth) * 0.86
  const ySpan = (length + prismWidth) * 0.48 + height
  return Math.min(34, (width - 70) / Math.max(1, xSpan), (canvasHeight - 58) / Math.max(1, ySpan))
}

function getOrigin(width, length, prismWidth, height, unit) {
  const corners = [
    [0, 0, 0],
    [length, 0, 0],
    [0, prismWidth, 0],
    [length, prismWidth, 0],
    [0, 0, height],
    [length, 0, height],
    [0, prismWidth, height],
    [length, prismWidth, height],
  ].map(([x, y, z]) => projectPoint(x, y, z, 0, 0, unit))
  const minX = Math.min(...corners.map((point) => point.x))
  const maxX = Math.max(...corners.map((point) => point.x))
  const minY = Math.min(...corners.map((point) => point.y))
  const maxY = Math.max(...corners.map((point) => point.y))
  return {
    x: width / 2 - (minX + maxX) / 2,
    y: canvasHeight / 2 + 12 - (minY + maxY) / 2,
  }
}

function drawCube(ctx, cube, origin, unit, alpha = 1, dashed = false) {
  const points = cubePoints(cube.x, cube.y, cube.z, origin.x, origin.y, unit)
  drawFace(ctx, points.left, colors.cubeLeft, alpha, dashed)
  drawFace(ctx, points.right, colors.cubeRight, alpha, dashed)
  drawFace(ctx, points.top, colors.cubeTop, alpha, dashed)
}

function formatCount(layer, baseArea, volume) {
  if (layer <= 0) return '0 layers × 0 cubes = 0 cubes so far'
  if (layer >= volume.layers) return `${volume.layers} layers × ${baseArea} cubes = ${volume.total} cubes total`
  return `${layer} layers × ${baseArea} cubes = ${layer * baseArea} cubes so far`
}

export default function VolumePrisms() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [length, setLength] = useState(4)
  const [width, setWidth] = useState(3)
  const [height, setHeight] = useState(3)
  const [filledLayers, setFilledLayers] = useState(0)
  const [currentLayer, setCurrentLayer] = useState(null)
  const [layerProgress, setLayerProgress] = useState(0)
  const [playing, setPlaying] = useState(false)

  const baseArea = length * width
  const totalVolume = baseArea * height
  const isComplete = filledLayers >= height

  const cubes = useMemo(() => {
    const result = []
    for (let z = 0; z < height; z += 1) {
      for (let y = width - 1; y >= 0; y -= 1) {
        for (let x = 0; x < length; x += 1) {
          result.push({ x, y, z, depth: x + y + z * 2 })
        }
      }
    }
    return result.sort((a, b) => a.depth - b.depth)
  }, [height, length, width])

  const stopAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setPlaying(false)
    setCurrentLayer(null)
    setLayerProgress(0)
  }, [])

  const resetFill = useCallback(() => {
    stopAnimation()
    setFilledLayers(0)
  }, [stopAnimation])

  const updateLength = (next) => {
    resetFill()
    setLength(next)
  }

  const updateWidth = (next) => {
    resetFill()
    setWidth(next)
  }

  const updateHeight = (next) => {
    resetFill()
    setHeight(next)
  }

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
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const unit = getUnit(canvasWidth, length, width, height)
    const origin = getOrigin(canvasWidth, length, width, height, unit)
    const activeLayer = currentLayer ?? filledLayers
    const pop = currentLayer === null ? 1 : easeOutBack(layerProgress)

    cubes.forEach((cube) => {
      if (cube.z < filledLayers) {
        drawCube(ctx, cube, origin, unit, 1)
      } else if (cube.z === activeLayer && currentLayer !== null) {
        const center = projectPoint(cube.x + 0.5, cube.y + 0.5, cube.z + 0.5, origin.x, origin.y, unit)
        ctx.save()
        ctx.translate(center.x, center.y)
        ctx.scale(0.82 + Math.min(1, pop) * 0.18, 0.82 + Math.min(1, pop) * 0.18)
        ctx.translate(-center.x, -center.y)
        drawCube(ctx, cube, origin, unit, Math.min(1, layerProgress + 0.15))
        ctx.restore()
      } else {
        drawCube(ctx, cube, origin, unit, 0.18, true)
      }
    })

    if (filledLayers === 0 && currentLayer === null) {
      ctx.fillStyle = '#6B7280'
      ctx.font = '700 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('press Fill layer by layer to count the cubes', canvasWidth / 2, 28)
    }
  }, [canvasWidth, cubes, currentLayer, filledLayers, height, layerProgress, length, width])

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

  const fillLayers = () => {
    stopAnimation()
    setFilledLayers(0)
    setPlaying(true)
    let layer = 0
    let startedAt = performance.now()
    const duration = 350
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setCurrentLayer(layer)
      setLayerProgress(progress)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      setFilledLayers(layer + 1)
      if (layer + 1 >= height) {
        setCurrentLayer(null)
        setLayerProgress(0)
        setPlaying(false)
        frameRef.current = null
        return
      }
      layer += 1
      startedAt = performance.now()
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <section className="grid shrink-0 grid-cols-3 gap-2">
        <StepperCard label="Length" value={length} min={1} max={5} fill={colors.lengthFill} border={colors.lengthBorder} accent={colors.lengthAccent} text={colors.lengthText} onChange={updateLength} />
        <StepperCard label="Width" value={width} min={1} max={5} fill={colors.widthFill} border={colors.widthBorder} accent={colors.widthAccent} text={colors.widthText} onChange={updateWidth} />
        <StepperCard label="Height" value={height} min={1} max={6} fill={colors.heightFill} border={colors.heightBorder} accent={colors.heightAccent} text={colors.heightText} onChange={updateHeight} />
      </section>

      <section ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} className="block h-[300px] w-full" />
        <div
          className="absolute left-3 top-3 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-black shadow-sm"
          style={{ borderColor: isComplete ? colors.volume : colors.border, color: isComplete ? colors.volume : '#5F5E5A' }}
        >
          {formatCount(currentLayer === null ? filledLayers : currentLayer + 1, baseArea, { layers: height, total: totalVolume })}
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-[1fr_auto_auto] items-center gap-2">
        <div className="rounded-[14px] border border-[#E0DDD6] bg-white px-3 py-2 font-mono text-sm font-black">
          <p>
            <span style={{ color: colors.volume }}>V</span> = <span style={{ color: colors.lengthText }}>{length}</span> × <span style={{ color: colors.widthText }}>{width}</span> × <span style={{ color: colors.heightText }}>{height}</span> = <span style={{ color: colors.volume }}>{totalVolume}</span>
          </p>
          <p className="text-xs text-[#5F5E5A]">
            base area (<span style={{ color: colors.lengthText }}>{length}</span>×<span style={{ color: colors.widthText }}>{width}</span> = {baseArea}) × height (<span style={{ color: colors.heightText }}>{height}</span>)
          </p>
        </div>
        <button type="button" onClick={fillLayers} disabled={playing} className="h-12 rounded-full px-5 text-sm font-black text-white disabled:opacity-60" style={{ backgroundColor: colors.lengthAccent }}>
          Fill layer by layer
        </button>
        <button type="button" onClick={resetFill} className="h-12 rounded-full border border-[#E0DDD6] bg-white px-4 text-sm font-black text-[#5F5E5A]">
          Reset
        </button>
      </section>

      <p className="shrink-0 rounded-[14px] border border-[#E0DDD6] bg-white px-3 py-2 text-center text-sm font-bold text-[#5F5E5A]">
        Each layer is the base — <span style={{ color: colors.lengthText }}>{length}</span> × <span style={{ color: colors.widthText }}>{width}</span> = <span style={{ color: colors.volume }}>{baseArea}</span> cubes. Stack <span style={{ color: colors.heightText }}>{height}</span> identical layers to get <span style={{ color: colors.volume }}>{totalVolume}</span> cubes.
      </p>
    </div>
  )
}
