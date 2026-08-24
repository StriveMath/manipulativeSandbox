import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  start: '#2A7DE1',
  startTint: '#EAF0FB',
  end: '#1E7A5E',
  endTint: '#E9F5EF',
  elapsed: '#7B3F9E',
  elapsedTint: '#F3EEFA',
  navy: '#1E2D5A',
  border: '#E0DDD6',
  muted: '#5F5E5A',
}

const clockHeight = 282
const playbackClockHeight = 325

function normalizeMinutes(minutes) {
  return ((Math.round(minutes) % 1440) + 1440) % 1440
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mixHex(from, to, amount) {
  const cleanFrom = from.replace('#', '')
  const cleanTo = to.replace('#', '')
  const fromRgb = [0, 2, 4].map((index) => parseInt(cleanFrom.slice(index, index + 2), 16))
  const toRgb = [0, 2, 4].map((index) => parseInt(cleanTo.slice(index, index + 2), 16))
  const mixed = fromRgb.map((channel, index) => Math.round(channel + (toRgb[index] - channel) * amount))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}

function snapToFive(minutes) {
  return normalizeMinutes(Math.round(minutes / 5) * 5)
}

function minutesToParts(totalMinutes) {
  const normalized = normalizeMinutes(totalMinutes)
  const hour24 = Math.floor(normalized / 60)
  const minute = normalized % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute, period }
}

function partsToMinutes({ hour, minute, period }) {
  const hour12 = hour % 12
  return normalizeMinutes(hour12 * 60 + minute + (period === 'PM' ? 720 : 0))
}

function formatClock(totalMinutes) {
  const { hour, minute, period } = minutesToParts(totalMinutes)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

function getElapsed(start, end) {
  const diff = normalizeMinutes(end) - normalizeMinutes(start)
  return diff > 0 ? diff : diff + 1440
}

function formatDuration(totalMinutes, long = false) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hourText = long ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${hours} h`
  const minuteText = long ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : `${minutes} min`
  if (hours === 0) return minuteText
  if (minutes === 0) return hourText
  return `${hourText} ${minuteText}`
}

function timeAngles(totalMinutes) {
  const normalized = normalizeMinutes(totalMinutes) % 720
  const hourAngle = ((normalized / 720) * Math.PI * 2) - Math.PI / 2
  const minuteAngle = (((normalized % 60) / 60) * Math.PI * 2) - Math.PI / 2
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

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq))
  const x = a.x + dx * t
  const y = a.y + dy * t
  return Math.hypot(point.x - x, point.y - y)
}

function clockLayout(width, height) {
  const radius = Math.min(width, height) * 0.47
  return { cx: width / 2, cy: height / 2, radius }
}

function drawClockFace(ctx, width, height, color) {
  const { cx, cy, radius } = clockLayout(width, height)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = colors.navy
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  for (let index = 0; index < 60; index += 1) {
    const angle = (index / 60) * Math.PI * 2 - Math.PI / 2
    const major = index % 5 === 0
    const inner = radius - (major ? 13 : 7)
    ctx.strokeStyle = major ? '#9AA6B2' : '#D8DEE8'
    ctx.lineWidth = major ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * (radius - 3), cy + Math.sin(angle) * (radius - 3))
    ctx.stroke()
  }

  ctx.fillStyle = colors.navy
  ctx.font = '900 18px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let number = 1; number <= 12; number += 1) {
    const angle = (number / 12) * Math.PI * 2 - Math.PI / 2
    ctx.fillText(String(number), cx + Math.cos(angle) * (radius - 31), cy + Math.sin(angle) * (radius - 31))
  }

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fill()

  return { cx, cy, radius }
}

function drawElapsedArc(ctx, width, height, startTime, endTime, progress = 1) {
  const { cx, cy, radius } = clockLayout(width, height)
  const elapsed = getElapsed(startTime, endTime)
  const startAngle = timeAngles(startTime).minuteAngle
  const visibleSweep = (Math.min(elapsed, 720) / 720 * Math.PI * 2) * progress
  const arcRadius = radius - 16

  ctx.save()
  ctx.strokeStyle = colors.elapsed
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, arcRadius, startAngle, startAngle + visibleSweep)
  ctx.stroke()

  if (visibleSweep > 0.18) {
    const mid = startAngle + visibleSweep / 2
    const label = formatDuration(Math.round(elapsed * progress))
    ctx.font = '900 12px Inter, system-ui, sans-serif'
    const labelWidth = ctx.measureText(label).width + 18
    const labelHeight = 25
    const rawX = cx + Math.cos(mid) * (radius - 3)
    const rawY = cy + Math.sin(mid) * (radius - 3)
    const x = Math.max(labelWidth / 2 + 6, Math.min(width - labelWidth / 2 - 6, rawX))
    const y = Math.max(labelHeight / 2 + 6, Math.min(height - labelHeight / 2 - 6, rawY))

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = colors.elapsed
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x - labelWidth / 2, y - labelHeight / 2, labelWidth, labelHeight, 13)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = colors.elapsed
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y)
  }
  ctx.restore()
}

function drawHands(ctx, width, height, time, color) {
  const { cx, cy, radius } = clockLayout(width, height)
  const { hourAngle, minuteAngle } = timeAngles(time)
  const hourTip = {
    x: cx + Math.cos(hourAngle) * radius * 0.48,
    y: cy + Math.sin(hourAngle) * radius * 0.48,
  }
  const minuteTip = {
    x: cx + Math.cos(minuteAngle) * radius * 0.72,
    y: cy + Math.sin(minuteAngle) * radius * 0.72,
  }

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(hourTip.x, hourTip.y)
  ctx.stroke()

  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(minuteTip.x, minuteTip.y)
  ctx.stroke()

  ctx.fillStyle = colors.navy
  ctx.beginPath()
  ctx.arc(cx, cy, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  return { hourTip, minuteTip }
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function ClockCanvas({ label, time, color, tint, onChange, showElapsedArc, startTime, endTime }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const [size, setSize] = useState({ width: 300, height: clockHeight })

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setSize({ width: Math.max(260, Math.floor(node.clientWidth)), height: clockHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawClockFace(ctx, size.width, size.height, color)
    if (showElapsedArc) drawElapsedArc(ctx, size.width, size.height, startTime, endTime)
    drawHands(ctx, size.width, size.height, time, color)
  }, [color, endTime, showElapsedArc, size, startTime, time])

  useEffect(() => {
    draw()
  }, [draw])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (size.width / rect.width),
      y: (event.clientY - rect.top) * (size.height / rect.height),
    }
  }

  const updateFromDrag = (event) => {
    if (!dragRef.current) return
    const point = getPoint(event)
    const { cx, cy } = clockLayout(size.width, size.height)
    const angle = angleFromPoint(point, cx, cy)
    let nextTime

    if (dragRef.current.hand === 'hour') {
      const halfDayMinutes = snapToFive((angle / (Math.PI * 2)) * 720)
      const periodOffset = minutesToParts(dragRef.current.startTime).period === 'PM' ? 720 : 0
      nextTime = periodOffset + (halfDayMinutes % 720)
    } else {
      const delta = shortestAngleDelta(dragRef.current.lastAngle, angle)
      dragRef.current.lastAngle = angle
      dragRef.current.unwrappedDelta += delta
      nextTime = dragRef.current.startTime + (dragRef.current.unwrappedDelta / (Math.PI * 2)) * 60
    }

    onChange(snapToFive(nextTime))
  }

  const beginDrag = (event) => {
    const point = getPoint(event)
    const { cx, cy, radius } = clockLayout(size.width, size.height)
    const { hourAngle, minuteAngle } = timeAngles(time)
    const hourTip = { x: cx + Math.cos(hourAngle) * radius * 0.48, y: cy + Math.sin(hourAngle) * radius * 0.48 }
    const minuteTip = { x: cx + Math.cos(minuteAngle) * radius * 0.72, y: cy + Math.sin(minuteAngle) * radius * 0.72 }
    const hourDistance = distanceToSegment(point, { x: cx, y: cy }, hourTip)
    const minuteDistance = distanceToSegment(point, { x: cx, y: cy }, minuteTip)
    dragRef.current = {
      hand: hourDistance < minuteDistance ? 'hour' : 'minute',
      startTime: time,
      lastAngle: angleFromPoint(point, cx, cy),
      unwrappedDelta: 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromDrag(event)
  }

  return (
    <div className="min-w-0 rounded-[14px] border bg-white p-2 shadow-sm" style={{ borderColor: color, background: `linear-gradient(180deg, ${tint}, #ffffff 26%)` }}>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-black" style={{ color }}>{label}</h2>
        <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ color, background: tint }}>drag hands or type</span>
      </div>
      <div ref={wrapRef} className="overflow-hidden rounded-xl bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={beginDrag}
          onPointerMove={updateFromDrag}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
          aria-label={`${label} clock`}
        />
      </div>
      <TimeEditor time={time} color={color} tint={tint} onChange={onChange} />
    </div>
  )
}

function PlaybackClock({ startTime, endTime, progress }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ width: 440, height: playbackClockHeight })
  const elapsed = useMemo(() => getElapsed(startTime, endTime), [endTime, startTime])
  const eased = easeInOut(progress)
  const animatedTime = startTime + elapsed * eased
  const handBlend = easeInOut(clamp((progress - 0.08) / 0.84, 0, 1))
  const handColor = mixHex(colors.start, colors.end, handBlend)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setSize({ width: Math.max(300, Math.floor(node.clientWidth)), height: playbackClockHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawClockFace(ctx, size.width, size.height, colors.elapsed)
    drawElapsedArc(ctx, size.width, size.height, startTime, endTime, eased)
    drawHands(ctx, size.width, size.height, animatedTime, handColor)
  }, [animatedTime, eased, endTime, handColor, size, startTime])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[14px] bg-white">
      <canvas ref={canvasRef} className="block w-full" aria-label="Animated elapsed time clock" />
    </div>
  )
}

function TimeEditor({ time, color, tint, onChange }) {
  const parts = minutesToParts(time)
  const [hourText, setHourText] = useState(String(parts.hour))
  const [minuteText, setMinuteText] = useState(String(parts.minute).padStart(2, '0'))
  const editingRef = useRef(null)

  useEffect(() => {
    if (editingRef.current) return
    setHourText(String(parts.hour))
    setMinuteText(String(parts.minute).padStart(2, '0'))
  }, [parts.hour, parts.minute])

  const commitHour = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const parsed = Number(digits)
    if (digits && parsed >= 1 && parsed <= 12) {
      onChange(partsToMinutes({ ...parts, hour: parsed }))
    }
  }

  const commitMinute = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    if (!digits) return
    const parsed = clamp(Number(digits), 0, 59)
    onChange(partsToMinutes({ ...parts, minute: parsed }))
  }

  const finishHour = () => {
    editingRef.current = null
    const digits = hourText.replace(/\D/g, '').slice(0, 2)
    const parsed = clamp(Number(digits || parts.hour), 1, 12)
    setHourText(String(parsed))
    onChange(partsToMinutes({ ...parts, hour: parsed }))
  }

  const finishMinute = () => {
    editingRef.current = null
    const digits = minuteText.replace(/\D/g, '').slice(0, 2)
    const parsed = clamp(Number(digits || 0), 0, 59)
    setMinuteText(String(parsed).padStart(2, '0'))
    onChange(partsToMinutes({ ...parts, minute: parsed }))
  }

  return (
    <div className="mx-auto mt-1 flex w-full max-w-[230px] items-center justify-center gap-1.5 rounded-full border bg-white px-2 py-1 shadow-sm" style={{ borderColor: color }}>
      <input
        aria-label="Hour"
        value={hourText}
        onFocus={(event) => {
          editingRef.current = 'hour'
          event.currentTarget.select()
        }}
        onBlur={finishHour}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, 2)
          setHourText(next)
          commitHour(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="w-10 rounded-lg border bg-transparent text-center font-mono text-xl font-black outline-none"
        style={{ borderColor: tint, color }}
        inputMode="numeric"
      />
      <span className="font-mono text-xl font-black text-[#9CA3AF]">:</span>
      <input
        aria-label="Minute"
        value={minuteText}
        onFocus={(event) => {
          editingRef.current = 'minute'
          event.currentTarget.select()
        }}
        onBlur={finishMinute}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, 2)
          setMinuteText(next)
          commitMinute(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="w-12 rounded-lg border bg-transparent text-center font-mono text-xl font-black outline-none"
        style={{ borderColor: tint, color }}
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={() => onChange(partsToMinutes({ ...parts, period: parts.period === 'AM' ? 'PM' : 'AM' }))}
        className="rounded-full px-3 py-1 text-sm font-black text-white"
        style={{ background: color }}
      >
        {parts.period}
      </button>
    </div>
  )
}

export default function ElapsedTimeClock() {
  const [startTime, setStartTime] = useState(9 * 60 + 15)
  const [endTime, setEndTime] = useState(12 * 60)
  const [view, setView] = useState('set')
  const [playProgress, setPlayProgress] = useState(0)
  const frameRef = useRef(null)
  const elapsed = useMemo(() => getElapsed(startTime, endTime), [endTime, startTime])

  const cancelPlayback = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const playElapsed = useCallback(() => {
    cancelPlayback()
    setView('play')
    setPlayProgress(0)
    const duration = 3900
    const startedAt = performance.now()

    const tick = (now) => {
      const next = Math.min(1, (now - startedAt) / duration)
      setPlayProgress(next)
      if (next < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [cancelPlayback])

  const editTimes = () => {
    cancelPlayback()
    setView('set')
    setPlayProgress(0)
  }

  useEffect(() => () => cancelPlayback(), [cancelPlayback])

  const crossesPeriod = minutesToParts(startTime).period !== minutesToParts(endTime).period
  const hint = `From ${formatClock(startTime)} to ${formatClock(endTime)} is ${formatDuration(elapsed, true)}. Count the hours first, then the extra minutes${crossesPeriod ? ' and watch the AM/PM change.' : '.'}`

  return (
    <div className="flex h-[500px] flex-col gap-1 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.navy }}>
      <style>
        {`
          @keyframes elapsedViewIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.985); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black">
          <span style={{ color: colors.start }}>Start</span>
          <span className="text-[#9CA3AF]">-&gt;</span>
          <span style={{ color: colors.end }}>End</span>
          {view === 'play' && (
            <>
              <span className="text-[#9CA3AF]">-&gt;</span>
              <span style={{ color: colors.elapsed }}>Difference</span>
            </>
          )}
        </div>
        {view === 'set' ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            <div className="rounded-full px-3 py-1 text-xs font-black" style={{ color: colors.start, background: colors.startTint }}>
              Start {formatClock(startTime)}
            </div>
            <div className="rounded-full px-3 py-1 text-xs font-black" style={{ color: colors.end, background: colors.endTint }}>
              End {formatClock(endTime)}
            </div>
          </div>
        ) : (
          <div className="rounded-full px-4 py-1.5 text-sm font-black" style={{ color: colors.elapsed, background: colors.elapsedTint }}>
            Elapsed: {formatDuration(Math.round(elapsed * easeInOut(playProgress)), true)}
          </div>
        )}
      </div>

      {view === 'set' ? (
        <>
          <div className="grid h-[386px] shrink-0 grid-cols-2 gap-2 max-[560px]:h-auto max-[560px]:grid-cols-1 max-[560px]:overflow-y-auto" style={{ animation: 'elapsedViewIn 260ms ease-out both' }}>
            <ClockCanvas label="Start" time={startTime} color={colors.start} tint={colors.startTint} onChange={setStartTime} />
            <ClockCanvas label="End" time={endTime} color={colors.end} tint={colors.endTint} onChange={setEndTime} />
          </div>

          <button
            type="button"
            onClick={playElapsed}
            className="mx-auto w-full max-w-[420px] shrink-0 rounded-full px-5 py-1.5 text-base font-black text-white shadow-sm"
            style={{ background: colors.elapsed }}
          >
            Show elapsed time -&gt;
          </button>
        </>
      ) : (
        <>
          <div className="shrink-0 rounded-[14px] border bg-white p-2 shadow-sm" style={{ borderColor: colors.border, animation: 'elapsedViewIn 320ms ease-out both' }}>
            <PlaybackClock startTime={startTime} endTime={endTime} progress={playProgress} />
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={playElapsed}
              className="rounded-full px-5 py-2 text-base font-black text-white shadow-sm"
              style={{ background: colors.elapsed }}
            >
              Play again
            </button>
            <button
              type="button"
              onClick={editTimes}
              className="rounded-full border bg-white px-5 py-2 text-base font-black"
              style={{ borderColor: colors.start, color: colors.start }}
            >
              Edit times
            </button>
          </div>
        </>
      )}

      <p className="shrink-0 rounded-[14px] border bg-white px-3 py-1 text-center text-sm font-bold text-[#4B5563]" style={{ borderColor: colors.border }}>
        {view === 'set' ? 'Set the start and end times first, then show the elapsed-time clock.' : hint}
      </p>
    </div>
  )
}
