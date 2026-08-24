import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  accent: '#1E7A8C',
  border: '#E0DDD6',
  muted: '#5F5E5A',
}

const choices = [
  { id: 'red', name: 'Red', color: '#E23B4E' },
  { id: 'blue', name: 'Blue', color: '#2E6FD4' },
  { id: 'green', name: 'Green', color: '#1FA05E' },
  { id: 'gold', name: 'Gold', color: '#F0A722' },
]

const presets = {
  equal4: { label: '4 equal', parts: { red: 1, blue: 1, green: 1, gold: 1 } },
  equal3: { label: '3 equal', parts: { red: 1, blue: 1, green: 1, gold: 0 } },
  halfQuarters: { label: 'Half & quarters', parts: { red: 2, blue: 1, green: 1, gold: 0 } },
  custom: { label: 'Custom', parts: null },
}

const canvasSize = 268

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function normalizeAngle(angle) {
  const full = Math.PI * 2
  return ((angle % full) + full) % full
}

function percent(value) {
  return `${Math.round(value * 100)}%`
}

function activeSlices(parts) {
  const total = choices.reduce((sum, item) => sum + (parts[item.id] || 0), 0)
  if (total < 1) return []
  let start = 0
  return choices
    .filter((item) => parts[item.id] > 0)
    .map((item) => {
      const share = parts[item.id] / total
      const slice = {
        ...item,
        parts: parts[item.id],
        share,
        start,
        end: start + share * Math.PI * 2,
      }
      start = slice.end
      return slice
    })
}

function landedSlice(parts, rotation) {
  const slices = activeSlices(parts)
  const angleUnderPointer = normalizeAngle(-rotation)
  return slices.find((slice) => angleUnderPointer >= slice.start && angleUnderPointer < slice.end) ?? slices[slices.length - 1]
}

function drawSpinner(ctx, width, height, parts, rotation) {
  const slices = activeSlices(parts)
  const cx = width / 2
  const cy = height / 2 + 3
  const radius = Math.min(width, height) * 0.37

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  if (!slices.length) {
    ctx.fillStyle = colors.muted
    ctx.font = '800 17px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Add at least 1 part.', cx, cy)
    return
  }

  slices.forEach((slice) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, rotation + slice.start, rotation + slice.end)
    ctx.closePath()
    ctx.fillStyle = slice.color
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
  })

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, 17, 0, Math.PI * 2)
  ctx.fillStyle = colors.ink
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  const tipX = cx + radius - 9
  ctx.beginPath()
  ctx.moveTo(tipX, cy)
  ctx.lineTo(cx + radius + 29, cy - 15)
  ctx.lineTo(cx + radius + 29, cy + 15)
  ctx.closePath()
  ctx.fillStyle = colors.ink
  ctx.fill()
}

export default function ProbabilitySpinner() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const mountedRef = useRef(true)
  const [mode, setMode] = useState('equal4')
  const [parts, setParts] = useState(presets.equal4.parts)
  const [rotation, setRotation] = useState(0)
  const [counts, setCounts] = useState({})
  const [spinning, setSpinning] = useState(false)
  const [lastLand, setLastLand] = useState(null)

  const slices = useMemo(() => activeSlices(parts), [parts])
  const totalParts = useMemo(() => choices.reduce((sum, item) => sum + (parts[item.id] || 0), 0), [parts])
  const totalSpins = useMemo(() => Object.values(counts).reduce((sum, count) => sum + count, 0), [counts])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawSpinner(ctx, canvasSize, canvasSize, parts, rotation)
  }, [parts, rotation])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const resetCounts = () => {
    setCounts({})
    setLastLand(null)
  }

  const choosePreset = (key) => {
    setMode(key)
    if (key !== 'custom') {
      setParts(presets[key].parts)
      resetCounts()
    }
  }

  const setPart = (id, delta) => {
    setMode('custom')
    setParts((current) => {
      const nextValue = clamp((current[id] || 0) + delta, 0, 8)
      const totalWithout = choices.reduce((sum, item) => sum + (item.id === id ? 0 : current[item.id] || 0), 0)
      if (nextValue === 0 && totalWithout === 0) return current
      return { ...current, [id]: nextValue }
    })
    resetCounts()
  }

  const spinOnce = useCallback((duration = 520) => {
    if (totalParts < 1) return Promise.resolve(null)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    const startRotation = rotation
    const finalRotation = startRotation + Math.PI * 2 * (2 + Math.random() * 2) + Math.random() * Math.PI * 2
    const startTime = performance.now()

    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeOutCubic(t)
        const currentRotation = startRotation + (finalRotation - startRotation) * eased
        setRotation(currentRotation)
        if (t < 1) {
          animationRef.current = requestAnimationFrame(tick)
          return
        }
        const landed = landedSlice(parts, finalRotation)
        setRotation(finalRotation)
        if (landed) {
          setCounts((current) => ({ ...current, [landed.id]: (current[landed.id] || 0) + 1 }))
          setLastLand(landed.id)
        }
        resolve(landed)
      }
      animationRef.current = requestAnimationFrame(tick)
    })
  }, [parts, rotation, totalParts])

  const handleSpinOnce = async () => {
    if (spinning) return
    setSpinning(true)
    await spinOnce(600)
    if (mountedRef.current) setSpinning(false)
  }

  const handleSpinMany = async () => {
    if (spinning) return
    setSpinning(true)
    for (let i = 0; i < 50 && mountedRef.current; i += 1) {
      await spinOnce(138)
    }
    if (mountedRef.current) setSpinning(false)
  }

  const hint =
    totalSpins < 10
      ? 'Small samples are jumpy, so the bars may miss the black theory lines.'
      : totalSpins < 50
        ? 'The bars are starting to settle toward the true probability for each colour.'
        : 'Law of large numbers: after many spins, experimental frequency gets closer to the true probability.'

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-3" style={{ background: colors.page, color: colors.ink }}>
      <div className="flex h-[86px] shrink-0 flex-col justify-start gap-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => choosePreset(key)}
              className="rounded-full border px-4 py-1.5 text-[15px] font-black transition"
              style={{
                borderColor: mode === key ? colors.accent : colors.border,
                background: mode === key ? colors.accent : '#ffffff',
                color: mode === key ? '#ffffff' : colors.ink,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="h-[46px] overflow-hidden">
          {mode === 'custom' && (
            <div className="grid grid-cols-4 gap-1 rounded-xl border bg-white p-1" style={{ borderColor: colors.border }}>
              {choices.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-1 rounded-lg px-1.5 py-1" style={{ background: `${item.color}18` }}>
                  <span className="flex items-center gap-1 text-[12px] font-black" style={{ color: item.color }}>
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPart(item.id, -1)}
                      disabled={spinning}
                      className="grid h-5 w-5 place-items-center rounded-full text-[13px] font-black text-white disabled:opacity-40"
                      style={{ background: item.color }}
                    >
                      -
                    </button>
                    <span className="w-3 text-center font-mono text-[13px] font-black">{parts[item.id] || 0}</span>
                    <button
                      type="button"
                      onClick={() => setPart(item.id, 1)}
                      disabled={spinning}
                      className="grid h-5 w-5 place-items-center rounded-full text-[13px] font-black text-white disabled:opacity-40"
                      style={{ background: item.color }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[310px_1fr] gap-3">
        <section className="flex min-h-0 flex-col items-center rounded-xl border bg-white p-2" style={{ borderColor: colors.border }}>
          <canvas ref={canvasRef} className="block" aria-label="Probability spinner" />
          <div className="mt-0 flex w-full gap-2">
            <button
              type="button"
              onClick={handleSpinOnce}
              disabled={spinning}
              className="flex-1 rounded-full px-3 py-1.5 text-[15px] font-black text-white disabled:opacity-50"
              style={{ background: colors.accent }}
            >
              Spin once
            </button>
            <button
              type="button"
              onClick={handleSpinMany}
              disabled={spinning}
              className="flex-1 rounded-full px-3 py-1.5 text-[15px] font-black text-white disabled:opacity-50"
              style={{ background: colors.accent }}
            >
              Spin x50
            </button>
          </div>
          <button
            type="button"
            onClick={resetCounts}
            disabled={spinning}
            className="mt-1 w-full shrink-0 rounded-full border bg-white px-3 py-1.5 text-[15px] font-black disabled:opacity-50"
            style={{ borderColor: colors.border, color: colors.ink }}
          >
            Reset counts
          </button>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border bg-white p-3" style={{ borderColor: colors.border }}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-black">Results</h2>
            <span className="rounded-full px-3 py-1 text-[13px] font-black" style={{ background: '#EEF6F8', color: colors.accent }}>
              {totalSpins} spins so far
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {slices.map((slice) => {
              const count = counts[slice.id] || 0
              const experimental = totalSpins ? count / totalSpins : 0
              return (
                <div key={slice.id}>
                  <div className="mb-1 flex items-center justify-between text-[13px] font-black">
                    <span style={{ color: slice.color }}>{slice.name}</span>
                    <span className="text-neutral-600">
                      {count} / {totalSpins || 0} · true: {percent(slice.share)}
                    </span>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded-full border bg-neutral-100" style={{ borderColor: colors.border }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{ width: `${experimental * 100}%`, background: slice.color }}
                    />
                    {experimental > 0.16 && (
                      <div className="absolute inset-y-0 left-2 flex items-center text-[13px] font-black text-white">
                        {percent(experimental)}
                      </div>
                    )}
                    <div
                      className="absolute top-0 h-full w-[3px] rounded-full"
                      style={{ left: `calc(${slice.share * 100}% - 1.5px)`, background: colors.ink }}
                    />
                    {lastLand === slice.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-0.5 text-[11px] font-black" style={{ color: slice.color }}>
                        landed
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="rounded-xl border bg-white px-3 py-2 text-center text-[15px] font-semibold text-neutral-700" style={{ borderColor: colors.border }}>
        {hint}
      </div>
    </div>
  )
}
