import { useMemo, useRef, useState } from 'react'

const terrains = [
  { id: 'grass', name: 'Grass', color: '#3E9B4F' },
  { id: 'woodland', name: 'Woodland', color: '#1E6B3C' },
  { id: 'flowers', name: 'Flower beds', color: '#F0D9A8' },
  { id: 'playground', name: 'Playground', color: '#E8923A' },
  { id: 'water', name: 'Water', color: '#3D8FD1' },
]
const challenges = [
  { grass: 40, woodland: 25, flowers: 15, playground: 15, water: 5 },
  { grass: 50, woodland: 20, flowers: 10, playground: 10, water: 10 },
  { grass: 30, woodland: 30, flowers: 20, playground: 15, water: 5 },
  { grass: 60, woodland: 15, flowers: 10, playground: 10, water: 5 },
  null,
]

function TerrainIcon({ type }) {
  if (type === 'grass') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 28h26" stroke="#287D39" strokeWidth="2"/><path d="M6 27c0-6-1-10-3-14m3 14c0-7 2-13 5-18m3 18c0-6-1-11-4-15m4 15c0-8 2-15 5-20m2 20c0-6-1-10-3-14m3 14c1-7 3-11 7-15m-2 15c0-4 1-7 3-10" fill="none" stroke="#EAF3DE" strokeWidth="2" strokeLinecap="round"/><path d="M5 9l2-2m16 2 2-2" stroke="#CDE8C7" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (type === 'water') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 11c5-4 8 4 14 0s9 4 14 0M2 20c5-4 8 4 14 0s9 4 14 0" fill="none" stroke="#EAF0FB" strokeWidth="2.3" strokeLinecap="round"/></svg>
  if (type === 'woodland') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 7 20h6l-3 5h12l-3-5h6L16 4Z" fill="#A9D4B8"/><path d="M16 21v7" stroke="#F0D9A8" strokeWidth="2.4"/></svg>
  if (type === 'flowers') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 16v12M8 20v8M24 20v8" stroke="#3E9B4F" strokeWidth="1.8"/><g fill="#D96A85"><circle cx="16" cy="12" r="4"/><circle cx="8" cy="17" r="3.5"/><circle cx="24" cy="17" r="3.5"/></g><g fill="#FFF7D6"><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="17" r="1.3"/><circle cx="24" cy="17" r="1.3"/></g></svg>
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 28h24" stroke="#B75B20" strokeWidth="2" strokeLinecap="round"/><path d="M9 27V8h9v6" fill="none" stroke="#FFF4DE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 13h9M9 18h7M12 8v19" fill="none" stroke="#B75B20" strokeWidth="1.7"/><path d="M18 12c1 6 4 9 9 12l-2 3c-7-3-11-8-12-15Z" fill="#FFE3B4" stroke="#FFF4DE" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="7" r="2" fill="#FFF4DE"/></svg>
}

export default function PercentParkDesigner() {
  const [cells, setCells] = useState(() => Array(100).fill(null))
  const [active, setActive] = useState('grass')
  const [challenge, setChallenge] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const drag = useRef(null)
  const target = challenges[challenge]
  const counts = useMemo(() => Object.fromEntries(terrains.map(t => [t.id, cells.filter(v => v === t.id).length])), [cells])
  const empty = cells.filter(v => v === null).length

  const paint = (index, mode) => {
    if (index < 0 || index > 99 || drag.current?.seen.has(index)) return
    drag.current?.seen.add(index)
    setCells(old => {
      const next = [...old]
      next[index] = mode === 'erase' ? null : active
      return next
    })
    setFeedback('')
    setCelebrate(false)
  }
  const pointerDown = (event, index) => {
    event.preventDefault()
    const mode = cells[index] === active ? 'erase' : 'paint'
    drag.current = { mode, seen: new Set() }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    paint(index, mode)
  }
  const pointerMove = event => {
    if (!drag.current) return
    event.preventDefault()
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]')
    if (hit) paint(Number(hit.dataset.cell), drag.current.mode)
  }
  const stopDrag = () => { drag.current = null }

  const check = () => {
    if (!target) {
      const used = 100 - empty
      setFeedback(`Your park uses ${used}% of the grid: ${terrains.map(t => `${counts[t.id]}% ${t.name.toLowerCase()}`).join(', ')}.`)
      return
    }
    const wrong = terrains.filter(t => counts[t.id] !== target[t.id])
    if (!wrong.length) {
      setFeedback(`Perfect park! ${terrains.map(t => target[t.id]).join(' + ')} = 100 — every tile accounted for.`)
      setCelebrate(true)
    } else {
      setFeedback(wrong.map(t => `${t.name}: ${counts[t.id]}% — needs ${target[t.id]}%.`).join(' '))
    }
  }
  const clear = () => { setCells(Array(100).fill(null)); setFeedback(''); setCelebrate(false) }
  const nextPark = () => { setChallenge(i => (i + 1) % challenges.length); clear() }

  const banner = target
    ? `Lay out the park: ${terrains.map(t => `${target[t.id]}% ${t.name.toLowerCase()}`).join(', ')}.`
    : 'Design any park you like — then read off your percentages.'

  return <div className="ppd">
    <style>{`.ppd{height:500px;overflow:hidden;position:relative;background:#F8F6F0;color:#24231F;padding:8px 10px;font-family:Inter,system-ui}.ppd *{box-sizing:border-box}.ppd-banner{height:32px;display:flex;align-items:center;padding:6px 11px;border-radius:10px;background:#E4F3F7;color:#1E5F74;font-size:14.4px;font-weight:800}.ppd-body{height:384px;display:grid;grid-template-columns:384px 1fr;gap:18px;margin-top:6px}.ppd-grid{width:384px;height:384px;display:grid;grid-template-columns:repeat(10,38px);grid-template-rows:repeat(10,38px);background:#A9A49A;border:2px solid #827D73;border-radius:10px;overflow:hidden;touch-action:none;user-select:none}.ppd-tile{width:38px;height:38px;min-width:38px;min-height:38px;position:relative;border:0;border-right:1.5px solid rgba(75,72,66,.48);border-bottom:1.5px solid rgba(75,72,66,.48);background:#FFF;cursor:crosshair;padding:0;overflow:hidden}.ppd-tile:nth-child(10n){border-right:0}.ppd-tile:nth-child(n+91){border-bottom:0}.ppd-tile svg{width:100%;height:100%;display:block;pointer-events:none}.ppd-shimmer{animation:shimmer .7s ease both;animation-delay:calc(var(--i)*8ms)}@keyframes shimmer{50%{filter:brightness(1.35)}}.ppd-side{min-width:0;display:flex;flex-direction:column;gap:6px}.ppd-terrain{height:58px;display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:8px;padding:5px 8px;border:.5px solid #E0DDD6;border-radius:12px;background:#FFF;text-align:left;cursor:pointer}.ppd-terrain[aria-pressed=true]{border:2px solid #1E5F74}.ppd-terrain.exact{background:#EAF3DE;border-color:#72A856}.ppd-terrain.over{background:#FBE9ED;border-color:#B23050}.ppd-swatch{width:38px;height:38px;border-radius:8px}.ppd-swatch svg{width:100%;height:100%}.ppd-cardcopy{min-width:0}.ppd-cardtop{display:flex;align-items:baseline;justify-content:space-between;gap:6px}.ppd-name{font-size:14.4px;font-weight:800;white-space:nowrap}.ppd-percent{font-size:15.6px;font-weight:900;white-space:nowrap}.ppd-count{font-size:13.2px;color:#5F5C56}.ppd-target{float:right;font-size:13.2px;font-weight:800;white-space:nowrap}.ppd-empty{height:36px;display:flex;align-items:center;justify-content:space-between;padding:5px 9px;border:.5px solid #E0DDD6;border-radius:10px;background:#FFF;font-size:13.2px;font-weight:800}.ppd-footer{height:54px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:25px 25px;gap:4px 7px;margin-top:6px}.ppd-feedback{grid-column:1/-1;overflow:hidden;padding:5px 9px;border:.5px solid #E0DDD6;border-radius:9px;background:#FFF;font-size:13.2px;line-height:1.15}.ppd-feedback.success{background:#EAF3DE;color:#27500A}.ppd-actions{display:contents}.ppd-btn{border-radius:8px;padding:3px 10px;font-size:13.2px;font-weight:800;cursor:pointer}.ppd-done{background:#1E5F74;color:#FFF;border:1px solid #1E5F74}.ppd-clear,.ppd-new{background:#FFF;color:#1E5F74;border:1px solid #1E5F74}.ppd-hint{display:flex;align-items:center;overflow:hidden;padding:3px 8px;border:.5px solid #E0DDD6;border-radius:9px;background:#FFF;font-size:13.2px;line-height:1.1}.ppd-modalback{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(30,45,36,.42)}.ppd-modal{width:310px;padding:24px;text-align:center;border:2px solid #72A856;border-radius:16px;background:#EAF3DE;color:#27500A;box-shadow:0 14px 36px rgba(39,80,10,.22);animation:pop .32s cubic-bezier(.2,1.5,.4,1)}.ppd-modal strong{display:block;font-size:28px;margin-bottom:7px}.ppd-modal p{margin:0 0 16px;font-size:15px}.ppd-modal button{border:0;border-radius:9px;padding:8px 22px;background:#27500A;color:#FFF;font-size:14px;font-weight:800;cursor:pointer}@keyframes pop{from{transform:scale(.65);opacity:0}}`}</style>
    <div className="ppd-banner">{banner}</div>
    <div className="ppd-body">
      <div className="ppd-grid" role="grid" aria-label="100 tile park grid" onPointerMove={pointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} onPointerLeave={event => { if (event.buttons === 0) stopDrag() }} onTouchMove={event => event.preventDefault()}>
        {cells.map((terrain, i) => <button key={i} type="button" role="gridcell" data-cell={i} className={`ppd-tile ${celebrate ? 'ppd-shimmer' : ''}`} style={{background:terrain ? terrains.find(t => t.id === terrain).color : '#FFF', '--i':i}} aria-label={`Tile ${i + 1}: ${terrain || 'empty'}`} onPointerDown={event => pointerDown(event, i)}>{terrain && <TerrainIcon type={terrain}/>}</button>)}
      </div>
      <div className="ppd-side">
        {terrains.map(t => {
          const exact = target && counts[t.id] === target[t.id]
          const over = target && counts[t.id] > target[t.id]
          return <button key={t.id} type="button" className={`ppd-terrain ${exact ? 'exact' : ''} ${over ? 'over' : ''}`} aria-pressed={active === t.id} onClick={() => setActive(t.id)}>
            <span className="ppd-swatch" style={{background:t.color}}><TerrainIcon type={t.id}/></span>
            <span className="ppd-cardcopy"><span className="ppd-cardtop"><span className="ppd-name">{t.name}</span><span className="ppd-percent">{counts[t.id]}%</span></span><span className="ppd-count" key={counts[t.id]}>{counts[t.id]} tiles</span><span className="ppd-target">{target ? over ? 'Too many' : exact ? '✓ Right' : '' : 'free design'}</span></span>
          </button>
        })}
        <div className="ppd-empty"><span>Empty tiles</span><strong>{empty} · {empty}%</strong></div>
      </div>
    </div>
    <div className="ppd-footer">
      <button className="ppd-btn ppd-done" type="button" onClick={check}>✓ Done</button>
      <button className="ppd-btn ppd-clear" type="button" onClick={clear}>Clear</button>
      <button className="ppd-btn ppd-new" type="button" onClick={nextPark}>New park →</button>
      <div className={`ppd-feedback ${celebrate ? 'success' : ''}`} aria-live="polite">{feedback || 'Paint by tapping or dragging. One tile = one percent.'}</div>
    </div>
    {celebrate && <div className="ppd-modalback" role="presentation"><section className="ppd-modal" role="dialog" aria-modal="true" aria-labelledby="ppd-success-title"><strong id="ppd-success-title">Spot on!</strong><p>Well done — every part of your park is exactly right.</p><button type="button" onClick={() => setCelebrate(false)}>Continue painting</button></section></div>}
  </div>
}
