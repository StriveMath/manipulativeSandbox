import { useState } from 'react'

const denominatorOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const multiplierOptions = [2, 3, 4, 5]

const palette = {
  original: {
    fill: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
  },
  equivalent: {
    fill: 'bg-sky-500',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    ring: 'ring-sky-200',
  },
  bridge: {
    fill: 'bg-amber-400',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
}

function FractionText({ denominator, numerator, tone = 'text-slate-900' }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${tone}`}>
      <span>{numerator}</span>
      <span className="text-slate-400">/</span>
      <span>{denominator}</span>
    </span>
  )
}

function Stepper({ label, max, min = 1, onChange, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
      <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="grid grid-cols-[34px_1fr_34px] items-center gap-1">
        <button
          className="h-8 rounded border border-slate-300 bg-slate-50 text-lg font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          type="button"
        >
          -
        </button>
        <div className="text-center text-2xl font-black tabular-nums text-slate-900">
          {value}
        </div>
        <button
          className="h-8 rounded border border-slate-300 bg-slate-50 text-lg font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}

function FractionBar({
  animationRun = 0,
  denominator,
  groupSize = 1,
  label,
  numerator,
  paletteKey,
  showGroups = false,
}) {
  const color = palette[paletteKey]

  return (
    <div className={`rounded-lg border ${color.border} ${color.soft} p-2`}>
      <div className="mb-2 grid grid-cols-[150px_1fr_96px] items-end gap-2">
        <div>
          <div className={`text-sm font-black ${color.text}`}>{label}</div>
          <div className="text-[11px] font-bold text-slate-500">
            {numerator} shaded out of {denominator}
          </div>
        </div>
        <div className="text-center text-xs font-bold text-slate-500">
          same whole length
        </div>
        <div className={`text-right text-xl font-black ${color.text}`}>
          <FractionText
            denominator={denominator}
            numerator={numerator}
            tone={color.text}
          />
        </div>
      </div>

      <div
        className="grid h-20 overflow-hidden rounded-md border border-slate-300 bg-white shadow-inner"
        style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: denominator }, (_, index) => {
          const isFilled = index < numerator
          const isGroupEnd = showGroups && (index + 1) % groupSize === 0

          return (
            <div
              className={`relative border-r border-white/80 last:border-r-0 ${
                isFilled ? `${color.fill} fraction-segment-lay` : 'bg-slate-100'
              } ${isFilled && animationRun ? 'equivalent-build-segment' : ''} ${isGroupEnd ? 'shadow-[inset_-2px_0_0_rgba(15,23,42,0.32)]' : ''}`}
              key={`${animationRun}-${index}`}
              style={{ '--segment-delay': `${Math.min(index, numerator - 1) * 42}ms` }}
            >
              {showGroups && isGroupEnd && (
                <span className="absolute bottom-0 right-0 top-0 w-0.5 bg-slate-800/30" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyEquivalentPanel() {
  return (
    <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/35" />
  )
}

function EquivalentMatchPanel({
  denominator,
  equivalentDenominator,
  equivalentNumerator,
  hasScale,
  numerator,
}) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        hasScale ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
        Equivalent match
      </div>
      {hasScale ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-2xl font-black leading-none">
          <span className="rounded-md border border-emerald-300 bg-emerald-100 px-2 py-1 text-emerald-600 shadow-sm">
            <FractionText
              denominator={denominator}
              numerator={numerator}
              tone="text-emerald-600"
            />
          </span>
          <span className="rounded-md border border-amber-300 bg-amber-200 px-2 py-1 text-amber-700 shadow-sm">
            =
          </span>
          <span className="rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-sky-600 shadow-sm">
            <FractionText
              denominator={equivalentDenominator}
              numerator={equivalentNumerator}
              tone="text-sky-600"
            />
          </span>
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-2 py-3 text-center text-xs font-bold text-slate-400">
          Choose a scale to make a match.
        </div>
      )}
    </div>
  )
}

function EquivalentBuildPanel({
  animationRun,
  denominator,
  equivalentDenominator,
  equivalentNumerator,
  multiplier,
  numerator,
}) {
  const denominatorDelayStart = 1780
  const denominatorDelayStep = 118
  const numeratorDelayStart =
    denominatorDelayStart + equivalentDenominator * denominatorDelayStep + 560

  return (
    <div className="relative overflow-hidden rounded-lg border border-sky-200 bg-sky-50 p-2">
      <div className="mb-1 grid grid-cols-[1fr_auto] items-start gap-2">
        <div>
          <div className={`text-sm font-black ${palette.equivalent.text}`}>
            Equivalent fraction
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            {equivalentNumerator} shaded out of {equivalentDenominator}
          </div>
        </div>
        <div className={`text-right text-xl font-black ${palette.equivalent.text}`}>
          <FractionText
            denominator={equivalentDenominator}
            numerator={equivalentNumerator}
            tone={palette.equivalent.text}
          />
        </div>
      </div>

      <div className="relative h-[136px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20">
          <div
            className="equivalent-ghost-collide absolute left-3 top-3 z-20 grid h-12 w-48 overflow-hidden rounded border border-emerald-300 bg-white shadow-lg"
            key={`source-${animationRun}`}
            style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: denominator }, (_, index) => {
              const isFilled = index < numerator

              return (
                <div
                  className={`grid border-r border-white/80 last:border-r-0 ${
                    isFilled ? palette.original.fill : 'bg-slate-100'
                  }`}
                  key={index}
                  style={{ gridTemplateColumns: `repeat(${multiplier}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: multiplier }, (_, partIndex) => (
                    <span
                      className={`border-r border-white/70 last:border-r-0 ${
                        isFilled ? 'equivalent-subsection-pop' : ''
                      }`}
                      key={partIndex}
                      style={{ '--sub-delay': `${(index * multiplier + partIndex) * 64}ms` }}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2">
            <div
              className="equivalent-scale-impact rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-center text-lg font-black text-amber-800"
              key={`scale-${animationRun}`}
            >
              x{multiplier}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <div className="equivalent-result-label mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-black text-sky-800">
              {equivalentDenominator} equal parts
            </div>
            <div className="text-sm font-black text-sky-800">
              <FractionText
                denominator={equivalentDenominator}
                numerator={equivalentNumerator}
                tone={palette.equivalent.text}
              />
            </div>
          </div>
          <div
            className="grid h-16 overflow-hidden rounded border border-slate-300 bg-white shadow-inner"
            style={{ gridTemplateColumns: `repeat(${equivalentDenominator}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: equivalentDenominator }, (_, index) => {
              const isFilled = index < equivalentNumerator
              const isGroupEnd = (index + 1) % multiplier === 0

              return (
                <div
                  className={`equivalent-denominator-cell relative bg-slate-100 after:absolute after:bottom-0 after:right-0 after:top-0 after:z-10 after:w-px after:bg-white/95 last:after:hidden ${isGroupEnd ? 'shadow-[inset_-2px_0_0_rgba(15,23,42,0.42)]' : ''}`}
                  key={`${animationRun}-${index}`}
                  style={{
                    '--denominator-delay': `${denominatorDelayStart + index * denominatorDelayStep}ms`,
                  }}
                >
                  {isFilled && (
                    <span
                      className={`equivalent-numerator-fill absolute inset-0 ${palette.equivalent.fill}`}
                      style={{ '--numerator-delay': `${numeratorDelayStart + index * 165}ms` }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EquivalentFractionsVisual() {
  const [denominator, setDenominator] = useState(4)
  const [numerator, setNumerator] = useState(1)
  const [multiplier, setMultiplier] = useState(null)
  const [animationRun, setAnimationRun] = useState(0)

  const activeMultiplier = multiplier ?? 1
  const hasScale = multiplier !== null
  const equivalentNumerator = numerator * activeMultiplier
  const equivalentDenominator = denominator * activeMultiplier
  const setSafeDenominator = (nextDenominator) => {
    setDenominator(nextDenominator)
    setNumerator((current) => Math.min(current, nextDenominator - 1))
    setMultiplier(null)
  }

  const reset = () => {
    setDenominator(4)
    setNumerator(1)
    setMultiplier(null)
    setAnimationRun(0)
  }

  const setSafeNumerator = (nextNumerator) => {
    setNumerator(nextNumerator)
    setMultiplier(null)
  }

  const selectMultiplier = (nextMultiplier) => {
    setMultiplier(nextMultiplier)
    setAnimationRun((current) => current + 1)
  }

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-4 py-3 text-slate-700">
      <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black leading-5 text-slate-900">
            Equivalent Fractions Visual
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Multiply the numerator and denominator by the same number.
          </p>
        </div>
        <button
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-700"
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_230px] gap-3">
        <div className="grid min-h-0 grid-rows-2 gap-3">
          <FractionBar
            denominator={denominator}
            label="Original fraction"
            numerator={numerator}
            paletteKey="original"
          />
          {hasScale ? (
            <EquivalentBuildPanel
              animationRun={animationRun}
              denominator={denominator}
              equivalentDenominator={equivalentDenominator}
              equivalentNumerator={equivalentNumerator}
              multiplier={multiplier}
              numerator={numerator}
            />
          ) : (
            <EmptyEquivalentPanel />
          )}
        </div>

        <div className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Choose denominator
            </div>
            <div className="grid grid-cols-3 gap-1">
              {denominatorOptions.map((option) => (
                <button
                  className={`h-8 rounded border text-sm font-black transition ${
                    denominator === option
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  key={option}
                  onClick={() => setSafeDenominator(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Stepper
            label="Numerator"
            max={denominator - 1}
            onChange={setSafeNumerator}
            value={numerator}
          />

          <div className="min-h-0 space-y-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Scale both parts
              </div>
              <div className="grid grid-cols-4 gap-1">
                {multiplierOptions.map((option) => (
                  <button
                    className={`h-9 rounded border text-sm font-black transition ${
                      multiplier === option
                        ? 'border-sky-300 bg-sky-100 text-sky-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                    key={option}
                    onClick={() => selectMultiplier(option)}
                    type="button"
                  >
                    x{option}
                  </button>
                ))}
              </div>
            </div>
            <EquivalentMatchPanel
              denominator={denominator}
              equivalentDenominator={equivalentDenominator}
              equivalentNumerator={equivalentNumerator}
              hasScale={hasScale}
              numerator={numerator}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
