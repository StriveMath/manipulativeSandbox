import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'

const COLORS = ['#0EA5A4', '#F97316', '#7C3AED']
const INK = '#16233A'
const UP = [Math.PI / 2, Math.PI / 2]
const DOWN = [-Math.PI / 2, 3 * Math.PI / 2]
const SVG_WIDTH = 776
const BASELINE = 137.5
const SNAP_DISTANCE = 36
const clamp = value => Math.max(1, Math.min(10, value))
const clampAngle = angle => Math.max(0, Math.min(Math.PI, angle))

export default function TriangleInequality() {
  const [values, setValues] = useState([3, 4, 5])
  const [angles, setAngles] = useState(UP)
  const [snapped, setSnapped] = useState(false)
  const [checked, setChecked] = useState(false)
  const [falling, setFalling] = useState(false)
  const svgRef = useRef(null)
  const drag = useRef(null)
  const sides = values.map((length, id) => ({ length, id }))
  const longest = sides.reduce((a, side) => side.length > a.length ? side : a)
  const shorter = sides.filter(side => side.id !== longest.id)
  const shorterSum = shorter.reduce((total, side) => total + side.length, 0)
  const base = longest
  const [left, right] = shorter
  const valid = longest.length < shorterSum
  const canMeet = longest.length <= shorterSum
  const ppu = Math.min(21, 118 / Math.max(left.length, right.length))
  const originX = SVG_WIDTH / 2 - base.length * ppu / 2
  const endX = originX + base.length * ppu
  const tip = (hingeX, length, angle) => [
    hingeX + length * ppu * Math.cos(angle),
    BASELINE - length * ppu * Math.sin(angle),
  ]
  const leftTip = tip(originX, left.length, angles[0])
  const rightTip = tip(endX, right.length, angles[1])
  const snappedAngles = () => {
    if (!canMeet) return null
    const apexX = (base.length ** 2 + left.length ** 2 - right.length ** 2) / (2 * base.length)
    const apexY = Math.sqrt(Math.max(0, left.length ** 2 - apexX ** 2))
    return [
      Math.atan2(apexY, apexX),
      Math.atan2(apexY, apexX - base.length),
    ]
  }

  useEffect(() => {
    if (!falling) return undefined
    let frame
    const startedAt = performance.now()
    const duration = 1600
    const tick = now => {
      const progress = Math.min(1, (now - startedAt) / duration)
      if (progress === 1) {
        setAngles(DOWN)
        setFalling(false)
        return
      }
      const swing = Math.exp(-4 * progress) * Math.cos(4 * Math.PI * progress)
      setAngles(DOWN.map((target, index) => target + (UP[index] - target) * swing))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [falling])

  const changeSide = (id, value) => {
    setFalling(false)
    setValues(old => old.map((length, i) => i === id ? clamp(value) : length))
    setAngles(UP)
    setSnapped(false)
    setChecked(false)
  }
  const point = event => {
    const matrix = svgRef.current.getScreenCTM()
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null
  }
  const startDrag = (event, arm) => {
    if (drag.current) return
    event.preventDefault()
    setFalling(false)
    drag.current = { arm, pointerId: event.pointerId, angles }
    setSnapped(false)
    setChecked(false)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = event => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    const p = point(event)
    if (!p) return
    const hingeX = d.arm === 0 ? originX : endX
    const nextAngles = [...d.angles]
    nextAngles[d.arm] = clampAngle(Math.atan2(BASELINE - p.y, p.x - hingeX))
    drag.current.angles = nextAngles
    setAngles(nextAngles)
    setSnapped(false)
  }
  const endDrag = event => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    const finalAngles = d.angles
    const finalLeftTip = tip(originX, left.length, finalAngles[0])
    const finalRightTip = tip(endX, right.length, finalAngles[1])
    const closeEnough = Math.hypot(
      finalLeftTip[0] - finalRightTip[0],
      finalLeftTip[1] - finalRightTip[1],
    ) <= SNAP_DISTANCE
    const target = closeEnough ? snappedAngles() : null
    if (target) {
      setAngles(target)
      setSnapped(true)
    }
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handle = (arm, side, x, y) => <circle key={`handle-${side.id}`} cx={x} cy={y} r="10"
    fill={COLORS[side.id]} stroke="white" strokeWidth="3" style={{ cursor: 'grab', touchAction: 'none' }}
    role="slider" tabIndex="0" aria-label={`Rotate side ${'ABC'[side.id]}`}
    aria-valuemin={0} aria-valuemax={180} aria-valuenow={Math.round(angles[arm] * 180 / Math.PI)}
    onKeyDown={event => {
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault()
        setChecked(false)
        setSnapped(false)
        setAngles(old => old.map((angle, index) => index === arm
          ? clampAngle(angle + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? Math.PI / 36 : -Math.PI / 36))
          : angle))
      }
    }} onPointerDown={event => startDrag(event, arm)} onPointerMove={moveDrag}
    onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} />
  const line = (side, x1, y1, x2, y2) => <g key={`line-${side.id}`}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS[side.id]} strokeWidth="9" strokeLinecap="round" />
  </g>
  const barScale = 100 / Math.max(shorterSum, longest.length)
  const checkColor = checked ? snapped && valid ? '#16A34A' : snapped ? '#D97706' : '#E11D48' : INK
  const resetArms = () => {
    drag.current = null
    setFalling(false)
    setAngles(UP)
    setSnapped(false)
    setChecked(false)
  }
  const checkTriangle = () => {
    const target = snappedAngles()
    if (target) {
      setFalling(false)
      setAngles(target)
      setSnapped(true)
    } else {
      setAngles(UP)
      setFalling(true)
    }
    setChecked(true)
  }

  return <div className="flex h-[500px] w-[800px] flex-col overflow-hidden bg-[#F3F6FB] p-3" style={{ color: INK }}>
    <header className="h-[88px] shrink-0">
      <h1 className="text-center text-2xl font-extrabold">Can you make a triangle?</h1>
      <div className="relative mx-auto mt-2 w-72" role="img" aria-label={`The two shorter sides total ${shorterSum}; the longest side is ${longest.length}.`}>
        <div className="flex h-4 overflow-hidden rounded">
          {shorter.map(side => <div key={side.id} style={{ width: `${side.length * barScale}%`, background: COLORS[side.id] }} />)}
        </div>
        <div className="mt-2 h-4 rounded" style={{ width: `${longest.length * barScale}%`, background: COLORS[longest.id] }} />
        <div className="absolute -bottom-1 -top-1 border-r-2 border-slate-500" style={{ left: `${longest.length * barScale}%` }} />
      </div>
    </header>
    <svg ref={svgRef} className="min-h-0 w-full flex-1 rounded-2xl bg-white shadow-sm" viewBox={`0 0 ${SVG_WIDTH} 275`} preserveAspectRatio="xMidYMid meet" aria-label="Two rotatable arms attached to a fixed base.">
      {snapped && <path d={`M ${originX} ${BASELINE} L ${leftTip[0]} ${leftTip[1]} L ${endX} ${BASELINE} Z`} fill={checked ? '#DCFCE7' : '#E0F2FE'} />}
      {line(base, originX, BASELINE, endX, BASELINE)}
      {line(left, originX, BASELINE, ...leftTip)}
      {line(right, endX, BASELINE, ...rightTip)}
      {[originX, endX].map(x => <circle key={x} cx={x} cy={BASELINE} r="5" fill={INK} />)}
      {checked && !snapped && <line x1={leftTip[0]} y1={leftTip[1]} x2={rightTip[0]} y2={rightTip[1]} stroke="#E11D48" strokeWidth="3" strokeDasharray="6 6" />}
      {handle(0, left, ...leftTip)}
      {handle(1, right, ...rightTip)}
    </svg>
    <section className="mt-2 grid shrink-0 grid-cols-3 gap-2" aria-label="Side lengths">
      {values.map((value, id) => <label key={id} className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
        <span className="w-5 text-sm font-extrabold" style={{ color: COLORS[id] }}>{'ABC'[id]}</span>
        <input className="min-w-0 flex-1 cursor-pointer" style={{ accentColor: COLORS[id] }} type="range" min="1" max="10" step="1" value={value}
          aria-label={`Side ${'ABC'[id]} length`} onChange={event => changeSide(id, Number(event.target.value))} />
        <span className="w-5 text-center text-sm font-extrabold" style={{ color: COLORS[id] }}>{value}</span>
      </label>)}
    </section>
    <div className="mt-2 flex h-9 shrink-0 items-center gap-2">
      <button className="flex h-full w-28 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-80" style={{ background: checkColor }}
        disabled={checked || snapped} onClick={checkTriangle}><Check size={18} />Check</button>
      <button className="flex h-full w-24 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
        onClick={resetArms}><RotateCcw size={16} />Reset</button>
      <span className="ml-2 text-xs font-bold text-slate-500">Try a set</span>
      {[[3, 4, 5], [2, 3, 9], [3, 4, 7], [6, 6, 6]].map(preset => <button key={preset.join()}
        className="h-full flex-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50"
        onClick={() => { setFalling(false); setValues(preset); setAngles(UP); setSnapped(false); setChecked(false) }}>{preset.join(' · ')}</button>)}
    </div>
  </div>
}
