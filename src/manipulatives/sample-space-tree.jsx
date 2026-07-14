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

export default function SampleSpaceTree() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 720, h: 380 })
  const [expKey, setExpKey] = useState('coins')
  const [selected, setSelected] = useState(() => new Set())

  const exp = EXPERIMENTS[expKey]
  const a = exp.s1.length
  const b = exp.s2.length
  const N = a * b

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
    ctx.strokeStyle = '#C9CDd6'
    ctx.lineWidth = 1.5
    for (let j = 0; j < a; j += 1) {
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
      const o = exp.s1[j]
      ctx.fillStyle = colorOf(o)
      ctx.beginPath()
      ctx.arc(s1X, s1Y(j), 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '900 13px Inter, system-ui, sans-serif'
      ctx.fillText(o, s1X, s1Y(j))
    }

    // Leaves (stage 2) + outcome labels.
    const r = N > 9 ? 10 : 12
    for (let k = 0; k < N; k += 1) {
      const j = Math.floor(k / b)
      const i = k % b
      const o1 = exp.s1[j]
      const o2 = exp.s2[i]
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
  }, [size, geo, exp, a, b, N, selected])

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

  const changeExp = (key) => {
    setExpKey(key)
    setSelected(new Set())
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-2xl font-black tabular-nums">
        <span style={{ color: totalPurple }}>{N} outcomes</span>
        <span className="text-base font-bold" style={{ color: muted }}>= {a} × {b}</span>
        {selected.size > 0 && (
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
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: muted }}>
          Experiment:
          <select
            value={expKey}
            onChange={(e) => changeExp(e.target.value)}
            className="rounded-lg border border-[#E0DDD6] bg-white px-3 py-2 text-sm font-black outline-none"
            style={{ color: totalPurple }}
          >
            {Object.entries(EXPERIMENTS).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setSelected(new Set())} className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: '#E0DDD6', color: muted }}>
          Clear selection
        </button>
      </div>
    </div>
  )
}
