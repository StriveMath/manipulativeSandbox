import { useMemo, useRef, useState } from 'react'

const stripConfigs = [
  {
    denominator: 1,
    label: 'Whole',
    fill: 'bg-emerald-500',
    hover: 'hover:bg-emerald-400',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  {
    denominator: 2,
    label: 'Halves',
    fill: 'bg-blue-500',
    hover: 'hover:bg-blue-400',
    soft: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  {
    denominator: 3,
    label: 'Thirds',
    fill: 'bg-violet-500',
    hover: 'hover:bg-violet-400',
    soft: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-800',
  },
  {
    denominator: 4,
    label: 'Fourths',
    fill: 'bg-amber-500',
    hover: 'hover:bg-amber-400',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  {
    denominator: 5,
    label: 'Fifths',
    fill: 'bg-rose-500',
    hover: 'hover:bg-rose-400',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
  },
  {
    denominator: 6,
    label: 'Sixths',
    fill: 'bg-cyan-500',
    hover: 'hover:bg-cyan-400',
    soft: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-800',
  },
  {
    denominator: 7,
    label: 'Sevenths',
    fill: 'bg-lime-500',
    hover: 'hover:bg-lime-400',
    soft: 'bg-lime-50',
    border: 'border-lime-200',
    text: 'text-lime-800',
  },
  {
    denominator: 8,
    label: 'Eighths',
    fill: 'bg-fuchsia-500',
    hover: 'hover:bg-fuchsia-400',
    soft: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-800',
  },
  {
    denominator: 9,
    label: 'Ninths',
    fill: 'bg-orange-500',
    hover: 'hover:bg-orange-400',
    soft: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
  },
  {
    denominator: 10,
    label: 'Tenths',
    fill: 'bg-sky-500',
    hover: 'hover:bg-sky-400',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
  },
]

const denominators = stripConfigs.map(({ denominator }) => denominator)

const breakPieces = [
  { left: '8%', top: '16%', dx: '-18px', dy: '-12px', rotate: '-28deg' },
  { left: '38%', top: '10%', dx: '4px', dy: '-18px', rotate: '18deg' },
  { left: '68%', top: '18%', dx: '18px', dy: '-10px', rotate: '34deg' },
  { left: '12%', top: '54%', dx: '-16px', dy: '14px', rotate: '22deg' },
  { left: '44%', top: '52%', dx: '2px', dy: '18px', rotate: '-16deg' },
  { left: '72%', top: '56%', dx: '20px', dy: '12px', rotate: '-30deg' },
]

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

const simplifyParts = (numerator, denominator) => {
  const safeNumerator = Number.isFinite(numerator) ? numerator : 0

  if (safeNumerator === 0) return { numerator: 0, denominator: 1 }
  const divisor = gcd(safeNumerator, denominator)

  return {
    numerator: safeNumerator / divisor,
    denominator: denominator / divisor,
  }
}

const simplifyFraction = (numerator, denominator) => {
  const simplified = simplifyParts(numerator, denominator)

  if (simplified.numerator === 0) return '0'
  if (simplified.denominator === 1) return `${simplified.numerator}`

  return `${simplified.numerator}/${simplified.denominator}`
}

const fractionKey = (numerator, denominator) => {
  const simplified = simplifyParts(numerator, denominator)

  return `${simplified.numerator}/${simplified.denominator}`
}

function SelectedFractions({ activeFractions }) {
  if (activeFractions.length === 0) {
    return (
      <span className="text-sm font-semibold text-slate-500">
        No fractions selected
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeFractions.map(({ config, denominator, numerator }) => (
        <span
          className={`rounded border ${config.border} ${config.soft} px-2 py-0.5 text-xs font-black tabular-nums ${config.text}`}
          key={denominator}
        >
          {numerator}/{denominator}
        </span>
      ))}
    </div>
  )
}

export default function FractionBars() {
  const [filledByDenominator, setFilledByDenominator] = useState(() =>
    Object.fromEntries(denominators.map((denominator) => [denominator, 0]))
  )
  const [segmentAnimations, setSegmentAnimations] = useState({})
  const animationIdRef = useRef(0)

  const equivalentValues = useMemo(() => {
    const counts = new Map()

    denominators.forEach((denominator) => {
      const numerator = filledByDenominator[denominator] ?? 0

      if (numerator > 0) {
        const key = fractionKey(numerator, denominator)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    })

    return counts
  }, [filledByDenominator])

  const setNumerator = (denominator, numerator) => {
    setFilledByDenominator((prev) => ({
      ...prev,
      [denominator]: prev[denominator] === numerator ? 0 : numerator,
    }))

    const current = filledByDenominator[denominator] ?? 0
    const next = current === numerator ? 0 : numerator
    const type = next > current ? 'add' : 'remove'
    const start = type === 'add' ? current + 1 : next + 1
    const end = type === 'add' ? next : current
    animationIdRef.current += 1
    const animationId = animationIdRef.current

    setSegmentAnimations((prev) => {
      const nextAnimations = { ...prev }

      for (let segment = start; segment <= end; segment += 1) {
        nextAnimations[`${denominator}-${segment}`] = {
          id: animationId,
          type,
        }
      }

      return nextAnimations
    })

    window.setTimeout(() => {
      setSegmentAnimations((prev) => {
        const nextAnimations = { ...prev }

        for (let segment = start; segment <= end; segment += 1) {
          const key = `${denominator}-${segment}`
          if (nextAnimations[key]?.id === animationId) {
            delete nextAnimations[key]
          }
        }

        return nextAnimations
      })
    }, 720)
  }

  const clearAll = () => {
    setFilledByDenominator(
      Object.fromEntries(denominators.map((denominator) => [denominator, 0]))
    )
  }

  const activeFractions = stripConfigs
    .map((config) => ({
      config,
      denominator: config.denominator,
      numerator: filledByDenominator[config.denominator] ?? 0,
    }))
    .filter(({ numerator }) => numerator > 0)

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-3 py-1.5 text-slate-700">
      <div className="mb-1 grid shrink-0 grid-cols-[1fr_auto_auto] items-center gap-3">
        <div>
          <h2 className="text-base font-bold leading-5 text-slate-800">
            Fraction bars
          </h2>
          <p className="text-[10px] font-medium leading-3 text-slate-500">
            Compare shaded fractions and equivalent values.
          </p>
        </div>
        <div className="min-w-0 max-w-72">
          <SelectedFractions activeFractions={activeFractions} />
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="rounded border border-slate-300 bg-white px-3 py-0.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100"
        >
          Clear
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-10 gap-1">
        {stripConfigs.map((config) => {
          const denominator = config.denominator
          const numerator = filledByDenominator[denominator] ?? 0
          const key = fractionKey(numerator, denominator)
          const hasEquivalent =
            numerator > 0 && (equivalentValues.get(key) ?? 0) > 1

          return (
            <div
              key={denominator}
              className={`grid h-full grid-cols-[88px_minmax(0,1fr)_86px] items-center gap-2 rounded border px-2 py-0.5 transition-all duration-200 ${
                hasEquivalent
                  ? `${config.border} ${config.soft} shadow-sm ring-2 ring-amber-300/70`
                  : 'border-slate-200 bg-white'
              } ${hasEquivalent ? 'fraction-equivalent-aura' : ''}`}
            >
              <div>
                <div className={`text-base font-black leading-5 ${config.text}`}>
                  1/{denominator}
                </div>
                <div className="text-xs font-semibold leading-4 text-slate-500">
                  {config.label}
                </div>
              </div>

              <div
                className="grid h-8 w-full overflow-hidden rounded border border-slate-300 bg-white shadow-inner"
                style={{ gridTemplateColumns: `repeat(${denominator}, 1fr)` }}
              >
                {Array.from({ length: denominator }, (_, index) => {
                  const segmentNumber = index + 1
                  const isFilled = segmentNumber <= numerator
                  const animation = segmentAnimations[`${denominator}-${segmentNumber}`]
                  const isAdding = animation?.type === 'add'
                  const isRemoving = animation?.type === 'remove'

                  return (
                    <button
                      key={segmentNumber}
                      type="button"
                      onClick={() => setNumerator(denominator, segmentNumber)}
                      className={`relative h-full overflow-hidden border-r border-white/80 transition duration-150 last:border-r-0 motion-safe:hover:scale-y-110 ${
                        isFilled
                          ? `${config.fill} ${config.hover}`
                          : 'bg-slate-100 hover:bg-slate-200'
                      } ${isAdding ? 'fraction-segment-lay' : ''}`}
                      aria-label={`Shade ${segmentNumber} of ${denominator}`}
                    >
                      {isRemoving && (
                        <span className="pointer-events-none absolute inset-0">
                          {breakPieces.map((piece, pieceIndex) => (
                            <span
                              className={`fraction-break-piece absolute h-2.5 w-2.5 rounded-sm ${config.fill}`}
                              key={pieceIndex}
                              style={{
                                '--break-dx': piece.dx,
                                '--break-dy': piece.dy,
                                '--break-rotate': piece.rotate,
                                left: piece.left,
                                top: piece.top,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="text-right">
                <div className={`text-lg font-black leading-5 tabular-nums ${config.text}`}>
                  {numerator}/{denominator}
                </div>
                <div className="text-xs font-bold leading-4 text-slate-500">
                  {simplifyFraction(numerator, denominator)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
