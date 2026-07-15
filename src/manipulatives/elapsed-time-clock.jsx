import { useCallback, useEffect, useRef, useState } from 'react'

const blue = '#2AA9E0'
const orange = '#D85A30'
const purple = '#7C3AED'
const navy = '#1E2D5A'
const clockCanvasHeight = 320

function minutesToParts(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hour24 = Math.floor(normalized / 60)
  const minute = normalized % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute, period }
}

function partsToMinutes({ hour, minute, period }) {
  const hour12 = hour % 12
  return hour12 * 60 + minute + (period === 'PM' ? 720 : 0)
}

function formatClock(totalMinutes) {
  const { hour, minute, period } = minutesToParts(totalMinutes)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

function elapsedMinutes(start, end) {
  const diff = end - start
  return diff > 0 ? diff : diff + 1440
}

function formatDuration(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} minutes`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

function timeAngles(totalMinutes) {
  const normalized = ((totalMinutes % 720) + 720) % 720
  const hourAngle = ((normalized / 60) / 12) * Math.PI * 2 - Math.PI / 2
  const minuteAngle = ((normalized % 60) / 60) * Math.PI * 2 - Math.PI / 2
  return { hourAngle, minuteAngle }
}

function angleFromPoint(point, cx, cy) {
  const angle = Math.atan2(point.y - cy, point.x - cx) + Math.PI / 2
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

function shortestAngleDelta(from, to) {
  let delta = to - from
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

function snapToFive(totalMinutes) {
  return Math.round(totalMinutes / 5) * 5
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq))
  const x = a.x + dx * t
  const y = a.y + dy * t
  return Math.hypot(point.x - x, point.y - y)
}

function getClockLayout(canvasSize) {
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const radius = Math.min(canvasSize.width * 0.5 - 30, canvasSize.height * 0.5 - 14)
  return { cx, cy, radius }
}

function drawHand(ctx, cx, cy, radius, totalMinutes, color, label, alpha) {
  const { hourAngle, minuteAngle } = timeAngles(totalMinutes)
  const hourLength = radius * 0.48
  const minuteLength = radius * 0.7
  const hx = cx + Math.cos(hourAngle) * hourLength
  const hy = cy + Math.sin(hourAngle) * hourLength
  const mx = cx + Math.cos(minuteAngle) * minuteLength
  const my = cy + Math.sin(minuteAngle) * minuteLength

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(hx, hy)
  ctx.stroke()

  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(mx, my)
  ctx.stroke()

  if (label) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(mx, my, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, mx, my)
  }
  ctx.restore()

  return { minuteTip: { x: mx, y: my }, hourTip: { x: hx, y: hy } }
}

function roundedRect(ctx, x, y, width, height, radius) {
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

function SpinnerCard({ title, color, time, onChange }) {
  const parts = minutesToParts(time)
  const update = (patch) => onChange(partsToMinutes({ ...parts, ...patch }))

  return (
    <div className="mx-auto w-[250px] rounded-2xl border-[1.5px] bg-white px-4 py-1 text-center" style={{ borderColor: color }}>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>{title}</p>
      <div className="mt-0.5 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <div className="grid justify-items-center">
          <button type="button" onClick={() => update({ hour: parts.hour === 12 ? 1 : parts.hour + 1 })} className="h-5 w-9 rounded border border-[#D8DEE8] text-xs font-black text-[#5F6B7A]">▲</button>
          <span className="text-xl font-black text-[#1A1A2E]">{parts.hour}</span>
          <button type="button" onClick={() => update({ hour: parts.hour === 1 ? 12 : parts.hour - 1 })} className="h-5 w-9 rounded border border-[#D8DEE8] text-xs font-black text-[#5F6B7A]">▼</button>
          <span className="text-[10px] font-black uppercase text-[#8A93A2]">Hour</span>
        </div>
        <span className="text-xl font-black text-[#CCD6E2]">:</span>
        <div className="grid justify-items-center">
          <button type="button" onClick={() => update({ minute: (parts.minute + 5) % 60 })} className="h-5 w-9 rounded border border-[#D8DEE8] text-xs font-black text-[#5F6B7A]">▲</button>
          <span className="text-xl font-black text-[#1A1A2E]">{String(parts.minute).padStart(2, '0')}</span>
          <button type="button" onClick={() => update({ minute: (parts.minute + 55) % 60 })} className="h-5 w-9 rounded border border-[#D8DEE8] text-xs font-black text-[#5F6B7A]">▼</button>
          <span className="text-[10px] font-black uppercase text-[#8A93A2]">Min</span>
        </div>
        <button type="button" onClick={() => update({ period: parts.period === 'AM' ? 'PM' : 'AM' })} className="h-9 w-16 rounded-xl border-[1.5px] text-base font-black" style={{ borderColor: color, color }}>
          {parts.period}
        </button>
      </div>
    </div>
  )
}

export default function ElapsedTimeClock() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 760, height: clockCanvasHeight })
  const [step, setStep] = useState(1)
  const [startTime, setStartTime] = useState(9 * 60 + 15)
  const [endTime, setEndTime] = useState(10 * 60)
  const [playTime, setPlayTime] = useState(null)
  const [showTravelHand, setShowTravelHand] = useState(false)

  const elapsed = elapsedMinutes(startTime, endTime)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const update = () => setCanvasSize({ width: Math.max(320, Math.floor(node.clientWidth)), height: clockCanvasHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
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

    const { cx, cy, radius } = getClockLayout(canvasSize)

    ctx.strokeStyle = navy
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    for (let index = 0; index < 60; index += 1) {
      const angle = (index / 60) * Math.PI * 2 - Math.PI / 2
      const major = index % 5 === 0
      const inner = radius - (major ? radius * 0.12 : radius * 0.065)
      ctx.strokeStyle = major ? '#9AA6B2' : '#CBD3DC'
      ctx.lineWidth = major ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
      ctx.lineTo(cx + Math.cos(angle) * (radius - 4), cy + Math.sin(angle) * (radius - 4))
      ctx.stroke()
    }

    ctx.fillStyle = '#1A1A2E'
    ctx.font = '900 19px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let number = 1; number <= 12; number += 1) {
      const angle = (number / 12) * Math.PI * 2 - Math.PI / 2
      ctx.fillText(String(number), cx + Math.cos(angle) * (radius - radius * 0.27), cy + Math.sin(angle) * (radius - radius * 0.27))
    }

    const animatedTime = playTime === null ? endTime : Math.round(playTime)
    const animatedElapsed = playTime === null ? elapsed : Math.min(elapsed, Math.max(0, Math.round(playTime - startTime)))

    if (step === 3) {
      const startAngle = timeAngles(startTime).minuteAngle
      const sweep = (elapsed / 720) * Math.PI * 2
      const visibleSweep = playTime === null ? sweep : (animatedElapsed / 720) * Math.PI * 2
      const midAngle = startAngle + visibleSweep / 2
      const arcRadius = radius - 17
      ctx.strokeStyle = purple
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, cy, arcRadius, startAngle, startAngle + visibleSweep)
      ctx.stroke()
      if (visibleSweep > 0.25) {
        const label = formatDuration(animatedElapsed)
        ctx.font = '900 12px Inter, system-ui, sans-serif'
        const paddingX = 9
        const labelWidth = ctx.measureText(label).width + paddingX * 2
        const labelHeight = 24
        const labelDistance = radius - 4
        const rawX = cx + Math.cos(midAngle) * labelDistance
        const rawY = cy + Math.sin(midAngle) * labelDistance
        const labelX = Math.max(labelWidth / 2 + 8, Math.min(canvasSize.width - labelWidth / 2 - 8, rawX))
        const labelY = Math.max(labelHeight / 2 + 8, Math.min(canvasSize.height - labelHeight / 2 - 8, rawY))
        ctx.fillStyle = '#ffffff'
        roundedRect(ctx, labelX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 12)
        ctx.fill()
        ctx.strokeStyle = '#E0DDD6'
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.fillStyle = purple
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, labelX, labelY)
      }
    }

    if (step === 3 && showTravelHand) {
      drawHand(ctx, cx, cy, radius, animatedTime, navy, '', 1)
    } else {
      drawHand(ctx, cx, cy, radius, startTime, blue, 'S', step === 2 ? 0.3 : 1)
      drawHand(ctx, cx, cy, radius, animatedTime, orange, 'E', step === 1 ? 0.3 : 1)
    }

    ctx.fillStyle = navy
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fill()
  }, [canvasSize, elapsed, endTime, playTime, showTravelHand, startTime, step])

  useEffect(() => {
    draw()
  }, [draw])

  const getCanvasPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    }
  }

  const cancelPlayback = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setPlayTime(null)
  }, [])

  useEffect(() => () => cancelPlayback(), [cancelPlayback])

  const setDraggedTime = (event) => {
    if (!dragRef.current) return
    const point = getCanvasPoint(event)
    const { cx, cy } = getClockLayout(canvasSize)
    const currentAngle = angleFromPoint(point, cx, cy)
    let next

    if (dragRef.current.hand === 'hour') {
      const halfDayMinutes = snapToFive((currentAngle / (Math.PI * 2)) * 720) % 720
      const periodOffset = minutesToParts(dragRef.current.startTime).period === 'PM' ? 720 : 0
      next = periodOffset + halfDayMinutes
    } else {
      const delta = shortestAngleDelta(dragRef.current.lastAngle, currentAngle)
      dragRef.current.lastAngle = currentAngle
      dragRef.current.unwrappedDelta += delta
      next = snapToFive(dragRef.current.startTime + (dragRef.current.unwrappedDelta / (Math.PI * 2)) * 60)
    }

    if (dragRef.current.target === 'start') setStartTime(next)
    if (dragRef.current.target === 'end') setEndTime(next)
  }

  const beginDrag = (event) => {
    cancelPlayback()
    setShowTravelHand(false)
    const point = getCanvasPoint(event)
    const { cx, cy, radius } = getClockLayout(canvasSize)
    const candidates = (step === 3 ? [
      ['start', startTime],
      ['end', endTime],
    ] : [[step === 1 ? 'start' : 'end', step === 1 ? startTime : endTime]])
      .flatMap(([targetName, targetTime]) => {
        const { hourAngle, minuteAngle } = timeAngles(targetTime)
        const hourTip = {
          x: cx + Math.cos(hourAngle) * radius * 0.48,
          y: cy + Math.sin(hourAngle) * radius * 0.48,
        }
        const minuteTip = {
          x: cx + Math.cos(minuteAngle) * radius * 0.7,
          y: cy + Math.sin(minuteAngle) * radius * 0.7,
        }
        return [
          {
            target: targetName,
            time: targetTime,
            hand: 'hour',
            distance: distanceToSegment(point, { x: cx, y: cy }, hourTip),
          },
          {
            target: targetName,
            time: targetTime,
            hand: 'minute',
            distance: distanceToSegment(point, { x: cx, y: cy }, minuteTip),
          },
        ]
      })
    const best = candidates.reduce((closest, candidate) => (
      candidate.distance < closest.distance ? candidate : closest
    ), candidates[0])

    dragRef.current = {
      target: best.target,
      hand: best.hand,
      startTime: best.time,
      lastAngle: angleFromPoint(point, cx, cy),
      unwrappedDelta: 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggedTime(event)
  }

  const moveDrag = (event) => {
    if (!dragRef.current) return
    setDraggedTime(event)
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const playElapsed = () => {
    cancelPlayback()
    setShowTravelHand(true)
    const startedAt = performance.now()
    const duration = Math.min(4200, Math.max(1400, elapsed * 18))

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2
      setPlayTime(startTime + elapsed * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setPlayTime(null)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const activeColor = step === 1 ? blue : step === 2 ? orange : purple
  const activeTime = step === 1 ? startTime : endTime
  const setActiveTime = step === 1 ? setStartTime : setEndTime

  return (
    <div className="flex h-[500px] flex-col gap-1 overflow-hidden bg-[#EEF3F8] p-1 font-['Inter'] text-[#1A1A2E]">
      <div className="h-5 shrink-0 text-center">
        <div className="flex h-full items-center justify-center gap-3 text-sm font-black">
          <span style={{ color: step === 1 ? blue : '#8A93A2' }}>1. Start</span>
          <span className="text-[#A7B0BC]">→</span>
          <span style={{ color: step === 2 ? orange : '#8A93A2' }}>2. End</span>
          <span className="text-[#A7B0BC]">→</span>
          <span style={{ color: step === 3 ? purple : '#8A93A2' }}>3. Difference</span>
        </div>
      </div>

      <div ref={wrapRef} className="h-[320px] shrink-0 overflow-hidden rounded-2xl bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-pointer"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {step < 3 ? (
          <>
            <SpinnerCard title={step === 1 ? 'Start time' : 'End time'} color={activeColor} time={activeTime} onChange={setActiveTime} />
            <button
              type="button"
            onClick={() => {
              if (step === 2) playElapsed()
              setStep(step === 1 ? 2 : 3)
            }}
              className="mx-auto h-7 rounded-xl px-5 text-sm font-black text-white"
            style={{ backgroundColor: activeColor }}
          >
            {step === 1 ? 'Set start → choose end' : 'See elapsed time →'}
          </button>
        </>
      ) : (
        <>
          <div className="mx-auto rounded-[14px] border border-[#E0DDD6] bg-white px-6 py-2 text-center" style={{ borderWidth: 0.5 }}>
            <p className="text-xs font-semibold text-[#6B7280]">
              From {formatClock(startTime)} to {formatClock(endTime)}
            </p>
            <p className="text-lg font-black text-[#7C3AED]">{formatDuration(elapsed)}</p>
          </div>
          <div className="mx-auto grid w-[290px] grid-cols-2 gap-2">
              <button type="button" onClick={playElapsed} className="h-7 rounded-xl bg-[#7C3AED] px-5 text-sm font-black text-white">
              Play time
            </button>
            <button type="button" onClick={() => {
              cancelPlayback()
              setShowTravelHand(false)
              setStep(1)
              }} className="h-7 rounded-xl bg-[#2AA9E0] px-5 text-sm font-black text-white">
              Start over
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
