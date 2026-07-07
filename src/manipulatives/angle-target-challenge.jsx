import { useEffect, useMemo, useRef, useState } from 'react'

const TARGET_ANGLES = [35, 90, 140, 220, 300, 270, 185, 350, 360]
const ANGLE_TYPES = ['Acute', 'Right', 'Obtuse', 'Straight', 'Reflex', 'Full turn']
const GEOMETRY = {
  height: 560,
  pivot: { x: 380, y: 280 },
  armLength: 175,
  protractorRadius: 190,
  targetRadius: 245,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pointAtAngle(angle, radius, pivot) {
  const radians = (angle * Math.PI) / 180
  return {
    x: pivot.x + Math.cos(radians) * radius,
    y: pivot.y - Math.sin(radians) * radius,
  }
}

function classifyAngle(angle) {
  if (angle < 90) return 'Acute'
  if (angle === 90) return 'Right'
  if (angle < 180) return 'Obtuse'
  if (angle === 180) return 'Straight'
  if (angle < 360) return 'Reflex'
  return 'Full turn'
}

function polarFromPointer(event, geometry) {
  const rect = event.currentTarget.getBoundingClientRect()
  const scale = Math.min(rect.width / 760, rect.height / geometry.height)
  const offsetX = (rect.width - 760 * scale) / 2
  const offsetY = (rect.height - geometry.height * scale) / 2
  const x = (event.clientX - rect.left - offsetX) / scale
  const y = (event.clientY - rect.top - offsetY) / scale
  let degrees = (Math.atan2(geometry.pivot.y - y, x - geometry.pivot.x) * 180) / Math.PI
  if (degrees <= 0) degrees += 360
  return clamp(Math.round(degrees), 1, 360)
}

function signedAngleDifference(from, to) {
  return ((to - from + 540) % 360) - 180
}

export default function AngleTargetChallenge() {
  const [view, setView] = useState('explorer')
  const [angle, setAngle] = useState(48)
  const [targetIndex, setTargetIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [shots, setShots] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [firing, setFiring] = useState(false)
  const [projectile, setProjectile] = useState(null)
  const [feedback, setFeedback] = useState({
    tone: 'ready',
    title: 'Line up your launcher!',
    message: 'Move the gold handle until the launcher points at the target.',
  })
  const timerRef = useRef(null)

  const geometry = GEOMETRY
  const targetAngle = TARGET_ANGLES[targetIndex % TARGET_ANGLES.length]
  const armEnd = useMemo(
    () => pointAtAngle(angle, geometry.armLength, geometry.pivot),
    [angle, geometry],
  )
  const target = useMemo(
    () => pointAtAngle(targetAngle, geometry.targetRadius, geometry.pivot),
    [geometry, targetAngle],
  )
  const arcEnd = useMemo(
    () => pointAtAngle(angle, 54, geometry.pivot),
    [angle, geometry],
  )
  const targetGuideEnd = pointAtAngle(targetAngle, geometry.targetRadius - 31, geometry.pivot)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const updateAngle = (next) => {
    const safeAngle = clamp(Math.round(Number(next) || 0), 1, 360)
    setAngle(safeAngle)
    if (!firing) {
      setFeedback({
        tone: 'ready',
        title: 'Now classify your angle',
        message: 'Choose an angle type below to fire.',
      })
    }
  }

  const startDrag = (event) => {
    if (firing) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    updateAngle(polarFromPointer(event, geometry))
  }

  const moveDrag = (event) => {
    if (!dragging || firing) return
    updateAngle(polarFromPointer(event, geometry))
  }

  const endDrag = () => setDragging(false)

  const fire = (selectedType) => {
    if (firing) return

    const shotAngle = angle
    const shotType = classifyAngle(shotAngle)
    const aimDifference = Math.abs(signedAngleDifference(shotAngle, targetAngle))
    const classificationCorrect = selectedType === shotType
    const hit = classificationCorrect && aimDifference <= 4
    const shotEnd = pointAtAngle(shotAngle, geometry.targetRadius + 20, geometry.pivot)

    setFiring(true)
    setProjectile({ x: geometry.pivot.x, y: geometry.pivot.y, angle: shotAngle, moving: false })
    setFeedback({
      tone: 'ready',
      title: '',
      message: '',
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setProjectile({ x: shotEnd.x, y: shotEnd.y, angle: shotAngle, moving: true })
      })
    })

    timerRef.current = window.setTimeout(() => {
      setShots((current) => current + 1)
      if (hit) {
        setScore((current) => current + 1)
        setFeedback({
          tone: 'success',
          title: 'Bullseye!',
          message: '',
        })
      } else if (!classificationCorrect) {
        setFeedback({
          tone: 'error',
          title: 'Check the angle type',
          message: `${shotAngle}° is ${shotType.toLowerCase()}, not ${selectedType.toLowerCase()}. Adjust or try again.`,
        })
      } else {
        const shotDifference = signedAngleDifference(shotAngle, targetAngle)
        const direction = shotDifference > 0 ? 'counterclockwise' : 'clockwise'
        setFeedback({
          tone: 'error',
          title: 'Correct type — adjust your aim!',
          message: `You were ${aimDifference}° away. Move the launcher ${direction} and try again.`,
        })
      }
      setProjectile(null)
      setFiring(false)
    }, 720)
  }

  const nextTarget = () => {
    window.clearTimeout(timerRef.current)
    const nextIndex = (targetIndex + 1) % TARGET_ANGLES.length
    const nextTargetAngle = TARGET_ANGLES[nextIndex]
    let startingAngle = nextTargetAngle + (nextIndex % 2 === 0 ? 16 : -14)
    startingAngle = ((startingAngle - 1 + 360) % 360) + 1
    setTargetIndex(nextIndex)
    setAngle(startingAngle)
    setProjectile(null)
    setFiring(false)
    setFeedback({
      tone: 'ready',
      title: 'New target!',
      message: 'Drag the gold handle or type an angle to line up your shot.',
    })
  }

  const switchView = (nextView) => {
    if (nextView === view) return
    window.clearTimeout(timerRef.current)
    setView(nextView)
    setTargetIndex(0)
    setAngle(48)
    setProjectile(null)
    setFiring(false)
    setFeedback({
      tone: 'ready',
      title: 'Line up your launcher!',
      message: 'Move the gold handle until the launcher points at the moon.',
    })
  }

  const feedbackColors = {
    ready: 'border-[#C8B6FF] bg-[#F4F0FF] text-[#3D267A]',
    success: 'border-[#65C7A5] bg-[#EAF8F2] text-[#176B50]',
    error: 'border-[#F18F8F] bg-[#FFF0F0] text-[#9C3030]',
  }

  return (
    <div className="flex h-[500px] flex-col overflow-hidden bg-[#F7F3EA] font-['Inter'] text-[#17213A]">
      <div className="grid grid-cols-[190px_1fr_280px] items-center border-b border-[#DED7CA] bg-white px-5 py-2">
        <div>
          <p className="font-['Fredoka_One'] text-lg tracking-wide text-[#3D267A]">ANGLE LAUNCH</p>
          <p className="text-xs font-semibold text-[#6F6B63]">Explore the full 360°</p>
        </div>
        <div className="flex rounded-full bg-[#E8E9F2] p-1" aria-label="Activity">
          {[
            ['explorer', 'Explorer'],
            ['challenge', 'Challenge'],
          ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchView(id)}
                aria-pressed={view === id}
                className={`rounded-full px-5 py-1.5 text-xs font-black transition ${
                  view === id
                    ? 'bg-[#5936B4] text-white shadow-sm'
                    : 'text-[#596078] hover:bg-white'
                }`}
              >
                {label}
              </button>
          ))}
        </div>
        {view === 'challenge' ? (
          <div className="flex items-center gap-2 justify-self-end">
            <div className="rounded-full bg-[#EEE8FF] px-2.5 py-1 text-xs font-black text-[#5936B4]" style={{ whiteSpace: 'nowrap' }}>
              Score: <span data-testid="score">{score}</span>
            </div>
            <div className="rounded-full bg-[#EEF5F7] px-2.5 py-1 text-xs font-black text-[#346070]" style={{ whiteSpace: 'nowrap' }}>
              Shots: <span data-testid="shots">{shots}</span>
            </div>
            <button
              type="button"
              onClick={nextTarget}
              className="rounded-full bg-[#17213A] px-4 py-1.5 text-xs font-black text-white transition hover:bg-[#2E3C61]"
              style={{ whiteSpace: 'nowrap' }}
            >
              Next target
            </button>
          </div>
        ) : <div />}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <section
          className="relative min-h-0 flex-1"
          style={{ background: 'linear-gradient(180deg, #0A1238 0%, #182657 70%, #26396B 100%)' }}
        >
          <svg
            viewBox={`0 0 760 ${geometry.height}`}
            className={`h-full w-full touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
            role="img"
            aria-label={`Angle launcher showing ${angle} degrees`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A1238" />
                <stop offset="70%" stopColor="#182657" />
                <stop offset="100%" stopColor="#26396B" />
              </linearGradient>
              <filter id="target-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#FFF0A8" floodOpacity=".65" />
              </filter>
            </defs>

            <rect width="760" height={geometry.height} fill="url(#sky)" />
            {[
              [48, 50, 2], [105, 105, 1.5], [172, 38, 1.5], [235, 82, 2],
              [304, 30, 1.2], [367, 68, 1.6], [438, 36, 1.3], [505, 91, 2],
              [584, 39, 1.5], [668, 79, 1.7], [716, 34, 1.2], [72, 182, 1.3],
              [151, 146, 1.8], [648, 168, 1.4], [704, 131, 1.8], [278, 150, 1.2],
              [42, 292, 1.5], [112, 354, 1.2], [186, 470, 1.7], [265, 515, 1.2],
              [490, 484, 1.6], [572, 410, 1.3], [650, 505, 1.8], [724, 334, 1.2],
            ].map(([x, y, radius]) => (
              y < geometry.height - 8 && (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={radius} fill="#FFFFFF" opacity=".8" />
              )
            ))}
            <circle
              cx={geometry.pivot.x}
              cy={geometry.pivot.y}
              r={geometry.protractorRadius}
              fill="none"
              stroke="#8DA6D8"
              strokeWidth="2"
              strokeDasharray="5 7"
            />
            {Array.from({ length: 36 }, (_, index) => index * 10).map((tick) => {
              const outer = pointAtAngle(tick, geometry.protractorRadius + 5, geometry.pivot)
              const inner = pointAtAngle(
                tick,
                tick % 30 === 0 ? geometry.protractorRadius - 8 : geometry.protractorRadius - 3,
                geometry.pivot,
              )
              return (
                <line
                  key={tick}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#AFC3EB"
                  strokeWidth={tick % 30 === 0 ? 2 : 1}
                />
              )
            })}
            <text x={geometry.pivot.x + geometry.protractorRadius + 14} y={geometry.pivot.y + 5} fill="#CED9F3" fontSize="11" fontWeight="800">0°</text>
            <text x={geometry.pivot.x - 9} y={geometry.pivot.y - geometry.protractorRadius - 10} fill="#CED9F3" fontSize="11" fontWeight="800">90°</text>
            <text x={geometry.pivot.x - geometry.protractorRadius - 39} y={geometry.pivot.y + 5} fill="#CED9F3" fontSize="11" fontWeight="800">180°</text>
            <text x={geometry.pivot.x - 10} y={geometry.pivot.y + geometry.protractorRadius + 19} fill="#CED9F3" fontSize="11" fontWeight="800">270°</text>

            {view === 'challenge' && (
              <>
                <g transform={`translate(${target.x} ${target.y})`} filter="url(#target-shadow)" data-testid="target">
                  <circle r="31" fill="#F8E7A7" stroke="#FFF6D2" strokeWidth="3" />
                  <circle cx="-10" cy="-9" r="7" fill="#D4BF77" opacity=".72" />
                  <circle cx="12" cy="9" r="8" fill="#DCC985" opacity=".7" />
                  <circle cx="10" cy="-13" r="4" fill="#C9B46C" opacity=".66" />
                  <circle cx="-13" cy="14" r="4.5" fill="#E4D394" opacity=".8" />
                  <path d="M20 -22 A31 31 0 0 1 20 22 A27 31 0 0 0 20 -22Z" fill="#D0BD7A" opacity=".45" />
                  <text y="48" textAnchor="middle" fill="#FFF7D6" fontSize="12" fontWeight="900">MOON</text>
                </g>

                <line
                  x1={geometry.pivot.x}
                  y1={geometry.pivot.y}
                  x2={targetGuideEnd.x}
                  y2={targetGuideEnd.y}
                  stroke="#5DE1FF"
                  strokeWidth="2.5"
                  strokeDasharray="7 7"
                  opacity=".92"
                />
              </>
            )}

            <line
              x1={geometry.pivot.x}
              y1={geometry.pivot.y}
              x2={geometry.pivot.x + geometry.armLength + 25}
              y2={geometry.pivot.y}
              stroke="#D3D9EA"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <line
              x1={geometry.pivot.x}
              y1={geometry.pivot.y}
              x2={armEnd.x}
              y2={armEnd.y}
              stroke="#8A5AF5"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <line
              x1={geometry.pivot.x}
              y1={geometry.pivot.y}
              x2={armEnd.x}
              y2={armEnd.y}
              stroke="#BBA3FF"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {angle < 360 && (
              <path
                d={`M ${geometry.pivot.x + 54} ${geometry.pivot.y} A 54 54 0 ${angle > 180 ? 1 : 0} 0 ${arcEnd.x} ${arcEnd.y}`}
                fill="none"
                stroke="#F09A2B"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}
            {angle === 360 && (
              <circle
                cx={geometry.pivot.x}
                cy={geometry.pivot.y}
                r="54"
                fill="none"
                stroke="#F09A2B"
                strokeWidth="5"
              />
            )}

            <g transform={`translate(${armEnd.x} ${armEnd.y})`}>
              <circle r="18" fill="#F5C451" stroke="#FFFFFF" strokeWidth="3" />
              <circle r="6" fill="#FFF4C5" />
            </g>
            <circle cx={geometry.pivot.x} cy={geometry.pivot.y} r="20" fill="#F4F6FF" />
            <circle cx={geometry.pivot.x} cy={geometry.pivot.y} r="8" fill="#F5C451" />

            <g transform={`translate(${pointAtAngle(angle / 2, 82, geometry.pivot).x} ${pointAtAngle(angle / 2, 82, geometry.pivot).y})`}>
              <rect x="-30" y="-17" width="60" height="34" rx="17" fill="#FFFFFF" stroke="#F09A2B" strokeWidth="2.5" />
              <text textAnchor="middle" dominantBaseline="central" fill="#17213A" fontSize="16" fontWeight="900">
                {angle}°
              </text>
            </g>

            {view === 'challenge' && (
              <>
                {projectile && (
                  <g
                    style={{
                      transform: `translate(${projectile.x}px, ${projectile.y}px)`,
                      transition: projectile.moving ? 'transform 650ms cubic-bezier(.22,.75,.35,1)' : 'none',
                    }}
                  >
                    <g transform={`rotate(${-projectile.angle})`}>
                      <path d="M-24 -7 L-34 -13 L-31 -4 L-42 0 L-31 4 L-34 13 L-24 7Z" fill="#FF8A3D" />
                      <path d="M-29 -4 L-39 0 L-29 4Z" fill="#FFE25B" />
                      <path d="M-20 -10 L5 -10 Q20 0 5 10 L-20 10Z" fill="#F6F8FF" stroke="#17213A" strokeWidth="2" />
                      <path d="M-15 -10 L-25 -19 L-27 -8Z" fill="#F14F64" stroke="#17213A" strokeWidth="1.5" />
                      <path d="M-15 10 L-25 19 L-27 8Z" fill="#F14F64" stroke="#17213A" strokeWidth="1.5" />
                      <circle cx="2" cy="0" r="5" fill="#5DE1FF" stroke="#17213A" strokeWidth="1.5" />
                    </g>
                  </g>
                )}
              </>
            )}
          </svg>

          <div className="pointer-events-none absolute left-4 top-3 rounded-full border border-[#C5DDE1] bg-white/90 px-3 py-1.5 text-xs font-bold text-[#496970] shadow-sm">
            {view === 'challenge' ? 'Drag anywhere to aim at the moon' : 'Drag anywhere to explore angles'}
          </div>
          {view === 'explorer' && (
            <div
              className="pointer-events-none absolute right-4 top-3 rounded-2xl border border-[#8ED8C1] bg-[#EAF8F2] px-5 py-2 text-center text-[#176B50] shadow-lg"
              data-testid="explorer-classification"
            >
              <p className="text-xl font-black">{angle}°</p>
              <p className="text-xs font-black uppercase tracking-wider">{classifyAngle(angle)} angle</p>
            </div>
          )}
        </section>

        {view === 'challenge' && (
          <section className="grid h-[108px] shrink-0 grid-cols-[1fr_230px] items-center gap-5 border-t border-[#DED7CA] bg-[#FFFDF8] px-5 py-2">
            <div className="w-full self-center">
              <p className="mb-2 text-left text-xs font-black uppercase tracking-wider text-[#6F6B63]">
                Classify your angle &amp; shoot
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {ANGLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => fire(type)}
                    disabled={firing}
                    className="rounded-xl border-2 border-[#D8D0C3] bg-white px-1 py-2 text-[11px] font-black text-[#26344F] transition hover:-translate-y-0.5 hover:border-[#7046C6] hover:bg-[#F4F0FF] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-40"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-h-[78px] items-center justify-end">
              {feedback.tone !== 'ready' && (
                <div
                  className={`w-full rounded-2xl border px-4 py-3 text-center shadow-sm ${feedbackColors[feedback.tone]}`}
                  role="status"
                  data-testid="feedback"
                >
                  <p className="text-sm font-black">{feedback.title}</p>
                  {feedback.message && <p className="mt-1 text-xs font-semibold">{feedback.message}</p>}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
