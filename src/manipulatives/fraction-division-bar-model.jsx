import { useEffect, useMemo, useState } from 'react'

const denominators = [2, 3, 4, 6, 8, 12]

const defaultProblem = {
  dividend: { numerator: 3, denominator: 4 },
  divisor: { numerator: 1, denominator: 3 },
}

const fullGroupColor = 'bg-sky-400'
const fullGroupAnswerColor = 'text-sky-600'
const step4GroupStepMs = 1300
const step4GroupFillOffsetMs = 960
const step4RemainderStartOffsetMs = 220
const step4RemainderFillOffsetMs = 950

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

const multiplesTo = (base, target) =>
  Array.from({ length: target / base }, (_, index) => base * (index + 1))

const initialCommonDenominator = lcm(
  defaultProblem.dividend.denominator,
  defaultProblem.divisor.denominator
)

const simplify = (numerator, denominator) => {
  const divisor = gcd(numerator, denominator)

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  }
}

const formatFraction = ({ numerator, denominator }) => {
  if (numerator === 0) return '0'
  if (denominator === 1) return `${numerator}`
  if (numerator < denominator) return `${numerator}/${denominator}`

  const whole = Math.floor(numerator / denominator)
  const remainder = numerator % denominator

  return remainder === 0 ? `${whole}` : `${whole} ${remainder}/${denominator}`
}

function FractionText({ fraction, className = '' }) {
  return (
    <span className={`inline-grid translate-y-0.5 grid-rows-2 text-center leading-none ${className}`}>
      <span className="border-b-2 border-current px-0.5">
        {fraction.numerator}
      </span>
      <span className="px-0.5">{fraction.denominator}</span>
    </span>
  )
}

function AnswerText({ fullGroups, remainderGroup, remainderUnits }) {
  if (fullGroups === 0 && remainderUnits === 0) {
    return <span className="text-slate-700">0</span>
  }

  return (
    <span
      aria-label={`Answer: ${fullGroups > 0 ? fullGroups : ''}${
        remainderUnits > 0
          ? `${fullGroups > 0 ? ' ' : ''}${remainderGroup.numerator}/${remainderGroup.denominator}`
          : ''
      }`}
      className="inline-flex items-end justify-end gap-1.5"
    >
      {fullGroups > 0 && (
        <span className={fullGroupAnswerColor}>
          {fullGroups}
        </span>
      )}
      {remainderUnits > 0 && (
        <FractionText
          className="text-xl font-black text-orange-500"
          fraction={remainderGroup}
        />
      )}
    </span>
  )
}

function CommonDenominatorMatch({ commonDenominator, dividend, divisor }) {
  const dividendMultiples = multiplesTo(
    dividend.denominator,
    commonDenominator
  )
  const divisorMultiples = multiplesTo(divisor.denominator, commonDenominator)

  const renderMultiples = (multiples, tone) => (
    <div className="flex min-w-0 items-center gap-1">
      {multiples.map((multiple, index) => {
        const isMatch = multiple === commonDenominator

        return (
          <span className="flex min-w-0 items-center gap-1" key={multiple}>
            {index > 0 && (
              <span className="text-[9px] font-black text-slate-400">
                &rarr;
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black leading-none ${
                isMatch
                  ? `${tone.matchBg} ${tone.matchText} common-denominator-match`
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {multiple}
            </span>
          </span>
        )
      })}
    </div>
  )

  return (
    <div className="mb-1 grid grid-cols-[42px_1fr_34px_1fr_auto] items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1">
      <span className="text-[9px] font-black uppercase text-slate-500">
        LCD
      </span>
      {renderMultiples(dividendMultiples, {
        matchBg: 'bg-emerald-100',
        matchText: 'text-emerald-700',
      })}
      <span className="justify-self-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
        same
      </span>
      {renderMultiples(divisorMultiples, {
        matchBg: 'bg-purple-100',
        matchText: 'text-purple-700',
      })}
      <span className="text-[10px] font-black text-slate-700">
        {commonDenominator} parts
      </span>
    </div>
  )
}

function ConversionGhost({
  commonDenominator,
  originalDenominator,
  originalNumerator,
  shadedColor,
  splitLabel,
}) {
  const brickTone = shadedColor.includes('purple')
    ? 'lcd-brick-segment-purple'
    : 'lcd-brick-segment-emerald'

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded">
      <div
        className="lcd-source-bar absolute left-2 top-1 grid h-4 w-24 overflow-hidden rounded border border-slate-700 bg-white shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${originalDenominator}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: originalDenominator }, (_, index) => (
          <span
            className={`border-r-2 border-white/95 last:border-r-0 ${
              index < originalNumerator ? shadedColor : 'bg-white'
            }`}
            key={`source-${index}`}
          />
        ))}
      </div>
      <span className="lcd-multiplier-badge absolute left-[132px] top-0.5 rounded bg-amber-100 px-1.5 text-[10px] font-black leading-5 text-amber-700 shadow-sm">
        {splitLabel}
      </span>
      <div
        className="lcd-target-preview absolute inset-0 grid rounded"
        style={{
          gridTemplateColumns: `repeat(${commonDenominator}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: commonDenominator }, (_, index) => (
          <span
            className={`lcd-brick-segment ${brickTone} border-r-2 border-white/95 last:border-r-0`}
            key={`target-${index}`}
            style={{ '--lcd-brick-delay': `${1180 + index * 70}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function FractionSetter({ fraction, label, onChange, tone }) {
  const setNumerator = (nextNumerator) => {
    onChange({
      ...fraction,
      numerator: Math.max(1, Math.min(fraction.denominator, nextNumerator)),
    })
  }

  const setDenominator = (denominator) => {
    onChange({
      numerator: Math.max(1, Math.min(denominator, fraction.numerator)),
      denominator,
    })
  }

  return (
    <div className={`rounded border ${tone.border} ${tone.bg} p-2`}>
      <div className={`text-[10px] font-bold uppercase tracking-wide ${tone.text}`}>
        {label}
      </div>
      <div className="mt-1 grid grid-cols-[52px_1fr] items-center gap-2">
        <div className="rounded bg-white px-2 py-1 text-center shadow-sm">
          <FractionText
            className={`text-xl font-bold tabular-nums ${tone.text}`}
            fraction={fraction}
          />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setNumerator(fraction.numerator + 1)}
            disabled={fraction.numerator === fraction.denominator}
            className="h-6 rounded border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Increase ${label} numerator`}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setNumerator(fraction.numerator - 1)}
            disabled={fraction.numerator === 1}
            className="h-6 rounded border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Decrease ${label} numerator`}
          >
            -
          </button>
          <select
            value={fraction.denominator}
            onChange={(event) => setDenominator(Number(event.target.value))}
            className="col-span-2 h-6 rounded border border-slate-300 bg-white px-1 text-[11px] font-semibold text-slate-700"
            aria-label={`${label} denominator`}
          >
            {denominators.map((denominator) => (
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

function StepLabel({ children }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded border-2 border-slate-900 bg-white px-2 text-base font-black text-slate-900 shadow-sm">
      {children}
    </div>
  )
}

const makeEmptyShade = (length) => Array.from({ length }, () => false)

const selectedCount = (segments) => segments.filter(Boolean).length

function InteractiveFractionBar({
  animateKey,
  compact = false,
  dataBarKey,
  disabled = false,
  denominator,
  label,
  onToggle,
  outlineColor,
  sourceDenominator,
  sourceNumerator,
  selected,
  shadedColor,
  splitLabel,
  target,
}) {
  const selectedTotal = selectedCount(selected)
  const isCorrect = selectedTotal === target
  const revealAfterConversion = Boolean(sourceDenominator && splitLabel)
  const finalFrameTone = outlineColor.includes('purple')
    ? 'lcd-final-frame-purple'
    : 'lcd-final-frame-emerald'

  return (
    <div>
      <div
        className={`flex items-center justify-between font-bold text-slate-500 ${
          compact ? 'mb-0.5 text-[9px]' : 'mb-1 text-[10px]'
        } ${revealAfterConversion ? 'lcd-final-content-reveal' : ''}`}
      >
        <span>{label}</span>
        <span className="flex items-center gap-1">
          {splitLabel && (
            <span className="rounded bg-amber-100 px-1 text-[9px] font-black leading-3 text-amber-700 common-denominator-split">
              {splitLabel}
            </span>
          )}
          <span className={isCorrect ? 'text-emerald-600' : 'text-slate-500'}>
            {selectedTotal}/{denominator} shaded
          </span>
        </span>
      </div>
      <div
        className={`relative grid ${compact ? 'h-6' : 'h-7'} overflow-hidden rounded border-2 ${outlineColor} bg-white common-denominator-split ${
          revealAfterConversion
            ? `lcd-final-frame-reveal ${finalFrameTone}`
            : ''
        }`}
        data-division-bar={dataBarKey}
        style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
      >
        {sourceDenominator && splitLabel && (
          <ConversionGhost
            commonDenominator={denominator}
            originalDenominator={sourceDenominator}
            originalNumerator={sourceNumerator}
            shadedColor={shadedColor}
            splitLabel={splitLabel}
          />
        )}
        {Array.from({ length: denominator }, (_, index) => {
          const isSelected = Boolean(selected[index])

          return (
            <button
              aria-label={`${label} segment ${index + 1}`}
              className={`min-w-0 transition last:border-r-0 ${
                isSelected
                  ? `${shadedColor} division-segment-pop border-r-2 border-white/95`
                  : 'border-r border-slate-200 bg-white hover:bg-slate-100'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                revealAfterConversion ? 'lcd-final-content-reveal' : ''
              }`}
              disabled={disabled}
              key={`${animateKey}-${index}`}
              onClick={() => onToggle(index)}
              style={{ '--division-delay': `${index * 38}ms` }}
              type="button"
            />
          )
        })}
      </div>
    </div>
  )
}

const rectToStyle = (rect) => ({
  height: `${rect.height}px`,
  left: `${rect.left}px`,
  top: `${rect.top}px`,
  width: `${rect.width}px`,
})

const segmentRect = (barRect, startUnit, unitCount, totalUnits) => {
  const unitWidth = barRect.width / totalUnits

  return {
    height: barRect.height,
    left: barRect.left + startUnit * unitWidth,
    top: barRect.top,
    width: unitCount * unitWidth,
  }
}

const constrainRectToBounds = (rect, bounds) => {
  const width = Math.min(rect.width, Math.max(bounds.width - 8, 1))
  const height = Math.min(rect.height, Math.max(bounds.height - 8, 1))

  return {
    height,
    left: Math.min(
      Math.max(rect.left, bounds.left + 4),
      bounds.right - width - 4
    ),
    top: Math.min(
      Math.max(rect.top, bounds.top + 4),
      bounds.bottom - height - 4
    ),
    width,
  }
}

const rectRelativeTo = (rect, origin) => ({
  ...rect,
  left: rect.left - origin.left,
  top: rect.top - origin.top,
})

const visibleBoundsFor = (rect) => ({
  bottom: Math.min(window.innerHeight, rect.bottom),
  height: Math.max(Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top), 1),
  left: Math.max(0, rect.left),
  right: Math.min(window.innerWidth, rect.right),
  top: Math.max(0, rect.top),
  width: Math.max(Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left), 1),
})

const makeFlightStyle = ({ delay, from, match, target }) => ({
  ...rectToStyle(from),
  '--flight-delay': `${delay}ms`,
  '--from-height': `${from.height}px`,
  '--from-left': `${from.left}px`,
  '--from-top': `${from.top}px`,
  '--from-width': `${from.width}px`,
  '--match-height': `${match.height}px`,
  '--match-left': `${match.left}px`,
  '--match-top': `${match.top}px`,
  '--match-width': `${match.width}px`,
  '--target-height': `${target.height}px`,
  '--target-left': `${target.left}px`,
  '--target-top': `${target.top}px`,
  '--target-width': `${target.width}px`,
})

function Step4SourceFlightOverlay({ commonDenominator, motionPlan }) {
  if (!motionPlan) return null

  return (
    <div aria-hidden="true" className="division-source-flight-layer">
      {motionPlan.groups.map((group) => (
        <div
          className="division-source-group-flight"
          key={`source-group-${group.index}`}
          style={group.style}
        >
          <div
            className="grid h-full overflow-hidden rounded"
            style={{
              gridTemplateColumns: `repeat(${group.units}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: group.units }, (_, index) => (
              <span
                className="division-source-flight-cell border-r-2 border-white/95 last:border-r-0"
                key={`source-group-cell-${group.index}-${index}`}
              />
            ))}
          </div>
          <span className="division-source-flight-label">
            {group.units}/{commonDenominator} group
          </span>
        </div>
      ))}
      {motionPlan.remainder && (
        <div
          className="division-source-remainder-flight"
          style={motionPlan.remainder.style}
        >
          <div
            className="grid h-full overflow-hidden rounded"
            style={{
              gridTemplateColumns: `repeat(${motionPlan.remainder.units}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: motionPlan.remainder.units }, (_, index) => (
              <span
                className="division-source-flight-cell border-r-2 border-white/95 last:border-r-0"
                key={`source-remainder-cell-${index}`}
              />
            ))}
          </div>
          <span className="division-source-flight-label">
            {motionPlan.remainder.label}
          </span>
        </div>
      )}
    </div>
  )
}

function Step4GroupingAnimation({
  animateKey,
  commonDenominator,
  dividendUnits,
  divisorUnits,
  fullGroups,
  remainderGroup,
  remainderUnits,
}) {
  const hasRemainder = remainderUnits > 0
  const [motionPlan, setMotionPlan] = useState(null)
  const remainderStart =
    fullGroups * step4GroupStepMs + step4RemainderStartOffsetMs
  const answerDelay =
    fullGroups * step4GroupStepMs + (hasRemainder ? 1900 : 1500)
  const groupTemplate = `${divisorUnits}/${commonDenominator} group`

  useEffect(() => {
    if (!fullGroups && !hasRemainder) {
      const emptyFrame = window.requestAnimationFrame(() => {
        setMotionPlan(null)
      })

      return () => {
        window.cancelAnimationFrame(emptyFrame)
      }
    }

    const measure = () => {
      const dividendBar = document.querySelector(
        '[data-division-bar="step3-dividend"]'
      )
      const divisorBar = document.querySelector(
        '[data-division-bar="step3-divisor"]'
      )
      const step4Bar = document.querySelector(
        '[data-division-bar="step4-target"]'
      )
      const workspace = document.querySelector('[data-division-workspace]')

      if (!dividendBar || !divisorBar || !step4Bar || !workspace) {
        setMotionPlan(null)
        return
      }

      const workspaceRect = workspace.getBoundingClientRect()
      const bounds = visibleBoundsFor(workspaceRect)
      const dividendRect = dividendBar.getBoundingClientRect()
      const divisorRect = divisorBar.getBoundingClientRect()
      const targetRect = step4Bar.getBoundingClientRect()
      const sourceDivisor = rectRelativeTo(
        constrainRectToBounds(
          segmentRect(divisorRect, 0, divisorUnits, commonDenominator),
          bounds
        ),
        workspaceRect
      )

      const groups = Array.from({ length: fullGroups }, (_, index) => {
        const startUnit = index * divisorUnits
        const match = rectRelativeTo(
          constrainRectToBounds(
            segmentRect(
              dividendRect,
              startUnit,
              divisorUnits,
              commonDenominator
            ),
            bounds
          ),
          workspaceRect
        )
        const target = rectRelativeTo(
          constrainRectToBounds(
            segmentRect(targetRect, startUnit, divisorUnits, commonDenominator),
            bounds
          ),
          workspaceRect
        )

        return {
          index,
          style: makeFlightStyle({
            delay: index * step4GroupStepMs,
            from: sourceDivisor,
            match,
            target,
          }),
          units: divisorUnits,
        }
      })

      const remainder =
        hasRemainder &&
        (() => {
          const startUnit = fullGroups * divisorUnits
          const from = rectRelativeTo(
            constrainRectToBounds(
              segmentRect(
                dividendRect,
                startUnit,
                remainderUnits,
                commonDenominator
              ),
              bounds
            ),
            workspaceRect
          )
          const target = rectRelativeTo(
            constrainRectToBounds(
              segmentRect(
                targetRect,
                startUnit,
                remainderUnits,
                commonDenominator
              ),
              bounds
            ),
            workspaceRect
          )

          return {
            label: `${formatFraction(remainderGroup)} group`,
            style: makeFlightStyle({
              delay: remainderStart,
              from,
              match: from,
              target,
            }),
            units: remainderUnits,
          }
        })()

      setMotionPlan({ groups, remainder })
    }

    const frame = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [
    animateKey,
    commonDenominator,
    divisorUnits,
    fullGroups,
    hasRemainder,
    remainderGroup,
    remainderStart,
    remainderUnits,
  ])

  return (
    <div className="min-w-0">
      <Step4SourceFlightOverlay
        commonDenominator={commonDenominator}
        motionPlan={motionPlan}
      />
      <div className="relative">
        <div
          className="grid h-9 overflow-hidden rounded border-2 border-slate-900 bg-white"
          data-division-bar="step4-target"
          style={{
            gridTemplateColumns: `repeat(${commonDenominator}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: commonDenominator }, (_, index) => {
            const isDividendUnit = index < dividendUnits
            const isFullGroupUnit =
              isDividendUnit && Math.floor(index / divisorUnits) < fullGroups
            const isRemainderUnit =
              isDividendUnit && !isFullGroupUnit && index < dividendUnits
            const divider = isDividendUnit
              ? 'border-r-2 border-r-white/95'
              : 'border-r border-r-slate-200'

            return (
              <span
                className={`relative min-w-0 bg-white ${divider} last:border-r-0`}
                key={`${animateKey}-base-${index}`}
              >
                {isFullGroupUnit && (
                  <span
                    className={`absolute inset-0 ${fullGroupColor} division-full-group-fill`}
                    style={{
                      '--group-delay': `${
                        Math.floor(index / divisorUnits) * step4GroupStepMs +
                        step4GroupFillOffsetMs
                      }ms`,
                    }}
                  />
                )}
                {isRemainderUnit && (
                  <span
                    className="absolute inset-0 bg-orange-400 division-remainder-fill"
                    style={{
                      '--remainder-delay': `${
                        remainderStart + step4RemainderFillOffsetMs
                      }ms`,
                    }}
                  />
                )}
              </span>
            )
          })}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${commonDenominator}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: fullGroups }, (_, index) => {
            const start = index * divisorUnits + 1
            const end = start + divisorUnits

            return (
              <span
                className="division-group-template-sweep mx-0.5 rounded border-2 border-sky-500 bg-sky-100/30"
                key={`${animateKey}-template-${index}`}
                style={{
                  '--group-delay': `${index * step4GroupStepMs + 420}ms`,
                  gridColumn: `${start} / ${end}`,
                }}
              >
                <span className="division-group-template-label">
                  {groupTemplate}
                </span>
              </span>
            )
          })}
          {hasRemainder && (
            <span
              className="division-remainder-template mx-0.5 rounded border-2 border-orange-400 bg-orange-100/40"
              style={{
                '--remainder-delay': `${remainderStart + 360}ms`,
                gridColumn: `${fullGroups * divisorUnits + 1} / ${
                  dividendUnits + 1
                }`,
              }}
            >
              <span className="division-remainder-template-label">
                {remainderUnits}/{divisorUnits} group
              </span>
            </span>
          )}
        </div>
      </div>

      <div
        className="mt-0.5 grid h-4 items-start"
        style={{
          gridTemplateColumns: `repeat(${commonDenominator}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: fullGroups }, (_, index) => {
          const start = index * divisorUnits + 1
          const end = start + divisorUnits

          return (
            <span
              className="division-group-count-label mx-0.5 rounded border border-sky-200 bg-sky-50 px-1 text-center text-[8px] font-black leading-3 text-sky-700"
              key={`${animateKey}-group-label-${index}`}
              style={{
                '--group-delay': `${
                  index * step4GroupStepMs + step4GroupFillOffsetMs + 160
                }ms`,
                gridColumn: `${start} / ${end}`,
              }}
            >
              {index + 1} group{index === 0 ? '' : 's'}
            </span>
          )
        })}
        {hasRemainder && (
          <span
            className="division-remainder-count-label mx-0.5 rounded border border-orange-200 bg-orange-50 px-1 text-center text-[8px] font-black leading-3 text-orange-700"
            style={{
              '--remainder-delay': `${
                remainderStart + step4RemainderFillOffsetMs + 160
              }ms`,
              gridColumn: `${fullGroups * divisorUnits + 1} / ${
                dividendUnits + 1
              }`,
            }}
          >
            {formatFraction(remainderGroup)} group
          </span>
        )}
      </div>

      <div className="mt-0.5 grid grid-cols-[1fr_auto] items-end gap-3">
        <div
          className="division-answer-reveal flex flex-wrap gap-1 text-[10px] font-bold text-slate-600"
          style={{ '--answer-delay': `${answerDelay}ms` }}
        >
          <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">
            {fullGroups} full group{fullGroups === 1 ? '' : 's'}
          </span>
          {hasRemainder && (
            <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
              {formatFraction(remainderGroup)} of a group
            </span>
          )}
        </div>
        <div
          className="division-answer-reveal text-right"
          style={{ '--answer-delay': `${answerDelay}ms` }}
        >
          <div className="text-xs font-black uppercase text-slate-700">
            Answer:
          </div>
          <div className="text-2xl font-black leading-none tabular-nums">
            <AnswerText
              fullGroups={fullGroups}
              remainderGroup={remainderGroup}
              remainderUnits={remainderUnits}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ children, locked = false, step }) {
  return (
    <section className="grid h-full min-w-0 grid-cols-[76px_minmax(0,1fr)] gap-2">
      <StepLabel>Step {step}</StepLabel>
      <div
        className={`min-w-0 overflow-hidden rounded border-2 p-1.5 shadow-sm ${
          locked
            ? 'border-slate-300 bg-slate-100 text-slate-400'
            : 'border-slate-900 bg-white text-slate-800'
        }`}
      >
        {children}
      </div>
    </section>
  )
}

export default function FractionDivisionBarModel() {
  const [dividend, setDividend] = useState(defaultProblem.dividend)
  const [divisor, setDivisor] = useState(defaultProblem.divisor)
  const [step2DividendShade, setStep2DividendShade] = useState(
    makeEmptyShade(defaultProblem.dividend.denominator)
  )
  const [step2DivisorShade, setStep2DivisorShade] = useState(
    makeEmptyShade(defaultProblem.divisor.denominator)
  )
  const [step3DividendShade, setStep3DividendShade] = useState(
    makeEmptyShade(initialCommonDenominator)
  )
  const [step3DivisorShade, setStep3DivisorShade] = useState(
    makeEmptyShade(initialCommonDenominator)
  )
  const [interactionRun, setInteractionRun] = useState(0)

  const model = useMemo(() => {
    const commonDenominator = lcm(dividend.denominator, divisor.denominator)
    const dividendUnits =
      dividend.numerator * (commonDenominator / dividend.denominator)
    const divisorUnits =
      divisor.numerator * (commonDenominator / divisor.denominator)
    const quotient = simplify(dividendUnits, divisorUnits)
    const fullGroups = Math.floor(dividendUnits / divisorUnits)
    const remainderUnits = dividendUnits % divisorUnits
    const remainderGroup = simplify(remainderUnits, divisorUnits)

    return {
      commonDenominator,
      dividendUnits,
      divisorUnits,
      fullGroups,
      quotient,
      remainderGroup,
      remainderUnits,
    }
  }, [dividend, divisor])

  const step2Complete =
    selectedCount(step2DividendShade) === dividend.numerator &&
    selectedCount(step2DivisorShade) === divisor.numerator
  const step3Complete =
    step2Complete &&
    selectedCount(step3DividendShade) === model.dividendUnits &&
    selectedCount(step3DivisorShade) === model.divisorUnits

  const resetShading = (nextDividend, nextDivisor) => {
    const nextCommonDenominator = lcm(
      nextDividend.denominator,
      nextDivisor.denominator
    )

    setStep2DividendShade(makeEmptyShade(nextDividend.denominator))
    setStep2DivisorShade(makeEmptyShade(nextDivisor.denominator))
    setStep3DividendShade(makeEmptyShade(nextCommonDenominator))
    setStep3DivisorShade(makeEmptyShade(nextCommonDenominator))
    setInteractionRun((current) => current + 1)
  }

  const updateDividend = (nextDividend) => {
    setDividend(nextDividend)
    resetShading(nextDividend, divisor)
  }

  const updateDivisor = (nextDivisor) => {
    setDivisor(nextDivisor)
    resetShading(dividend, nextDivisor)
  }

  const toggleShade = (setter) => (index) => {
    setter((current) => current.map((isSelected, itemIndex) => (itemIndex === index ? !isSelected : isSelected)))
  }

  return (
    <div
      className="relative box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-4 py-0 text-slate-800"
      data-division-workspace
    >
      <div className="grid min-h-0 w-full flex-1 grid-cols-[165px_minmax(0,1fr)] gap-3">
        <aside className="flex min-h-0 flex-col gap-2">
          <div className="rounded border border-slate-200 bg-white p-2 shadow-sm">
            <h2 className="text-sm font-black leading-tight text-slate-900">
              Fraction bar model method
            </h2>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
              Divide by asking how many divisor groups fit in the first fraction.
            </p>
          </div>

          <div className="rounded border-2 border-slate-900 bg-white p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-3 text-4xl font-black">
              <FractionText className="text-emerald-600" fraction={dividend} />
              <span className="text-slate-900">&divide;</span>
              <FractionText className="text-purple-600" fraction={divisor} />
            </div>
          </div>

          <FractionSetter
            fraction={dividend}
            label="First fraction"
            onChange={updateDividend}
            tone={{
              bg: 'bg-emerald-50',
              border: 'border-emerald-200',
              text: 'text-emerald-700',
            }}
          />
          <FractionSetter
            fraction={divisor}
            label="Divisor"
            onChange={updateDivisor}
            tone={{
              bg: 'bg-purple-50',
              border: 'border-purple-200',
              text: 'text-purple-700',
            }}
          />
        </aside>

        <div className="grid h-full min-h-0 min-w-0 grid-rows-[48px_118px_155px_163px] gap-1">
          <StepCard step="1">
            <div className="flex items-center justify-center gap-2 text-lg font-black">
              <span>How many</span>
              <FractionText className="text-purple-600" fraction={divisor} />
              <span>are in</span>
              <FractionText className="text-emerald-600" fraction={dividend} />
              <span>?</span>
            </div>
          </StepCard>

          <StepCard step="2">
            <div className="mb-1 text-center text-[11px] font-bold text-slate-700">
              {step2Complete
                ? 'Correct. Step 3 is open.'
                : 'Shade both models correctly to unlock Step 3.'}
            </div>
            <div className="grid grid-cols-[34px_1fr] items-center gap-2">
              <FractionText className="text-sm font-black text-emerald-600" fraction={dividend} />
              <InteractiveFractionBar
                animateKey={`step2-a-${interactionRun}`}
                denominator={dividend.denominator}
                //label="First fraction"
                compact
                onToggle={toggleShade(setStep2DividendShade)}
                outlineColor="border-emerald-300"
                selected={step2DividendShade}
                shadedColor="bg-emerald-500"
                target={dividend.numerator}
              />
              <FractionText className="text-sm font-black text-purple-600" fraction={divisor} />
              <InteractiveFractionBar
                animateKey={`step2-b-${interactionRun}`}
                denominator={divisor.denominator}
                //label="Divisor"
                compact
                onToggle={toggleShade(setStep2DivisorShade)}
                outlineColor="border-purple-300"
                selected={step2DivisorShade}
                shadedColor="bg-purple-500"
                target={divisor.numerator}
              />
            </div>
          </StepCard>

          <StepCard locked={!step2Complete} step="3">
            {step2Complete ? (
              <>
                <div className="mb-1 text-center text-[11px] font-bold text-slate-700">
                  {step3Complete
                    ? 'Correct. Step 4 is open.'
                    : 'Find the common denominator, then shade the numerators.'}
                </div>
                <CommonDenominatorMatch
                  commonDenominator={model.commonDenominator}
                  dividend={dividend}
                  divisor={divisor}
                />
                <div className="grid grid-cols-[42px_1fr] items-center gap-2">
                  <FractionText
                    className="text-sm font-black text-emerald-600 lcd-final-content-reveal"
                    fraction={{
                      numerator: model.dividendUnits,
                      denominator: model.commonDenominator,
                    }}
                  />
                  <InteractiveFractionBar
                    animateKey={`step3-a-${interactionRun}`}
                    compact
                    dataBarKey="step3-dividend"
                    denominator={model.commonDenominator}
                    //label="First fraction with common denominator"
                    onToggle={toggleShade(setStep3DividendShade)}
                    outlineColor="border-emerald-300"
                    selected={step3DividendShade}
                    shadedColor="bg-emerald-500"
                    sourceDenominator={dividend.denominator}
                    sourceNumerator={dividend.numerator}
                    splitLabel={`x${model.commonDenominator / dividend.denominator}`}
                    target={model.dividendUnits}
                  />
                  <FractionText
                    className="text-sm font-black text-purple-600 lcd-final-content-reveal"
                    fraction={{
                      numerator: model.divisorUnits,
                      denominator: model.commonDenominator,
                    }}
                  />
                  <InteractiveFractionBar
                    animateKey={`step3-b-${interactionRun}`}
                    compact
                    dataBarKey="step3-divisor"
                    denominator={model.commonDenominator}
                    //label="Divisor with common denominator"
                    onToggle={toggleShade(setStep3DivisorShade)}
                    outlineColor="border-purple-300"
                    selected={step3DivisorShade}
                    shadedColor="bg-purple-500"
                    sourceDenominator={divisor.denominator}
                    sourceNumerator={divisor.numerator}
                    splitLabel={`x${model.commonDenominator / divisor.denominator}`}
                    target={model.divisorUnits}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs font-bold">
                Complete Step 2 to build common-denominator bars.
              </div>
            )}
          </StepCard>

          <StepCard locked={!step3Complete} step="4">
            {step3Complete ? (
              <>
                <div className="mb-1 flex items-center justify-center gap-2 text-sm font-black">
                  <span>How many</span>
                  <FractionText
                    className="text-purple-600"
                    fraction={{
                      numerator: model.divisorUnits,
                      denominator: model.commonDenominator,
                    }}
                  />
                  <span>are in</span>
                  <FractionText
                    className="text-emerald-600"
                    fraction={{
                      numerator: model.dividendUnits,
                      denominator: model.commonDenominator,
                    }}
                  />
                  <span>?</span>
                </div>

                <Step4GroupingAnimation
                  animateKey={`step4-${interactionRun}`}
                  commonDenominator={model.commonDenominator}
                  dividendUnits={model.dividendUnits}
                  divisorUnits={model.divisorUnits}
                  fullGroups={model.fullGroups}
                  remainderGroup={model.remainderGroup}
                  remainderUnits={model.remainderUnits}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs font-bold">
                Complete Step 3 to reveal the grouping animation.
              </div>
            )}
          </StepCard>
        </div>
      </div>
    </div>
  )
}
