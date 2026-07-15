import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  whisker: '#185FA5',
  box: '#534AB7',
  median: '#D85A30',
  iqr: '#0F6E56',
  outlier: '#DC2626',
  dot: '#AFA9EC',
  border: '#E0DDD6',
}

const canvasHeight = 230

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makePoint(value) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    value,
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '-'
  const rounded = Math.abs(value - Math.round(value)) < 0.05 ? Math.round(value) : Number(value.toFixed(1))
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function quantile(sorted, p) {
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function getStats(points) {
  const values = points.map((point) => point.value).sort((a, b) => a - b)
  if (!values.length) return null

  const min = values[0]
  const max = values[values.length - 1]
  const q1 = quantile(values, 0.25)
  const median = quantile(values, 0.5)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1
  const lowFence = q1 - 1.5 * iqr
  const highFence = q3 + 1.5 * iqr
  const outlierValues = values.filter((value) => value < lowFence || value > highFence)
  const nonOutliers = values.filter((value) => value >= lowFence && value <= highFence)
  const whiskerMin = nonOutliers[0] ?? min
  const whiskerMax = nonOutliers[nonOutliers.length - 1] ?? max

  return {
    values,
    min,
    max,
    q1,
    median,
    q3,
    iqr,
    lowFence,
    highFence,
    outlierValues,
    whiskerMin,
    whiskerMax,
  }
}

function getScale(values, width) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const padValue = Math.max(1, span * 0.1)
  const domainMin = Math.floor(min - padValue)
  const domainMax = Math.ceil(max + padValue)
  const left = 42
  const right = width - 34
  const toX = (value) => left + ((value - domainMin) / (domainMax - domainMin || 1)) * (right - left)
  const toValue = (x) => domainMin + ((x - left) / (right - left || 1)) * (domainMax - domainMin)
  return { domainMin, domainMax, left, right, toX, toValue }
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function getDotPositions(points, stats, scale) {
  const stackCounts = new Map()
  const dotY = 166
  return points
    .map((point, index) => {
      const rounded = Math.round(point.value)
      const stack = stackCounts.get(rounded) ?? 0
      stackCounts.set(rounded, stack + 1)
      const isOutlier = stats ? point.value < stats.lowFence || point.value > stats.highFence : false
      return {
        ...point,
        index,
        isOutlier,
        x: scale.toX(point.value),
        y: dotY + stack * 14,
      }
    })
}

function tickValues(min, max) {
  const count = 6
  const span = max - min || 1
  const rawStep = span / (count - 1)
  const power = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / power
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = nice * power
  const start = Math.ceil(min / step) * step
  const ticks = []
  for (let value = start; value <= max + step * 0.1; value += step) {
    ticks.push(Number(value.toFixed(1)))
    if (ticks.length > 7) break
  }
  return ticks.length ? ticks : [min, max]
}

export default function BoxPlotBuilder() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dotHitsRef = useRef([])
  const scaleRef = useRef(null)
  const dragRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [points, setPoints] = useState([52, 55, 57, 60, 62, 64, 68, 72, 84].map(makePoint))
  const [inputValue, setInputValue] = useState('66')
  const [showDots, setShowDots] = useState(true)
  const [showQuarters, setShowQuarters] = useState(true)
  const [dragIndex, setDragIndex] = useState(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const stats = useMemo(() => getStats(points), [points])
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

    if (!points.length) {
      ctx.fillStyle = '#5F5E5A'
      ctx.font = '700 18px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Add at least 4 values to build a box plot.', canvasWidth / 2, canvasHeight / 2)
      dotHitsRef.current = []
      scaleRef.current = null
      return
    }

    const scale = getScale(stats.values, canvasWidth)
    scaleRef.current = scale
    const axisY = 202

    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(scale.left, axisY)
    ctx.lineTo(scale.right, axisY)
    ctx.stroke()

    ctx.fillStyle = '#5F5E5A'
    ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    tickValues(scale.domainMin, scale.domainMax).forEach((tick) => {
      const x = scale.toX(tick)
      ctx.strokeStyle = '#E5E7EB'
      ctx.beginPath()
      ctx.moveTo(x, 30)
      ctx.lineTo(x, axisY + 5)
      ctx.stroke()
      ctx.strokeStyle = '#94A3B8'
      ctx.beginPath()
      ctx.moveTo(x, axisY - 6)
      ctx.lineTo(x, axisY + 6)
      ctx.stroke()
      ctx.fillText(formatNumber(tick), x, axisY + 22)
    })

    const dotPositions = getDotPositions(points, stats, scale)

    if (points.length < 4) {
      ctx.fillStyle = '#5F5E5A'
      ctx.font = '800 16px Inter, system-ui, sans-serif'
      ctx.fillText('Add at least 4 values to draw the box and whiskers.', canvasWidth / 2, 78)
    } else {
      const boxY = 74
      const boxH = 42
      const midY = boxY + boxH / 2
      const xMin = scale.toX(stats.whiskerMin)
      const xQ1 = scale.toX(stats.q1)
      const xMed = scale.toX(stats.median)
      const xQ3 = scale.toX(stats.q3)
      const xMax = scale.toX(stats.whiskerMax)

      ctx.strokeStyle = colors.whisker
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(xMin, midY)
      ctx.lineTo(xQ1, midY)
      ctx.moveTo(xQ3, midY)
      ctx.lineTo(xMax, midY)
      ctx.moveTo(xMin, boxY + 5)
      ctx.lineTo(xMin, boxY + boxH - 5)
      ctx.moveTo(xMax, boxY + 5)
      ctx.lineTo(xMax, boxY + boxH - 5)
      ctx.stroke()

      ctx.fillStyle = 'rgba(83, 74, 183, 0.13)'
      ctx.strokeStyle = colors.box
      ctx.lineWidth = 2.5
      drawRoundRect(ctx, xQ1, boxY, Math.max(2, xQ3 - xQ1), boxH, 8)
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = colors.median
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(xMed, boxY - 4)
      ctx.lineTo(xMed, boxY + boxH + 4)
      ctx.stroke()

      if (showQuarters) {
        const regions = [
          [xMin, xQ1],
          [xQ1, xMed],
          [xMed, xQ3],
          [xQ3, xMax],
        ]
        ctx.font = '900 12px Inter, system-ui, sans-serif'
        ctx.fillStyle = colors.iqr
        regions.forEach(([from, to]) => {
          if (Math.abs(to - from) > 24) ctx.fillText('25%', (from + to) / 2, boxY + boxH + 20)
        })
      }

      const marks = [
        ['Min', stats.whiskerMin, colors.whisker],
        ['Q1', stats.q1, colors.box],
        ['Median', stats.median, colors.median],
        ['Q3', stats.q3, colors.box],
        ['Max', stats.whiskerMax, colors.whisker],
      ]
      ctx.font = '900 11px Inter, system-ui, sans-serif'
      marks.forEach(([label, value, color]) => {
        const x = scale.toX(value)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x, boxY - 3)
        ctx.lineTo(x, boxY - 14)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.fillText(`${label} ${formatNumber(value)}`, x, boxY - 20)
      })
    }

    dotHitsRef.current = []
    if (showDots) {
      dotPositions.forEach((dot) => {
        const isActiveDot = dragIndex === dot.index || hoverIndex === dot.index
        const radius = isActiveDot ? 8.5 : 7.5
        ctx.save()
        ctx.shadowColor = dot.isOutlier ? 'rgba(220, 38, 38, 0.3)' : 'rgba(83, 74, 183, 0.22)'
        ctx.shadowBlur = dot.isOutlier ? 10 : 5
        ctx.fillStyle = dot.isOutlier ? colors.outlier : colors.dot
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
        dotHitsRef.current.push({ index: dot.index, value: dot.value, isOutlier: dot.isOutlier, x: dot.x, y: dot.y, radius: radius + 7 })
      })

      const activeDot = dotHitsRef.current.find((dot) => dot.index === (dragIndex ?? hoverIndex))
      if (activeDot) {
        const label = formatNumber(activeDot.value)
        ctx.save()
        ctx.font = '900 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
        const width = Math.max(34, ctx.measureText(label).width + 18)
        const x = clamp(activeDot.x - width / 2, 8, canvasWidth - width - 8)
        const y = Math.max(8, activeDot.y - 38)
        ctx.fillStyle = activeDot.isOutlier ? colors.outlier : colors.ink
        ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
        ctx.shadowBlur = 10
        drawRoundRect(ctx, x, y, width, 25, 12)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x + width / 2, y + 13)
        ctx.restore()
      }
    }
  }, [canvasWidth, dragIndex, hoverIndex, points, showDots, showQuarters, stats])

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
    dragRef.current = null
  }, [])

  const addValue = () => {
    const value = Number(inputValue)
    if (!Number.isFinite(value)) return
    setPoints((current) => [...current, makePoint(Math.round(value))])
    setInputValue('')
  }

  const removePoint = (id) => {
    setPoints((current) => current.filter((point) => point.id !== id))
  }

  const handlePointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * canvasWidth
    const y = ((event.clientY - rect.top) / rect.height) * canvasHeight
    const hit = dotHitsRef.current.find((dot) => Math.hypot(dot.x - x, dot.y - y) <= dot.radius)
    if (!hit) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, index: hit.index }
    setHoverIndex(hit.index)
    setDragIndex(hit.index)
  }

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * canvasWidth
    const y = ((event.clientY - rect.top) / rect.height) * canvasHeight
    const hit = dotHitsRef.current.find((dot) => Math.hypot(dot.x - x, dot.y - y) <= dot.radius)
    setHoverIndex(hit?.index ?? null)
    if (!dragRef.current || !scaleRef.current) return
    const nextValue = Math.round(scaleRef.current.toValue(x))
    const clamped = clamp(nextValue, Math.floor(scaleRef.current.domainMin), Math.ceil(scaleRef.current.domainMax))
    setPoints((current) => current.map((point, index) => (
      index === dragRef.current.index ? { ...point, value: clamped } : point
    )))
  }

  const endDrag = (event) => {
    if (dragRef.current && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDragIndex(null)
  }

  const clearHover = () => {
    if (!dragRef.current) setHoverIndex(null)
  }

  const summaryCards = stats ? [
    ['Min', stats.whiskerMin, colors.whisker],
    ['Q1', stats.q1, colors.box],
    ['Median', stats.median, colors.median],
    ['Q3', stats.q3, colors.box],
    ['Max', stats.whiskerMax, colors.whisker],
    ['IQR', stats.iqr, colors.iqr],
  ] : []

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <section className="shrink-0 rounded-xl border border-[#E0DDD6] bg-white p-2">
        <div className="flex min-h-[30px] flex-wrap items-center gap-1.5">
          {points.map((point) => (
            <button
              key={point.id}
              type="button"
              onClick={() => removePoint(point.id)}
              className="rounded-full border border-[#D6D3E8] bg-[#F4F2FF] px-2 py-1 text-xs font-black text-[#534AB7]"
            >
              {formatNumber(point.value)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addValue()
            }}
            className="h-8 w-[70px] rounded-lg border-[1.5px] border-[#0F6E56] bg-white px-2 text-center text-sm font-black text-[#0F6E56] outline-none focus:ring-2 focus:ring-[#0F6E5633]"
          />
          <button type="button" onClick={addValue} className="h-8 rounded-lg bg-[#534AB7] px-3 text-xs font-black text-white">Add value</button>
          <button type="button" onClick={() => setPoints([])} className="h-8 rounded-lg border border-[#DC2626] px-3 text-xs font-black text-[#DC2626]">Clear</button>
        </div>
      </section>

      <section ref={wrapRef} className="shrink-0 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas
          ref={canvasRef}
          className={`block h-[230px] w-full touch-none ${dragIndex === null ? 'cursor-grab' : 'cursor-grabbing'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={clearHover}
        />
      </section>

      <section className="grid shrink-0 grid-cols-6 gap-1.5">
        {summaryCards.map(([label, value, color]) => (
          <div key={label} className="rounded-xl border-[1.5px] bg-white px-2 py-1.5" style={{ borderColor: color }}>
            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color }}>{label}</p>
            <p className="text-lg font-black leading-tight" style={{ color }}>{formatNumber(value)}</p>
          </div>
        ))}
      </section>

      <section className="flex min-h-0 flex-1 items-start gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E0DDD6] bg-white px-3 py-2 text-xs font-semibold text-[#5F5E5A]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showDots} onChange={(event) => setShowDots(event.target.checked)} />
            Show data dots
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showQuarters} onChange={(event) => setShowQuarters(event.target.checked)} />
            Show quarter labels
          </label>
        </div>
      </section>
    </div>
  )
}
