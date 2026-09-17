import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, Move, Triangle } from 'lucide-react'

// Pendulum acceleration and damping; lengths are in classroom units.
const GRAV = 20
const DAMP = 1.1
const COLORS = ['#0EA5A4', '#F97316', '#7C3AED']
const INK = '#16233A'
const THEMES = {
  valid: ['#16A34A', '#DCFCE7', 'Yes! A triangle.'],
  flat: ['#D97706', '#FEF3C7', 'It falls flat.'],
  none: ['#E11D48', '#FFE4E6', 'These sides cannot meet.'],
}
const UP = [Math.PI / 2, Math.PI / 2]
const DOWN = [-Math.PI / 2, 3 * Math.PI / 2]
// Fixed SVG geometry: all 10-unit arms, including their full swings, fit.
const PPU = 16
const AX = 170
const AY = 190
const ROLES = ['Base', 'Left arm', 'Right arm']
const clamp = value => Math.max(1, Math.min(10, value))
const display = value => Math.round(value)

export default function TriangleInequality() {
  const [values, setValues] = useState([3, 4, 5])
  const [phase, setPhase] = useState('ready')
  const [angles, setAngles] = useState(UP)
  const svgRef = useRef(null)
  const drag = useRef(null)
  const motion = useRef({ angles: [...UP], velocity: [0, 0] })
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // Slot identities are permanent: A is the base, B the left arm, C the right.
  const [base, left, right] = values.map((length, id) => ({ length, id }))
  const [draggingId, setDraggingId] = useState(null)
  // Longest-side comparison is for the verdict/rule bars only, never geometry.
  const longest = [base, left, right].reduce((a, side) => side.length > a.length ? side : a)
  const shorter = [base, left, right].filter(side => side.id !== longest.id)
  const shorterSum = shorter.reduce((total, side) => total + side.length, 0)
  const b = base.length, l = left.length, r = right.length
  const sum = l + r
  const valid = b < l + r && l < b + r && r < b + l
  const status = valid ? 'valid' : longest.length === shorterSum ? 'flat' : 'none'
  const showGap = b > l + r
  const [accent, soft, headline] = THEMES[status]
  const checked = phase !== 'ready'

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let frame, previous, gapTime = 0
    const apexX = (b * b + l * l - r * r) / (2 * b)
    const apexY = Math.sqrt(Math.max(0, l * l - apexX * apexX))
    const goal = phase === 'ready' ? UP : status === 'valid'
      ? [Math.atan2(apexY, apexX), Math.atan2(apexY, apexX - b)]
      : status === 'flat' ? (l === b + r ? [0, 0] : r === b + l ? [Math.PI, Math.PI] : [0, Math.PI]) : [0, Math.PI]
    const tick = time => {
      const dt = Math.min(previous === undefined ? 1 / 60 : (time - previous) / 1000, 0.04)
      previous = time
      const state = motion.current
      if (phase === 'falling') {
        // Semi-implicit integration with small substeps, independent of frame rate.
        for (let step = 0; step < 8; step++) {
          const h = dt / 8
          for (let arm = 0; arm < 2; arm++) {
            const length = arm === 0 ? l : r
            state.velocity[arm] += (-(GRAV / length) * Math.sin(state.angles[arm] - DOWN[arm]) - DAMP * state.velocity[arm]) * h
            state.angles[arm] += state.velocity[arm] * h
          }
        }
        if (reduced || state.angles.every((a, i) => Math.abs(a - DOWN[i]) < 0.002 && Math.abs(state.velocity[i]) < 0.005)) {
          state.angles = [...DOWN]
          setAngles([...DOWN])
          setPhase('settled')
          return
        }
      } else if (phase === 'settled') {
        return
      } else {
        const ease = reduced ? 1 : 1 - Math.pow(0.86, dt * 60)
        state.angles = state.angles.map((angle, i) => angle + (goal[i] - angle) * ease)
        state.velocity = [0, 0]
        const arrived = state.angles.every((angle, i) => Math.abs(angle - goal[i]) < 0.002)
        if (arrived) {
          state.angles = [...goal]
          if (phase === 'closing') {
            setAngles([...goal])
            setPhase(status !== 'none' ? 'closed' : showGap ? 'gap' : 'falling')
            return
          }
          if (phase === 'gap') {
            gapTime += dt
            if (gapTime >= (reduced ? 0.1 : 1.2)) {
              setPhase('falling')
              return
            }
          } else {
            setAngles([...goal])
            return
          }
        }
      }
      setAngles([...state.angles])
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [b, l, r, phase, status, reduced, showGap])

  const reset = () => setPhase('ready')
  const changeSide = (id, value) => {
    setValues(old => old.map((length, i) => i === id ? clamp(value) : length))
    reset()
  }
  // SVG-to-screen scaling is handled by the shared canvas, never by lengths.
  const originX = AX
  const baseline = AY
  const tip = (hinge, length, angle) => [hinge + length * PPU * Math.cos(angle), AY - length * PPU * Math.sin(angle)]
  const endX = AX + b * PPU
  const lt = tip(AX, l, angles[0]), rt = tip(endX, r, angles[1])
  const point = event => {
    const matrix = svgRef.current.getScreenCTM()
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null
  }
  const startDrag = (event, side, axis) => {
    if (checked || drag.current) return
    event.preventDefault()
    // Start from vertical ready arms, even if the reset tween is still finishing.
    motion.current.angles = [...UP]
    motion.current.velocity = [0, 0]
    setAngles([...UP])
    drag.current = { id: side.id, axis, pointerId: event.pointerId }
    setDraggingId(side.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = event => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId || checked) return
    const p = point(event)
    if (!p) return
    // Project onto the permanent axis. Perpendicular jitter has no effect.
    const length = clamp((d.axis === 'x' ? p.x - AX : AY - p.y) / PPU)
    setValues(old => old.map((value, id) => id === d.id ? length : value))
  }
  const endDrag = event => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    setValues(old => old.map((value, id) => id === d.id ? Math.round(value) : value))
    drag.current = null
    setDraggingId(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handle = (side, x, y, axis) => <circle key={`handle-${side.id}`} cx={x} cy={y} r={checked ? 5 : 12}
    fill={COLORS[side.id]} stroke="white" strokeWidth="3" style={{ cursor: checked ? 'default' : draggingId === side.id ? 'grabbing' : 'grab', touchAction: 'none' }}
    role={checked ? undefined : 'slider'} tabIndex={checked ? undefined : 0} aria-label={`Drag Side ${'ABC'[side.id]}`}
    aria-valuemin={1} aria-valuemax={10} aria-valuenow={side.length}
    onKeyDown={event => {
      if (!checked && ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault()
        changeSide(side.id, Math.round(side.length) + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1))
      }
    }} onPointerDown={event => startDrag(event, side, axis)} onPointerMove={moveDrag}
    onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} />
  const line = (side, x1, y1, x2, y2) => <g key={`line-${side.id}`}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS[side.id]} strokeWidth="9" strokeLinecap="round" />
    <text x={(x1 + x2) / 2 + (y1 === y2 ? 0 : 14)} y={(y1 + y2) / 2 + (y1 === y2 ? 25 : 0)} textAnchor="middle" dominantBaseline="middle"
      fill={COLORS[side.id]} fontSize="21" fontWeight="800" stroke="white" strokeWidth="5" paintOrder="stroke">{display(side.length)}</text>
  </g>
  const barScale = 100 / Math.max(shorterSum, longest.length)

  return <div className="flex h-[500px] w-[800px] flex-col overflow-hidden p-3" style={{ color: INK, backgroundColor: '#F3F6FB', backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, #16233A06 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, #16233A06 24px)' }}>
    <header className="mb-3 shrink-0">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#516080' }}><Triangle size={17} /> Triangle lab</div>
      <h1 className="text-xl font-extrabold">Will these sides make a triangle?</h1>
      <p className="mt-1 text-xs" style={{ color: '#516080' }}>Choose three lengths. Check to see whether the arms can meet.</p>
    </header>
    <div className="flex min-h-0 flex-1 flex-row gap-2">
      <section className="w-[152px] shrink-0 rounded-2xl bg-white p-2 shadow-sm">
        <h2 className="mb-2 text-sm font-bold">Set the sides</h2>
        {values.map((value, id) => <div className="mb-2" key={id}>
          <label htmlFor={`triangle-side-${id}`} className="mb-1 flex items-center justify-between text-xs font-bold"><span style={{ color: COLORS[id] }}>{'ABC'[id]} · {ROLES[id]}</span><span className="rounded-lg px-2 py-0.5 text-sm" style={{ background: `${COLORS[id]}15`, color: COLORS[id] }}>{display(value)}</span></label>
          <input id={`triangle-side-${id}`} className="block h-4 w-full cursor-pointer" style={{ accentColor: COLORS[id] }} type="range" min="1" max="10" step="any" value={value} onChange={event => changeSide(id, Math.round(Number(event.target.value)))} />
          <div className="flex justify-between text-[10px] text-slate-400"><span>1</span><span>10</span></div>
        </div>)}
        <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-white disabled:opacity-40" style={{ background: INK }} disabled={checked} onClick={() => { drag.current = null; setPhase('closing') }}><Check size={19} />Check</button>
        <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-[11px] font-semibold hover:bg-slate-50" onClick={reset}><RotateCcw size={16} />Stand them back up</button>
        <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Try a set</p>
        <div className="grid grid-cols-2 gap-1">{[[3, 4, 5], [2, 3, 9], [3, 4, 7], [6, 6, 6]].map(preset => <button key={preset.join()} className="rounded-lg border border-slate-200 py-1.5 text-xs font-semibold hover:bg-slate-100" onClick={() => { setValues(preset); reset() }}>{preset.join(' · ')}</button>)}</div>
      </section>
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2 px-1 pt-1 text-[9px] font-semibold text-slate-500"><span>BASE: SIDE {'ABC'[base.id]}</span><span>{checked ? 'Watch what happens' : 'Drag a colored handle'}</span></div>
        <svg ref={svgRef} className="min-h-0 w-full flex-1" viewBox="0 0 500 380" preserveAspectRatio="xMidYMid meet" aria-label={`Side ${'ABC'[base.id]} is the base, length ${b}; arms have lengths ${l} and ${r}.`}>
          {phase === 'closed' && status === 'valid' && <path d={`M ${originX} ${baseline} L ${lt[0]} ${lt[1]} L ${endX} ${baseline} Z`} fill="#DCFCE7" />}
          <line x1="15" y1={baseline} x2="485" y2={baseline} stroke="#E2E8F0" strokeDasharray="4 5" />
          {line(base, originX, baseline, endX, baseline)}
          {line(left, originX, baseline, ...lt)}{line(right, endX, baseline, ...rt)}
          {[originX, endX].map(x => <circle key={x} cx={x} cy={baseline} r="5" fill={INK} />)}
          {handle(base, endX, baseline, 'x')}{handle(left, ...lt, 'y')}{handle(right, ...rt, 'y')}
          {phase === 'gap' && showGap && <g><line x1={lt[0]} y1={baseline} x2={rt[0]} y2={baseline} stroke="#E11D48" strokeWidth="3" strokeDasharray="5 4" /><text x={(lt[0] + rt[0]) / 2} y={baseline - 18} textAnchor="middle" fill="#E11D48" fontSize="16" fontWeight="700">gap of {display(b - sum)}</text></g>}
        </svg>
        <p className="flex items-center justify-center gap-1 pb-1 text-center text-[10px] text-slate-500"><Move size={15} />{checked ? 'Change a length or reset to explore again.' : 'A: base · B: left arm · C: right arm'}</p>
      </section>
      <aside className="flex w-[174px] shrink-0 flex-col gap-2">
        <section className="rounded-2xl p-2 shadow-sm" style={{ background: checked ? soft : 'white' }} aria-live="polite">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: checked ? accent : '#516080' }}>The verdict</p>
          <h2 className="text-lg font-extrabold leading-tight" style={{ color: checked ? accent : INK }}>{checked ? headline : 'What do you predict?'}</h2>
          <p className="mt-2 text-xs leading-snug">{!checked ? 'Will the two arms meet above the base? Press Check to find out.' : `${display(shorter[0].length)} + ${display(shorter[1].length)} = ${display(shorterSum)}. ${status === 'valid' ? `More than ${display(longest.length)} — all three inequalities hold.` : status === 'flat' ? `Exactly Side ${'ABC'[longest.id]} (${ROLES[longest.id].toLowerCase()}). No triangle height.` : `Side ${'ABC'[longest.id]} (${ROLES[longest.id].toLowerCase()}) is ${display(longest.length - shorterSum)} too long.`}`}</p>
        </section>
        <section className="rounded-2xl bg-white p-2 shadow-sm">
          <h2 className="text-sm font-bold">The triangle rule</h2>
          <p className="mb-2 mt-1 text-xs leading-snug text-slate-600">The two shorter sides must together be <strong>longer</strong> than the longest side.</p>
          <p className="mb-2 text-[10px] font-semibold text-slate-500">Two shorter sides: {display(shorter[0].length)} + {display(shorter[1].length)} = {display(shorterSum)}</p>
          <div className="relative mr-2" role="img" aria-label={`Two shorter sides total ${shorterSum}; longest side ${longest.length}`}>
            <div className="flex h-5">{shorter.map(side => <div key={side.id} className="flex items-center justify-center text-xs font-bold text-white" style={{ width: `${side.length * barScale}%`, background: COLORS[side.id] }}>{display(side.length)}</div>)}</div>
            <div className="mt-2 flex h-5 items-center justify-center text-xs font-bold text-white" style={{ width: `${longest.length * barScale}%`, background: COLORS[longest.id] }}>{display(longest.length)}</div>
            <div className="absolute -bottom-2 -top-2 border-r-2 border-dashed border-slate-500" style={{ left: `${longest.length * barScale}%` }} />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">Longest: {'ABC'[longest.id]} · {display(longest.length)}</p>
          <p className="mt-2 rounded-xl bg-slate-50 p-2 text-center text-sm font-bold">{display(shorter[0].length)} + {display(shorter[1].length)} {shorterSum > longest.length ? '>' : shorterSum === longest.length ? '=' : '<'} {display(longest.length)}</p>
        </section>
      </aside>
    </div>
  </div>
}
