import { useEffect, useMemo, useRef, useState } from 'react'

const ANALYSIS_DURATION = 1450
const ZOOM_DURATION = 620

const curatedNumbers = [
  {
    id: 'three-fourths',
    label: '3/4',
    value: 3 / 4,
    classification: 'rational',
    decimalType: 'terminating',
    decimalPrefix: '0.75',
    exactFraction: '3/4',
  },
  {
    id: 'two-thirds',
    label: '2/3',
    value: 2 / 3,
    classification: 'rational',
    decimalType: 'repeating',
    decimalPrefix: '0.',
    repeatBlock: '6',
    exactFraction: '2/3',
  },
  {
    id: 'one-eighth',
    label: '0.125',
    value: 0.125,
    classification: 'rational',
    decimalType: 'terminating',
    decimalPrefix: '0.125',
    exactFraction: '1/8',
  },
  {
    id: 'repeat-twenty-seven',
    label: 'repeat-27',
    value: 3 / 11,
    classification: 'rational',
    decimalType: 'repeating',
    decimalPrefix: '0.',
    repeatBlock: '27',
    exactFraction: '3/11',
  },
  {
    id: 'root-four',
    label: 'sqrt-4',
    value: 2,
    classification: 'rational',
    decimalType: 'terminating',
    decimalPrefix: '2',
    exactFraction: '2/1',
    radicand: 4,
  },
  {
    id: 'root-two',
    label: 'sqrt-2',
    value: Math.sqrt(2),
    classification: 'irrational',
    decimalType: 'irrational',
    radicand: 2,
  },
  {
    id: 'root-five',
    label: 'sqrt-5',
    value: Math.sqrt(5),
    classification: 'irrational',
    decimalType: 'irrational',
    radicand: 5,
  },
  {
    id: 'pi',
    label: 'pi',
    value: Math.PI,
    classification: 'irrational',
    decimalType: 'irrational',
    constant: 'pi',
  },
  {
    id: 'negative-root-two',
    label: 'negative-sqrt-2',
    value: -Math.sqrt(2),
    classification: 'irrational',
    decimalType: 'irrational',
    radicand: 2,
    sign: -1,
  },
]

const presetOptionLabels = {
  'three-fourths': '3/4',
  'two-thirds': '2/3',
  'one-eighth': '0.125',
  'repeat-twenty-seven': '0.(27)',
  'root-four': 'sqrt(4)',
  'root-two': 'sqrt(2)',
  'root-five': 'sqrt(5)',
  pi: 'pi',
  'negative-root-two': '-sqrt(2)',
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const isPerfectSquare = (value) => Number.isInteger(Math.sqrt(value))

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

const formatAtPrecision = (value, decimals) => {
  const rounded = roundTo(value, decimals)
  return decimals === 0 ? `${rounded}` : rounded.toFixed(decimals)
}

const makeCustomRoot = (radicand, sign) => {
  const root = Math.sqrt(radicand)
  const rational = isPerfectSquare(radicand)

  return {
    id: 'custom-root',
    label: 'custom-root',
    value: sign * root,
    sign,
    radicand,
    classification: rational ? 'rational' : 'irrational',
    decimalType: rational ? 'terminating' : 'irrational',
    decimalPrefix: rational ? `${sign * root}` : undefined,
    exactFraction: rational ? `${sign * root}/1` : undefined,
  }
}

function ExactNumber({ number, className = '' }) {
  if (number.constant === 'pi') {
    return <span className={className}>π</span>
  }

  if (number.label === 'repeat-27') {
    return (
      <span className={className}>
        0.<span className="border-t-2 border-current leading-none">27</span>
      </span>
    )
  }

  if (number.radicand) {
    return (
      <span className={className}>
        {number.sign === -1 ? '−' : ''}√{number.radicand}
      </span>
    )
  }

  return <span className={className}>{number.label}</span>
}

function DecimalMicroscope({ animationKey, number, state }) {
  if (state === 'idle') {
    return (
      <div className="flex h-[78px] items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center text-sm font-bold text-slate-500">
        Analyze the number to open its decimal expansion.
      </div>
    )
  }

  let characters
  let repeatingStart = -1
  let terminatingStart = -1

  if (number.decimalType === 'repeating') {
    const repeated = number.repeatBlock.repeat(number.repeatBlock.length === 1 ? 6 : 3)
    characters = `${number.decimalPrefix}${repeated}`.split('')
    repeatingStart = number.decimalPrefix.length
  } else if (number.decimalType === 'terminating') {
    const suffix = number.decimalPrefix.includes('.') ? '000' : '.000'
    characters = `${number.decimalPrefix}${suffix}`.split('')
    terminatingStart = number.decimalPrefix.length
  } else {
    characters = number.value.toFixed(10).split('')
  }

  return (
    <div
      className="relative flex h-[78px] min-w-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-950 px-3"
      key={`${number.id}-${animationKey}`}
    >
      <div
        className="grid w-full min-w-0 grid-flow-col auto-cols-fr items-center gap-0.5"
        aria-label={`Decimal expansion of ${number.label}`}
      >
        {characters.map((character, index) => {
          const repeating = index >= repeatingStart && repeatingStart >= 0
          const trailingZero = index >= terminatingStart && terminatingStart >= 0

          return (
            <span
              className={`number-microscope-digit flex h-10 min-w-0 items-center justify-center rounded px-0 text-xl font-black tabular-nums ${
                repeating
                  ? 'number-microscope-repeat border-t-2 border-violet-300 bg-violet-500/25 text-violet-100'
                  : trailingZero
                    ? 'number-microscope-zero bg-emerald-500/15 text-emerald-200'
                    : 'bg-white/10 text-white'
              }`}
              key={`${character}-${index}`}
              style={{ '--number-digit-delay': `${index * 78}ms` }}
            >
              {character === '-' ? '−' : character}
            </span>
          )
        })}
        {number.decimalType !== 'terminating' && (
          <span
            className={`number-microscope-ellipsis min-w-0 text-center text-xl font-black ${
              number.decimalType === 'repeating' ? 'text-violet-200' : 'text-amber-300'
            }`}
          >
            …
          </span>
        )}
      </div>
      <span className="absolute bottom-1 right-2 text-[9px] font-bold uppercase text-slate-400">
        decimal microscope
      </span>
    </div>
  )
}

function RationalNumberLine({ number }) {
  const start = Math.floor(number.value) - 1
  const end = Math.ceil(number.value) + 1
  const span = end - start
  const ticks = Array.from({ length: span * 2 + 1 }, (_, index) => start + index / 2)
  const markerPosition = ((number.value - start) / span) * 100

  return (
    <div className="relative h-[102px] min-w-0 overflow-hidden px-10 pt-5">
      <div className="absolute left-10 right-10 top-0 h-full">
        <div className="absolute left-0 right-0 top-11 h-1 rounded bg-slate-800" />
        {ticks.map((tick) => {
          const position = ((tick - start) / span) * 100
          const showLabel = Number.isInteger(tick)
          return (
            <div
              className="absolute top-[38px] -translate-x-1/2"
              key={tick}
              style={{ left: `${position}%` }}
            >
              <div className="mx-auto h-4 w-0.5 bg-slate-700" />
              {showLabel && (
                <div className="mt-1 text-center text-[11px] font-black tabular-nums text-slate-600">
                  {tick}
                </div>
              )}
            </div>
          )
        })}
        <div
          className="number-microscope-exact-marker absolute top-4 -translate-x-1/2"
          style={{ left: `${markerPosition}%` }}
        >
          <div className="mx-auto flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white bg-sky-500 px-2 text-xs font-black text-white shadow-lg">
            <ExactNumber number={number} />
          </div>
          <div className="mx-auto h-7 w-1 rounded bg-sky-500" />
        </div>
      </div>
    </div>
  )
}

const buildApproximationTicks = (interval) => {
  if (interval.level === 0) {
    return Array.from(
      { length: Math.round(interval.end - interval.start) + 1 },
      (_, index) => interval.start + index
    )
  }

  const step = 10 ** -interval.level
  return Array.from({ length: 11 }, (_, index) =>
    roundTo(interval.start + index * step, interval.level)
  )
}

function ApproximationNumberLine({
  finalBounds,
  interval,
  number,
  onSelect,
  selectedBounds,
  zooming,
}) {
  const ticks = buildApproximationTicks(interval)
  const span = interval.end - interval.start
  const finalMarkerPosition = finalBounds
    ? ((number.value - interval.start) / span) * 100
    : null

  return (
    <div
      className={`relative h-[102px] min-w-0 overflow-hidden px-10 pt-5 ${zooming ? 'number-microscope-line-zoom' : ''}`}
      key={`${interval.start}-${interval.end}-${interval.level}`}
    >
      <div className="absolute left-10 right-10 top-0 h-full">
        <div className="absolute left-0 right-0 top-12 h-1 rounded bg-slate-800" />
        {selectedBounds.length === 2 && (
          <div
            className="absolute top-[45px] h-[10px] rounded bg-amber-300/55"
            style={{
              left: `${((selectedBounds[0] - interval.start) / span) * 100}%`,
              width: `${((selectedBounds[1] - selectedBounds[0]) / span) * 100}%`,
            }}
          />
        )}
        {ticks.map((tick, index) => {
          const position = span === 0 ? 0 : ((tick - interval.start) / span) * 100
          const selected = selectedBounds.some(
            (bound) => Math.abs(bound - tick) < 1e-10
          )
          const endpoint = index === 0 || index === ticks.length - 1

          return (
            <button
              aria-label={`Select ${formatAtPrecision(tick, interval.level)} as a bound`}
              aria-pressed={selected}
              className="group absolute top-[32px] z-10 h-12 w-7 -translate-x-1/2 touch-none focus:outline-none"
              key={`${tick}-${index}`}
              onClick={() => onSelect(tick)}
              style={{ left: `${position}%` }}
              type="button"
            >
              <span
                className={`mx-auto block h-8 w-1 rounded transition ${
                  selected
                    ? 'number-microscope-bound-selected bg-amber-500'
                    : 'bg-slate-500 group-hover:bg-amber-400 group-focus:bg-amber-400'
                }`}
              />
              <span
                className={`absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap text-[11px] font-black tabular-nums ${
                  selected ? 'text-amber-700' : 'text-slate-600'
                } ${!endpoint && ticks.length > 7 ? 'hidden sm:block' : ''}`}
              >
                {formatAtPrecision(tick, interval.level)}
              </span>
            </button>
          )
        })}
        {finalMarkerPosition !== null && (
          <div
            className="number-microscope-final-marker absolute top-[19px] z-20 -translate-x-1/2"
            style={{ left: `${finalMarkerPosition}%` }}
          >
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.16)]" />
            <div className="mx-auto h-7 w-1 rounded bg-sky-500" />
          </div>
        )}
      </div>
    </div>
  )
}

function RootSquareEvidence({ bounds, number }) {
  if (!number.radicand || bounds.length !== 2) return null

  const lowerMagnitude = number.value < 0 ? Math.abs(bounds[1]) : Math.abs(bounds[0])
  const upperMagnitude = number.value < 0 ? Math.abs(bounds[0]) : Math.abs(bounds[1])

  return (
    <div className="text-[11px] font-bold text-amber-800">
      {formatAtPrecision(lowerMagnitude, 3)}² ={' '}
      {formatAtPrecision(lowerMagnitude ** 2, 4)} &lt; {number.radicand} &lt;{' '}
      {formatAtPrecision(upperMagnitude ** 2, 4)} ={' '}
      {formatAtPrecision(upperMagnitude, 3)}²
    </div>
  )
}

function EvidencePanel({ number }) {
  const rational = number.classification === 'rational'
  let message

  if (rational && number.radicand) {
    const exact = number.sign === -1 ? -Math.sqrt(number.radicand) : Math.sqrt(number.radicand)
    message = `${number.radicand} is a perfect square, so the root equals ${exact} = ${exact}/1.`
  } else if (rational && number.decimalType === 'repeating') {
    message = `The repeating decimal has the exact fraction form ${number.exactFraction}.`
  } else if (rational) {
    message = `The decimal terminates and has the exact fraction form ${number.exactFraction}.`
  } else if (number.radicand) {
    message = `${number.radicand} is not a perfect square, so this root cannot be written exactly as a/b.`
  } else {
    message = 'π cannot be written exactly as a/b; its decimal continues without a repeating block.'
  }

  return (
    <div
      className={`number-microscope-evidence flex h-full min-w-0 items-center gap-3 overflow-hidden rounded border px-3 ${
        rational
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-violet-200 bg-violet-50'
      }`}
    >
      <div
        className={`shrink-0 rounded px-3 py-2 text-lg font-black ${
          rational ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'
        }`}
      >
        {rational ? 'Rational' : 'Irrational'}
      </div>
      <div className="min-w-0 break-words text-[12px] font-bold leading-4 text-slate-700">
        {message}
        {!rational && (
          <span className="ml-1 text-amber-700">
            The visible decimal digits are an approximation.
          </span>
        )}
      </div>
    </div>
  )
}

export default function RationalVsIrrationalNumbers() {
  const [selectedId, setSelectedId] = useState('root-two')
  const [customRadicand, setCustomRadicand] = useState(10)
  const [customSign, setCustomSign] = useState(1)
  const [analysisState, setAnalysisState] = useState('idle')
  const [animationKey, setAnimationKey] = useState(0)
  const [interval, setInterval] = useState(null)
  const [selectedBounds, setSelectedBounds] = useState([])
  const [boundHistory, setBoundHistory] = useState([])
  const [boundFeedback, setBoundFeedback] = useState('')
  const [finalBounds, setFinalBounds] = useState(null)
  const [zooming, setZooming] = useState(false)
  const analysisTimerRef = useRef(null)
  const zoomTimerRef = useRef(null)

  const customNumber = useMemo(
    () => makeCustomRoot(customRadicand, customSign),
    [customRadicand, customSign]
  )

  const selectedNumber = useMemo(
    () =>
      selectedId === 'custom-root'
        ? customNumber
        : curatedNumbers.find((number) => number.id === selectedId) ?? curatedNumbers[5],
    [customNumber, selectedId]
  )

  const busy = analysisState === 'analyzing' || zooming

  const clearTimers = () => {
    window.clearTimeout(analysisTimerRef.current)
    window.clearTimeout(zoomTimerRef.current)
  }

  const resetExploration = () => {
    clearTimers()
    setAnalysisState('idle')
    setInterval(null)
    setSelectedBounds([])
    setBoundHistory([])
    setBoundFeedback('')
    setFinalBounds(null)
    setZooming(false)
  }

  useEffect(
    () => () => {
      window.clearTimeout(analysisTimerRef.current)
      window.clearTimeout(zoomTimerRef.current)
    },
    []
  )

  const chooseNumber = (id) => {
    if (busy) return
    setSelectedId(id)
    resetExploration()
  }

  const updateCustomRoot = (nextRadicand, nextSign = customSign) => {
    if (busy) return
    setCustomRadicand(clamp(nextRadicand, 1, 100))
    setCustomSign(nextSign)
    setSelectedId('custom-root')
    resetExploration()
  }

  const startAnalysis = () => {
    clearTimers()
    setAnimationKey((key) => key + 1)
    setAnalysisState('analyzing')
    setSelectedBounds([])
    setBoundHistory([])
    setBoundFeedback('')
    setFinalBounds(null)
    setZooming(false)

    if (selectedNumber.classification === 'irrational') {
      setInterval({
        start: Math.floor(selectedNumber.value) - 1,
        end: Math.ceil(selectedNumber.value) + 1,
        level: 0,
      })
    } else {
      setInterval(null)
    }

    analysisTimerRef.current = window.setTimeout(() => {
      setAnalysisState('revealed')
    }, ANALYSIS_DURATION)
  }

  const selectBound = (tick) => {
    if (busy || finalBounds) return
    setBoundFeedback('')
    setSelectedBounds((current) => {
      if (current.some((bound) => Math.abs(bound - tick) < 1e-10)) {
        return current.filter((bound) => Math.abs(bound - tick) >= 1e-10)
      }
      return [...current.slice(-1), tick].sort((a, b) => a - b)
    })
  }

  const evaluateBounds = () => {
    if (!interval || busy || finalBounds) return
    if (selectedBounds.length !== 2) {
      setBoundFeedback('Choose one lower tick and one upper tick.')
      return
    }

    const [lower, upper] = selectedBounds
    const ticks = buildApproximationTicks(interval)
    const lowerIndex = ticks.findIndex((tick) => Math.abs(tick - lower) < 1e-10)
    const upperIndex = ticks.findIndex((tick) => Math.abs(tick - upper) < 1e-10)
    const adjacent = upperIndex - lowerIndex === 1
    const surrounds = lower < selectedNumber.value && selectedNumber.value < upper

    if (!surrounds) {
      setBoundFeedback(
        selectedNumber.value <= lower
          ? 'The number is farther left. Move the lower bound left.'
          : 'The number is farther right. Move the upper bound right.'
      )
      return
    }

    if (!adjacent) {
      setBoundFeedback('These bounds surround the number. Make them adjacent for a tighter interval.')
      return
    }

    const nextHistory = [...boundHistory, { lower, upper, level: interval.level }]
    setBoundHistory(nextHistory)
    setBoundFeedback(
      interval.level === 3
        ? 'The thousandth bounds locate the number very closely.'
        : 'These bounds work. Zooming into that interval…'
    )

    if (interval.level === 3) {
      setFinalBounds({ lower, upper })
      return
    }

    setZooming(true)
    zoomTimerRef.current = window.setTimeout(() => {
      setInterval({ start: lower, end: upper, level: interval.level + 1 })
      setSelectedBounds([])
      setZooming(false)
      setBoundFeedback('Choose the next pair of adjacent bounds.')
    }, ZOOM_DURATION)
  }

  const resetAll = () => {
    if (busy) return
    clearTimers()
    setSelectedId('root-two')
    setCustomRadicand(10)
    setCustomSign(1)
    setAnimationKey(0)
    resetExploration()
  }

  const selectedBoundsBracketNumber =
    selectedBounds.length === 2 &&
    selectedBounds[0] < selectedNumber.value &&
    selectedNumber.value < selectedBounds[1]
  const latestBounds = selectedBoundsBracketNumber
    ? { lower: selectedBounds[0], upper: selectedBounds[1] }
    : boundHistory.at(-1)

  return (
    <div className="h-[498px] bg-slate-50 p-3 text-slate-900">
      <section className="grid h-[60px] min-w-0 grid-cols-[148px_178px_145px_minmax(0,1fr)_64px] gap-1.5 rounded border border-slate-200 bg-white p-1 shadow-sm">
        <label className="min-w-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-1">
          <span className="block text-[9px] font-black uppercase leading-3 text-slate-500">
            Try a number
          </span>
          <select
            aria-label="Try a number"
            className="mt-1 h-6 w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 text-[12px] font-black text-slate-800 outline-none focus:border-sky-500 disabled:opacity-45"
            disabled={busy}
            onChange={(event) => {
              if (event.target.value === 'custom-root') {
                updateCustomRoot(customRadicand, customSign)
              } else {
                chooseNumber(event.target.value)
              }
            }}
            value={selectedId}
          >
            {curatedNumbers.map((number) => (
              <option key={number.id} value={number.id}>
                {presetOptionLabels[number.id]}
              </option>
            ))}
            <option value="custom-root">Custom root</option>
          </select>
        </label>

        <section
          className={`min-w-0 rounded border px-1.5 py-0.5 ${
            selectedId === 'custom-root'
              ? 'border-sky-300 bg-sky-50'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex h-[14px] items-center justify-between text-[9px] font-black uppercase leading-[14px] text-slate-500">
            <span>Custom root</span>
            <ExactNumber className="text-[12px] leading-[14px] text-sky-700" number={customNumber} />
          </div>
          <div className="mt-1 grid h-[26px] grid-cols-[28px_26px_minmax(0,1fr)_26px]">
            <button
              aria-label="Change the sign of the custom root"
              className="rounded-l border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-40"
              disabled={busy}
              onClick={() => updateCustomRoot(customRadicand, customSign * -1)}
              type="button"
            >
              {customSign === 1 ? '+' : '−'}
            </button>
            <button
              aria-label="Decrease the custom radicand"
              className="border-y border-r border-slate-300 bg-white font-black disabled:opacity-35"
              disabled={busy || customRadicand <= 1}
              onClick={() => updateCustomRoot(customRadicand - 1)}
              type="button"
            >
              −
            </button>
            <input
              aria-label="Custom root radicand"
              className="min-w-0 border-y border-slate-300 bg-white text-center text-sm font-black tabular-nums outline-none focus:bg-sky-50"
              disabled={busy}
              max="100"
              min="1"
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value) && value >= 1) {
                  updateCustomRoot(Math.round(value))
                }
              }}
              type="number"
              value={customRadicand}
            />
            <button
              aria-label="Increase the custom radicand"
              className="rounded-r border border-slate-300 bg-white font-black disabled:opacity-35"
              disabled={busy || customRadicand >= 100}
              onClick={() => updateCustomRoot(customRadicand + 1)}
              type="button"
            >
              +
            </button>
          </div>
        </section>

        <button
          className={`rounded border border-sky-500 bg-sky-500 px-2 text-[12px] font-black leading-4 text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
            analysisState !== 'analyzing' ? 'number-microscope-ready' : ''
          }`}
          disabled={busy}
          onClick={startAnalysis}
          type="button"
        >
          {analysisState === 'revealed' ? 'Animate analysis again' : 'Analyze number'}
        </button>

        <section className="min-w-0 overflow-hidden rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold leading-[13px] text-amber-900">
          <span className="mr-1 font-black uppercase text-amber-700">Explore:</span>
          {analysisState === 'idle' &&
            'Choose a number, animate its decimal, then locate it exactly or with rational bounds.'}
          {analysisState === 'analyzing' && 'Watch how the decimal digits behave.'}
          {analysisState === 'revealed' && selectedNumber.classification === 'rational' &&
            'A rational number has an exact fraction form a/b.'}
          {analysisState === 'revealed' && selectedNumber.classification === 'irrational' &&
            'Choose neighboring rational bounds, then zoom in for a closer approximation.'}
        </section>

        <button
          className="rounded border border-slate-300 bg-white px-2 text-[11px] font-black text-slate-800 shadow-sm disabled:opacity-40"
          disabled={busy}
          onClick={resetAll}
          type="button"
        >
          Reset
        </button>
      </section>

      <main className="mt-2 grid h-[406px] min-h-0 min-w-0 grid-rows-[116px_214px_60px] gap-2">
          <section className="grid min-w-0 grid-cols-[116px_minmax(0,1fr)] gap-2 overflow-hidden rounded border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex flex-col items-center justify-center rounded border border-sky-200 bg-sky-50">
              <span className="text-[9px] font-black uppercase text-sky-700">Selected number</span>
              <ExactNumber className="mt-1 text-[34px] font-black leading-[42px] text-slate-900" number={selectedNumber} />
              <span className="mt-1 text-[10px] font-bold text-slate-500">exact form</span>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-700">Decimal expansion</span>
                <span className="min-w-0 truncate text-[10px] font-bold text-slate-400">digits appear from left to right</span>
              </div>
              <DecimalMicroscope
                animationKey={animationKey}
                number={selectedNumber}
                state={analysisState}
              />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex h-9 items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-black">Number line microscope</h3>
                <p className="text-[10px] font-bold text-slate-500">
                  {analysisState !== 'revealed'
                    ? 'Analyze the number to reveal its location model.'
                    : selectedNumber.classification === 'rational'
                      ? 'The blue marker shows the exact location.'
                      : `Precision: ${['whole numbers', 'tenths', 'hundredths', 'thousandths'][interval?.level ?? 0]}`}
                </p>
              </div>
              {latestBounds && (
                <div className="rounded bg-amber-100 px-2 py-1 text-xs font-black tabular-nums text-amber-800">
                  {formatAtPrecision(latestBounds.lower, Math.max(interval?.level ?? 0, 0))}{' '}
                  &lt;{' '}
                  <ExactNumber number={selectedNumber} />
                  {' '}&lt;{' '}
                  {formatAtPrecision(latestBounds.upper, Math.max(interval?.level ?? 0, 0))}
                </div>
              )}
            </div>

            <div className="mt-1 h-[104px] rounded border border-slate-200 bg-slate-50">
              {analysisState !== 'revealed' && (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                  The number line is ready for your analysis.
                </div>
              )}
              {analysisState === 'revealed' && selectedNumber.classification === 'rational' && (
                <RationalNumberLine number={selectedNumber} />
              )}
              {analysisState === 'revealed' && selectedNumber.classification === 'irrational' && interval && (
                <ApproximationNumberLine
                  finalBounds={finalBounds}
                  interval={interval}
                  number={selectedNumber}
                  onSelect={selectBound}
                  selectedBounds={selectedBounds}
                  zooming={zooming}
                />
              )}
            </div>

            <div className="mt-1 grid h-[48px] min-w-0 grid-cols-[minmax(0,1fr)_190px] items-center gap-2">
              <div className="min-w-0 rounded border border-amber-100 bg-amber-50 px-2 py-1">
                <div className="truncate text-[11px] font-bold text-amber-900">
                  {analysisState !== 'revealed'
                    ? 'Decimal evidence and bounds will appear here.'
                    : selectedNumber.classification === 'rational'
                      ? `Exact value: ${selectedNumber.exactFraction}`
                      : boundFeedback || 'Select two neighboring ticks that surround the number.'}
                </div>
                {selectedNumber.classification === 'irrational' && (
                  <RootSquareEvidence
                    bounds={latestBounds ? [latestBounds.lower, latestBounds.upper] : []}
                    number={selectedNumber}
                  />
                )}
              </div>
              {analysisState === 'revealed' && selectedNumber.classification === 'irrational' ? (
                <button
                  className={`h-10 rounded border px-2 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedBounds.length === 2
                      ? 'number-microscope-ready border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}
                  disabled={busy || Boolean(finalBounds)}
                  onClick={evaluateBounds}
                  type="button"
                >
                  {finalBounds
                    ? 'Approximation located'
                    : interval?.level === 3
                      ? 'Confirm thousandths'
                      : 'Zoom between bounds'}
                </button>
              ) : (
                <div />
              )}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden">
            {analysisState === 'revealed' ? (
              <EvidencePanel number={selectedNumber} />
            ) : (
              <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white text-sm font-bold text-slate-400">
                Classification evidence appears after the decimal animation.
              </div>
            )}
          </section>
      </main>
    </div>
  )
}
