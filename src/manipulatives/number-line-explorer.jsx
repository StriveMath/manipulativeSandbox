import { useCallback, useEffect, useRef, useState } from 'react'

const axisColor = '#1A1A2E'
const purple = '#534AB7'
const orange = '#D85A30'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundDisplay(value, digits = 2) {
  const rounded = Number(value.toFixed(digits))
  return Object.is(rounded, -0) ? 0 : rounded
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

export default function NumberLineExplorer() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)

  const [pointInput, setPointInput] = useState(3)
  const [points, setPoints] = useState([-4, 3])
  const [draggingPoint, setDraggingPoint] = useState(null)

  const canvasHeight = 180

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

  const addPoint = () => {
    const value = clamp(Math.round(Number(pointInput)), -10, 10)
    setPoints((current) => current.includes(value) ? current : [...current, value].sort((a, b) => a - b))
    setPointInput(value)
  }

  const addPointValue = (value) => {
    setPoints((current) => current.includes(value) ? current : [...current, value].sort((a, b) => a - b))
  }

  const plotValueFromX = useCallback((x) => {
    const PAD = 40
    const CELL = (canvasWidth - PAD * 2) / 20
    return clamp(Math.round((x - PAD) / CELL - 10), -10, 10)
  }, [canvasWidth])

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
    const pointer = getCanvasPoint(event)
    const hit = points.find((point) => {
      const screen = getPlotPointScreen(point)
      return Math.hypot(screen.x - pointer.x, screen.y - pointer.y) <= 22
    })

    if (hit !== undefined) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDraggingPoint({ value: hit, current: hit, startX: pointer.x, startY: pointer.y, x: pointer.x, y: pointer.y, didMove: false })
      return
    }

    // Click on the empty number line adds a point at that integer.
    const PAD = 40
    const AXIS_Y = canvasHeight * 0.66
    const inBand = pointer.y >= AXIS_Y - 78 && pointer.y <= AXIS_Y + 34 && pointer.x >= PAD && pointer.x <= canvasWidth - PAD
    if (inBand) addPointValue(plotValueFromX(pointer.x))
  }

  const handleCanvasPointerMove = (event) => {
    if (!draggingPoint) return
    const pointer = getCanvasPoint(event)
    setDraggingPoint((current) => {
      if (!current) return null
      const moved = current.didMove || Math.hypot(pointer.x - current.startX, pointer.y - current.startY) > 4
      return { ...current, current: plotValueFromX(pointer.x), x: pointer.x, y: pointer.y, didMove: moved }
    })
  }

  const handleCanvasPointerUp = (event) => {
    if (!draggingPoint) return

    const pointer = getCanvasPoint(event)
    const PAD = 40
    const AXIS_Y = canvasHeight * 0.66
    const offLine = pointer.y < AXIS_Y - 78 || pointer.y > AXIS_Y + 34 || pointer.x < PAD || pointer.x > canvasWidth - PAD
    const { value, current, didMove } = draggingPoint

    setPoints((existing) => {
      const without = existing.filter((point) => point !== value)
      // A click (no drag) or a drag off the line removes the point.
      if (!didMove || offLine) return without
      // A drag along the line repositions it to the new integer.
      return without.includes(current) ? without : [...without, current].sort((a, b) => a - b)
    })

    setDraggingPoint(null)
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const width = canvasWidth
    const height = canvasHeight
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

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
      const willRemove = offLine || !draggingPoint.didMove

      ctx.save()
      ctx.globalAlpha = offLine ? 0.45 : 0.95
      ctx.fillStyle = draggingPoint.current < 0 ? orange : purple
      ctx.beginPath()
      ctx.arc(draggingPoint.x, draggingPoint.y, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(draggingPoint.current), draggingPoint.x, draggingPoint.y)
      if (willRemove) {
        ctx.fillStyle = '#A32D2D'
        ctx.font = '800 12px Inter, system-ui, sans-serif'
        ctx.fillText('release to remove', draggingPoint.x, draggingPoint.y - 26)
      }
      ctx.restore()
    }
  }, [canvasWidth, draggingPoint, points])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto bg-[#F8F6F0] p-4 font-['Inter'] text-[#1A1A2E]">
      <div ref={wrapRef} className="h-[180px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={() => setDraggingPoint(null)}
        />
      </div>

      <section className="rounded-xl border border-[#E0DDD6] bg-white p-4">
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
          <p className="text-center text-sm font-semibold text-[#5F5E5A]">
            Click the line to add a point. Click a point to remove it, or drag it to move.
          </p>
        </div>
      </section>
    </div>
  )
}
