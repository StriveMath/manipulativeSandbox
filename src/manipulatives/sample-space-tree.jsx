import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const selBlue = '#2563EB'
const totalPurple = '#7C3AED'

const OPT_COLORS = {
  H: '#2563EB', T: '#D85A30',
  R: '#D8402F', B: '#2563EB', G: '#1D9E75',
}
const numColor = '#7C3AED'
const colorOf = (o) => OPT_COLORS[o] || numColor

const EXPERIMENTS = {
  coins: { name: 'Two coins', s1: ['H', 'T'], s2: ['H', 'T'] },
  coindie: { name: 'Coin + Die', s1: ['H', 'T'], s2: ['1', '2', '3', '4', '5', '6'] },
  spinners: { name: 'Two spinners (R/B/G)', s1: ['R', 'B', 'G'], s2: ['R', 'B', 'G'] },
}

// Comma-separated options -> labels (max 6 a stage so the tree stays readable).
const parseOpts = (text) => {
  const o = text.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6)
  return o.length ? o : ['?']
}

export default function SampleSpaceTree() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 720, h: 380 })
  const [s1Text, setS1Text] = useState('H,T')
  const [s2Text, setS2Text] = useState('H,T')
  const [selected, setSelected] = useState(() => new Set())
  // Layered reveals: the teacher peels back one idea at a time.
  const [show, setShow] = useState({ count: true, prob: true })
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }))

  // Stages are free text, so a teacher (or the worksheet AI) can define any
  // experiment; the presets below just load a starting pair.
  const s1 = useMemo(() => parseOpts(s1Text), [s1Text])
  const s2 = useMemo(() => parseOpts(s2Text), [s2Text])
  const a = s1.length
  const b = s2.length
  const N = a * b
  const matchKey =
    Object.entries(EXPERIMENTS).find(([, v]) => v.s1.join(',') === s1.join(',') && v.s2.join(',') === s2.join(','))?.[0] || 'custom'

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    let raf = 0
    const commit = (box) => {
      const w = Math.max(420, Math.round(box.width))
      const h = Math.max(240, Math.round(box.height))
      setSize((prev) => (Math.abs(prev.w - w) >= 1 || Math.abs(prev.h - h) >= 1 ? { w, h } : prev))
    }
    commit(node.getBoundingClientRect())
    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => commit(cr))
    })
    observer.observe(node)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const geo = useMemo(() => {
    const { w, h } = size
    const rootX = 46
    const s1X = w * 0.3
    const leafX = w * 0.58
    const topPad = 26
    const availH = h - topPad - 18
    const leafY = (k) => topPad + (N === 1 ? availH / 2 : (k / (N - 1)) * availH)
    const s1Y = (j) => (leafY(j * b) + leafY(j * b + b - 1)) / 2
    return { rootX, s1X, leafX, topPad, availH, leafY, s1Y, w, h }
  }, [size, N, b])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cw = Math.round(size.w * dpr)
    const ch = Math.round(size.h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    const { rootX, s1X, leafX, leafY, s1Y } = geo
    const rootY = size.h / 2

    // Edges root -> stage 1.
    for (let j = 0; j < a; j += 1) {
      const anySel = [...selected].some((k) => Math.floor(k / b) === j)
      ctx.strokeStyle = anySel ? selBlue : '#C9CDd6'
      ctx.lineWidth = anySel ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(rootX + 14, rootY)
      ctx.lineTo(s1X - 14, s1Y(j))
      ctx.stroke()
    }
    // Edges stage 1 -> leaves.
    for (let k = 0; k < N; k += 1) {
      const j = Math.floor(k / b)
      ctx.strokeStyle = selected.has(k) ? selBlue : '#C9CDd6'
      ctx.lineWidth = selected.has(k) ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(s1X + 14, s1Y(j))
      ctx.lineTo(leafX - 12, leafY(k))
      ctx.stroke()
    }

    // Branch probability labels (each branch is equally likely).
    if (show.prob) {
      ctx.font = '700 10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = selBlue
      for (let j = 0; j < a; j += 1) {
        const mx = rootX + 14 + (s1X - 14 - (rootX + 14)) * 0.42
        const my = rootY + (s1Y(j) - rootY) * 0.42
        ctx.fillText(`1/${a}`, mx, my - 7)
      }
      if (b <= 4) {
        for (let k = 0; k < N; k += 1) {
          const j = Math.floor(k / b)
          const mx = s1X + 14 + (leafX - 12 - (s1X + 14)) * 0.45
          const my = s1Y(j) + (leafY(k) - s1Y(j)) * 0.45
          ctx.fillText(`1/${b}`, mx, my - 6)
        }
      }
      // Per-outcome probability note.
      ctx.fillStyle = selBlue
      ctx.font = '800 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`each outcome = 1/${N}`, leafX - 12, 6)
    }

    // Root node.
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(rootX, rootY, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '800 9px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('start', rootX, rootY)

    // Stage 1 nodes.
    for (let j = 0; j < a; j += 1) {
      const o = s1[j]
      if ([...selected].some((k) => Math.floor(k / b) === j)) {
        ctx.strokeStyle = selBlue
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(s1X, s1Y(j), 16, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = colorOf(o)
      ctx.beginPath()
      ctx.arc(s1X, s1Y(j), 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '900 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(o, s1X, s1Y(j))
    }

    // Leaves (stage 2) + outcome labels.
    const r = N > 9 ? 10 : 12
    for (let k = 0; k < N; k += 1) {
      const j = Math.floor(k / b)
      const i = k % b
      const o1 = s1[j]
      const o2 = s2[i]
      const y = leafY(k)
      const on = selected.has(k)
      ctx.fillStyle = colorOf(o2)
      ctx.beginPath()
      ctx.arc(leafX, y, r, 0, Math.PI * 2)
      ctx.fill()
      if (on) {
        ctx.strokeStyle = selBlue
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(leafX, y, r + 3, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${r > 10 ? 12 : 10}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(o2, leafX, y)
      // outcome text
      ctx.fillStyle = on ? selBlue : ink
      ctx.font = `${on ? '900' : '700'} ${N > 9 ? 12 : 14}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(`${o1}${o2}`, leafX + r + 8, y)
    }
  }, [size, geo, s1, s2, a, b, N, selected, show])

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) * (size.w / rect.width)
    const y = (event.clientY - rect.top) * (size.h / rect.height)
    for (let k = 0; k < N; k += 1) {
      const ly = geo.leafY(k)
      if (x >= geo.leafX - 16 && x <= geo.leafX + 70 && Math.abs(y - ly) <= 16) {
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(k)) next.delete(k)
          else next.add(k)
          return next
        })
        return
      }
    }
  }

  const loadStarter = (key) => {
    const p = EXPERIMENTS[key]
    if (!p) return
    setS1Text(p.s1.join(','))
    setS2Text(p.s2.join(','))
    setSelected(new Set())
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-2xl font-black tabular-nums">
        <span style={{ color: totalPurple }}>{show.count ? N : '?'} outcomes</span>
        {show.count && <span className="text-base font-bold" style={{ color: muted }}>= {a} × {b}</span>}
        {show.prob && selected.size > 0 && (
          <span className="text-base font-black" style={{ color: selBlue }}>· P(selected) = {selected.size}/{N}</span>
        )}
      </div>

      <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas ref={canvasRef} className="h-full w-full cursor-pointer" onClick={handleClick} />
      </div>

      <p className="text-center text-sm font-semibold" style={{ color: muted }}>
        The tree lists every combined outcome exactly once — count them by multiplying the branches. Click outcomes to pick an event.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: muted }}>
          Starter:
          <select
            value={matchKey}
            onChange={(e) => loadStarter(e.target.value)}
            className="rounded-lg border border-[#E0DDD6] bg-white px-2 py-1.5 text-sm font-black outline-none"
            style={{ color: totalPurple }}
          >
            {Object.entries(EXPERIMENTS).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {/* Any experiment: type the outcomes for each stage. */}
        <label className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: muted }}>
          Stage 1:
          <input
            value={s1Text}
            onChange={(e) => { setS1Text(e.target.value); setSelected(new Set()) }}
            className="w-28 rounded-lg border border-[#E0DDD6] bg-white px-2 py-1.5 text-sm font-black outline-none"
            style={{ color: ink }}
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: muted }}>
          Stage 2:
          <input
            value={s2Text}
            onChange={(e) => { setS2Text(e.target.value); setSelected(new Set()) }}
            className="w-28 rounded-lg border border-[#E0DDD6] bg-white px-2 py-1.5 text-sm font-black outline-none"
            style={{ color: ink }}
          />
        </label>
        <button type="button" onClick={() => setSelected(new Set())} className="rounded-full border px-3 py-1.5 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Clear selection
        </button>
        <ToggleChip label="Show count" color={totalPurple} on={show.count} onClick={() => toggle('count')} />
        <ToggleChip label="Show probabilities" color={selBlue} on={show.prob} onClick={() => toggle('prob')} />
      </div>
    </div>
  )
}

// One reveal layer. The dot carries the layer's colour so the chip and the
// thing it reveals read as the same idea.
function ToggleChip({ label, color, on, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm font-bold"
      style={{ borderColor: on ? color : '#E0DDD6', color: on ? color : muted }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? color : '#C9CDD6' }} />
      {label}
    </button>
  )
}
