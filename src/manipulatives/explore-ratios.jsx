import { useCallback, useEffect, useRef, useState } from 'react'

const colors = {
  page: '#EAF4F8',
  card: '#ffffff',
  border: '#E0DDD6',
  ink: '#1A1A2E',
  muted: '#6B7280',
  blue: '#2E6FD4',
  blueDark: '#2660C4',
  blueSoft: '#DCE8FF',
  yellow: '#E8C33C',
  yellowDark: '#C79A1E',
  yellowSoft: '#FFF4BD',
  purple: '#7B3F9E',
  purpleSoft: '#F1E8F7',
}

const canvasHeight = 178
const maxBase = 9
const maxMultiplier = 8
const minReadableUnit = 12
const barLeft = 92
const barRightPad = 54

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = y
    y = x % y
    x = next
  }
  return x || 1
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

function maxGroupsThatFit(width, blue, yellow) {
  const availableWidth = width - barLeft - barRightPad
  const widestGroup = Math.max(blue, yellow)
  return clamp(Math.floor(availableWidth / (widestGroup * minReadableUnit)), 1, maxMultiplier)
}

function Stepper({ label, value, color, soft, dark, onChange }) {
  return (
    <div className="rounded-[14px] border bg-white px-4 py-3" style={{ borderColor: color }}>
      <div className="mb-2 text-center text-[11px] font-black uppercase tracking-wide" style={{ color: dark }}>{label}</div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-black text-white"
          style={{ background: color }}
        >
          -
        </button>
        <span className="min-w-14 rounded-2xl px-4 py-2 text-center font-mono text-3xl font-black" style={{ background: soft, color: dark }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-black text-white"
          style={{ background: color }}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function ExploreRatios() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [blue, setBlue] = useState(3)
  const [yellow, setYellow] = useState(2)
  const [multiplier, setMultiplier] = useState(1)
  const [animatedGroups, setAnimatedGroups] = useState(1)

  const fitMaxMultiplier = maxGroupsThatFit(canvasWidth, blue, yellow)
  const activeMultiplier = clamp(multiplier, 1, fitMaxMultiplier)
  const blueTotal = blue * activeMultiplier
  const yellowTotal = yellow * activeMultiplier
  const divisor = gcd(blue, yellow)
  const isSimplified = divisor === 1

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
    ctx.fillStyle = colors.card
    drawRoundRect(ctx, 0, 0, canvasWidth, canvasHeight, 14)
    ctx.fill()

    const labelX = 26
    const barX = barLeft
    const rightPad = barRightPad
    const availableWidth = canvasWidth - barX - rightPad
    const longestCurrent = Math.max(blueTotal, yellowTotal, maxBase)
    const unit = Math.min(34, availableWidth / longestCurrent)
    const barH = 34
    const rows = [
      { label: 'Blue', base: blue, value: blueTotal, y: 42, color: colors.blue, dark: colors.blueDark, soft: colors.blueSoft },
      { label: 'Yellow', base: yellow, value: yellowTotal, y: 108, color: colors.yellow, dark: colors.yellowDark, soft: colors.yellowSoft },
    ]
    const shortestX = barX + Math.min(blueTotal, yellowTotal) * unit
    const guideTop = rows[0].y - 8
    const guideBottom = rows[1].y + barH + 8

    rows.forEach((row) => {
      const width = Math.max(1, row.value * unit)
      const visibleWidth = Math.max(1, Math.min(row.value, animatedGroups * row.base) * unit)
      const trackW = width + Math.max(8, unit * 0.5)
      ctx.fillStyle = row.dark
      ctx.font = '800 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(row.label, labelX, row.y + barH / 2)

      ctx.fillStyle = row.soft
      ctx.globalAlpha = 0.35
      drawRoundRect(ctx, barX, row.y, trackW, barH, 9)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.save()
      ctx.beginPath()
      drawRoundRect(ctx, barX, row.y, visibleWidth, barH, 9)
      ctx.clip()
      for (let group = 0; group < activeMultiplier; group += 1) {
        const groupStart = barX + group * row.base * unit
        const groupWidth = row.base * unit
        const groupProgress = clamp(animatedGroups - group, 0, 1)
        if (groupProgress <= 0) continue
        ctx.globalAlpha = groupProgress
        ctx.fillStyle = group % 2 === 0 ? row.color : row.dark
        ctx.globalAlpha = group % 2 === 0 ? groupProgress : groupProgress * 0.86
        ctx.fillRect(groupStart, row.y, groupWidth, barH)
        ctx.globalAlpha = groupProgress
        ctx.strokeStyle = '#ffffff88'
        ctx.lineWidth = 1
        for (let i = 1; i < row.base; i += 1) {
          const x = groupStart + i * unit
          ctx.beginPath()
          ctx.moveTo(x, row.y + 4)
          ctx.lineTo(x, row.y + barH - 4)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      ctx.restore()

      ctx.strokeStyle = row.dark
      ctx.lineWidth = 2
      drawRoundRect(ctx, barX, row.y, width, barH, 9)
      ctx.stroke()

      ctx.strokeStyle = row.dark
      ctx.lineWidth = 3
      for (let group = 1; group < activeMultiplier; group += 1) {
        const x = barX + group * row.base * unit
        ctx.beginPath()
        ctx.moveTo(x, row.y - 2)
        ctx.lineTo(x, row.y + barH + 2)
        ctx.stroke()
      }

      const textX = Math.min(canvasWidth - 28, barX + width + 12)
      ctx.fillStyle = row.dark
      ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(String(row.value), textX, row.y + barH / 2)
    })

    if (blueTotal !== yellowTotal) {
      ctx.save()
      ctx.strokeStyle = colors.purple
      ctx.globalAlpha = 0.22
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(shortestX, guideTop)
      ctx.lineTo(shortestX, guideBottom)
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = colors.purple
    ctx.font = '900 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${activeMultiplier} group${activeMultiplier === 1 ? '' : 's'} of ${blue}:${yellow}`, barX + Math.max(blueTotal, yellowTotal) * unit / 2, 24)
  }, [activeMultiplier, animatedGroups, blue, blueTotal, canvasWidth, yellow, yellowTotal])

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

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const startedAt = performance.now()
    const duration = 520
    const tick = (now) => {
      const t = clamp((now - startedAt) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedGroups(activeMultiplier * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      setAnimatedGroups(activeMultiplier)
      frameRef.current = null
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [activeMultiplier, blue, yellow])

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-3 overflow-hidden p-4 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <section className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Stepper label="Blue" value={blue} color={colors.blue} soft={colors.blueSoft} dark={colors.blueDark} onChange={(value) => setBlue(clamp(value, 1, 9))} />
        <div className="font-mono text-4xl font-black text-slate-400">:</div>
        <Stepper label="Yellow" value={yellow} color={colors.yellow} soft={colors.yellowSoft} dark={colors.yellowDark} onChange={(value) => setYellow(clamp(value, 1, 9))} />
      </section>

      <section ref={wrapRef} className="shrink-0 overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: colors.border }}>
        <canvas ref={canvasRef} className="block touch-none" aria-label="Two equivalent ratio bars" />
      </section>

      <section className="shrink-0 rounded-[14px] border bg-white px-5 py-4" style={{ borderColor: colors.border }}>
        <div className="mb-3 flex items-center justify-center gap-4">
          <span className="text-sm font-black uppercase tracking-wide text-slate-500">Make copies of the ratio</span>
          <span className="rounded-2xl px-5 py-2 font-mono text-4xl font-black text-white shadow-sm" style={{ background: colors.purple }}>
            &times;{activeMultiplier}
          </span>
          <span className="text-sm font-bold text-slate-500">{activeMultiplier} group{activeMultiplier === 1 ? '' : 's'} of {blue}:{yellow}</span>
        </div>
        <input
          type="range"
          min="1"
          max={fitMaxMultiplier}
          value={activeMultiplier}
          onChange={(event) => setMultiplier(Number(event.target.value))}
          className="w-full accent-[#7B3F9E]"
          aria-label="Scale both parts by multiplier"
        />
        {fitMaxMultiplier < maxMultiplier && (
          <div className="mt-2 text-center text-xs font-bold text-slate-500">
            Slider stops at &times;{fitMaxMultiplier} so the groups stay readable.
          </div>
        )}
      </section>

      <section className="flex min-h-0 flex-1 items-center justify-center rounded-[14px] border bg-white px-4 text-center" style={{ borderColor: colors.border }}>
        <div className="font-mono font-black">
          {activeMultiplier === 1 ? (
            <div className="text-5xl">
              <span style={{ color: colors.blueDark }}>{blue}</span>
              <span className="px-3 text-slate-400">:</span>
              <span style={{ color: colors.yellowDark }}>{yellow}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <span className="text-3xl opacity-40">
                <span style={{ color: colors.blueDark }}>{blue}</span>
                <span className="px-2 text-slate-500">:</span>
                <span style={{ color: colors.yellowDark }}>{yellow}</span>
              </span>
              <span className="text-4xl text-slate-400">=</span>
              <span className="text-5xl">
                <span style={{ color: colors.blueDark }}>{blueTotal}</span>
                <span className="px-3 text-slate-400">:</span>
                <span style={{ color: colors.yellowDark }}>{yellowTotal}</span>
              </span>
            </div>
          )}
          {!isSimplified && (
            <div className="mt-2 text-sm font-bold text-slate-500">
              = <span style={{ color: colors.blueDark }}>{blue / divisor}</span>
              <span className="px-1">:</span>
              <span style={{ color: colors.yellowDark }}>{yellow / divisor}</span> simplified
            </div>
          )}
          <div className="mt-3 text-sm font-bold text-slate-500">
            <span style={{ color: colors.purple }}>{activeMultiplier} group{activeMultiplier === 1 ? '' : 's'}</span> of <span style={{ color: colors.blueDark }}>{blue}</span>
            <span className="px-1">:</span>
            <span style={{ color: colors.yellowDark }}>{yellow}</span> — both parts grew &times;{activeMultiplier}, so the ratio stays the same.
          </div>
        </div>
      </section>
    </div>
  )
}
