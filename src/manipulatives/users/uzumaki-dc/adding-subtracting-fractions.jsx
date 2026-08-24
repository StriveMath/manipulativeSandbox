import { useMemo, useRef, useState } from 'react'

const denominatorOptions = [2, 3, 4, 5, 6, 8, 10, 12]
const maxWorkingParts = 24

const initialProblem = {
  operation: '+',
  first: { numerator: 1, denominator: 4 },
  second: { numerator: 2, denominator: 4 },
}

const palette = {
  first: {
    fill: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  second: {
    fill: 'bg-purple-500',
    soft: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  result: {
    fill: 'bg-sky-500',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  removed: {
    fill: 'bg-orange-400',
    soft: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)

  while (y) {
    const next = x % y
    x = y
    y = next
  }

  return x || 1
}

const lcm = (a, b) => (a * b) / gcd(a, b)

const fractionValue = ({ numerator, denominator }) => numerator / denominator

const simplify = (numerator, denominator) => {
  if (numerator === 0) return { numerator: 0, denominator: 1 }

  const divisor = gcd(numerator, denominator)

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  }
}

const formatFraction = ({ numerator, denominator }) => {
  if (numerator === 0) return '0'
  if (denominator === 1) return `${numerator}`
  return `${numerator}/${denominator}`
}

const equivalentFraction = (fraction, multiplier) => ({
  numerator: fraction.numerator * multiplier,
  denominator: fraction.denominator * multiplier,
})

const compatibleDenominators = (first, second) =>
  lcm(first, second) <= maxWorkingParts

function normalizeProblem(problem) {
  const next = {
    operation: problem.operation,
    first: {
      denominator: problem.first.denominator,
      numerator: clamp(
        problem.first.numerator,
        1,
        problem.first.denominator - 1
      ),
    },
    second: {
      denominator: problem.second.denominator,
      numerator: clamp(
        problem.second.numerator,
        1,
        problem.second.denominator - 1
      ),
    },
  }

  if (next.operation === '+') {
    let maxSecond = Math.floor(
      (1 - fractionValue(next.first)) * next.second.denominator + 1e-9
    )

    if (maxSecond < 1) {
      const maxFirst = Math.floor(
        (1 - 1 / next.second.denominator) * next.first.denominator + 1e-9
      )
      next.first.numerator = clamp(next.first.numerator, 1, maxFirst)
      maxSecond = Math.floor(
        (1 - fractionValue(next.first)) * next.second.denominator + 1e-9
      )
    }

    next.second.numerator = clamp(next.second.numerator, 1, maxSecond)
    return next
  }

  let maxSecond = Math.floor(
    fractionValue(next.first) * next.second.denominator + 1e-9
  )

  if (maxSecond < 1) {
    const minFirst = Math.ceil(
      (1 / next.second.denominator) * next.first.denominator - 1e-9
    )
    next.first.numerator = clamp(
      Math.max(next.first.numerator, minFirst),
      1,
      next.first.denominator - 1
    )
    maxSecond = Math.floor(
      fractionValue(next.first) * next.second.denominator + 1e-9
    )
  }

  next.second.numerator = clamp(next.second.numerator, 1, maxSecond)
  return next
}

function FractionText({ className = '', fraction }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      <span>{fraction.numerator}</span>
      <span className="text-slate-400">/</span>
      <span>{fraction.denominator}</span>
    </span>
  )
}

function OperationControl({ onChange, value }) {
  return (
    <div>
      <div className="mb-1 text-[9px] font-black uppercase text-slate-400">
        Operation
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: '+ Add', value: '+' },
          { label: '- Subtract', value: '-' },
        ].map((option) => (
          <button
            className={`h-8 rounded border text-xs font-black transition ${
              value === option.value
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FractionControl({
  disabledDenominator,
  fraction,
  label,
  maxNumerator,
  onChange,
  tone,
}) {
  const updateNumerator = (numerator) => {
    onChange({
      ...fraction,
      numerator: clamp(numerator, 1, maxNumerator),
    })
  }

  const updateDenominator = (denominator) => {
    const nextDenominator = Number(denominator)
    onChange({
      denominator: nextDenominator,
      numerator: clamp(fraction.numerator, 1, nextDenominator - 1),
    })
  }

  return (
    <div className={`rounded border ${tone.border} ${tone.soft} p-2`}>
      <div className={`mb-1 text-[10px] font-black uppercase ${tone.text}`}>
        {label}
      </div>
      <div className="grid grid-cols-[54px_1fr] items-center gap-2">
        <div className="rounded border border-white bg-white px-1 py-1 text-center text-xl font-black shadow-sm">
          <FractionText className={tone.text} fraction={fraction} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            aria-label={`Decrease ${label} numerator`}
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator <= 1}
            onClick={() => updateNumerator(fraction.numerator - 1)}
            type="button"
          >
            -
          </button>
          <button
            aria-label={`Increase ${label} numerator`}
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator >= maxNumerator}
            onClick={() => updateNumerator(fraction.numerator + 1)}
            type="button"
          >
            +
          </button>
          <select
            aria-label={`${label} denominator`}
            className="col-span-2 h-7 rounded border border-slate-300 bg-white px-2 text-xs font-black text-slate-700"
            onChange={(event) => updateDenominator(event.target.value)}
            value={fraction.denominator}
          >
            {denominatorOptions.map((denominator) => (
              <option
                disabled={disabledDenominator(denominator)}
                key={denominator}
                value={denominator}
              >
                /{denominator}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function MultiplierButtons({ fraction, multiplier, onChange, tone }) {
  const multipliers = Array.from(
    { length: Math.floor(maxWorkingParts / fraction.denominator) },
    (_, index) => index + 1
  )

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="shrink-0 text-[9px] font-black uppercase text-slate-400">
        Split
      </span>
      <div className="flex min-w-0 flex-1 gap-1">
        {multipliers.map((value) => (
          <button
            aria-label={`Split ${formatFraction(fraction)} into ${value} equal pieces per original part`}
            className={`h-6 min-w-0 flex-1 rounded border px-1 text-[10px] font-black transition ${
              multiplier === value
                ? `${tone.border} ${tone.soft} ${tone.text} shadow-sm`
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
            key={value}
            onClick={() => onChange(value)}
            type="button"
          >
            x{value}
          </button>
        ))}
      </div>
    </div>
  )
}

function EquivalentBar({
  actionComplete,
  aligned,
  baseFraction,
  draggableIndices,
  equivalent,
  highlightRemovable,
  multiplier,
  onActivate,
  onDragStart,
  onMultiplierChange,
  partitionAnimation,
  side,
  tone,
  usedIndices,
}) {
  const draggableSet = new Set(draggableIndices)
  const usedSet = new Set(usedIndices)
  const splitClass = partitionAnimation
    ? partitionAnimation.direction === 'split'
      ? 'fraction-workbench-split-piece'
      : 'fraction-workbench-merge-piece'
    : ''

  return (
    <section
      className={`grid min-h-0 grid-cols-[122px_1fr] gap-2 rounded border p-2 ${tone.border} ${tone.soft} ${
        aligned ? 'fraction-workbench-match' : ''
      }`}
    >
      <div className="grid content-center gap-1">
        <div className={`text-[10px] font-black uppercase ${tone.text}`}>
          Fraction {side === 'first' ? 'A' : 'B'}
        </div>
        <div className="flex items-center gap-1 text-lg font-black">
          <FractionText className={tone.text} fraction={baseFraction} />
          <span className="text-xs text-slate-400">=</span>
          <FractionText className={tone.text} fraction={equivalent} />
        </div>
        <div className="text-[9px] font-bold text-slate-500">
          x{multiplier}/x{multiplier}
        </div>
      </div>

      <div className="grid min-w-0 grid-rows-[1fr_auto] gap-1.5">
        <div
          className="grid h-12 overflow-visible rounded border-2 border-slate-800 bg-white shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${equivalent.denominator}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: equivalent.denominator }, (_, index) => {
            const filled = index < equivalent.numerator
            const used = usedSet.has(index)
            const draggable = draggableSet.has(index) && !used
            const remainingResult =
              actionComplete && side === 'first' && filled && !used
            const segmentColor = remainingResult
              ? palette.result.fill
              : filled
                ? tone.fill
                : 'bg-slate-100'
            const originalBoundary =
              multiplier > 1 && (index + 1) % multiplier === 0

            return (
              <button
                aria-label={`Fraction ${side === 'first' ? 'A' : 'B'} piece ${index + 1} of ${equivalent.denominator}${
                  draggable ? ', move this piece' : ''
                }`}
                className={`relative min-w-0 overflow-hidden bg-white p-0 ${
                  originalBoundary
                    ? 'border-r-2 border-r-slate-500'
                    : 'border-r border-r-white'
                } last:border-r-0 ${
                  draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                } ${
                  draggable && highlightRemovable && !actionComplete
                    ? 'fraction-workbench-removable'
                    : ''
                }`}
                disabled={!draggable}
                key={`${partitionAnimation?.id ?? `${side}-initial`}-${multiplier}-${index}`}
                onKeyDown={(event) => {
                  if (!draggable || (event.key !== 'Enter' && event.key !== ' ')) return
                  event.preventDefault()
                  onActivate(side, index)
                }}
                onPointerDown={(event) =>
                  draggable && onDragStart(event, { source: side, index })
                }
                style={{
                  touchAction: 'none',
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 ${segmentColor} ${splitClass} transition-opacity duration-200 ${
                    used ? 'opacity-20' : 'opacity-100'
                  }`}
                  style={{
                    '--fraction-workbench-delay': `${Math.min(index * 28, 420)}ms`,
                  }}
                />
              </button>
            )
          })}
        </div>
        <MultiplierButtons
          fraction={baseFraction}
          multiplier={multiplier}
          onChange={onMultiplierChange}
          tone={tone}
        />
      </div>
    </section>
  )
}

function PartitionBar({ denominator, fillCount, tone, ariaLabel }) {
  return (
    <div
      aria-label={ariaLabel}
      className="grid h-11 overflow-hidden rounded border-2 border-slate-800 bg-white shadow-inner"
      role="img"
      style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: denominator }, (_, index) => (
        <span
          className={`min-w-0 border-r border-white/95 last:border-r-0 ${
            index < fillCount ? tone.fill : 'bg-slate-100'
          }`}
          key={`${ariaLabel}-${index}`}
        />
      ))}
    </div>
  )
}

function LiveEquation({
  aligned,
  complete,
  first,
  operation,
  placedFirst,
  placedSecond,
  progress,
  result,
  second,
}) {
  let shownFirst = first
  let shownSecond = second
  let shownResult = result

  if (aligned && !complete && operation === '+') {
    shownFirst = { numerator: placedFirst, denominator: first.denominator }
    shownSecond = { numerator: placedSecond, denominator: second.denominator }
    shownResult = { numerator: progress, denominator: first.denominator }
  }

  if (aligned && !complete && operation === '-') {
    shownSecond = { numerator: progress, denominator: second.denominator }
    shownResult = {
      numerator: first.numerator - progress,
      denominator: first.denominator,
    }
  }

  const simplifiedResult = complete
    ? simplify(result.numerator, result.denominator)
    : null
  const showSimplified =
    complete && formatFraction(simplifiedResult) !== formatFraction(result)

  return (
    <div className="grid min-h-0 grid-cols-[1fr_auto] items-center gap-3 rounded border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <div className="flex items-center justify-center gap-2 text-2xl font-black tabular-nums">
        <FractionText className={palette.first.text} fraction={shownFirst} />
        <span
          className={`rounded px-2 py-0.5 ${
            operation === '+'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {operation}
        </span>
        <FractionText className={palette.second.text} fraction={shownSecond} />
        <span className="text-slate-300">=</span>
        {aligned ? (
          <FractionText className={palette.result.text} fraction={shownResult} />
        ) : (
          <span className="text-slate-300">?</span>
        )}
        {showSimplified && (
          <>
            <span className="text-slate-300">=</span>
            <FractionText className="text-slate-900" fraction={simplifiedResult} />
          </>
        )}
      </div>
      <div
        className={`rounded px-3 py-1 text-center text-xs font-black ${
          complete
            ? `${palette.result.soft} ${palette.result.text} fraction-workbench-complete`
            : 'bg-slate-100 text-slate-500'
        }`}
      >
        {complete ? 'Model complete' : aligned ? 'Build the result' : 'Match the pieces'}
      </div>
    </div>
  )
}

export default function AddingSubtractingFractions() {
  const [problem, setProblem] = useState(initialProblem)
  const [firstMultiplier, setFirstMultiplier] = useState(1)
  const [secondMultiplier, setSecondMultiplier] = useState(1)
  const [placedPieces, setPlacedPieces] = useState([])
  const [removedIndices, setRemovedIndices] = useState([])
  const [dragging, setDragging] = useState(null)
  const [feedback, setFeedback] = useState(
    'Split the bars when you need equal-size pieces.'
  )
  const [partitionAnimations, setPartitionAnimations] = useState({
    first: null,
    second: null,
  })
  const workspaceRef = useRef(null)
  const targetRef = useRef(null)

  const model = useMemo(() => {
    const normalized = normalizeProblem(problem)
    const firstEquivalent = equivalentFraction(
      normalized.first,
      firstMultiplier
    )
    const secondEquivalent = equivalentFraction(
      normalized.second,
      secondMultiplier
    )
    const aligned =
      firstEquivalent.denominator === secondEquivalent.denominator
    const denominator = aligned ? firstEquivalent.denominator : null
    const resultNumerator = aligned
      ? normalized.operation === '+'
        ? firstEquivalent.numerator + secondEquivalent.numerator
        : firstEquivalent.numerator - secondEquivalent.numerator
      : null

    return {
      ...normalized,
      aligned,
      denominator,
      firstEquivalent,
      result: aligned
        ? { numerator: resultNumerator, denominator }
        : null,
      secondEquivalent,
    }
  }, [firstMultiplier, problem, secondMultiplier])

  const progress =
    model.operation === '+' ? placedPieces.length : removedIndices.length
  const complete = model.aligned
    ? model.operation === '+'
      ? progress === model.result.numerator
      : progress === model.secondEquivalent.numerator
    : false
  const placedFirst = placedPieces.filter(
    (piece) => piece.source === 'first'
  ).length
  const placedSecond = placedPieces.filter(
    (piece) => piece.source === 'second'
  ).length
  const firstUsed =
    model.operation === '+'
      ? placedPieces
          .filter((piece) => piece.source === 'first')
          .map((piece) => piece.index)
      : removedIndices
  const secondUsed = placedPieces
    .filter((piece) => piece.source === 'second')
    .map((piece) => piece.index)
  const subtractionStart = model.aligned
    ? model.firstEquivalent.numerator - model.secondEquivalent.numerator
    : 0
  const firstDraggable = model.aligned
    ? model.operation === '+'
      ? Array.from({ length: model.firstEquivalent.numerator }, (_, index) => index)
      : Array.from(
          { length: model.secondEquivalent.numerator },
          (_, index) => subtractionStart + index
        )
    : []
  const secondDraggable =
    model.aligned && model.operation === '+'
      ? Array.from({ length: model.secondEquivalent.numerator }, (_, index) => index)
      : []

  const clearAction = (message) => {
    setPlacedPieces([])
    setRemovedIndices([])
    setDragging(null)
    if (message) setFeedback(message)
  }

  const resetPartitions = (message) => {
    setFirstMultiplier(1)
    setSecondMultiplier(1)
    setPartitionAnimations({ first: null, second: null })
    clearAction(message)
  }

  const applyProblem = (nextProblem, resetMultiplier = true) => {
    setProblem(normalizeProblem(nextProblem))
    if (resetMultiplier) {
      resetPartitions('The fractions changed. Prepare equal-size pieces again.')
    } else {
      clearAction(
        nextProblem.operation === '+'
          ? 'Addition selected. Move both sets of pieces into the result bar.'
          : 'Subtraction selected. Move the glowing pieces into the removal tray.'
      )
    }
  }

  const maxSecondNumerator = (() => {
    if (model.operation === '+') {
      return Math.max(
        1,
        Math.floor(
          (1 - fractionValue(model.first)) * model.second.denominator + 1e-9
        )
      )
    }

    return Math.max(
      1,
      Math.floor(
        fractionValue(model.first) * model.second.denominator + 1e-9
      )
    )
  })()

  const changeMultiplier = (side, nextMultiplier) => {
    const current = side === 'first' ? firstMultiplier : secondMultiplier
    if (current === nextMultiplier) return

    if (side === 'first') setFirstMultiplier(nextMultiplier)
    else setSecondMultiplier(nextMultiplier)

    setPartitionAnimations((currentAnimations) => ({
      ...currentAnimations,
      [side]: {
        direction: nextMultiplier > current ? 'split' : 'merge',
        id: `${side}-${nextMultiplier}-${performance.now()}`,
      },
    }))
    clearAction(
      nextMultiplier > current
        ? `Fraction ${side === 'first' ? 'A' : 'B'} split into more equal pieces.`
        : `Fraction ${side === 'first' ? 'A' : 'B'} merged into larger pieces.`
    )
  }

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

  const beginDrag = (event, piece) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = localPointer(event)

    setDragging({
      ...piece,
      pointerId: event.pointerId,
      x: pointer.x,
      y: pointer.y,
    })
  }

  const placePiece = (source, index) => {
    if (!model.aligned || complete) return

    if (model.operation === '+') {
      const alreadyPlaced = placedPieces.some(
        (piece) => piece.source === source && piece.index === index
      )
      if (alreadyPlaced) return

      const next = [...placedPieces, { source, index }]
      setPlacedPieces(next)
      const remaining = model.result.numerator - next.length
      setFeedback(
        remaining === 0
          ? 'The blue bar shows the complete sum.'
          : `Placed ${next.length} piece${next.length === 1 ? '' : 's'}. ${remaining} remaining.`
      )
      return
    }

    if (!firstDraggable.includes(index) || removedIndices.includes(index)) return
    const next = [...removedIndices, index]
    setRemovedIndices(next)
    const remaining = model.secondEquivalent.numerator - next.length
    setFeedback(
      remaining === 0
        ? 'The orange pieces were removed. The blue pieces remain.'
        : `Removed ${next.length} piece${next.length === 1 ? '' : 's'}. ${remaining} remaining.`
    )
  }

  const moveDrag = (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return
    const pointer = localPointer(event)
    setDragging((current) =>
      current ? { ...current, x: pointer.x, y: pointer.y } : current
    )
  }

  const finishDrag = (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return

    const rect = targetRef.current?.getBoundingClientRect()
    const inside =
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom

    if (inside) placePiece(dragging.source, dragging.index)
    else setFeedback('Drop the piece inside the outlined destination bar.')

    setDragging(null)
  }

  const undo = () => {
    if (model.operation === '+') {
      if (!placedPieces.length) return
      setPlacedPieces((current) => current.slice(0, -1))
    } else {
      if (!removedIndices.length) return
      setRemovedIndices((current) => current.slice(0, -1))
    }
    setFeedback('The latest piece returned to its source bar.')
  }

  const reset = () => {
    setProblem(initialProblem)
    setFirstMultiplier(1)
    setSecondMultiplier(1)
    setPlacedPieces([])
    setRemovedIndices([])
    setDragging(null)
    setPartitionAnimations({ first: null, second: null })
    setFeedback('Split the bars when you need equal-size pieces.')
  }

  const resultFill = model.aligned
    ? model.operation === '+'
      ? placedPieces.length
      : removedIndices.length > 0 || complete
        ? model.firstEquivalent.numerator - removedIndices.length
        : 0
    : 0

  const observation = !model.aligned
    ? `The bars use ${model.firstEquivalent.denominator}ths and ${model.secondEquivalent.denominator}ths. Split them until the piece sizes match.`
    : complete
      ? model.operation === '+'
        ? `${model.result.numerator} blue ${model.result.denominator}ths make the sum.`
        : `${model.result.numerator} blue ${model.result.denominator}ths remain after subtraction.`
      : `Both bars now use ${model.denominator} equal parts. The pieces are ready to move.`

  return (
    <div
      className="relative box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-800"
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      ref={workspaceRef}
    >
      <header className="mb-1 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black leading-5 text-slate-900">
            Adding & Subtracting Fractions
          </h2>
          <p className="text-[11px] font-semibold leading-4 text-slate-500">
            Split fractions into equal-size pieces, then combine or remove them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 shadow-sm disabled:opacity-35"
            disabled={progress === 0}
            onClick={undo}
            type="button"
          >
            Undo piece
          </button>
          <button
            className="h-8 rounded bg-slate-900 px-3 text-xs font-black text-white shadow-sm"
            onClick={reset}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[188px_minmax(0,1fr)] gap-3">
        <aside className="grid content-start gap-2">
          <OperationControl
            onChange={(operation) =>
              applyProblem({ ...model, operation }, false)
            }
            value={model.operation}
          />
          <FractionControl
            disabledDenominator={(denominator) =>
              !compatibleDenominators(denominator, model.second.denominator)
            }
            fraction={model.first}
            label="Fraction A"
            maxNumerator={model.first.denominator - 1}
            onChange={(first) => applyProblem({ ...model, first })}
            tone={palette.first}
          />
          <FractionControl
            disabledDenominator={(denominator) =>
              !compatibleDenominators(model.first.denominator, denominator)
            }
            fraction={model.second}
            label="Fraction B"
            maxNumerator={maxSecondNumerator}
            onChange={(second) => applyProblem({ ...model, second })}
            tone={palette.second}
          />
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[10px] font-bold leading-4 text-amber-800">
            <div className="mb-0.5 font-black uppercase">Piece limit</div>
            Denominator pairs are limited to {maxWorkingParts} working pieces so every piece stays readable.
          </div>
          <div className="rounded border border-sky-200 bg-sky-50 p-2 text-[10px] font-bold leading-4 text-sky-800">
            {feedback}
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[194px_1fr_62px] gap-2">
          <div className="grid min-h-0 grid-rows-2 gap-2">
            <EquivalentBar
              actionComplete={complete}
              aligned={model.aligned}
              baseFraction={model.first}
              draggableIndices={firstDraggable}
              equivalent={model.firstEquivalent}
              highlightRemovable={model.operation === '-'}
              multiplier={firstMultiplier}
              onActivate={placePiece}
              onDragStart={beginDrag}
              onMultiplierChange={(value) => changeMultiplier('first', value)}
              partitionAnimation={partitionAnimations.first}
              side="first"
              tone={palette.first}
              usedIndices={firstUsed}
            />
            <EquivalentBar
              actionComplete={complete}
              aligned={model.aligned}
              baseFraction={model.second}
              draggableIndices={secondDraggable}
              equivalent={model.secondEquivalent}
              highlightRemovable={false}
              multiplier={secondMultiplier}
              onActivate={placePiece}
              onDragStart={beginDrag}
              onMultiplierChange={(value) => changeMultiplier('second', value)}
              partitionAnimation={partitionAnimations.second}
              side="second"
              tone={palette.second}
              usedIndices={secondUsed}
            />
          </div>

          <section
            className={`grid min-h-0 rounded border-2 border-dashed p-2 ${
              model.aligned
                ? model.operation === '+'
                  ? `${palette.result.border} bg-sky-50/60`
                  : `${palette.removed.border} bg-orange-50/50`
                : 'border-slate-300 bg-white'
            }`}
          >
            {!model.aligned ? (
              <div className="grid place-items-center text-center">
                <div>
                  <div className="text-base font-black text-slate-700">
                    Make both bars use equal-size pieces
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    Try the split multipliers above. The whole lengths stay the same.
                  </div>
                  <div className="mx-auto mt-4 h-12 w-4/5 rounded border-2 border-dashed border-slate-300 bg-slate-50" />
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 grid-rows-[auto_1fr] gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span
                    className={
                      model.operation === '+'
                        ? palette.result.text
                        : palette.removed.text
                    }
                  >
                    {model.operation === '+'
                      ? 'Drag A and B pieces into the result'
                      : 'Drag the glowing A pieces into the removal tray'}
                  </span>
                  <span className="text-slate-500">
                    {progress}/{
                      model.operation === '+'
                        ? model.result.numerator
                        : model.secondEquivalent.numerator
                    } moved
                  </span>
                </div>
                <div
                  className={`grid min-h-0 ${
                    model.operation === '-' ? 'grid-cols-2 gap-2' : ''
                  }`}
                >
                  <div
                    className={`rounded border bg-white p-2 ${
                      model.operation === '+'
                        ? palette.result.border
                        : palette.removed.border
                    }`}
                    ref={targetRef}
                  >
                    <div
                      className={`mb-1 text-[9px] font-black uppercase ${
                        model.operation === '+'
                          ? palette.result.text
                          : palette.removed.text
                      }`}
                    >
                      {model.operation === '+' ? 'Result bar' : 'Removed pieces'}
                    </div>
                    <PartitionBar
                      ariaLabel={
                        model.operation === '+' ? 'Result bar' : 'Removed pieces bar'
                      }
                      denominator={model.denominator}
                      fillCount={
                        model.operation === '+'
                          ? placedPieces.length
                          : removedIndices.length
                      }
                      tone={
                        model.operation === '+' ? palette.result : palette.removed
                      }
                    />
                  </div>
                  {model.operation === '-' && (
                    <div className={`rounded border bg-white p-2 ${palette.result.border}`}>
                      <div className={`mb-1 text-[9px] font-black uppercase ${palette.result.text}`}>
                        Remaining result
                      </div>
                      <PartitionBar
                        ariaLabel="Remaining result bar"
                        denominator={model.denominator}
                        fillCount={resultFill}
                        tone={palette.result}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-rows-[1fr_auto] gap-1">
            <LiveEquation
              aligned={model.aligned}
              complete={complete}
              first={model.firstEquivalent}
              operation={model.operation}
              placedFirst={placedFirst}
              placedSecond={placedSecond}
              progress={progress}
              result={model.result ?? { numerator: 0, denominator: 1 }}
              second={model.secondEquivalent}
            />
            <div className="text-center text-[10px] font-bold leading-3 text-slate-500">
              {observation}
            </div>
          </div>
        </main>
      </div>

      {dragging && (
        <div
          className={`pointer-events-none absolute z-50 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white shadow-xl ${
            dragging.source === 'first' ? palette.first.fill : palette.second.fill
          }`}
          style={{ left: dragging.x, top: dragging.y }}
        />
      )}
    </div>
  )
}
