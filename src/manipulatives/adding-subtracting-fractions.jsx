import { useMemo, useRef, useState } from 'react'

const denominatorOptions = [2, 3, 4, 5, 6, 8, 10, 12]

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
  bridge: {
    fill: 'bg-amber-400',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
}

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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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

const commonFinderMultiples = (base, leastCommonDenominator) => {
  const countToLeastCommon = Math.ceil(leastCommonDenominator / base)
  const count = Math.min(Math.max(countToLeastCommon + 2, 8), 10)

  return Array.from({ length: count }, (_, index) => base * (index + 1))
}

const properFraction = (fraction) => ({
  denominator: fraction.denominator,
  numerator: clamp(fraction.numerator, 1, fraction.denominator - 1),
})

function normalizeProblem(problem) {
  const next = {
    operation: problem.operation,
    first: properFraction(problem.first),
    second: properFraction(problem.second),
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

    next.second.numerator = clamp(next.second.numerator, 1, Math.max(1, maxSecond))

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

  next.second.numerator = clamp(next.second.numerator, 1, Math.max(1, maxSecond))

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

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div>
      <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => {
          const selected = value === option.value

          return (
            <button
              className={`h-8 rounded border text-xs font-black transition ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FractionControl({
  fraction,
  label,
  maxNumerator,
  minNumerator = 1,
  onChange,
  tone,
}) {
  const updateNumerator = (numerator) => {
    onChange({
      ...fraction,
      numerator: clamp(numerator, minNumerator, maxNumerator),
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
      <div className="grid grid-cols-[52px_1fr] items-center gap-2">
        <div className="rounded border border-white bg-white px-1 py-1 text-center text-xl font-black shadow-sm">
          <FractionText className={tone.text} fraction={fraction} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator <= minNumerator}
            onClick={() => updateNumerator(fraction.numerator - 1)}
            type="button"
          >
            -
          </button>
          <button
            className="h-7 rounded border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-35"
            disabled={fraction.numerator >= maxNumerator}
            onClick={() => updateNumerator(fraction.numerator + 1)}
            type="button"
          >
            +
          </button>
          <select
            aria-label={`${label} denominator`}
            className="col-span-2 h-7 rounded border border-slate-300 bg-white px-1 text-[11px] font-bold text-slate-700"
            onChange={(event) => updateDenominator(event.target.value)}
            value={fraction.denominator}
          >
            {denominatorOptions.map((denominator) => (
              <option key={denominator} value={denominator}>
                /{denominator}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function ProgressRail({ activeStep, stages }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
      {stages.map((stage) => {
        const complete = stage.step < activeStep
        const active = stage.step === activeStep

        return (
          <span
            className={`grid min-h-11 place-items-center rounded border px-1 text-center text-[10px] font-black leading-3 transition ${
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : complete
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-400'
            }`}
            key={stage.step}
          >
            <span>{complete ? 'Done' : `Step ${stage.step}`}</span>
            <span>{stage.shortTitle}</span>
          </span>
        )
      })}
    </div>
  )
}

function StageShell({
  actionDisabled = false,
  actionLabel,
  actionReady = false,
  children,
  feedback,
  hideAction = false,
  onAction,
  tone = 'slate',
  title,
}) {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    slate: 'border-slate-200 bg-white text-slate-700',
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h3 className="text-lg font-black leading-5 text-slate-900">{title}</h3>
        {hideAction ? (
          <span className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-400">
            Drag the pieces
          </span>
        ) : (
          <button
            className={`h-9 rounded border border-slate-900 bg-slate-900 px-4 text-xs font-black text-white shadow-sm disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 ${
              actionReady && !actionDisabled ? 'fraction-step-ready-aura' : ''
            }`}
            disabled={actionDisabled}
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="min-h-0 overflow-hidden p-3">{children}</div>
      <div className={`mx-3 mb-3 rounded border px-3 py-2 text-center text-sm font-black ${toneClasses[tone]}`}>
        {feedback}
      </div>
    </section>
  )
}

function InteractiveFractionBar({
  animateKey,
  barClassName = 'h-14',
  count,
  denominator,
  label,
  onChange,
  showCount = true,
  target,
  tone,
}) {
  return (
    <div className={`rounded border ${tone.border} ${tone.soft} px-2 py-1`}>
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-[11px] font-black ${tone.text}`}>{label}</span>
        {showCount && (
          <span className={`text-sm font-black ${tone.text}`}>
            {count}/{denominator}
          </span>
        )}
      </div>
      <div
        className={`grid overflow-hidden rounded border border-slate-300 bg-white shadow-inner ${barClassName}`}
        style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: denominator }, (_, index) => {
          const filled = index < count

          return (
            <button
              aria-label={`${label} segment ${index + 1}`}
              className={`min-w-0 border-r border-white/95 transition last:border-r-0 ${
                filled
                  ? `${tone.fill} fraction-op-first-piece`
                  : 'bg-slate-100 hover:bg-slate-200'
              }`}
              key={`${animateKey}-${label}-${index}`}
              onClick={() => onChange(filled && index + 1 === count ? count - 1 : index + 1)}
              style={{ '--fraction-op-delay': `${index * 38}ms` }}
              type="button"
            />
          )
        })}
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-black ${
          count === target ? 'text-emerald-700' : 'text-slate-400'
        }`}
      >
        {count === target ? 'Correct' : `Shade ${target} part${target === 1 ? '' : 's'}`}
      </div>
    </div>
  )
}

function StageFractionModel({
  animateKey,
  barClassName = 'h-20',
  count,
  denominator,
  label,
  onChange,
  target,
  tone,
}) {
  return (
    <div className="grid w-full grid-cols-[112px_minmax(0,1fr)] items-end gap-3">
      <div
        className={`grid ${barClassName} place-items-center rounded border ${tone.border} bg-white text-4xl font-black shadow-sm`}
      >
        <FractionText
          className={tone.text}
          fraction={{ numerator: count, denominator }}
        />
      </div>
      <InteractiveFractionBar
        animateKey={animateKey}
        barClassName={barClassName}
        count={count}
        denominator={denominator}
        label={label}
        onChange={onChange}
        showCount={false}
        target={target}
        tone={tone}
      />
    </div>
  )
}

function LiveEquationStrip({
  firstFraction,
  operation,
  resultFraction = null,
  secondFraction = null,
  showFirst = true,
  showResult = false,
  showSecond = true,
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center shadow-inner">
      <div className="flex items-center justify-center gap-2 text-2xl font-black leading-none">
        {showFirst ? (
          <FractionText className={palette.first.text} fraction={firstFraction} />
        ) : (
          <span className="text-slate-300">?</span>
        )}
        <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
          {operation}
        </span>
        {showSecond && secondFraction ? (
          <FractionText
            className={operation === '+' ? palette.second.text : palette.removed.text}
            fraction={secondFraction}
          />
        ) : (
          <span className="text-slate-300">?</span>
        )}
        <span className="text-slate-300">=</span>
        {showResult && resultFraction ? (
          <FractionText className={palette.result.text} fraction={resultFraction} />
        ) : (
          <span className="text-slate-300">?</span>
        )}
      </div>
    </div>
  )
}

function ConversionStep({
  animateRun,
  firstShade,
  model,
  onFirstShade,
  onSecondShade,
  secondShade,
}) {
  const firstScale = model.commonDenominator / model.first.denominator
  const secondScale = model.commonDenominator / model.second.denominator

  return (
    <div className="grid gap-1.5">
      <div
        className={`rounded border ${palette.bridge.border} ${palette.bridge.soft} px-2 py-1 text-center text-[12px] font-black ${palette.bridge.text}`}
      >
        Rename both bars into {model.commonDenominator} equal parts
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded border ${palette.first.border} bg-white p-1.5`}>
          <div className="mb-1 flex items-center justify-between text-[11px] font-black">
            <span className={palette.first.text}>
              {formatFraction(model.first)}
            </span>
            <span className={palette.bridge.text}>x{firstScale}</span>
          </div>
          <InteractiveFractionBar
            animateKey={`convert-first-${animateRun}`}
            barClassName="h-12"
            count={firstShade}
            denominator={model.commonDenominator}
            label={`${model.firstUnits}/${model.commonDenominator}`}
            onChange={onFirstShade}
            target={model.firstUnits}
            tone={palette.first}
          />
        </div>
        <div className={`rounded border ${palette.second.border} bg-white p-1.5`}>
          <div className="mb-1 flex items-center justify-between text-[11px] font-black">
            <span className={palette.second.text}>
              {formatFraction(model.second)}
            </span>
            <span className={palette.bridge.text}>x{secondScale}</span>
          </div>
          <InteractiveFractionBar
            animateKey={`convert-second-${animateRun}`}
            barClassName="h-12"
            count={secondShade}
            denominator={model.commonDenominator}
            label={`${model.secondUnits}/${model.commonDenominator}`}
            onChange={onSecondShade}
            target={model.secondUnits}
            tone={palette.second}
          />
        </div>
      </div>
    </div>
  )
}

function CommonSizeFinder({
  firstCount,
  model,
  onFirstNext,
  onFirstSelect,
  onSecondNext,
  onSecondSelect,
  operation,
  secondCount,
  selectedFirst,
  selectedSecond,
}) {
  const firstMultiples = commonFinderMultiples(
    model.first.denominator,
    model.leastCommonDenominator
  )
  const secondMultiples = commonFinderMultiples(
    model.second.denominator,
    model.leastCommonDenominator
  )
  const visibleFirst = firstMultiples.slice(0, firstCount)
  const visibleSecond = secondMultiples.slice(0, secondCount)
  const found =
    selectedFirst &&
    selectedFirst === selectedSecond &&
    selectedFirst % model.first.denominator === 0 &&
    selectedFirst % model.second.denominator === 0

  const renderRow = ({ label, multiples, onNext, onSelect, selected, tone, visible }) => (
    <div className={`grid min-h-0 grid-rows-[auto_1fr] rounded border ${tone.border} ${tone.soft} p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-black ${tone.text}`}>{label}</span>
        <button
          className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 shadow-sm disabled:opacity-40"
          disabled={visible.length >= multiples.length}
          onClick={onNext}
          type="button"
        >
          Next size
        </button>
      </div>
      <div className="grid min-h-0 grid-cols-10 items-center gap-1.5">
        {visible.map((multiple, index) => {
          const isSelected = selected === multiple
          const isCommonVisible =
            visibleFirst.includes(multiple) && visibleSecond.includes(multiple)
          const isSelectedMatch = isSelected && isCommonVisible && found

          return (
            <button
              aria-label={`${label} select ${multiple}`}
              className={`grid h-11 min-w-0 place-items-center rounded border px-1 text-base font-black shadow-sm ${
                isSelectedMatch
                  ? 'common-size-match border-amber-300 bg-amber-100 text-amber-800'
                  : isCommonVisible
                    ? 'common-size-hint border-amber-300 bg-white text-amber-700'
                  : isSelected
                    ? 'border-slate-900 bg-white text-slate-900 ring-2 ring-slate-300'
                  : 'border-white bg-white text-slate-700'
              }`}
              key={`${label}-${multiple}-${index}`}
              onClick={() => onSelect(multiple)}
              type="button"
            >
              {multiple}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-2">
      <div className={`rounded border ${palette.bridge.border} ${palette.bridge.soft} px-3 py-2 text-center text-sm font-black ${palette.bridge.text}`}>
        Reveal sizes, then select the matching size in both rows.
      </div>
      <div className="grid min-h-0 grid-rows-2 gap-2">
        {renderRow({
          label: `${model.first.denominator}s can become`,
          multiples: firstMultiples,
          onNext: onFirstNext,
          onSelect: onFirstSelect,
          selected: selectedFirst,
          tone: palette.first,
          visible: visibleFirst,
        })}
        {renderRow({
          label: `${model.second.denominator}s can become`,
          multiples: secondMultiples,
          onNext: onSecondNext,
          onSelect: onSecondSelect,
          selected: selectedSecond,
          tone: operation === '+' ? palette.second : palette.removed,
          visible: visibleSecond,
        })}
      </div>
      <LiveEquationStrip
        firstFraction={model.first}
        operation={operation}
        secondFraction={model.second}
      />
    </div>
  )
}

function DraggableSegmentBar({
  denominator,
  draggableCount = 0,
  fillCount,
  label,
  highlightCount = 0,
  onDragStart,
  placedCount = 0,
  placedIndices = [],
  resultIndices = [],
  placedTone = palette.result,
  tone,
}) {
  return (
    <div className={`rounded border ${tone.border} ${tone.soft} px-2 py-1`}>
      <div className="mb-1 text-[11px] font-black uppercase text-slate-500">
        {label}
      </div>
      <div
        className="grid h-12 overflow-hidden rounded border border-slate-300 bg-white shadow-inner"
        style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: denominator }, (_, index) => {
          const filled = index < fillCount
          const placed = placedIndices.includes(index)
          const resultPlaced =
            resultIndices.includes(index) || index < placedCount
          const highlighted = index < highlightCount && !placed
          const canDrag = index < draggableCount && !placed
          const color = resultPlaced
            ? placedTone.fill
            : filled && !placed
              ? tone.fill
              : 'bg-slate-100'

          return (
            <button
              aria-label={`${label} drag segment ${index + 1}`}
              className={`min-w-0 border-r border-white/95 transition last:border-r-0 ${color} ${
                canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              } ${placed ? 'opacity-25' : ''} ${
                highlighted ? 'fraction-remove-target-aura relative z-10' : ''
              }`}
              disabled={!canDrag}
              key={`${label}-${index}`}
              onPointerDown={(event) => canDrag && onDragStart(event, index)}
              style={{ touchAction: 'none' }}
              type="button"
            />
          )
        })}
      </div>
    </div>
  )
}

function FractionDragAction({
  actionModel,
  onComplete,
  operation,
  setFeedback,
}) {
  const workspaceRef = useRef(null)
  const targetRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [placedPieces, setPlacedPieces] = useState([])
  const [removedIndices, setRemovedIndices] = useState([])
  const {
    denominator,
    firstCount,
    firstFraction,
    firstLabel,
    resultCount,
    secondCount,
    secondFraction,
    secondLabel,
  } = actionModel
  const complete =
    operation === '+'
      ? placedPieces.length === resultCount
      : removedIndices.length === secondCount

  const localPointer = (event) => {
    const workspace = workspaceRef.current
    if (!workspace) {
      return { x: event.clientX, y: event.clientY }
    }

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
      color: piece.source === 'second' ? palette.second.fill : palette.first.fill,
      pointerId: event.pointerId,
      x: pointer.x,
      y: pointer.y,
    })
  }

  const moveDrag = (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return
    const pointer = localPointer(event)

    setDragging((current) =>
      current
        ? {
            ...current,
            x: pointer.x,
            y: pointer.y,
          }
        : current
    )
  }

  const placeAdditionPiece = (piece) => {
    const alreadyPlaced = placedPieces.some(
      (placed) => placed.source === piece.source && placed.index === piece.index
    )

    if (alreadyPlaced || placedPieces.length >= resultCount) return

    const nextPieces = [...placedPieces, piece]
    setPlacedPieces(nextPieces)

    if (nextPieces.length === resultCount) {
      setFeedback('The blue pieces show the sum.')
      window.setTimeout(onComplete, 650)
    } else {
      setFeedback(
        `Good. Place ${resultCount - nextPieces.length} more piece${
          resultCount - nextPieces.length === 1 ? '' : 's'
        }.`
      )
    }
  }

  const placeSubtractionPiece = (piece) => {
    if (
      removedIndices.includes(piece.index) ||
      removedIndices.length >= secondCount
    ) {
      return
    }

    const nextRemoved = [...removedIndices, piece.index]
    setRemovedIndices(nextRemoved)

    if (nextRemoved.length === secondCount) {
      setFeedback('The orange pieces were removed. The blue pieces remain.')
      window.setTimeout(onComplete, 650)
    } else {
      setFeedback(
        `Good. Remove ${secondCount - nextRemoved.length} more piece${
          secondCount - nextRemoved.length === 1 ? '' : 's'
        }.`
      )
    }
  }

  const finishDrag = (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return

    const targetRect = targetRef.current?.getBoundingClientRect()
    const droppedInTarget =
      targetRect &&
      event.clientX >= targetRect.left &&
      event.clientX <= targetRect.right &&
      event.clientY >= targetRect.top &&
      event.clientY <= targetRect.bottom

    if (droppedInTarget) {
      if (operation === '+') {
        placeAdditionPiece(dragging)
      } else {
        placeSubtractionPiece(dragging)
      }
    } else {
      setFeedback('Drop the piece inside the empty bar.')
    }

    setDragging(null)
  }

  const firstPlacedIndices = placedPieces
    .filter((piece) => piece.source === 'first')
    .map((piece) => piece.index)
  const secondPlacedIndices = placedPieces
    .filter((piece) => piece.source === 'second')
    .map((piece) => piece.index)
  const remainingIndices = Array.from(
    { length: firstCount },
    (_, index) => index
  ).filter((index) => !removedIndices.includes(index))

  return (
    <div
      className="relative grid h-full grid-rows-[auto_1fr_auto] gap-2"
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      ref={workspaceRef}
    >
      <div className={operation === '+' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
        {operation === '+' ? (
          <>
            <DraggableSegmentBar
              denominator={denominator}
              draggableCount={firstCount}
              fillCount={firstCount}
              label={firstLabel}
              onDragStart={(event, index) =>
                beginDrag(event, { source: 'first', index })
              }
              placedIndices={firstPlacedIndices}
              tone={palette.first}
            />
            <DraggableSegmentBar
              denominator={denominator}
              draggableCount={secondCount}
              fillCount={secondCount}
              label={secondLabel}
              onDragStart={(event, index) =>
                beginDrag(event, { source: 'second', index })
              }
              placedIndices={secondPlacedIndices}
              tone={palette.second}
            />
          </>
        ) : (
          <DraggableSegmentBar
            denominator={denominator}
            draggableCount={secondCount}
            fillCount={firstCount}
            highlightCount={secondCount}
            label={firstLabel}
            onDragStart={(event, index) => beginDrag(event, { source: 'main', index })}
            placedIndices={removedIndices}
            placedTone={palette.result}
            resultIndices={complete ? remainingIndices : []}
            tone={palette.first}
          />
        )}
      </div>

      <div
        className={`rounded border-2 border-dashed ${
          operation === '+' ? palette.result.border : palette.removed.border
        } bg-white p-2`}
        data-drop-zone={operation === '+' ? 'result' : 'removed'}
        ref={targetRef}
      >
        <div
          className={`mb-1 text-[11px] font-black uppercase ${
            operation === '+' ? palette.result.text : palette.removed.text
          }`}
        >
          {operation === '+' ? 'Result bar' : 'Removed amount'}
        </div>
        <div
          className="grid h-16 overflow-hidden rounded border border-slate-300 bg-slate-50 shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: denominator }, (_, index) => {
            const filled =
              operation === '+'
                ? index < placedPieces.length
                : index < removedIndices.length

            return (
              <span
                className={`min-w-0 border-r border-white/95 last:border-r-0 ${
                  filled
                    ? operation === '+'
                      ? palette.result.fill
                      : palette.removed.fill
                    : 'bg-slate-100'
                }`}
                key={`target-${index}`}
              />
            )
          })}
        </div>
      </div>

      <LiveEquationStrip
        firstFraction={firstFraction}
        operation={operation}
        resultFraction={
          operation === '+'
            ? { numerator: placedPieces.length, denominator }
            : {
                numerator: firstCount - removedIndices.length,
                denominator,
              }
        }
        secondFraction={
          operation === '+'
            ? secondFraction
            : { numerator: removedIndices.length, denominator }
        }
        showResult={
          operation === '+'
            ? placedPieces.length > 0
            : removedIndices.length > 0
        }
      />

      {dragging && (
        <div
          className={`pointer-events-none absolute z-50 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white ${dragging.color} shadow-xl`}
          style={{ left: dragging.x, top: dragging.y }}
        />
      )}
    </div>
  )
}

function AnswerPanel({ model }) {
  const raw = {
    numerator: model.resultUnits,
    denominator: model.commonDenominator,
  }
  const rawText = formatFraction(raw)
  const simplifiedText = formatFraction(model.simplified)

  return (
    <div
      className={`fraction-op-answer-reveal grid h-full grid-rows-[auto_auto_1fr] gap-4 rounded border ${palette.result.border} bg-white p-4 text-center shadow-sm`}
    >
      <div>
        <div className="text-sm font-black uppercase text-slate-400">
          Final answer
        </div>
        <div className="mt-2 flex items-center justify-center gap-3 text-5xl font-black">
          <span className={palette.result.text}>{rawText}</span>
          {rawText !== simplifiedText && (
            <>
              <span className="text-slate-300">=</span>
              <span className="text-slate-900">{simplifiedText}</span>
            </>
          )}
        </div>
      </div>
      <div
        className={`flex items-center justify-between rounded border ${palette.result.border} ${palette.result.soft} px-3 py-2 text-sm font-black ${palette.result.text}`}
      >
        <span>Final model</span>
        <FractionText fraction={raw} />
      </div>
      <div
        className="grid h-16 overflow-hidden rounded border-2 border-slate-900 bg-white shadow-inner"
        style={{
          gridTemplateColumns: `repeat(${model.commonDenominator}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: model.commonDenominator }, (_, index) => {
          const filled = index < model.resultUnits

          return (
            <span
              aria-label={`Final model segment ${index + 1}${
                filled ? ' filled' : ' empty'
              }`}
              className={`min-w-0 border-r border-white/95 last:border-r-0 ${
                filled ? palette.result.fill : 'bg-slate-100'
              }`}
              key={`answer-model-${index}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function AddingSubtractingFractions() {
  const [problem, setProblem] = useState(initialProblem)
  const [activeStep, setActiveStep] = useState(1)
  const [firstShade, setFirstShade] = useState(0)
  const [secondShade, setSecondShade] = useState(0)
  const [firstMultipleCount, setFirstMultipleCount] = useState(1)
  const [secondMultipleCount, setSecondMultipleCount] = useState(1)
  const [selectedFirstMultiple, setSelectedFirstMultiple] = useState(null)
  const [selectedSecondMultiple, setSelectedSecondMultiple] = useState(null)
  const [convertedFirstShade, setConvertedFirstShade] = useState(0)
  const [convertedSecondShade, setConvertedSecondShade] = useState(0)
  const [animateRun, setAnimateRun] = useState(1)
  const [feedback, setFeedback] = useState('Read the problem, then start building the first fraction.')

  const model = useMemo(() => {
    const normalized = normalizeProblem(problem)
    const sameDenominator =
      normalized.first.denominator === normalized.second.denominator
    const leastCommonDenominator = sameDenominator
      ? normalized.first.denominator
      : lcm(normalized.first.denominator, normalized.second.denominator)
    const selectedCommonDenominator =
      !sameDenominator &&
      selectedFirstMultiple &&
      selectedFirstMultiple === selectedSecondMultiple &&
      selectedFirstMultiple % normalized.first.denominator === 0 &&
      selectedFirstMultiple % normalized.second.denominator === 0
        ? selectedFirstMultiple
        : null
    const commonDenominator = sameDenominator
      ? normalized.first.denominator
      : selectedCommonDenominator ?? leastCommonDenominator
    const firstUnits =
      normalized.first.numerator *
      (commonDenominator / normalized.first.denominator)
    const secondUnits =
      normalized.second.numerator *
      (commonDenominator / normalized.second.denominator)
    const resultUnits =
      normalized.operation === '+'
        ? firstUnits + secondUnits
        : firstUnits - secondUnits

    return {
      ...normalized,
      commonDenominator,
      firstUnits,
      leastCommonDenominator,
      resultUnits,
      sameDenominator,
      secondUnits,
      selectedCommonDenominator,
      simplified: simplify(resultUnits, commonDenominator),
    }
  }, [problem, selectedFirstMultiple, selectedSecondMultiple])

  const commonStep = model.sameDenominator ? null : 4
  const renameStep = model.sameDenominator ? null : 5
  const actionStep = model.sameDenominator ? 4 : 6
  const answerStep = actionStep + 1
  const commonSizeFound =
    model.sameDenominator ||
    Boolean(model.selectedCommonDenominator)
  const stages = [
    { step: 1, shortTitle: 'Equation' },
    { step: 2, shortTitle: 'First' },
    { step: 3, shortTitle: model.operation === '+' ? 'Second' : 'Remove' },
    ...(!model.sameDenominator
      ? [
          { step: commonStep, shortTitle: 'Common' },
          { step: renameStep, shortTitle: 'Rename' },
        ]
      : []),
    { step: actionStep, shortTitle: model.operation === '+' ? 'Combine' : 'Remove' },
    { step: answerStep, shortTitle: 'Answer' },
  ]

  const resetProgress = () => {
    setActiveStep(1)
    setFirstShade(0)
    setSecondShade(0)
    setFirstMultipleCount(1)
    setSecondMultipleCount(1)
    setSelectedFirstMultiple(null)
    setSelectedSecondMultiple(null)
    setConvertedFirstShade(0)
    setConvertedSecondShade(0)
    setFeedback('Read the problem, then start building the first fraction.')
    setAnimateRun((current) => current + 1)
  }

  const applyProblem = (nextProblem) => {
    setProblem(normalizeProblem(nextProblem))
    resetProgress()
  }

  const maxSecondNumerator = (() => {
    if (model.operation === '+') {
      return Math.max(
        1,
        Math.floor((1 - fractionValue(model.first)) * model.second.denominator + 1e-9)
      )
    }

    return Math.max(
      1,
      Math.floor(fractionValue(model.first) * model.second.denominator + 1e-9)
    )
  })()

  const updateFirst = (first) => applyProblem({ ...model, first })
  const updateSecond = (second) => applyProblem({ ...model, second })
  const updateOperation = (operation) => applyProblem({ ...model, operation })
  const revealFirstMultiple = () => {
    setFirstMultipleCount((current) =>
      Math.min(
        current + 1,
        commonFinderMultiples(
          model.first.denominator,
          model.leastCommonDenominator
        ).length
      )
    )
  }
  const revealSecondMultiple = () => {
    setSecondMultipleCount((current) =>
      Math.min(
        current + 1,
        commonFinderMultiples(
          model.second.denominator,
          model.leastCommonDenominator
        ).length
      )
    )
  }

  const runCurrentStage = () => {
    if (activeStep === 1) {
      setActiveStep(2)
      setFeedback(`Shade ${model.first.numerator} out of ${model.first.denominator} parts.`)
      return
    }

    if (activeStep === 2) {
      if (firstShade !== model.first.numerator) {
        setFeedback(`Not yet. Shade exactly ${model.first.numerator} out of ${model.first.denominator}.`)
        return
      }

      setActiveStep(3)
      setFeedback(
        model.operation === '+'
          ? `Correct. Now shade ${model.second.numerator} out of ${model.second.denominator}.`
          : `Correct. Now shade the ${formatFraction(model.second)} that will be removed.`
      )
      return
    }

    if (activeStep === 3) {
      if (secondShade !== model.second.numerator) {
        setFeedback(`Not yet. Shade exactly ${model.second.numerator} out of ${model.second.denominator}.`)
        return
      }

      setActiveStep(model.sameDenominator ? actionStep : commonStep)
      setFeedback(
        model.sameDenominator
          ? model.operation === '+'
            ? 'Correct. Drag the shaded pieces into the empty result bar.'
            : 'Correct. Drag the pieces being subtracted into the removed bar.'
          : 'Correct. Now find one size both denominators can become.'
      )
      return
    }

    if (!model.sameDenominator && activeStep === commonStep) {
      if (!commonSizeFound) {
        setFeedback('Select the matching common size in both rows.')
        return
      }

      setActiveStep(renameStep)
      setFeedback(`${model.commonDenominator} works. Rename both fractions using ${model.commonDenominator} equal parts.`)
      return
    }

    if (!model.sameDenominator && activeStep === renameStep) {
      if (
        convertedFirstShade !== model.firstUnits ||
        convertedSecondShade !== model.secondUnits
      ) {
        setFeedback(
          `Shade ${model.firstUnits}/${model.commonDenominator} and ${model.secondUnits}/${model.commonDenominator}.`
        )
        return
      }

      setAnimateRun((current) => current + 1)
      setActiveStep(actionStep)
      setFeedback('Correct. Now use the renamed pieces to find the result.')
      return
    }

    if (activeStep === answerStep) {
      resetProgress()
    }
  }

  const completeFractionAction = () => {
    setActiveStep(answerStep)
    setFeedback(
      model.operation === '+'
        ? 'The blue pieces show the sum.'
        : 'The orange pieces were removed. The blue pieces remain.'
    )
  }

  const stageButtonLabel = (() => {
    if (activeStep === 1) return 'Start'
    if (activeStep === 2) return 'Check first fraction'
    if (activeStep === 3) {
      return model.operation === '+' ? 'Check second fraction' : 'Check removed amount'
    }
    if (!model.sameDenominator && activeStep === commonStep) {
      return commonSizeFound
        ? `Use ${model.commonDenominator} equal parts`
        : 'Find a match'
    }
    if (!model.sameDenominator && activeStep === renameStep) return 'Rename fractions'
    if (activeStep === actionStep) {
      return model.operation === '+' ? 'Combine pieces' : 'Remove pieces'
    }
    return 'Try another'
  })()

  const stageTone = (() => {
    if (activeStep === 2) return 'emerald'
    if (activeStep === 3) return model.operation === '+' ? 'purple' : 'orange'
    if (!model.sameDenominator && activeStep === commonStep) return 'amber'
    if (!model.sameDenominator && activeStep === renameStep) return 'amber'
    if (activeStep === actionStep || activeStep === answerStep) return 'sky'
    return 'slate'
  })()

  const stageActionReady = (() => {
    if (activeStep === 2) return firstShade === model.first.numerator
    if (activeStep === 3) return secondShade === model.second.numerator
    if (!model.sameDenominator && activeStep === commonStep) {
      return commonSizeFound
    }
    if (!model.sameDenominator && activeStep === renameStep) {
      return (
        convertedFirstShade === model.firstUnits &&
        convertedSecondShade === model.secondUnits
      )
    }

    return false
  })()

  const actionModel = {
    denominator: model.commonDenominator,
    firstCount: model.firstUnits,
    firstFraction: {
      numerator: model.firstUnits,
      denominator: model.commonDenominator,
    },
    firstLabel: model.sameDenominator ? 'First fraction' : 'First renamed fraction',
    resultCount: model.resultUnits,
    secondCount: model.secondUnits,
    secondFraction: {
      numerator: model.secondUnits,
      denominator: model.commonDenominator,
    },
    secondLabel: model.sameDenominator
      ? model.operation === '+'
        ? 'Second fraction'
        : 'Amount to remove'
      : model.operation === '+'
        ? 'Second renamed fraction'
        : 'Renamed amount to remove',
  }

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-2 text-slate-800">
      <div className="mb-1 grid shrink-0 grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <h2 className="text-lg font-black leading-5 text-slate-900">
            Adding & Subtracting Fractions
          </h2>
          <p className="text-[11px] font-semibold leading-4 text-slate-500">
            Shade each model, then combine or remove matching fraction pieces.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => applyProblem(initialProblem)}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid h-full min-h-0 flex-1 grid-cols-[196px_minmax(0,1fr)] gap-3">
        <aside className="grid content-start gap-2">
          <SegmentedControl
            label="Operation"
            onChange={updateOperation}
            options={[
              { label: '+ Add', value: '+' },
              { label: '- Subtract', value: '-' },
            ]}
            value={model.operation}
          />

          <FractionControl
            fraction={model.first}
            label="First fraction"
            maxNumerator={model.first.denominator - 1}
            onChange={updateFirst}
            tone={palette.first}
          />
          <FractionControl
            fraction={model.second}
            label={model.operation === '+' ? 'Second fraction' : 'Subtract'}
            maxNumerator={maxSecondNumerator}
            onChange={updateSecond}
            tone={model.operation === '+' ? palette.second : palette.removed}
          />

          <div className="rounded border border-slate-200 bg-white p-2 text-[11px] font-bold leading-4 text-slate-500 shadow-sm">
            <div className="mb-1 text-[10px] font-black uppercase text-slate-400">
              Path
            </div>
            {model.sameDenominator
              ? 'Same denominators: combine or remove directly.'
              : `Unlike denominators: first rename both fractions as ${model.commonDenominator}ths.`}
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <ProgressRail activeStep={activeStep} stages={stages} />

          <StageShell
            actionDisabled={
              !model.sameDenominator && activeStep === commonStep && !commonSizeFound
            }
            actionLabel={stageButtonLabel}
            actionReady={stageActionReady}
            feedback={feedback}
            hideAction={activeStep === actionStep}
            onAction={runCurrentStage}
            tone={stageTone}
            title={
              activeStep === 1
                ? 'Read the equation'
                : activeStep === 2
                  ? 'Shade the first fraction'
                  : activeStep === 3
                    ? model.operation === '+'
                      ? 'Shade the second fraction'
                      : 'Shade the amount to remove'
                    : !model.sameDenominator && activeStep === commonStep
                      ? 'Find a common size'
                      : !model.sameDenominator && activeStep === renameStep
                      ? 'Rename with a common denominator'
                      : activeStep === actionStep
                        ? model.operation === '+'
                          ? 'Combine the pieces'
                          : 'Remove the pieces'
                        : 'Answer'
            }
          >
            {activeStep === 1 && (
              <div className="grid h-full place-items-center">
                <LiveEquationStrip
                  firstFraction={model.first}
                  operation={model.operation}
                  secondFraction={model.second}
                />
              </div>
            )}

            {activeStep === 2 && (
              <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                <StageFractionModel
                  animateKey={`first-${animateRun}`}
                  barClassName="h-20"
                  count={firstShade}
                  denominator={model.first.denominator}
                  label="First fraction"
                  onChange={setFirstShade}
                  target={model.first.numerator}
                  tone={palette.first}
                />
                <LiveEquationStrip
                  firstFraction={{
                    numerator: firstShade,
                    denominator: model.first.denominator,
                  }}
                  operation={model.operation}
                  showSecond={false}
                />
              </div>
            )}

            {activeStep === 3 && (
              <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                <StageFractionModel
                  animateKey={`second-${animateRun}`}
                  barClassName="h-20"
                  count={secondShade}
                  denominator={model.second.denominator}
                  label={model.operation === '+' ? 'Second fraction' : 'Subtract'}
                  onChange={setSecondShade}
                  target={model.second.numerator}
                  tone={model.operation === '+' ? palette.second : palette.removed}
                />
                <LiveEquationStrip
                  firstFraction={model.first}
                  operation={model.operation}
                  secondFraction={{
                    numerator: secondShade,
                    denominator: model.second.denominator,
                  }}
                />
              </div>
            )}

            {!model.sameDenominator && activeStep === commonStep && (
              <CommonSizeFinder
                firstCount={firstMultipleCount}
                model={model}
                onFirstNext={revealFirstMultiple}
                onFirstSelect={setSelectedFirstMultiple}
                onSecondNext={revealSecondMultiple}
                onSecondSelect={setSelectedSecondMultiple}
                operation={model.operation}
                secondCount={secondMultipleCount}
                selectedFirst={selectedFirstMultiple}
                selectedSecond={selectedSecondMultiple}
              />
            )}

            {!model.sameDenominator && activeStep === renameStep && (
              <div className="grid h-full grid-rows-[1fr_auto] gap-2">
                <ConversionStep
                  animateRun={animateRun}
                  firstShade={convertedFirstShade}
                  model={model}
                  onFirstShade={setConvertedFirstShade}
                  onSecondShade={setConvertedSecondShade}
                  secondShade={convertedSecondShade}
                />
                <LiveEquationStrip
                  firstFraction={{
                    numerator: convertedFirstShade,
                    denominator: model.commonDenominator,
                  }}
                  operation={model.operation}
                  secondFraction={{
                    numerator: convertedSecondShade,
                    denominator: model.commonDenominator,
                  }}
                />
              </div>
            )}

            {activeStep === actionStep && (
              <FractionDragAction
                actionModel={actionModel}
                onComplete={completeFractionAction}
                operation={model.operation}
                setFeedback={setFeedback}
              />
            )}

            {activeStep === answerStep && (
              <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                <AnswerPanel model={model} />
                <LiveEquationStrip
                  firstFraction={
                    model.sameDenominator
                      ? model.first
                      : {
                          numerator: model.firstUnits,
                          denominator: model.commonDenominator,
                        }
                  }
                  operation={model.operation}
                  resultFraction={{
                    numerator: model.resultUnits,
                    denominator: model.commonDenominator,
                  }}
                  secondFraction={
                    model.sameDenominator
                      ? model.second
                      : {
                          numerator: model.secondUnits,
                          denominator: model.commonDenominator,
                        }
                  }
                  showResult
                />
              </div>
            )}
          </StageShell>
        </main>
      </div>
    </div>
  )
}
