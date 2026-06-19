import { useEffect, useMemo, useState } from 'react'

const defaultProblem = {
  totalAmount: 20,
  numberOfGroups: 10,
}

const fractionStarterProblem = {
  whole: '2',
  numerator: '0',
  denominator: '1',
  numberOfGroups: '6',
}

const fractionChoices = [
  { key: '1/5', label: '1/5', fraction: { numerator: 1, denominator: 5 } },
  { key: '1/4', label: '1/4', fraction: { numerator: 1, denominator: 4 } },
  { key: '1/3', label: '1/3', fraction: { numerator: 1, denominator: 3 } },
  { key: '1/2', label: '1/2', fraction: { numerator: 1, denominator: 2 } },
  { key: '1', label: '1', fraction: { numerator: 1, denominator: 1 } },
]

function gcd(a, b) {
  let first = Math.abs(a)
  let second = Math.abs(b)

  while (second !== 0) {
    const remainder = first % second
    first = second
    second = remainder
  }

  return first || 1
}

function simplifyFraction(numerator, denominator) {
  if (denominator === 0) {
    return { numerator, denominator }
  }

  const sign = denominator < 0 ? -1 : 1
  const divisor = gcd(numerator, denominator)

  return {
    numerator: (numerator / divisor) * sign,
    denominator: Math.abs(denominator / divisor),
  }
}

function mixedToImproper(whole, numerator, denominator) {
  const sign = whole < 0 ? -1 : 1
  return simplifyFraction(whole * denominator + sign * numerator, denominator)
}

function multiplyFractionByInteger(fraction, integer) {
  return simplifyFraction(fraction.numerator * integer, fraction.denominator)
}

function compareFractions(fractionA, fractionB) {
  const left = fractionA.numerator * fractionB.denominator
  const right = fractionB.numerator * fractionA.denominator

  if (left === right) return 0
  return left > right ? 1 : -1
}

function fractionToNumber(fraction) {
  if (fraction.denominator === 0) return Number.NaN
  return fraction.numerator / fraction.denominator
}

function formatFraction(fraction) {
  const simplified = simplifyFraction(fraction.numerator, fraction.denominator)
  const { numerator, denominator } = simplified

  if (denominator === 0) return `${numerator}/0`
  if (numerator === 0) return '0'
  if (denominator === 1) return `${numerator}`

  const sign = numerator < 0 ? '-' : ''
  const absoluteNumerator = Math.abs(numerator)

  if (absoluteNumerator < denominator) {
    return `${sign}${absoluteNumerator}/${denominator}`
  }

  const whole = Math.floor(absoluteNumerator / denominator)
  const remainder = absoluteNumerator % denominator

  if (remainder === 0) return `${sign}${whole}`
  return `${sign}${whole} ${remainder}/${denominator}`
}

const fractionHelpers = {
  gcd,
  simplifyFraction,
  mixedToImproper,
  multiplyFractionByInteger,
  compareFractions,
  fractionToNumber,
  formatFraction,
}

function getFeedbackType(tileValue, attemptedTotal, totalAmount) {
  if (attemptedTotal === null) return 'placeholder'
  if (attemptedTotal === totalAmount) return 'success'
  return 'warning'
}

function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  min,
  className = 'w-full',
  labelClassName = 'text-[10px]',
  inputClassName = 'h-5 text-xs',
}) {
  return (
    <label className={`block ${className}`}>
      <span className={`${labelClassName} font-black uppercase tracking-wide text-slate-600`}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-0.5 w-full rounded-md border border-slate-200 bg-white px-1.5 font-bold text-slate-800 shadow-sm outline-none focus:border-sky-400 ${inputClassName}`}
      />
    </label>
  )
}

function CompactInputField({ id, label, type = 'text', value, onChange, min, className = 'w-20' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 h-5 w-full rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-800 shadow-sm outline-none focus:border-sky-400"
      />
    </label>
  )
}

function FractionProblemFields({ value, denominatorIsValid, onChange }) {
  const updatePart = (part, nextValue) => {
    onChange({
      ...value,
      [part]: nextValue,
    })
  }

  return (
    <>
      <div>
        <div className="flex items-end gap-1">
          <span className="mb-1 whitespace-nowrap text-[10px] font-black uppercase tracking-wide text-slate-600">
            Total amount:
          </span>
          <CompactInputField
            id="fraction-total-whole"
            label="Whole"
            type="number"
            min="0"
            value={value.whole}
            onChange={(nextValue) => updatePart('whole', nextValue)}
            className="w-[70px]"
          />
          <CompactInputField
            id="fraction-total-numerator"
            label="Numerator"
            type="number"
            min="0"
            value={value.numerator}
            onChange={(nextValue) => updatePart('numerator', nextValue)}
            className="w-20"
          />
          <span className="pb-1 text-sm font-black text-slate-500">/</span>
          <CompactInputField
            id="fraction-total-denominator"
            label="Denominator"
            type="number"
            min="1"
            value={value.denominator}
            onChange={(nextValue) => updatePart('denominator', nextValue)}
            className="w-20"
          />
        </div>
        {!denominatorIsValid && (
          <p className="text-[10px] font-black text-rose-700">
            Use a denominator greater than 0.
          </p>
        )}
      </div>
      <InputField
        id="fraction-number-of-groups"
        label="Number of groups"
        type="number"
        min="1"
        value={value.numberOfGroups}
        onChange={(nextValue) => updatePart('numberOfGroups', nextValue)}
      />
    </>
  )
}

function CompactMixedFractionInputs({ value, onChange }) {
  const updatePart = (part, nextValue) => {
    onChange({
      ...value,
      [part]: nextValue,
    })
  }

  return (
    <div className="flex items-end gap-1">
      <CompactInputField
        id="custom-try-whole"
        label="Whole"
        type="number"
        min="0"
        value={value.whole}
        onChange={(nextValue) => updatePart('whole', nextValue)}
        className="w-[70px]"
      />
      <CompactInputField
        id="custom-try-numerator"
        label="Numerator"
        type="number"
        min="0"
        value={value.numerator}
        onChange={(nextValue) => updatePart('numerator', nextValue)}
        className="w-20"
      />
      <span className="pb-1 text-sm font-black text-slate-500">/</span>
      <CompactInputField
        id="custom-try-denominator"
        label="Denominator"
        type="number"
        min="1"
        value={value.denominator}
        onChange={(nextValue) => updatePart('denominator', nextValue)}
        className="w-20"
      />
    </div>
  )
}

function BuildUnitRateForm({
  totalAmount,
  numberOfGroups,
  fractionProblem,
  fractionDenominatorIsValid,
  onTotalAmountChange,
  onNumberOfGroupsChange,
  onFractionProblemChange,
  mode,
  onModeChange,
}) {
  return (
    <div className="rounded-lg bg-amber-50 px-2 py-0.5">
      <div className="flex items-center justify-between gap-2">
        <span aria-hidden="true" />
        <div className="flex items-center gap-1">
          {mode === 'Fractions' && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-800">
              Fraction Mode
            </span>
          )}
          <div className="flex rounded-md bg-white p-0.5 text-[10px] font-black shadow-sm">
            {['Whole Numbers', 'Fractions'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onModeChange(option)}
                className={`rounded px-1.5 py-0.5 ${
                  mode === option
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:bg-sky-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={`mt-0.5 gap-2 ${mode === 'Fractions' ? 'grid grid-cols-[1fr_150px]' : 'flex items-end'}`}>
        {mode === 'Whole Numbers' ? (
          <>
            <InputField
              id="total-amount"
              label="Total amount"
              type="number"
              min="1"
              value={totalAmount}
              onChange={onTotalAmountChange}
              className="w-[180px]"
              labelClassName="text-xs"
              inputClassName="h-7 text-base"
            />
            <InputField
              id="number-of-groups"
              label="Number of groups"
              type="number"
              min="1"
              value={numberOfGroups}
              onChange={onNumberOfGroupsChange}
              className="w-[180px]"
              labelClassName="text-xs"
              inputClassName="h-7 text-base"
            />
          </>
        ) : (
          <FractionProblemFields
            value={fractionProblem}
            denominatorIsValid={fractionDenominatorIsValid}
            onChange={onFractionProblemChange}
          />
        )}
      </div>
    </div>
  )
}

function BarModel({
  totalAmount,
  totalAmountLabel,
  numberOfGroups,
  tileValue,
  tileValueLabel,
  onTileValueChange,
  fractionChoices,
  selectedFractionKey,
  onFractionChoice,
  customFractionTry,
  customFractionDenominatorIsValid,
  onCustomFractionTryChange,
  attemptedTotal,
  attemptedTotalLabel,
  hasTested,
  visibleTileCount,
  animationComplete,
  mode,
}) {
  const unitTilePercent = totalAmount > 0 ? (tileValue / totalAmount) * 100 : 0
  const tileWidthPercent = Math.min(unitTilePercent, 100)
  const attemptedPercent =
    totalAmount > 0 && attemptedTotal !== null ? (attemptedTotal / totalAmount) * 100 : 0
  const repeatedWidthPercent = Math.min(attemptedPercent, 124)
  const showTileLabels = numberOfGroups <= 8 && tileValue > 0
  const tileWidth = tileValue === 0 ? '4px' : `${tileWidthPercent}%`
  const unitTileLabel = tileValue > 0 ? tileValueLabel : '?'
  const showTileLabelInside = tileValue > 0 && tileWidthPercent >= 14
  const testedTotalMatches = animationComplete && attemptedTotal === totalAmount
  const resultLabel = animationComplete
    ? attemptedTotalLabel
    : `Target: ${totalAmountLabel}`
  const resultLabelClass = animationComplete
    ? testedTotalMatches
      ? 'text-emerald-700'
      : 'text-rose-700'
    : 'text-sky-900'
  const repeatedTileTextSize =
    tileWidthPercent >= 10 ? 'text-[10px]' : tileWidthPercent >= 5 ? 'text-[9px]' : 'text-[8px]'
  const isWholeNumbersMode = mode === 'Whole Numbers'
  const totalLabelSize = isWholeNumbersMode ? 'text-sm' : 'text-xs'
  const totalBarHeight = isWholeNumbersMode ? 'h-10' : 'h-8'
  const repeatedTileHeight = isWholeNumbersMode ? 'h-6' : 'h-5'
  const unitLabelSize = isWholeNumbersMode ? 'text-xs' : 'text-[10px]'
  const unitLaneHeight = isWholeNumbersMode ? 'h-8' : 'h-6'
  const unitTileHeight = isWholeNumbersMode ? 'h-8' : 'h-6'
  const unitTextSize = isWholeNumbersMode ? 'text-sm' : 'text-[10px]'
  const controlLabelSize = isWholeNumbersMode ? 'text-sm' : 'text-[11px]'
  const currentTrySize = isWholeNumbersMode ? 'text-xs' : 'text-[10px]'

  return (
    <div className="rounded-lg bg-sky-50 px-1 py-0.5">
      <style>
        {`
          @keyframes unitTileRise {
            from { opacity: 0; transform: translateY(18px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <div className="barScale box-border w-full">
        <div className={`totalLabel mb-0.5 text-center font-black ${totalLabelSize} ${resultLabelClass}`}>
          {resultLabel}
        </div>
        <div className={`totalBar relative box-border w-full overflow-visible rounded-lg bg-white shadow-[inset_0_0_0_2px_rgb(125_211_252)] ${totalBarHeight}`}>
          <div className="absolute inset-0 flex overflow-hidden rounded-lg">
            {Array.from({ length: numberOfGroups }, (_, index) => (
              <div
                key={index}
                className="h-full border-r border-sky-200 bg-sky-100/70 last:border-r-0"
                style={{ width: `${100 / numberOfGroups}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          {hasTested && visibleTileCount > 0 && (
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-visible ${repeatedTileHeight}`}>
              <div
                className="flex h-full overflow-visible"
                style={{
                  width: `${repeatedWidthPercent}%`,
                  animation: 'unitTileRise 280ms ease-out',
                }}
              >
                <div className="flex h-full w-full">
                  {Array.from({ length: visibleTileCount }, (_, index) => (
                    <div
                      key={index}
                      className={`flex h-full min-w-[3px] items-center justify-center border-r border-white text-[10px] font-black ${
                        animationComplete && attemptedTotal === totalAmount
                          ? 'bg-emerald-400 text-emerald-950'
                          : 'bg-amber-300 text-amber-950'
                      }`}
                      style={{ width: `${100 / numberOfGroups}%` }}
                      title={`${tileValueLabel}`}
                    >
                      <span className={`${repeatedTileTextSize} leading-none`}>
                        {showTileLabels || tileWidthPercent >= 4 ? tileValueLabel : ''}
                      </span>
                    </div>
                  ))}
                </div>
                {animationComplete && attemptedPercent > 100 && (
                  <span className="ml-1 self-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                    past
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`unitLabel font-black text-slate-600 ${unitLabelSize}`}>
          One unit tile
        </div>
        <div className={`unitLane relative block box-border w-full overflow-visible bg-transparent p-0 ${unitLaneHeight}`}>
          <div
            className={`unitTile absolute left-0 top-0 box-border flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-amber-400 bg-amber-100 text-center text-xs font-black text-amber-950 ${unitTileHeight}`}
            style={{ width: tileWidth, marginLeft: 0 }}
            title={`1 group = ${unitTileLabel}`}
          >
            <span className={showTileLabelInside ? 'm-auto truncate px-2' : 'sr-only'}>
              {unitTileLabel}
            </span>
          </div>
        </div>
        <div className={`unitText font-black text-slate-700 ${unitTextSize}`}>
          1 group = {unitTileLabel}
        </div>
      </div>

      <div className="mt-0.5 rounded-lg bg-white px-2 py-0.5">
        <div className="flex items-center justify-between gap-3">
          <label className={`font-black text-slate-800 ${controlLabelSize}`} htmlFor="tile-value-slider">
            {mode === 'Fractions'
              ? 'Choose the value of 1 group'
              : 'Change the value of 1 group'}
          </label>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-900">
            {tileValueLabel}
          </span>
        </div>
        {mode === 'Fractions' ? (
          <div className="mt-1">
            <div className="flex gap-1">
              {fractionChoices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => onFractionChoice(choice)}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-black ${
                    selectedFractionKey === choice.key
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="mt-0.5 rounded-md bg-slate-50 px-2 py-0.5">
              <p className="text-[10px] font-black text-slate-600">
                Custom try for 1 group - Current try: {tileValueLabel}
              </p>
              <CompactMixedFractionInputs
                value={customFractionTry}
                onChange={onCustomFractionTryChange}
              />
              {!customFractionDenominatorIsValid && (
                <p className="text-[10px] font-black text-rose-700">
                  Use a denominator greater than 0.
                </p>
              )}
            </div>
          </div>
        ) : (
          <input
            id="tile-value-slider"
            type="range"
            min="0"
            max={totalAmount}
            step="1"
            value={tileValue}
            onChange={(event) => onTileValueChange(event.target.value)}
            className="mt-0.5 w-full accent-sky-600"
          />
        )}
        {mode === 'Whole Numbers' && (
          <p className={`${currentTrySize} font-black text-slate-700`}>
            Current try: {tileValueLabel}
          </p>
        )}
      </div>
    </div>
  )
}

function FeedbackBox({ feedbackType, message, mode }) {
  const classes = {
    placeholder: 'border-slate-200 bg-slate-50 text-slate-500',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }

  return (
    <div className={`min-h-[32px] rounded-lg border px-3 py-1 font-bold ${mode === 'Whole Numbers' ? 'text-base' : 'text-sm'} ${classes[feedbackType]}`}>
      {message}
    </div>
  )
}

export default function UnitRateSplitterLab() {
  const [mode, setMode] = useState('Whole Numbers')
  const [totalAmount, setTotalAmount] = useState(defaultProblem.totalAmount)
  const [fractionProblem, setFractionProblem] = useState(fractionStarterProblem)
  const [numberOfGroups, setNumberOfGroups] = useState(defaultProblem.numberOfGroups)
  const [tileValue, setTileValue] = useState(0)
  const [selectedFraction, setSelectedFraction] = useState({ numerator: 0, denominator: 1 })
  const [selectedFractionKey, setSelectedFractionKey] = useState(null)
  const [customFractionTry, setCustomFractionTry] = useState({
    whole: '0',
    numerator: '0',
    denominator: '1',
  })
  const [hasTested, setHasTested] = useState(false)
  const [testRun, setTestRun] = useState(0)
  const [visibleTileCount, setVisibleTileCount] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [feedback, setFeedback] = useState('Feedback will appear here.')

  const fractionDenominatorNumber = Number(fractionProblem.denominator)
  const fractionDenominatorIsValid =
    fractionProblem.denominator !== '' &&
    Number.isFinite(fractionDenominatorNumber) &&
    fractionDenominatorNumber > 0
  const fractionTotal = useMemo(
    () =>
      fractionDenominatorIsValid
        ? mixedToImproper(
            Number(fractionProblem.whole) || 0,
            Number(fractionProblem.numerator) || 0,
            fractionDenominatorNumber,
          )
        : { numerator: 0, denominator: 1 },
    [
      fractionDenominatorIsValid,
      fractionDenominatorNumber,
      fractionProblem.numerator,
      fractionProblem.whole,
    ],
  )
  const customFractionDenominatorNumber = Number(customFractionTry.denominator)
  const customFractionDenominatorIsValid =
    customFractionTry.denominator !== '' &&
    Number.isFinite(customFractionDenominatorNumber) &&
    customFractionDenominatorNumber > 0
  const customSelectedFraction = useMemo(
    () =>
      customFractionDenominatorIsValid
        ? mixedToImproper(
            Number(customFractionTry.whole) || 0,
            Number(customFractionTry.numerator) || 0,
            customFractionDenominatorNumber,
          )
        : { numerator: 0, denominator: 1 },
    [
      customFractionDenominatorIsValid,
      customFractionDenominatorNumber,
      customFractionTry.numerator,
      customFractionTry.whole,
    ],
  )
  const safeTotalAmount = Math.max(1, Number(totalAmount) || 1)
  const safeNumberOfGroups =
    mode === 'Fractions'
      ? Math.max(1, Number(fractionProblem.numberOfGroups) || 1)
      : Math.max(1, Number(numberOfGroups) || 1)
  const activeSelectedFraction = mode === 'Fractions' ? customSelectedFraction : selectedFraction
  const attemptedFractionTotal = useMemo(
    () => multiplyFractionByInteger(activeSelectedFraction, safeNumberOfGroups),
    [activeSelectedFraction, safeNumberOfGroups],
  )
  const activeTotalAmount =
    mode === 'Fractions' ? Math.max(fractionToNumber(fractionTotal), 0.01) : safeTotalAmount
  const totalAmountLabel =
    mode === 'Fractions' ? formatFraction(fractionTotal) : `${safeTotalAmount}`
  const activeTileValue =
    mode === 'Fractions' ? fractionToNumber(activeSelectedFraction) : tileValue
  const tileValueLabel =
    mode === 'Fractions' ? formatFraction(activeSelectedFraction) : `${tileValue}`
  const attemptedTotal =
    hasTested && mode === 'Fractions'
      ? fractionToNumber(attemptedFractionTotal)
      : hasTested
        ? tileValue * safeNumberOfGroups
        : null
  const attemptedTotalLabel =
    mode === 'Fractions' ? formatFraction(attemptedFractionTotal) : `${attemptedTotal}`
  const feedbackType = animationComplete
    ? getFeedbackType(activeTileValue, attemptedTotal, activeTotalAmount)
    : 'placeholder'
  const availableFractionHelpers = fractionHelpers

  const updateMode = (nextMode) => {
    setMode(nextMode)

    if (nextMode === 'Fractions') {
      setFractionProblem(fractionStarterProblem)
      setTileValue(0)
      setSelectedFraction({ numerator: 0, denominator: 1 })
      setSelectedFractionKey(null)
      setCustomFractionTry({ whole: '0', numerator: '0', denominator: '1' })
      resetAttempt()
      return
    }

    if (nextMode === 'Whole Numbers') {
      setTotalAmount(defaultProblem.totalAmount)
      setNumberOfGroups(defaultProblem.numberOfGroups)
      setTileValue(0)
      setSelectedFraction({ numerator: 0, denominator: 1 })
      setSelectedFractionKey(null)
      setCustomFractionTry({ whole: '0', numerator: '0', denominator: '1' })
      resetAttempt()
    }
  }

  useEffect(() => {
    if (!hasTested) return undefined

    let nextCount = 0
    const intervalId = window.setInterval(() => {
      nextCount += 1
      setVisibleTileCount(nextCount)

      if (nextCount >= safeNumberOfGroups) {
        window.clearInterval(intervalId)
        setAnimationComplete(true)

        if (mode === 'Fractions') {
          const comparison = compareFractions(attemptedFractionTotal, fractionTotal)
          const attemptedLabel = formatFraction(attemptedFractionTotal)
          const tryLabel = formatFraction(activeSelectedFraction)
          if (comparison < 0) {
            setFeedback(`Too small: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
          } else if (comparison > 0) {
            setFeedback(`Too big: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
          } else {
            setFeedback(`Perfect fit: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
          }
          return
        }

        const nextAttemptedTotal = tileValue * safeNumberOfGroups
        if (nextAttemptedTotal < activeTotalAmount) {
          setFeedback(`Too small: ${nextAttemptedTotal} ÷ ${safeNumberOfGroups} = ${tileValue}`)
        } else if (nextAttemptedTotal > activeTotalAmount) {
          setFeedback(`Too big: ${nextAttemptedTotal} ÷ ${safeNumberOfGroups} = ${tileValue}`)
        } else {
          setFeedback(`Perfect fit: ${nextAttemptedTotal} ÷ ${safeNumberOfGroups} = ${tileValue}`)
        }
      }
    }, 150)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSelectedFraction, activeTotalAmount, attemptedFractionTotal, fractionTotal, hasTested, mode, safeNumberOfGroups, testRun, tileValue])

  const resetAttempt = () => {
    setTileValue(0)
    setHasTested(false)
    setTestRun(0)
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
  }

  const updateTotalAmount = (value) => {
    setTotalAmount(Math.max(1, Number(value) || 1))
    resetAttempt()
  }

  const updateNumberOfGroups = (value) => {
    setNumberOfGroups(Math.max(1, Number(value) || 1))
    resetAttempt()
  }

  const updateFractionProblem = (value) => {
    setFractionProblem(value)
    setSelectedFraction({ numerator: 0, denominator: 1 })
    setSelectedFractionKey(null)
    setCustomFractionTry({ whole: '0', numerator: '0', denominator: '1' })
    resetAttempt()
  }

  const updateCustomFractionTry = (value) => {
    setCustomFractionTry(value)
    setSelectedFractionKey(null)
    setHasTested(false)
    setTestRun(0)
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
  }

  const updateTileValue = (value) => {
    setTileValue(Number(value))
    setHasTested(false)
    setTestRun(0)
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
  }

  const updateFractionChoice = (choice) => {
    const simplifiedChoice = simplifyFraction(
      choice.fraction.numerator,
      choice.fraction.denominator,
    )
    setSelectedFraction(simplifiedChoice)
    setSelectedFractionKey(choice.key)
    setCustomFractionTry({
      whole: '0',
      numerator: `${simplifiedChoice.numerator}`,
      denominator: `${simplifiedChoice.denominator}`,
    })
    setTileValue(fractionToNumber(simplifiedChoice))
    setHasTested(false)
    setTestRun(0)
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
  }

  const testForAllGroups = () => {
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
    setHasTested(true)
    setTestRun((currentRun) => currentRun + 1)
  }

  return (
    <div className="box-border flex h-[500px] flex-col overflow-hidden bg-amber-50 p-1.5 text-slate-800">
      <div className="mx-auto flex h-full w-full max-w-[760px] flex-col">
        <header className="text-center">
          <h2 className="text-lg font-black leading-tight text-slate-900">
            Ratios - Unit rates
          </h2>
          <p className="text-xs font-medium text-slate-700">
            Adjust 1 unit. Test if it fills the total.
          </p>
        </header>

        <section className="mt-1 flex flex-col gap-0.5 rounded-lg border-2 border-amber-200 bg-white p-1 shadow-sm">
          <BuildUnitRateForm
            totalAmount={totalAmount}
            numberOfGroups={numberOfGroups}
            fractionProblem={fractionProblem}
            fractionDenominatorIsValid={fractionDenominatorIsValid}
            onTotalAmountChange={updateTotalAmount}
            onNumberOfGroupsChange={updateNumberOfGroups}
            onFractionProblemChange={updateFractionProblem}
            mode={mode}
            onModeChange={updateMode}
          />

          {mode === 'Fractions' && (
            <span
              className="sr-only"
              data-helper-count={Object.keys(availableFractionHelpers).length}
            >
              Fraction Mode
            </span>
          )}

          <div>
            <div className="text-center">
              <p className={`${mode === 'Whole Numbers' ? 'text-sm' : 'text-xs'} font-black text-sky-900`}>
                Find the value of 1 group.
              </p>
            </div>

            <BarModel
              totalAmount={activeTotalAmount}
              totalAmountLabel={totalAmountLabel}
              numberOfGroups={safeNumberOfGroups}
              tileValue={activeTileValue}
              tileValueLabel={tileValueLabel}
              onTileValueChange={updateTileValue}
              fractionChoices={fractionChoices}
              selectedFractionKey={selectedFractionKey}
              onFractionChoice={updateFractionChoice}
              customFractionTry={customFractionTry}
              customFractionDenominatorIsValid={customFractionDenominatorIsValid}
              onCustomFractionTryChange={updateCustomFractionTry}
              attemptedTotal={attemptedTotal}
              attemptedTotalLabel={attemptedTotalLabel}
              hasTested={hasTested}
              visibleTileCount={visibleTileCount}
              animationComplete={animationComplete}
              mode={mode}
            />

            <div className="mt-0.5 grid grid-cols-[1fr_150px] gap-2">
              <FeedbackBox feedbackType={feedbackType} message={feedback} mode={mode} />
              <button
                type="button"
                onClick={testForAllGroups}
                className="rounded-lg bg-sky-600 px-3 py-0.5 text-sm font-black text-white shadow-sm hover:bg-sky-700"
              >
                Test for all groups
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
