import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const beamColor = '#3D0099'
const dotColor = '#FF3EA5'
const meanColor = '#00C2A8'
const removeColor = '#A32D2D'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rounded(value, digits = 1) {
  const result = Number(value.toFixed(digits))
  return Object.is(result, -0) ? 0 : result
}

function makeDot(value) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    value,
  }
}

function getLayout(width, height) {
  const PAD = Math.max(28, Math.min(44, width * 0.08))
  const BEAM_Y = height * 0.62
  const BEAM_LEFT = PAD
  const BEAM_RIGHT = width - PAD
  const BEAM_LENGTH = BEAM_RIGHT - BEAM_LEFT
  const CENTER_X = width / 2
  const angle = 0

  const toLocalX = (value) => -BEAM_LENGTH / 2 + (value / 20) * BEAM_LENGTH
  const toValue = (localX) => clamp(((localX + BEAM_LENGTH / 2) / BEAM_LENGTH) * 20, 0, 20)
  const toIntegerValue = (localX) => Math.round(toValue(localX))
  const toScreen = (localX, localY = 0) => ({
    x: CENTER_X + localX * Math.cos(angle) - localY * Math.sin(angle),
    y: BEAM_Y + localX * Math.sin(angle) + localY * Math.cos(angle),
  })
  const toLocal = (x, y) => {
    const dx = x - CENTER_X
    const dy = y - BEAM_Y
    return {
      x: dx * Math.cos(angle) + dy * Math.sin(angle),
      y: -dx * Math.sin(angle) + dy * Math.cos(angle),
    }
  }

  return { PAD, BEAM_Y, BEAM_LENGTH, CENTER_X, angle, toIntegerValue, toLocal, toLocalX, toScreen, toValue }
}

function getDotPositions(dots, width, height) {
  const layout = getLayout(width, height)
  const stackCounts = new Map()

  return dots.map((dot) => {
    const stackKey = rounded(dot.value, 1)
    const stack = stackCounts.get(stackKey) ?? 0
    stackCounts.set(stackKey, stack + 1)
    const localX = layout.toLocalX(dot.value)
    const localY = -28 - stack * 24
    const screen = layout.toScreen(localX, localY)
    return { ...dot, localX, localY, screen, stack }
  })
}

export default function MeanBalancePoint() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const animatedMeanRef = useRef(8)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [dots, setDots] = useState([makeDot(4), makeDot(8), makeDot(12)])
  const [animatedMean, setAnimatedMean] = useState(8)
  const [drag, setDrag] = useState(null)
  const [statsHidden, setStatsHidden] = useState(false)

  const canvasHeight = 240
  const values = useMemo(() => dots.map((dot) => rounded(dot.value, 1)).sort((a, b) => a - b), [dots])
  const sum = values.reduce((total, value) => total + value, 0)
  const mean = dots.length ? sum / dots.length : 0
  const meanDisplay = rounded(mean, 1).toFixed(1)

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
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const start = animatedMeanRef.current
    const end = mean
    const duration = 240
    const started = performance.now()

    const tick = (now) => {
      const progress = clamp((now - started) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = start + (end - start) * eased
      animatedMeanRef.current = next
      setAnimatedMean(next)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [mean])

  const addValue = useCallback((value) => {
    if (dots.length >= 10) return
    const nextValue = clamp(Math.round(Number(value) || 0), 0, 20)
    setDots((current) => current.length >= 10 ? current : [...current, makeDot(nextValue)])
  }, [dots.length])

  const setPreset = (preset) => {
    setDots(preset.map(makeDot))
  }

  const getPointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    }
  }, [canvasWidth])

  const updateDotValue = (id, value) => {
    setDots((current) => current.map((dot) => dot.id === id ? { ...dot, value } : dot))
  }

  const moveMeanTo = useCallback((targetMean) => {
    setDots((current) => {
      if (!current.length) return current
      const adjustableIndex = current.length - 1
      const otherSum = current.reduce((total, dot, index) => index === adjustableIndex ? total : total + dot.value, 0)
      const nextValue = clamp(targetMean * current.length - otherSum, 0, 20)
      return current.map((dot, index) => index === adjustableIndex ? { ...dot, value: rounded(nextValue, 1) } : dot)
    })
  }, [])

  const removeDot = (id) => {
    setDots((current) => current.filter((dot) => dot.id !== id))
  }

  const handlePointerDown = (event) => {
    const point = getPointer(event)
    const positions = getDotPositions(dots, canvasWidth, canvasHeight)
    const hit = positions.findLast((dot) => Math.hypot(dot.screen.x - point.x, dot.screen.y - point.y) <= 19)

    if (hit) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrag({ type: 'dot', id: hit.id, startX: point.x, startY: point.y, x: point.x, y: point.y, didMove: false })
      return
    }

    const layout = getLayout(canvasWidth, canvasHeight)
    const meanScreen = layout.toScreen(layout.toLocalX(animatedMean), 0)
    const meanHit = Math.abs(point.x - meanScreen.x) <= 30 && point.y >= meanScreen.y + 2 && point.y <= meanScreen.y + 66
    if (meanHit) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrag({ type: 'mean', startX: point.x, startY: point.y, x: point.x, y: point.y, didMove: false })
      return
    }

    const local = layout.toLocal(point.x, point.y)
    if (Math.abs(local.y) <= 40 && local.x >= -layout.BEAM_LENGTH / 2 && local.x <= layout.BEAM_LENGTH / 2) {
      addValue(layout.toIntegerValue(local.x))
    }
  }

  const handlePointerMove = (event) => {
    if (!drag) return

    const point = getPointer(event)
    const moved = drag.didMove || Math.hypot(point.x - drag.startX, point.y - drag.startY) > 3
    const layout = getLayout(canvasWidth, canvasHeight)
    const local = layout.toLocal(point.x, point.y)

    if (drag.type === 'mean') {
      const targetMean = rounded(layout.toValue(local.x), 1)
      animatedMeanRef.current = targetMean
      setAnimatedMean(targetMean)
      moveMeanTo(targetMean)
      setDrag({ ...drag, x: point.x, y: point.y, didMove: moved })
      return
    }

    updateDotValue(drag.id, layout.toIntegerValue(local.x))
    setDrag({ ...drag, x: point.x, y: point.y, didMove: moved })
  }

  const handlePointerUp = () => {
    if (!drag) return

    if (drag.type === 'mean') {
      setDrag(null)
      return
    }

    const layout = getLayout(canvasWidth, canvasHeight)
    const removeByDrag = drag.didMove && drag.y < layout.BEAM_Y - 60
    if (!drag.didMove || removeByDrag) removeDot(drag.id)
    setDrag(null)
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const width = canvasWidth
    const height = canvasHeight
    const layout = getLayout(width, height)
    const positionedDots = getDotPositions(dots, width, height)
    const meanLocalX = layout.toLocalX(animatedMean)
    const meanScreen = layout.toScreen(meanLocalX, 0)
    const removing = drag?.type === 'dot' && drag.y < layout.BEAM_Y - 60

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (removing) {
      ctx.save()
      ctx.setLineDash([8, 7])
      ctx.strokeStyle = removeColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(18, layout.BEAM_Y - 60)
      ctx.lineTo(width - 18, layout.BEAM_Y - 60)
      ctx.stroke()
      ctx.fillStyle = removeColor
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('drag up to remove', width / 2, layout.BEAM_Y - 68)
      ctx.restore()
    }

    ctx.save()
    ctx.translate(layout.CENTER_X, layout.BEAM_Y)
    ctx.rotate(layout.angle)

    if (dots.length > 1) {
      positionedDots.forEach((dot) => {
        ctx.save()
        ctx.setLineDash([6, 5])
        ctx.strokeStyle = dot.value >= mean ? dotColor : beamColor
        ctx.globalAlpha = 0.75
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(dot.localX, dot.localY + 13)
        ctx.lineTo(meanLocalX, 0)
        ctx.stroke()
        ctx.restore()
      })
    }

    ctx.strokeStyle = beamColor
    ctx.fillStyle = beamColor
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-layout.BEAM_LENGTH / 2, 0)
    ctx.lineTo(layout.BEAM_LENGTH / 2, 0)
    ctx.stroke()

    ctx.lineWidth = 2
    ctx.font = '700 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let value = 0; value <= 20; value += 1) {
      const x = layout.toLocalX(value)
      ctx.beginPath()
      ctx.moveTo(x, -9)
      ctx.lineTo(x, value % 5 === 0 ? 16 : 10)
      ctx.stroke()
      if (value % 5 === 0) ctx.fillText(String(value), x, 20)
    }

    positionedDots.forEach((dot) => {
      const isDragging = drag?.type === 'dot' && drag.id === dot.id
      ctx.save()
      ctx.globalAlpha = isDragging ? 0.42 : 1
      ctx.fillStyle = dotColor
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(dot.localX, dot.localY, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(dot.value), dot.localX, dot.localY + 0.5)
      ctx.restore()
    })

    ctx.restore()

    if (drag?.type === 'dot') {
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.fillStyle = dotColor
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(drag.x, drag.y, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    ctx.fillStyle = meanColor
    ctx.strokeStyle = meanColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(meanScreen.x, meanScreen.y + 5)
    ctx.lineTo(meanScreen.x - 18, meanScreen.y + 42)
    ctx.lineTo(meanScreen.x + 18, meanScreen.y + 42)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(meanScreen.x - 26, meanScreen.y + 42)
    ctx.lineTo(meanScreen.x + 26, meanScreen.y + 42)
    ctx.stroke()

    ctx.fillStyle = beamColor
    ctx.font = '900 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`mean = ${meanDisplay}`, meanScreen.x, meanScreen.y + 48)
  }, [animatedMean, canvasWidth, dots, drag, mean, meanDisplay])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto bg-[#F8F0FF] p-4 font-['Inter'] text-[#3D0099]">
      <section className="relative grid grid-cols-2 gap-2 pr-24 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatsHidden((hidden) => !hidden)}
          className="absolute right-0 top-0 rounded-full border border-[#3D0099]/20 bg-white px-3 py-1.5 text-xs font-black"
        >
          {statsHidden ? 'Show' : 'Hide'}
        </button>
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-[#3D0099]/70">Values</p>
          <p className="text-lg font-black text-[#FF3EA5]">{values.length ? values.join(', ') : '-'}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-[#3D0099]/70">Sum</p>
          <p className="text-lg font-black text-[#3D0099]">{statsHidden ? '-' : rounded(sum, 1)}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-[#3D0099]/70">Count</p>
          <p className="text-lg font-black text-slate-500">{statsHidden ? '-' : dots.length}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-[#3D0099]/70">Mean</p>
          <p className="text-lg font-black text-[#00C2A8]">{statsHidden ? '-' : meanDisplay}</p>
        </div>
      </section>

      <div ref={wrapRef} className="relative h-[240px] overflow-hidden rounded-xl bg-white">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="h-full w-full touch-none cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
        />
      </div>

      <section className="rounded-xl bg-white p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-black">
          <button
            type="button"
            onClick={() => setDots([])}
            className="text-[#A32D2D] underline-offset-4 hover:underline"
          >
            Clear all
          </button>
          {[
            ['Evenly spread', [2, 4, 6, 8, 10]],
            ['One outlier', [1, 1, 1, 10]],
            ['All equal', [3, 3, 3, 3]],
            ['Symmetric', [2, 8, 2, 8]],
          ].map(([label, preset]) => (
            <button
              key={label}
              type="button"
              onClick={() => setPreset(preset)}
              className="text-[#3D0099] underline-offset-4 hover:underline"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm font-semibold text-[#3D0099]/75">
          Click beam to add dot. Click or drag dot up to remove. Drag the teal mean marker to adjust a value.
        </p>
      </section>
    </div>
  )
}
