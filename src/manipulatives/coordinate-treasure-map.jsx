import { useCallback, useEffect, useRef, useState } from 'react'

const minCoord = -10
const maxCoord = 10

const landmarks = [
  { name: 'Skull Rock', x: -4, y: 6, kind: 'skull' },
  { name: 'Palm Beach', x: 5, y: 7, kind: 'palm' },
  { name: 'Sunken Ship', x: -7, y: -5, kind: 'ship' },
  { name: 'Lost Cave', x: -3, y: -8, kind: 'cave' },
  { name: 'Parrot Perch', x: 4, y: -3, kind: 'perch' },
  { name: 'Gold Lagoon', x: -6, y: 3, kind: 'lagoon' },
  { name: 'Volcano Peak', x: 7, y: 4, kind: 'volcano' },
  { name: 'Treasure Chest', x: 3, y: -7, kind: 'chest' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseCoordinateInput(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return clamp(Math.round(parsed), minCoord, maxCoord)
}

function getQuadrant(point) {
  if (!point) return '-'
  if (point.x === 0 && point.y === 0) return 'Origin'
  if (point.x === 0) return 'y-axis'
  if (point.y === 0) return 'x-axis'
  if (point.x > 0 && point.y > 0) return 'I'
  if (point.x < 0 && point.y > 0) return 'II'
  if (point.x < 0 && point.y < 0) return 'III'
  return 'IV'
}

function getQuadrantDescription(point) {
  const quadrant = getQuadrant(point)
  const descriptions = {
    I: 'I - top right',
    II: 'II - top left',
    III: 'III - bottom left',
    IV: 'IV - bottom right',
    Origin: 'Origin',
    'x-axis': 'x-axis',
    'y-axis': 'y-axis',
  }
  return descriptions[quadrant] ?? quadrant
}

function drawIcon(ctx, kind, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  const s = Math.min(size, 20)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#1A1A2E'

  if (kind === 'skull') {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1A1A2E'
    ctx.beginPath()
    ctx.arc(-s * 0.12, -2, 1.8, 0, Math.PI * 2)
    ctx.arc(s * 0.12, -2, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, 1)
    ctx.lineTo(-2, 5)
    ctx.lineTo(2, 5)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'palm') {
    ctx.strokeStyle = '#7a5b2e'
    ctx.beginPath()
    ctx.moveTo(0, s * 0.42)
    ctx.lineTo(2, -s * 0.22)
    ctx.stroke()
    ctx.fillStyle = '#3B6D11'
    ;[
      [-8, -7, -0.65],
      [2, -10, 0],
      [10, -5, 0.65],
    ].forEach(([leafX, leafY, rotation]) => {
      ctx.save()
      ctx.translate(2, -s * 0.22)
      ctx.rotate(rotation)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(leafX * 0.5, leafY * 0.7, leafX, leafY)
      ctx.quadraticCurveTo(leafX * 0.2, leafY * 0.45, 0, 0)
      ctx.fill()
      ctx.restore()
    })
  } else if (kind === 'ship') {
    ctx.strokeStyle = '#4b5563'
    ctx.fillStyle = '#4b5563'
    ctx.beginPath()
    ctx.arc(0, 2, s * 0.38, 0, Math.PI)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-2, 2)
    ctx.lineTo(-4, -s * 0.35)
    ctx.moveTo(-4, -s * 0.35)
    ctx.lineTo(2, -s * 0.18)
    ctx.stroke()
  } else if (kind === 'cave') {
    ctx.fillStyle = '#4b5563'
    ctx.beginPath()
    ctx.arc(0, s * 0.25, s * 0.4, Math.PI, Math.PI * 2)
    ctx.lineTo(s * 0.4, s * 0.38)
    ctx.lineTo(-s * 0.4, s * 0.38)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (kind === 'perch') {
    ctx.strokeStyle = '#D85A30'
    ctx.fillStyle = '#D85A30'
    ctx.beginPath()
    ctx.moveTo(-s * 0.35, s * 0.25)
    ctx.lineTo(0, -s * 0.35)
    ctx.lineTo(s * 0.35, s * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.08, 0)
    ctx.lineTo(-s * 0.42, -s * 0.18)
    ctx.moveTo(s * 0.08, 0)
    ctx.lineTo(s * 0.42, -s * 0.18)
    ctx.stroke()
  } else if (kind === 'lagoon') {
    ctx.fillStyle = '#378ADD'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (kind === 'volcano') {
    ctx.fillStyle = '#D85A30'
    ctx.beginPath()
    ctx.moveTo(-s * 0.42, s * 0.36)
    ctx.lineTo(0, -s * 0.38)
    ctx.lineTo(s * 0.42, s * 0.36)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(-3, -s * 0.18)
    ctx.lineTo(0, -s * 0.38)
    ctx.lineTo(3, -s * 0.18)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = '#8b5a2b'
    ctx.fillRect(-s * 0.36, -s * 0.16, s * 0.72, s * 0.42)
    ctx.strokeRect(-s * 0.36, -s * 0.16, s * 0.72, s * 0.42)
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawHoverLabel(ctx, text, x, y) {
  ctx.save()
  ctx.font = '14px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const width = ctx.measureText(text).width + 18
  const labelX = clamp(x, width / 2 + 8, ctx.canvas.width - width / 2 - 8)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#E0DDD6'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(labelX - width / 2, y + 13, width, 24, 12)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1A1A2E'
  ctx.fillText(text, labelX, y + 25)
  ctx.restore()
}

export default function CoordinateTreasureMap() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 560 })
  const [selected, setSelected] = useState({ x: 3, y: 2 })
  const [manualX, setManualX] = useState('3')
  const [manualY, setManualY] = useState('2')
  const [hoveredLandmark, setHoveredLandmark] = useState(null)
  const [hoverPoint, setHoverPoint] = useState(null)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined

    const updateSize = () => {
      const width = Math.max(320, Math.floor(node.clientWidth))
      setCanvasSize({ width, height: width })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const getDrawConstants = useCallback(() => {
    const pad = Math.max(26, Math.min(36, canvasSize.width * 0.055))
    const cell = Math.min((canvasSize.width - pad * 2) / 20, (canvasSize.height - pad * 2) / 20)
    const originX = canvasSize.width / 2
    const originY = canvasSize.height / 2
    return { pad, cell, originX, originY }
  }, [canvasSize])

  const toScreen = useCallback((point) => {
    const { cell, originX, originY } = getDrawConstants()
    return {
      x: originX + point.x * cell,
      y: originY - point.y * cell,
    }
  }, [getDrawConstants])

  const fromScreen = useCallback((x, y) => {
    const { cell, originX, originY } = getDrawConstants()
    return {
      x: clamp(Math.round((x - originX) / cell), minCoord, maxCoord),
      y: clamp(Math.round((originY - y) / cell), minCoord, maxCoord),
    }
  }, [getDrawConstants])

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

    const { cell, originX, originY } = getDrawConstants()
    const sx = (x) => originX + x * cell
    const sy = (y) => originY - y * cell

    ctx.fillStyle = '#C8E6F5'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.fillStyle = '#B5CC7A'
    ctx.strokeStyle = '#8FAA4A'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const island = [
      [-9.8, 4.8],
      [-7.6, 8.6],
      [-2.5, 9.6],
      [1.2, 9.0],
      [5.2, 7.4],
      [8.0, 6.4],
      [9.5, 2.5],
      [9.0, -1.4],
      [9.7, -5.0],
      [5.7, -7.8],
      [1.4, -9.6],
      [-2.3, -8.7],
      [-6.6, -9.3],
      [-9.2, -6.2],
      [-9.8, -1.0],
    ]
    island.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(sx(x), sy(y))
      else ctx.lineTo(sx(x), sy(y))
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = 'rgba(26, 26, 46, 0.15)'
    ctx.lineWidth = 1
    for (let value = minCoord; value <= maxCoord; value += 1) {
      ctx.beginPath()
      ctx.moveTo(sx(value), sy(minCoord))
      ctx.lineTo(sx(value), sy(maxCoord))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(sx(minCoord), sy(value))
      ctx.lineTo(sx(maxCoord), sy(value))
      ctx.stroke()
    }

    ctx.strokeStyle = '#1A1A2E'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sx(minCoord), originY)
    ctx.lineTo(sx(maxCoord), originY)
    ctx.moveTo(originX, sy(minCoord))
    ctx.lineTo(originX, sy(maxCoord))
    ctx.stroke()

    ctx.fillStyle = '#5F5E5A'
    ctx.font = '20px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let value = minCoord; value <= maxCoord; value += 2) {
      if (value !== 0) {
        ctx.fillText(String(value), sx(value), originY + 19)
        ctx.fillText(String(value), originX - 20, sy(value))
      }
    }
    ctx.font = '22px Inter, sans-serif'
    ctx.fillText('x', sx(maxCoord) - 8, originY - 16)
    ctx.fillText('y', originX + 16, sy(maxCoord) + 17)

    landmarks.forEach((landmark) => {
      const point = toScreen(landmark)
      drawIcon(ctx, landmark.kind, point.x, point.y, 24)
      if (hoveredLandmark === landmark.name) {
        drawHoverLabel(ctx, landmark.name, point.x, point.y)
      }
    })

    if (hoverPoint) {
      const point = toScreen(hoverPoint)
      ctx.strokeStyle = '#1A1A2E'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(point.x - 13, point.y)
      ctx.lineTo(point.x + 13, point.y)
      ctx.moveTo(point.x, point.y - 13)
      ctx.lineTo(point.x, point.y + 13)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (selected) {
      const point = toScreen(selected)
      ctx.fillStyle = '#7F77DD'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const labelParts = [
        { text: '(', color: '#ffffff' },
        { text: String(selected.x), color: '#D85A30' },
        { text: ', ', color: '#cbd5e1' },
        { text: String(selected.y), color: '#7F77DD' },
        { text: ')', color: '#ffffff' },
      ]
      ctx.font = '18px Fredoka One, Inter, sans-serif'
      const textWidth = labelParts.reduce((total, part) => total + ctx.measureText(part.text).width, 0)
      const labelWidth = textWidth + 24
      const labelX = clamp(point.x, labelWidth / 2 + 8, canvasSize.width - labelWidth / 2 - 8)
      const labelY = clamp(point.y - 42, 18, canvasSize.height - 22)
      ctx.fillStyle = '#1A1A2E'
      ctx.beginPath()
      ctx.roundRect(labelX - labelWidth / 2, labelY - 18, labelWidth, 36, 18)
      ctx.fill()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      let textX = labelX - textWidth / 2
      labelParts.forEach((part) => {
        const partWidth = ctx.measureText(part.text).width
        ctx.fillStyle = part.color
        ctx.fillText(part.text, textX + partWidth / 2, labelY)
        textX += partWidth
      })
    }
  }, [canvasSize, getDrawConstants, hoverPoint, hoveredLandmark, selected, toScreen])

  const plotManual = useCallback(() => {
    const point = {
      x: parseCoordinateInput(manualX),
      y: parseCoordinateInput(manualY),
    }
    setManualX(String(point.x))
    setManualY(String(point.y))
    setSelected(point)
  }, [manualX, manualY])

  const commitAxisValue = useCallback((axis) => {
    if (axis === 'x') {
      const value = parseCoordinateInput(manualX)
      setManualX(String(value))
      return value
    }

    const value = parseCoordinateInput(manualY)
    setManualY(String(value))
    return value
  }, [manualX, manualY])

  const handleManualChange = (axis, value) => {
    if (!/^-?\d*$/.test(value)) return
    if (axis === 'x') setManualX(value)
    else setManualY(value)
  }

  const handleAxisKeyDown = (axis, event) => {
    if (event.key === 'Enter') {
      plotManual()
      event.currentTarget.blur()
      return
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    const currentValue = commitAxisValue(axis)
    const nextValue = clamp(currentValue + (event.key === 'ArrowUp' ? 1 : -1), minCoord, maxCoord)
    if (axis === 'x') setManualX(String(nextValue))
    else setManualY(String(nextValue))
  }

  const handleCanvasClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = canvasSize.width / rect.width
    const scaleY = canvasSize.height / rect.height
    const point = fromScreen((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY)
    setSelected(point)
    setManualX(String(point.x))
    setManualY(String(point.y))
  }

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = canvasSize.width / rect.width
    const scaleY = canvasSize.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    setHoverPoint(fromScreen(x, y))
    const match = landmarks.find((landmark) => {
      const point = toScreen(landmark)
      return Math.hypot(point.x - x, point.y - y) < 18
    })
    setHoveredLandmark(match?.name ?? null)
  }

  return (
    <div className="min-h-full overflow-auto bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <div className="mx-auto max-w-[900px]">
        <main className="grid grid-cols-[minmax(360px,560px)_minmax(230px,1fr)] justify-center gap-2 max-[760px]:grid-cols-1">
          <section ref={wrapRef} className="overflow-hidden rounded-xl bg-[#C8E6F5]">
            <canvas
              ref={canvasRef}
              className="block w-full cursor-none touch-none"
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => {
                setHoveredLandmark(null)
                setHoverPoint(null)
              }}
            />
          </section>

          <aside className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E0DDD6] bg-white p-2">
            <div className="rounded-xl border border-[#E0DDD6] bg-white p-3">
              <p className="text-[13px] text-[#5F5E5A]">Click the map or enter a coordinate pair.</p>
              <div className="mt-3 flex items-end justify-center gap-2 rounded-xl bg-[#F8F6F0] px-3 py-4">
                <span className="pb-2 font-['Fredoka_One'] text-4xl text-[#1A1A2E]">(</span>
                <label className="min-w-0 flex-1 text-center text-lg text-[#5F5E5A]">
                  x
                  <input
                    value={manualX}
                    onChange={(event) => handleManualChange('x', event.target.value)}
                    onBlur={() => commitAxisValue('x')}
                    onKeyDown={(event) => handleAxisKeyDown('x', event)}
                    className="mt-1 w-full rounded-lg border border-[#E0DDD6] bg-white px-2 py-3 text-center font-['Fredoka_One'] text-2xl text-[#D85A30]"
                    type="text"
                    inputMode="numeric"
                  />
                </label>
                <span className="pb-2 font-['Fredoka_One'] text-3xl text-slate-400">,</span>
                <label className="min-w-0 flex-1 text-center text-lg text-[#5F5E5A]">
                  y
                  <input
                    value={manualY}
                    onChange={(event) => handleManualChange('y', event.target.value)}
                    onBlur={() => commitAxisValue('y')}
                    onKeyDown={(event) => handleAxisKeyDown('y', event)}
                    className="mt-1 w-full rounded-lg border border-[#E0DDD6] bg-white px-2 py-3 text-center font-['Fredoka_One'] text-2xl text-[#7F77DD]"
                    type="text"
                    inputMode="numeric"
                  />
                </label>
                <span className="pb-2 font-['Fredoka_One'] text-4xl text-[#1A1A2E]">)</span>
              </div>
              <button
                type="button"
                onClick={plotManual}
                className="mt-3 w-full rounded-full bg-[#7F77DD] px-4 py-3 text-lg font-black text-white"
              >
                Plot
              </button>
            </div>

            <div className="rounded-xl border border-[#E0DDD6] bg-white px-4 py-3">
              <p className="text-[12px] text-[#5F5E5A]">Quadrant</p>
              <p className="font-['Fredoka_One'] text-2xl">{getQuadrantDescription(selected)}</p>
            </div>

          </aside>
        </main>
      </div>
    </div>
  )
}
