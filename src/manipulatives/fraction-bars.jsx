import { useMemo, useState } from 'react'

const denominators = [2, 3, 4, 5, 6, 8, 10, 12]

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

const simplifyFraction = (numerator, denominator) => {
  if (numerator === 0) return '0'
  if (numerator === denominator) return '1'
  const divisor = gcd(numerator, denominator)
  return `${numerator / divisor}/${denominator / divisor}`
}

export default function FractionBars() {
  const [filledByDenominator, setFilledByDenominator] = useState(() =>
    Object.fromEntries(denominators.map((denominator) => [denominator, 0]))
  )

  const equivalentValues = useMemo(() => {
    const counts = new Map()

    denominators.forEach((denominator) => {
      const numerator = filledByDenominator[denominator]
      if (numerator > 0) {
        const value = numerator / denominator
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    })

    return counts
  }, [filledByDenominator])

  const setNumerator = (denominator, numerator) => {
    setFilledByDenominator((prev) => ({
      ...prev,
      [denominator]: prev[denominator] === numerator ? 0 : numerator,
    }))
  }

  const clearAll = () => {
    setFilledByDenominator(
      Object.fromEntries(denominators.map((denominator) => [denominator, 0]))
    )
  }

  const activeFractions = denominators
    .map((denominator) => ({
      denominator,
      numerator: filledByDenominator[denominator],
    }))
    .filter(({ numerator }) => numerator > 0)

  return (
    <div className="box-border flex h-full flex-col bg-slate-50 px-8 py-5 text-slate-700">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Build and compare fractions
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Click a strip segment to shade up to that point. Matching values glow.
          </p>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
        >
          Clear
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2">
        {denominators.map((denominator) => {
          const numerator = filledByDenominator[denominator]
          const value = numerator / denominator
          const hasEquivalent =
            numerator > 0 && (equivalentValues.get(value) ?? 0) > 1

          return (
            <div
              key={denominator}
              className={`grid grid-cols-[54px_1fr_84px] items-center gap-3 rounded border px-3 py-2 transition ${
                hasEquivalent
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-sm font-semibold text-slate-600">
                /{denominator}
              </div>

              <div
                className="grid h-8 overflow-hidden rounded border border-slate-300 bg-slate-100"
                style={{ gridTemplateColumns: `repeat(${denominator}, 1fr)` }}
              >
                {Array.from({ length: denominator }, (_, index) => {
                  const segmentNumber = index + 1
                  const isFilled = segmentNumber <= numerator

                  return (
                    <button
                      key={segmentNumber}
                      type="button"
                      onClick={() => setNumerator(denominator, segmentNumber)}
                      className={`h-full border-r border-white/80 transition last:border-r-0 ${
                        isFilled
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-slate-100 hover:bg-blue-100'
                      }`}
                      aria-label={`Shade ${segmentNumber} of ${denominator}`}
                    />
                  )
                })}
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums text-slate-800">
                  {numerator}/{denominator}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {simplifyFraction(numerator, denominator)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 rounded border border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Selected fractions
          </div>
          <div className="mt-1 text-sm font-medium text-slate-700">
            {activeFractions.length > 0
              ? activeFractions
                  .map(({ numerator, denominator }) => `${numerator}/${denominator}`)
                  .join('  =?  ')
              : 'No shaded strips yet'}
          </div>
        </div>
        <div className="rounded bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Equivalent strips are highlighted
        </div>
      </div>
    </div>
  )
}
