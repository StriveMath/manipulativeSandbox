import { useEffect, useMemo, useState } from 'react'

const defaultProblem = {
  totalAmount: '20',
  numberOfGroups: '10',
}

const defaultCustomTry = {
  whole: '0',
  numerator: '0',
  denominator: '1',
}

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

function parsePositiveWholeNumber(value) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : null
}

function getFeedbackType(attemptedTotal, totalAmount) {
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
  onTotalAmountChange,
  onNumberOfGroupsChange,
}) {
  return (
    <div className="rounded-lg bg-amber-50 px-2 py-0.5">
      <div className="flex items-end gap-2">
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
  customFractionTry,
  customFractionDenominatorIsValid,
  onCustomFractionTryChange,
  attemptedTotal,
  attemptedTotalLabel,
  hasTested,
  visibleTileCount,
  animationComplete,
}) {
  const unitTilePercent = totalAmount > 0 ? (tileValue / totalAmount) * 100 : 0
  const groupCount = Number.isFinite(numberOfGroups) && numberOfGroups > 0 ? numberOfGroups : 0
  const tileWidthPercent = Math.min(unitTilePercent, 100)
  const attemptedPercent =
    totalAmount > 0 && attemptedTotal !== null ? (attemptedTotal / totalAmount) * 100 : 0
  const repeatedWidthPercent = Math.min(attemptedPercent, 124)
  const showTileLabels = groupCount <= 8 && tileValue > 0
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
        <div className={`totalLabel mb-0.5 text-center text-sm font-black ${resultLabelClass}`}>
          {resultLabel}
        </div>
        <div className="totalBar relative box-border h-10 w-full overflow-visible rounded-lg bg-white shadow-[inset_0_0_0_2px_rgb(125_211_252)]">
          <div className="absolute inset-0 flex overflow-hidden rounded-lg">
            {Array.from({ length: groupCount }, (_, index) => (
              <div
                key={index}
                className="h-full border-r border-sky-200 bg-sky-100/70 last:border-r-0"
                style={{ width: `${100 / groupCount}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          {hasTested && groupCount > 0 && visibleTileCount > 0 && (
            <div className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 overflow-visible">
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
                      style={{ width: `${100 / groupCount}%` }}
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

        <div className="unitLabel text-xs font-black text-slate-600">
          One unit tile
        </div>
        <div className="unitLane relative block box-border h-8 w-full overflow-visible bg-transparent p-0">
          <div
            className="unitTile absolute left-0 top-0 box-border flex h-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-amber-400 bg-amber-100 text-center text-xs font-black text-amber-950"
            style={{ width: tileWidth, marginLeft: 0 }}
            title={`1 group = ${unitTileLabel}`}
          >
            <span className={showTileLabelInside ? 'm-auto truncate px-2' : 'sr-only'}>
              {unitTileLabel}
            </span>
          </div>
        </div>
        <div className="unitText text-sm font-black text-slate-700">
          1 group = {unitTileLabel}
        </div>
      </div>

      <div className="mt-0.5 rounded-lg bg-white px-2 py-0.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-black text-slate-800" htmlFor="tile-value-slider">
            Try a whole number
          </label>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-900">
            {tileValueLabel}
          </span>
        </div>
        <input
          id="tile-value-slider"
          type="range"
          min="0"
          max={Math.max(0, Math.floor(totalAmount))}
          step="1"
          value={Math.min(Math.floor(tileValue), Math.max(0, Math.floor(totalAmount)))}
          onChange={(event) => onTileValueChange(event.target.value)}
          className="mt-0.5 w-full accent-sky-600"
        />
        <p className="text-xs font-black text-slate-700">
          Current try: {tileValueLabel}
        </p>
        <div className="mt-0.5 rounded-md bg-slate-50 px-2 py-0.5">
          <p className="text-[10px] font-black text-slate-600">
            Or try a fraction
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
    </div>
  )
}

function FeedbackBox({ feedbackType, message }) {
  const classes = {
    placeholder: 'border-slate-200 bg-slate-50 text-slate-500',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }

  return (
    <div className={`min-h-[32px] rounded-lg border px-3 py-1 text-base font-bold ${classes[feedbackType]}`}>
      {message}
    </div>
  )
}

export default function UnitRateSplitterLab() {
  const [totalAmount, setTotalAmount] = useState(defaultProblem.totalAmount)
  const [numberOfGroups, setNumberOfGroups] = useState(defaultProblem.numberOfGroups)
  const [tileValue, setTileValue] = useState(0)
  const [trySource, setTrySource] = useState('slider')
  const [customFractionTry, setCustomFractionTry] = useState(defaultCustomTry)
  const [hasTested, setHasTested] = useState(false)
  const [testRun, setTestRun] = useState(0)
  const [visibleTileCount, setVisibleTileCount] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [feedback, setFeedback] = useState('Feedback will appear here.')

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
  const parsedTotalAmount = parsePositiveWholeNumber(totalAmount)
  const parsedNumberOfGroups = parsePositiveWholeNumber(numberOfGroups)
  const totalAmountIsValid = parsedTotalAmount !== null
  const groupCountIsValid = parsedNumberOfGroups !== null
  const inputsAreValid = totalAmountIsValid && groupCountIsValid
  const safeTotalAmount = totalAmountIsValid ? parsedTotalAmount : 0
  const safeNumberOfGroups = groupCountIsValid ? parsedNumberOfGroups : 0
  const totalFraction = useMemo(
    () => ({ numerator: safeTotalAmount, denominator: 1 }),
    [safeTotalAmount],
  )
  const sliderTryFraction = useMemo(
    () => ({ numerator: tileValue, denominator: 1 }),
    [tileValue],
  )
  const activeSelectedFraction =
    trySource === 'custom' && customFractionDenominatorIsValid
      ? customSelectedFraction
      : sliderTryFraction
  const activeTileValue = fractionToNumber(activeSelectedFraction)
  const tileValueLabel = formatFraction(activeSelectedFraction)
  const attemptedFractionTotal = useMemo(
    () => multiplyFractionByInteger(activeSelectedFraction, safeNumberOfGroups),
    [activeSelectedFraction, safeNumberOfGroups],
  )
  const attemptedTotal = hasTested ? fractionToNumber(attemptedFractionTotal) : null
  const attemptedTotalLabel = formatFraction(attemptedFractionTotal)
  const feedbackType =
    feedback === 'Enter values'
      ? 'warning'
      : animationComplete
        ? getFeedbackType(attemptedTotal, safeTotalAmount)
        : 'placeholder'

  useEffect(() => {
    if (!hasTested || !inputsAreValid) return undefined

    let nextCount = 0
    const intervalId = window.setInterval(() => {
      nextCount += 1
      setVisibleTileCount(nextCount)

      if (nextCount >= safeNumberOfGroups) {
        window.clearInterval(intervalId)
        setAnimationComplete(true)

        const comparison = compareFractions(attemptedFractionTotal, totalFraction)
        const attemptedLabel = formatFraction(attemptedFractionTotal)
        const tryLabel = formatFraction(activeSelectedFraction)

        if (comparison < 0) {
          setFeedback(`Too small: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
        } else if (comparison > 0) {
          setFeedback(`Too big: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
        } else {
          setFeedback(`Perfect fit: ${attemptedLabel} ÷ ${safeNumberOfGroups} = ${tryLabel}`)
        }
      }
    }, 150)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    activeSelectedFraction,
    attemptedFractionTotal,
    hasTested,
    inputsAreValid,
    safeNumberOfGroups,
    testRun,
    totalFraction,
  ])

  const clearAttempt = () => {
    setHasTested(false)
    setTestRun(0)
    setVisibleTileCount(0)
    setAnimationComplete(false)
    setFeedback('Feedback will appear here.')
  }

  const updateTotalAmount = (value) => {
    setTotalAmount(value)
    clearAttempt()
  }

  const updateNumberOfGroups = (value) => {
    setNumberOfGroups(value)
    clearAttempt()
  }

  const updateCustomFractionTry = (value) => {
    setCustomFractionTry(value)
    setTrySource('custom')
    clearAttempt()
  }

  const updateTileValue = (value) => {
    setTileValue(Number(value))
    setTrySource('slider')
    setCustomFractionTry(defaultCustomTry)
    clearAttempt()
  }

  const testForAllGroups = () => {
    setVisibleTileCount(0)
    setAnimationComplete(false)

    if (!inputsAreValid || !customFractionDenominatorIsValid) {
      setHasTested(false)
      setTestRun(0)
      setFeedback('Enter values')
      return
    }

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
            onTotalAmountChange={updateTotalAmount}
            onNumberOfGroupsChange={updateNumberOfGroups}
          />

          <div>
            <div className="text-center">
              <p className="text-sm font-black text-sky-900">
                Find the value of 1 group.
              </p>
            </div>

            <BarModel
              totalAmount={safeTotalAmount}
              totalAmountLabel={inputsAreValid ? `${safeTotalAmount}` : '?'}
              numberOfGroups={safeNumberOfGroups}
              tileValue={activeTileValue}
              tileValueLabel={tileValueLabel}
              onTileValueChange={updateTileValue}
              customFractionTry={customFractionTry}
              customFractionDenominatorIsValid={customFractionDenominatorIsValid}
              onCustomFractionTryChange={updateCustomFractionTry}
              attemptedTotal={attemptedTotal}
              attemptedTotalLabel={attemptedTotalLabel}
              hasTested={hasTested}
              visibleTileCount={visibleTileCount}
              animationComplete={animationComplete}
            />

            <div className="mt-0.5 grid grid-cols-[1fr_150px] gap-2">
              <FeedbackBox feedbackType={feedbackType} message={feedback} />
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
