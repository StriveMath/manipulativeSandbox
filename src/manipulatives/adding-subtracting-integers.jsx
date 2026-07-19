import { useEffect, useMemo, useRef, useState } from 'react'

const LINE_MIN = -20
const LINE_MAX = 20
const MAX_CHIPS_PER_OPERAND = 10
const HOP_MS = 310
const DRAG_THRESHOLD = 5
const PAIR_PHASE_MS = 620
const A_PHASE_MS = 700
const B_FLIGHT_MS = 440

const chipTone = {
  positive: {
    fill: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    svg: '#10b981',
  },
  negative: {
    fill: 'bg-violet-500',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    svg: '#8b5cf6',
  },
}

function signedUnit(sign) {
  return sign === 'positive' ? '+1' : '-1'
}

function unitValue(sign) {
  return sign === 'positive' ? 1 : -1
}

function valueFromChips(chips) {
  return chips.reduce((total, chip) => total + unitValue(chip.sign), 0)
}

function splitZeroPairs(chips) {
  const positive = chips.filter((chip) => chip.sign === 'positive')
  const negative = chips.filter((chip) => chip.sign === 'negative')
  const pairCount = Math.min(positive.length, negative.length)
  const pairs = Array.from({ length: pairCount }, (_, index) => ({
    negative: negative[index],
    positive: positive[index],
  }))
  const cancelledIds = new Set(pairs.flatMap((pair) => [pair.positive.id, pair.negative.id]))
  return {
    pairs,
    remaining: chips.filter((chip) => !cancelledIds.has(chip.id)),
  }
}

function focusedLineRange(valueA, result) {
  let min = Math.max(LINE_MIN, Math.min(0, valueA, result) - 2)
  let max = Math.min(LINE_MAX, Math.max(0, valueA, result) + 2)

  if (max - min < 10) {
    const missing = 10 - (max - min)
    min -= Math.floor(missing / 2)
    max += Math.ceil(missing / 2)
    if (min < LINE_MIN) {
      max += LINE_MIN - min
      min = LINE_MIN
    }
    if (max > LINE_MAX) {
      min -= max - LINE_MAX
      max = LINE_MAX
    }
  }

  return { max, min }
}

function formatInteger(value, wrapNegative = false) {
  return wrapNegative && value < 0 ? `(${value})` : String(value)
}

function SignedChip({ cancelling = false, chip, disabled, onClick, onKeyDown, onPointerDown, selected, small = false }) {
  return (
    <button
      aria-label={`${signedUnit(chip.sign)} chip${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={`integer-chip-pop grid shrink-0 place-items-center rounded-full border-2 border-white font-black text-white shadow-md ${
        small ? 'h-7 w-7 text-[9px]' : 'h-10 w-10 text-xs'
      } ${chipTone[chip.sign].fill} ${disabled ? 'cursor-default opacity-50' : 'cursor-grab active:cursor-grabbing'} ${
        selected ? 'ring-4 ring-amber-300 ring-offset-1' : ''
      } ${cancelling ? 'integer-zero-pair-cancel' : ''}`}
      data-integer-chip-id={chip.id}
      data-integer-chip-operand={chip.operand ?? ''}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none' }}
      type="button"
    >
      {signedUnit(chip.sign)}
    </button>
  )
}

function DragGhost({ dragging }) {
  if (!dragging?.moved) return null
  return (
    <div
      className={`pointer-events-none absolute z-50 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-black text-white shadow-xl ${chipTone[dragging.sign].fill}`}
      style={{ left: dragging.x, top: dragging.y }}
    >
      {signedUnit(dragging.sign)}
    </div>
  )
}

function useLocalDrag(onDrop) {
  const workspaceRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState(null)

  const localPointer = (event) => {
    const workspace = workspaceRef.current
    if (!workspace) return { x: event.clientX, y: event.clientY }
    const rect = workspace.getBoundingClientRect()
    const scaleX = rect.width / workspace.offsetWidth || 1
    const scaleY = rect.height / workspace.offsetHeight || 1
    return {
      x: (event.clientX - rect.left) / scaleX,
      y: (event.clientY - rect.top) / scaleY,
    }
  }

  const beginDrag = (event, payload) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = localPointer(event)
    setDragging({
      ...payload,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      moved: false,
      ...point,
    })
  }

  const moveDrag = (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    const point = localPointer(event)
    setDragging((current) => {
      if (!current) return current
      const distance = Math.hypot(point.x - current.startX, point.y - current.startY)
      return { ...current, ...point, moved: current.moved || distance >= DRAG_THRESHOLD }
    })
  }

  const finishDrag = (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    if (dragging.moved) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-integer-drop], [data-integer-chip-id]')
      suppressClickRef.current = true
      onDrop(dragging, target)
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    setDragging(null)
  }

  const consumeSuppressedClick = () => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }

  return {
    beginDrag,
    cancelDrag: () => setDragging(null),
    consumeSuppressedClick,
    dragging,
    finishDrag,
    moveDrag,
    workspaceRef,
  }
}

function ChipBank({ activeOperand, busy, onAdd, onStart, onRemoveSelected, selected }) {
  return (
    <section
      className="grid h-full grid-rows-[auto_auto_1fr_auto] rounded border border-slate-200 bg-white p-2.5 shadow-sm"
      data-integer-drop="bank"
    >
      <div className="text-center text-[10px] font-black uppercase text-slate-500">Signed chip bank</div>
      <div className="mt-1 text-center text-[10px] font-bold text-sky-700">
        Adding to Integer {activeOperand}
      </div>
      <div className="flex items-center justify-center gap-5">
        {['positive', 'negative'].map((sign) => {
          const chip = { id: `bank-${sign}`, sign }
          return (
            <SignedChip
              chip={chip}
              disabled={busy}
              key={sign}
              onClick={() => onAdd(sign, activeOperand)}
              onPointerDown={(event) => onStart(event, { kind: 'bank', sign })}
            />
          )
        })}
      </div>
      <div className="space-y-1.5">
        <p className="text-center text-[9px] font-bold leading-3 text-slate-500">
          Click to add, or drag into A or B.
        </p>
        <button
          className="h-7 w-full rounded border border-orange-200 bg-orange-50 text-[9px] font-black text-orange-700 disabled:opacity-35"
          disabled={busy || !selected}
          onClick={onRemoveSelected}
          type="button"
        >
          Remove selected
        </button>
      </div>
    </section>
  )
}

function OperandPanel({
  active,
  busy,
  cancellingIds,
  chips,
  label,
  onActivate,
  onChipClick,
  onChipKeyDown,
  onChipStart,
  onClear,
  operationAnimating,
  selectedChipId,
  value,
}) {
  const labelColor = label === 'A' ? 'text-emerald-700' : 'text-violet-700'
  return (
    <section
      aria-label={`Integer ${label}, value ${value}`}
      className={`integer-operand-panel grid min-h-0 grid-cols-[112px_1fr] items-center gap-2 rounded border-2 bg-white p-1.5 shadow-sm ${
        active
          ? label === 'A'
            ? 'integer-operand-active border-emerald-400'
            : 'integer-operand-active border-violet-400'
          : 'border-slate-200'
      } ${operationAnimating ? 'integer-operation-source-subdued' : ''}`}
      data-integer-drop={label}
      onClick={onActivate}
      role="group"
    >
      <div className="border-r border-slate-200 pr-2 text-center">
        <div className={`text-[10px] font-black uppercase ${labelColor}`}>Integer {label}</div>
        <div className={`text-2xl font-black leading-7 ${labelColor}`}>{value}</div>
        <button
          className="mt-0.5 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-black text-slate-500 disabled:opacity-35"
          disabled={busy || !chips.length}
          onClick={(event) => {
            event.stopPropagation()
            onClear()
          }}
          type="button"
        >
          Clear {label}
        </button>
      </div>
      <div className="flex min-h-12 flex-wrap content-center items-center gap-1.5">
        {chips.length ? (
          chips.map((chip) => (
            <SignedChip
              cancelling={cancellingIds.includes(chip.id)}
              chip={{ ...chip, operand: label }}
              disabled={busy}
              key={chip.id}
              onClick={(event) => {
                event.stopPropagation()
                onChipClick(chip)
              }}
              onKeyDown={(event) => onChipKeyDown(event, chip)}
              onPointerDown={(event) => {
                event.stopPropagation()
                onChipStart(event, { chipId: chip.id, kind: 'operand', operand: label, sign: chip.sign })
              }}
              selected={selectedChipId === chip.id}
              small
            />
          ))
        ) : (
          <span className="w-full text-center text-[10px] font-bold text-slate-400">
            Drop +1 and -1 chips here
          </span>
        )}
      </div>
    </section>
  )
}

function OperationSelector({ busy, onChange, operation }) {
  return (
    <div className="grid grid-cols-[1fr_90px_1fr] items-center gap-2" aria-label="Main operation">
      <div className="h-px bg-emerald-200" />
      <div className="grid grid-cols-2 overflow-hidden rounded border border-slate-300 bg-white shadow-sm">
        <button
          aria-label="Add Integer A and Integer B"
          aria-pressed={operation === 'add'}
          className={`h-7 text-lg font-black ${operation === 'add' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          disabled={busy}
          onClick={() => onChange('add')}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Subtract Integer B from Integer A"
          aria-pressed={operation === 'subtract'}
          className={`h-7 text-lg font-black ${operation === 'subtract' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
          disabled={busy}
          onClick={() => onChange('subtract')}
          type="button"
        >
          −
        </button>
      </div>
      <div className="h-px bg-violet-200" />
    </div>
  )
}

function LiveIntegerEquation({ operation, resultVisible, valueA, valueB }) {
  const result = operation === 'add' ? valueA + valueB : valueA - valueB
  return (
    <section className="grid h-full place-items-center rounded border border-slate-200 bg-white px-3 shadow-sm">
      <div className="text-center">
        <div className="mb-1 text-[9px] font-black uppercase text-slate-400">Live equation</div>
        <div className="flex items-center justify-center gap-3 text-[24px] font-black leading-tight">
          <span className="text-emerald-700">{valueA}</span>
          <span className={operation === 'add' ? 'text-amber-500' : 'text-orange-500'}>
            {operation === 'add' ? '+' : '−'}
          </span>
          <span className="text-violet-700">{formatInteger(valueB, true)}</span>
          <span className="text-slate-300">=</span>
          <span className={resultVisible ? 'integer-answer-reveal text-sky-600' : 'text-slate-300'}>
            {resultVisible ? result : '?'}
          </span>
        </div>
      </div>
    </section>
  )
}

function directionDetails(operation, valueB) {
  const delta = operation === 'add' ? valueB : -valueB
  const direction = delta > 0 ? 'right' : delta < 0 ? 'left' : 'stay'
  const action = operation === 'add' ? 'Adding' : 'Subtracting'
  const statement = valueB === 0
    ? `${action} 0 means no movement is needed.`
    : `${action} ${valueB} means move ${direction} ${Math.abs(valueB)} ${Math.abs(valueB) === 1 ? 'space' : 'spaces'}.`
  return { delta, direction, statement }
}

function AnimatedGhostChip({ className, ghost }) {
  return (
    <div
      className={`pointer-events-none absolute z-50 grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-black text-white shadow-xl ${chipTone[ghost.sign].fill} ${className}`}
      style={{
        '--integer-chip-delay': `${ghost.delay ?? 0}ms`,
        '--integer-chip-duration': `${ghost.duration ?? B_FLIGHT_MS}ms`,
        '--integer-chip-x': `${ghost.to.x - ghost.from.x}px`,
        '--integer-chip-y': `${ghost.to.y - ghost.from.y}px`,
        left: ghost.from.x,
        top: ghost.from.y,
      }}
    >
      {signedUnit(ghost.sign)}
    </div>
  )
}

function OperationChipOverlay({ animation }) {
  if (!animation) return null

  let ghosts = []
  let className = ''
  if (animation.phase === 'cancel-pairs') {
    ghosts = animation.plan.pairGhosts
    className = 'integer-operation-pair-ghost'
  } else if (animation.phase === 'place-a') {
    ghosts = animation.plan.aGhosts
    className = 'integer-operation-a-ghost'
  } else if (animation.phase === 'move-b' && animation.activeBIndex >= 0) {
    ghosts = [animation.plan.bGhosts[animation.activeBIndex]].filter(Boolean)
    className = 'integer-operation-b-ghost'
  } else if (animation.phase === 'hop-b' && animation.activeBIndex >= 0) {
    const active = animation.plan.bGhosts[animation.activeBIndex]
    ghosts = active ? [{ ...active, from: active.to }] : []
    className = 'integer-operation-b-trigger'
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {ghosts.map((ghost) => (
        <AnimatedGhostChip className={className} ghost={ghost} key={`${animation.runId}-${animation.phase}-${ghost.id}`} />
      ))}
    </div>
  )
}

function OperationNumberLine({ animation, operation, resultVisible, valueA, valueB }) {
  const left = 32
  const width = 712
  const y = 108
  const { delta, direction, statement } = directionDetails(operation, valueB)
  const result = valueA + delta
  const range = focusedLineRange(valueA, result)
  const xFor = (value) => left + ((value - range.min) / (range.max - range.min)) * width
  const hopCount = Math.abs(valueB)
  const directionUnit = Math.sign(delta)
  const visibleHops = animation?.visibleHops ?? (resultVisible ? hopCount : 0)
  const currentValue = valueA + directionUnit * visibleHops
  const hopColor = operation === 'subtract' ? '#f97316' : '#0284c7'
  const labelEvery = range.max - range.min <= 12 ? 1 : 2
  const hideStartMarker = animation && ['cancel-pairs', 'place-a'].includes(animation.phase)

  const hops = Array.from({ length: hopCount }, (_, index) => {
    const from = valueA + directionUnit * index
    const to = from + directionUnit
    const x1 = xFor(from)
    const x2 = xFor(to)
    return {
      d: `M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 28} ${x2} ${y}`,
      from,
      to,
    }
  })

  return (
    <section className="grid h-full grid-rows-[30px_1fr] rounded border border-slate-200 bg-white px-2 py-1 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs font-black uppercase text-slate-600">Operation number line</div>
        <div className="text-[11px] font-black text-slate-600">
          <span className="text-emerald-700">Start at {valueA}</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-violet-700">B = {valueB}</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className={direction === 'left' ? 'text-orange-600' : 'text-sky-600'}>{statement}</span>
        </div>
      </div>
      <svg aria-label={`Focused integer number line from ${range.min} to ${range.max}. Start at ${valueA}. ${statement}`} className="h-[150px] w-full" role="img" viewBox="0 0 776 156">
        <line stroke="#0f172a" strokeWidth="4" x1={left} x2={left + width} y1={y} y2={y} />
        {Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index).map((value) => {
          const x = xFor(value)
          const labelled = value === range.min || value === range.max || value % labelEvery === 0
          return (
            <g data-integer-line-value={value} key={value}>
              <line stroke={value === 0 ? '#f59e0b' : '#64748b'} strokeWidth={value === 0 ? 3.5 : 2} x1={x} x2={x} y1={y - 12} y2={y + 12} />
              {labelled ? (
                <text fill={value === 0 ? '#b45309' : '#334155'} fontSize="11" fontWeight="900" textAnchor="middle" x={x} y={y + 31}>
                  {value}
                </text>
              ) : null}
            </g>
          )
        })}

        <g className={hideStartMarker ? 'opacity-20' : 'integer-operation-start-ready'}>
          <line stroke="#10b981" strokeWidth="4" x1={xFor(valueA)} x2={xFor(valueA)} y1={y - 27} y2={y + 14} />
          <circle cx={xFor(valueA)} cy={y - 31} fill="#10b981" r="12" />
          <text fill="white" fontSize="10" fontWeight="900" textAnchor="middle" x={xFor(valueA)} y={y - 27.5}>
            A
          </text>
        </g>

        {hops.map((hop, index) => {
          if (index >= visibleHops) return null
          const isNewest = animation?.phase === 'hop-b' && index === visibleHops - 1
          return (
            <g key={`${animation?.runId ?? 'settled'}-${index}`}>
              <path
                className={isNewest ? 'integer-operation-hop' : ''}
                d={hop.d}
                fill="none"
                pathLength="1"
                stroke={hopColor}
                strokeLinecap="round"
                strokeWidth="5"
                style={{ '--integer-operation-hop-ms': `${animation?.hopMs ?? HOP_MS}ms` }}
              />
              {isNewest ? (
                <circle className="integer-operation-hop-land" cx={xFor(hop.to)} cy={y} fill={hopColor} r="10" />
              ) : null}
            </g>
          )
        })}

        {animation?.phase === 'zero-b' && hopCount === 0 ? (
          <circle className="integer-operation-zero-bounce" cx={xFor(valueA)} cy={y - 31} fill="#0284c7" r="12" />
        ) : null}

        {animation && hopCount > 0 ? (
          <g className="integer-operation-moving-marker" key={`${animation.runId}-${visibleHops}`}>
            <circle cx={xFor(currentValue)} cy={y - 13} fill={hopColor} r="10" />
            <text fill="white" fontSize="9" fontWeight="900" textAnchor="middle" x={xFor(currentValue)} y={y - 10}>
              {currentValue}
            </text>
          </g>
        ) : null}

        {resultVisible ? (
          <g className="integer-answer-reveal">
            <line stroke="#0284c7" strokeWidth="4" x1={xFor(result)} x2={xFor(result)} y1={y - 27} y2={y + 14} />
            <circle cx={xFor(result)} cy={y - 31} fill="#0284c7" r="13" />
            <text fill="white" fontSize="10" fontWeight="900" textAnchor="middle" x={xFor(result)} y={y - 27.5}>
              {result}
            </text>
          </g>
        ) : null}
      </svg>
    </section>
  )
}

export default function AddingSubtractingIntegers() {
  const idRef = useRef(0)
  const animationTimersRef = useRef([])
  const pairTimerRef = useRef(null)
  const rootRef = useRef(null)
  const [chipsA, setChipsA] = useState([])
  const [chipsB, setChipsB] = useState([])
  const [operation, setOperation] = useState('add')
  const [activeOperand, setActiveOperand] = useState('A')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [animation, setAnimation] = useState(null)
  const [cancellingPair, setCancellingPair] = useState(null)
  const [resultVisible, setResultVisible] = useState(false)
  const [feedback, setFeedback] = useState('Build Integer A and Integer B with signed chips.')
  const [reducedMotion, setReducedMotion] = useState(false)

  const valueA = useMemo(() => valueFromChips(chipsA), [chipsA])
  const valueB = useMemo(() => valueFromChips(chipsB), [chipsB])
  const busy = Boolean(animation || cancellingPair)

  const nextId = (prefix) => {
    idRef.current += 1
    return `${prefix}-${idRef.current}`
  }

  const clearAnimationTimers = () => {
    animationTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    animationTimersRef.current = []
  }

  const scheduleAnimation = (callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    animationTimersRef.current.push(timer)
    return timer
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(
    () => () => {
      clearAnimationTimers()
      window.clearTimeout(pairTimerRef.current)
    },
    []
  )

  const snapshot = () => ({
    activeOperand,
    chipsA,
    chipsB,
    operation,
  })

  const clearResult = () => {
    clearAnimationTimers()
    setAnimation(null)
    setResultVisible(false)
  }

  const measureAnimationPlan = () => {
    const root = rootRef.current
    if (!root) return null
    const rootRect = root.getBoundingClientRect()
    const scaleX = rootRect.width / root.offsetWidth || 1
    const scaleY = rootRect.height / root.offsetHeight || 1
    const centerOf = (element) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        x: (rect.left + rect.width / 2 - rootRect.left) / scaleX,
        y: (rect.top + rect.height / 2 - rootRect.top) / scaleY,
      }
    }
    const chipCenter = (chip) => centerOf(root.querySelector(`[data-integer-chip-id="${chip.id}"]`))
    const tickCenter = (value) => {
      const tick = root.querySelector(`[data-integer-line-value="${value}"]`)
      return centerOf(tick?.querySelector('line'))
    }

    const splitA = splitZeroPairs(chipsA)
    const splitB = splitZeroPairs(chipsB)
    const pairGhosts = []
    ;[...splitA.pairs, ...splitB.pairs].forEach((pair, pairIndex) => {
      const positiveFrom = chipCenter(pair.positive)
      const negativeFrom = chipCenter(pair.negative)
      if (!positiveFrom || !negativeFrom) return
      const midpoint = {
        x: (positiveFrom.x + negativeFrom.x) / 2,
        y: (positiveFrom.y + negativeFrom.y) / 2,
      }
      pairGhosts.push(
        { delay: pairIndex * 75, duration: 500, from: positiveFrom, id: `${pair.positive.id}-pair`, sign: 'positive', to: midpoint },
        { delay: pairIndex * 75, duration: 500, from: negativeFrom, id: `${pair.negative.id}-pair`, sign: 'negative', to: midpoint }
      )
    })

    const aTarget = tickCenter(valueA)
    const aGhosts = aTarget
      ? splitA.remaining.flatMap((chip, index) => {
          const from = chipCenter(chip)
          return from
            ? [{ delay: index * 55, duration: 520, from, id: `${chip.id}-a`, sign: chip.sign, to: aTarget }]
            : []
        })
      : []

    const delta = operation === 'add' ? valueB : -valueB
    const directionUnit = Math.sign(delta)
    const bGhosts = splitB.remaining.flatMap((chip, index) => {
      const from = chipCenter(chip)
      const to = tickCenter(valueA + directionUnit * index)
      return from && to
        ? [{ delay: 0, duration: B_FLIGHT_MS, from, id: `${chip.id}-b`, sign: chip.sign, to }]
        : []
    })

    return { aGhosts, bGhosts, pairGhosts }
  }

  const commit = (changes, message) => {
    setHistory((current) => [...current, snapshot()])
    if (changes.chipsA) setChipsA(changes.chipsA)
    if (changes.chipsB) setChipsB(changes.chipsB)
    if (changes.operation) setOperation(changes.operation)
    if (changes.activeOperand) setActiveOperand(changes.activeOperand)
    setSelected(null)
    clearResult()
    setFeedback(message)
  }

  const chipsFor = (operand) => (operand === 'A' ? chipsA : chipsB)

  const replaceOperand = (operand, nextChips, message) => {
    commit(operand === 'A' ? { chipsA: nextChips } : { chipsB: nextChips }, message)
  }

  const addChip = (sign, operand = activeOperand) => {
    if (busy) return
    const chips = chipsFor(operand)
    if (chips.length >= MAX_CHIPS_PER_OPERAND) {
      setFeedback(`Integer ${operand} can hold at most ${MAX_CHIPS_PER_OPERAND} chips.`)
      return
    }
    const nextChips = [...chips, { id: nextId(`chip-${operand}`), sign }]
    replaceOperand(operand, nextChips, `${signedUnit(sign)} was added to Integer ${operand}.`)
    setActiveOperand(operand)
  }

  const removeChip = (operand, chipId) => {
    if (busy) return
    const chips = chipsFor(operand)
    const chip = chips.find((item) => item.id === chipId)
    if (!chip) return
    replaceOperand(
      operand,
      chips.filter((item) => item.id !== chipId),
      `${signedUnit(chip.sign)} was removed from Integer ${operand}.`
    )
  }

  const cancelPair = (operand, firstId, secondId) => {
    if (busy || firstId === secondId) return
    const chips = chipsFor(operand)
    const first = chips.find((chip) => chip.id === firstId)
    const second = chips.find((chip) => chip.id === secondId)
    if (!first || !second) return
    if (first.sign === second.sign) {
      setSelected({ chipId: secondId, operand })
      setFeedback('A zero pair needs one +1 chip and one -1 chip in the same integer.')
      return
    }
    const nextChips = chips.filter((chip) => chip.id !== firstId && chip.id !== secondId)
    setSelected(null)
    setCancellingPair({ ids: [firstId, secondId], operand })
    setFeedback(`The opposite chips in Integer ${operand} make 0.`)
    window.clearTimeout(pairTimerRef.current)
    pairTimerRef.current = window.setTimeout(() => {
      setCancellingPair(null)
      replaceOperand(
        operand,
        nextChips,
        `A zero pair was cancelled inside Integer ${operand}. Its value stayed the same.`
      )
    }, reducedMotion ? 20 : 440)
  }

  const handleChipClick = (operand, chip) => {
    if (busy) return
    setActiveOperand(operand)
    if (!selected) {
      setSelected({ chipId: chip.id, operand })
      setFeedback('Select an opposite chip in the same integer to cancel a zero pair, or remove this chip.')
      return
    }
    if (selected.chipId === chip.id && selected.operand === operand) {
      setSelected(null)
      setFeedback('Chip selection cleared.')
      return
    }
    if (selected.operand !== operand) {
      setSelected({ chipId: chip.id, operand })
      setFeedback('Zero pairs can only cancel inside the same integer.')
      return
    }
    cancelPair(operand, selected.chipId, chip.id)
  }

  const handleChipKeyDown = (event, operand, chip) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      removeChip(operand, chip.id)
    }
  }

  const handleDrop = (piece, target) => {
    const drop = target?.dataset.integerDrop
    const targetChipId = target?.dataset.integerChipId
    const targetOperand = target?.dataset.integerChipOperand

    if (piece.kind === 'bank') {
      if (drop === 'A' || drop === 'B') addChip(piece.sign, drop)
      else setFeedback('Drop the chip into Integer A or Integer B.')
      return
    }

    if (piece.kind === 'operand') {
      if (drop === 'bank' || targetChipId?.startsWith('bank-')) {
        removeChip(piece.operand, piece.chipId)
        return
      }
      if (targetChipId) {
        if (targetOperand !== piece.operand) {
          setFeedback('Zero pairs can only cancel inside the same integer.')
          return
        }
        cancelPair(piece.operand, piece.chipId, targetChipId)
        return
      }
      setFeedback('Drop the chip on an opposite chip, or return it to the chip bank.')
    }
  }

  const {
    beginDrag,
    cancelDrag,
    consumeSuppressedClick,
    dragging,
    finishDrag,
    moveDrag,
    workspaceRef,
  } = useLocalDrag(handleDrop)

  const handleBankClick = (sign, operand) => {
    if (consumeSuppressedClick()) return
    addChip(sign, operand)
  }

  const changeOperation = (nextOperation) => {
    if (busy || nextOperation === operation) return
    commit({ operation: nextOperation }, nextOperation === 'add' ? 'Now add Integer B to Integer A.' : 'Now subtract Integer B from Integer A.')
  }

  const clearOperand = (operand) => {
    if (busy || !chipsFor(operand).length) return
    replaceOperand(operand, [], `Integer ${operand} was cleared.`)
  }

  const undo = () => {
    if (busy || !history.length) return
    const previous = history.at(-1)
    setHistory((current) => current.slice(0, -1))
    setChipsA(previous.chipsA)
    setChipsB(previous.chipsB)
    setOperation(previous.operation)
    setActiveOperand(previous.activeOperand)
    setSelected(null)
    clearResult()
    setFeedback('The last change was undone.')
  }

  const animateOperation = () => {
    if (busy) return
    clearAnimationTimers()
    window.clearTimeout(pairTimerRef.current)
    setResultVisible(false)
    const runId = nextId('operation')

    if (reducedMotion) {
      setAnimation(null)
      setResultVisible(true)
      setFeedback('The number line shows the completed operation.')
      return
    }

    const plan = measureAnimationPlan()
    if (!plan) {
      setFeedback('The animation is not ready yet. Try again.')
      return
    }

    const hopCount = plan.bGhosts.length
    const hopMs = hopCount > 7 ? 230 : HOP_MS
    setFeedback(directionDetails(operation, valueB).statement)

    const finishAnimation = () => {
      setAnimation(null)
      setResultVisible(true)
      setFeedback(
        hopCount
          ? `The jumps land on ${operation === 'add' ? valueA + valueB : valueA - valueB}.`
          : 'B is 0 after its zero pairs cancel, so the starting value does not change.'
      )
    }

    const runBChip = (index) => {
      if (index >= hopCount) {
        scheduleAnimation(finishAnimation, 180)
        return
      }
      setAnimation({ activeBIndex: index, hopMs, phase: 'move-b', plan, runId, visibleHops: index })
      scheduleAnimation(() => {
        setAnimation({ activeBIndex: index, hopMs, phase: 'hop-b', plan, runId, visibleHops: index + 1 })
        scheduleAnimation(() => runBChip(index + 1), hopMs + 80)
      }, B_FLIGHT_MS)
    }

    const startBPhase = () => {
      if (!hopCount) {
        setAnimation({ activeBIndex: -1, hopMs, phase: 'zero-b', plan, runId, visibleHops: 0 })
        scheduleAnimation(finishAnimation, 650)
        return
      }
      runBChip(0)
    }

    const startAPhase = () => {
      setAnimation({ activeBIndex: -1, hopMs, phase: 'place-a', plan, runId, visibleHops: 0 })
      const finalADelay = plan.aGhosts.reduce(
        (longest, ghost) => Math.max(longest, ghost.delay + ghost.duration),
        plan.aGhosts.length ? 0 : 340
      )
      scheduleAnimation(startBPhase, Math.max(finalADelay + 100, A_PHASE_MS))
    }

    if (plan.pairGhosts.length) {
      setAnimation({ activeBIndex: -1, hopMs, phase: 'cancel-pairs', plan, runId, visibleHops: 0 })
      const finalPairDelay = plan.pairGhosts.reduce(
        (longest, ghost) => Math.max(longest, ghost.delay + ghost.duration),
        PAIR_PHASE_MS
      )
      scheduleAnimation(startAPhase, finalPairDelay + 90)
    } else {
      startAPhase()
    }
  }

  const reset = () => {
    if (busy) return
    clearAnimationTimers()
    setChipsA([])
    setChipsB([])
    setOperation('add')
    setActiveOperand('A')
    setSelected(null)
    setHistory([])
    setAnimation(null)
    setResultVisible(false)
    setFeedback('Build Integer A and Integer B with signed chips.')
  }

  const removeSelected = () => {
    if (!selected) return
    removeChip(selected.operand, selected.chipId)
  }

  const result = operation === 'add' ? valueA + valueB : valueA - valueB

  return (
    <div className="relative box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-1 text-slate-800" ref={rootRef}>
      <header className="mb-1 flex h-9 shrink-0 items-start justify-between">
        <div>
          <h2 className="text-lg font-black leading-5 text-slate-950">Adding & Subtracting Integers</h2>
          <p className="text-[11px] font-semibold text-slate-500">
            Build A and B, choose the operation, then watch B move the number line from A.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button className="h-8 rounded border border-slate-300 bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm disabled:opacity-35" disabled={busy || !history.length} onClick={undo} type="button">
            Undo
          </button>
          <button className="h-8 rounded border border-slate-300 bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm disabled:opacity-35" disabled={busy} onClick={reset} type="button">
            Reset
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[192px_190px_48px] gap-2">
        <div
          className="relative grid min-h-0 grid-cols-[150px_1fr] gap-2"
          onPointerCancel={cancelDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          ref={workspaceRef}
        >
          <ChipBank
            activeOperand={activeOperand}
            busy={busy}
            onAdd={handleBankClick}
            onRemoveSelected={removeSelected}
            onStart={beginDrag}
            selected={selected}
          />
          <div className="grid min-h-0 grid-rows-[76px_28px_76px] gap-1.5">
            <OperandPanel
              active={activeOperand === 'A'}
              busy={busy}
              cancellingIds={cancellingPair?.operand === 'A' ? cancellingPair.ids : []}
              chips={chipsA}
              label="A"
              onActivate={() => !busy && setActiveOperand('A')}
              onChipClick={(chip) => handleChipClick('A', chip)}
              onChipKeyDown={(event, chip) => handleChipKeyDown(event, 'A', chip)}
              onChipStart={beginDrag}
              onClear={() => clearOperand('A')}
              operationAnimating={Boolean(animation)}
              selectedChipId={selected?.operand === 'A' ? selected.chipId : null}
              value={valueA}
            />
            <OperationSelector busy={busy} onChange={changeOperation} operation={operation} />
            <OperandPanel
              active={activeOperand === 'B'}
              busy={busy}
              cancellingIds={cancellingPair?.operand === 'B' ? cancellingPair.ids : []}
              chips={chipsB}
              label="B"
              onActivate={() => !busy && setActiveOperand('B')}
              onChipClick={(chip) => handleChipClick('B', chip)}
              onChipKeyDown={(event, chip) => handleChipKeyDown(event, 'B', chip)}
              onChipStart={beginDrag}
              onClear={() => clearOperand('B')}
              operationAnimating={Boolean(animation)}
              selectedChipId={selected?.operand === 'B' ? selected.chipId : null}
              value={valueB}
            />
          </div>
          <DragGhost dragging={dragging} />
        </div>

        <OperationNumberLine animation={animation} operation={operation} resultVisible={resultVisible} valueA={valueA} valueB={valueB} />

        <div className="grid min-h-0 grid-cols-[310px_1fr_132px] gap-2">
          <LiveIntegerEquation operation={operation} resultVisible={resultVisible} valueA={valueA} valueB={valueB} />
          <section className="grid place-items-center rounded border border-sky-200 bg-sky-50 px-3 text-center text-[10px] font-black leading-4 text-sky-800">
            {resultVisible ? `The final answer is ${result}.` : feedback}
          </section>
          <button
            className={`rounded border text-[10px] font-black shadow-sm ${
              busy
                ? 'border-slate-200 bg-slate-100 text-slate-400'
                : 'fraction-step-ready-aura border-sky-500 bg-sky-500 text-white'
            }`}
            disabled={busy}
            onClick={animateOperation}
            type="button"
          >
            {busy ? 'Animating...' : resultVisible ? 'Animate again' : 'Animate operation'}
          </button>
        </div>
      </div>
      <OperationChipOverlay animation={animation} />
    </div>
  )
}
