import { useMemo, useState } from 'react'

const places = [
  { value: 4, label: '10,000s' },
  { value: 3, label: '1,000s' },
  { value: 2, label: '100s' },
  { value: 1, label: '10s' },
  { value: 0, label: '1s' },
  { value: -1, label: '0.1' },
  { value: -2, label: '0.01' },
  { value: -3, label: '0.001' },
  { value: -4, label: '0.0001' },
]

const presets = [
  { label: '4.7 x 10', number: '4.7', operation: 'multiply', power: 10 },
  { label: '36.2 x 100', number: '36.2', operation: 'multiply', power: 100 },
  { label: '5.08 x 1000', number: '5.08', operation: 'multiply', power: 1000 },
  { label: '420 ÷ 10', number: '420', operation: 'divide', power: 10 },
  { label: '63.5 ÷ 100', number: '63.5', operation: 'divide', power: 100 },
  { label: '8.4 ÷ 1000', number: '8.4', operation: 'divide', power: 1000 },
]

const powerSteps = {
  10: 1,
  100: 2,
  1000: 3,
}

const operationLabels = {
  multiply: 'multiplied',
  divide: 'divided',
}

const sanitizeNumberInput = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [first, ...rest] = cleaned.split('.')
  const decimal = rest.join('')

  if (cleaned.includes('.')) return `${first || '0'}.${decimal.slice(0, 4)}`
  return (first || '0').slice(0, 5)
}

const normalizeNumberText = (value) => {
  const sanitized = sanitizeNumberInput(value)
  const [rawInteger, rawDecimal = ''] = sanitized.split('.')
  const integer = rawInteger.replace(/^0+(?=\d)/, '') || '0'
  const decimal = rawDecimal.replace(/0+$/, '')

  return decimal.length > 0 ? `${integer}.${decimal}` : integer
}

const parseDigitCards = (value) => {
  const normalized = normalizeNumberText(value)
  const [integer, decimal = ''] = normalized.split('.')
  const cards = []

  integer.split('').forEach((digit, index) => {
    cards.push({
      digit,
      id: `i-${index}-${digit}`,
      place: integer.length - 1 - index,
      source: 'digit',
    })
  })

  decimal.split('').forEach((digit, index) => {
    cards.push({
      digit,
      id: `d-${index}-${digit}`,
      place: -(index + 1),
      source: 'digit',
    })
  })

  return cards
}

const formatResultFromCards = (cards) => {
  const cardPlaces = cards.map((card) => card.place)
  const maxPlace = Math.max(...cardPlaces)
  const minPlace = Math.min(...cardPlaces)
  const digitByPlace = new Map(cards.map((card) => [card.place, card.digit]))
  const integerStart = Math.max(maxPlace, 0)
  const integerDigits = []

  for (let place = integerStart; place >= 0; place -= 1) {
    integerDigits.push(digitByPlace.get(place) ?? '0')
  }

  const decimalDigits = []

  if (minPlace < 0) {
    for (let place = -1; place >= minPlace; place -= 1) {
      decimalDigits.push(digitByPlace.get(place) ?? '0')
    }
  }

  const integer = integerDigits.join('').replace(/^0+(?=\d)/, '') || '0'
  const decimal = decimalDigits.join('').replace(/0+$/, '')

  return decimal.length > 0 ? `${integer}.${decimal}` : integer
}

const buildResultCards = (shiftedCards) => {
  const shiftedPlaces = shiftedCards.map((card) => card.place)
  const maxPlace = Math.max(Math.max(...shiftedPlaces), 0)
  const minPlace = Math.min(Math.min(...shiftedPlaces), 0)
  const cardByPlace = new Map(shiftedCards.map((card) => [card.place, card]))
  const resultCards = []

  for (let place = maxPlace; place >= minPlace; place -= 1) {
    const shiftedCard = cardByPlace.get(place)

    if (shiftedCard) {
      resultCards.push(shiftedCard)
    } else {
      resultCards.push({
        digit: '0',
        id: `zero-${place}`,
        place,
        source: 'zero',
      })
    }
  }

  return resultCards
}

const sameNumber = (left, right) => {
  const parsedLeft = Number(normalizeNumberText(left))
  const parsedRight = Number(normalizeNumberText(right))

  return Number.isFinite(parsedLeft) && Math.abs(parsedLeft - parsedRight) < 0.000001
}

function DigitCard({ card, shiftColumns = 0, shouldAnimate = false }) {
  const isZeroFill = card.source === 'zero'

  return (
    <div
      className={`mx-auto flex h-8 w-8 items-center justify-center rounded border text-lg font-black tabular-nums shadow-sm ${
        isZeroFill
          ? 'border-slate-300 bg-slate-100 text-slate-500 power-zero-fill'
          : shouldAnimate
            ? 'border-emerald-300 bg-emerald-500 text-white power-shift-card'
            : 'border-blue-300 bg-blue-500 text-white'
      }`}
      style={{
        '--shift-from': `${shiftColumns * 100}%`,
      }}
    >
      {card.digit}
    </div>
  )
}

function PlaceValueRow({ cards, isResult, shiftColumns, shouldAnimate }) {
  const cardByPlace = new Map(cards.map((card) => [card.place, card]))

  return (
    <div className="grid grid-cols-9 border-t border-slate-200">
      {places.map((place) => {
        const card = cardByPlace.get(place.value)

        return (
          <div
            className={`flex h-10 items-center justify-center border-r border-slate-200 bg-white last:border-r-0 ${
              place.value === -1 ? 'border-l-4 border-l-slate-800' : ''
            }`}
            key={place.value}
          >
            {card && (
              <DigitCard
                card={card}
                shiftColumns={isResult && card.source !== 'zero' ? shiftColumns : 0}
                shouldAnimate={isResult && shouldAnimate && card.source !== 'zero'}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PowersOf10PlaceValueShift() {
  const [startingNumber, setStartingNumber] = useState('34.6')
  const [operation, setOperation] = useState('multiply')
  const [power, setPower] = useState(10)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [prediction, setPrediction] = useState('')
  const [feedback, setFeedback] = useState(null)

  const model = useMemo(() => {
    const steps = powerSteps[power]
    const direction = operation === 'multiply' ? 1 : -1
    const startingCards = parseDigitCards(startingNumber)
    const shiftedCards = startingCards.map((card) => ({
      ...card,
      id: `${card.id}-shifted`,
      place: card.place + direction * steps,
      source: 'digit',
    }))
    const resultCards = buildResultCards(shiftedCards)
    const result = formatResultFromCards(shiftedCards)

    return {
      direction,
      result,
      resultCards,
      shiftColumns: direction * steps,
      startingCards,
      steps,
    }
  }, [operation, power, startingNumber])

  const updateExample = (preset) => {
    setStartingNumber(preset.number)
    setOperation(preset.operation)
    setPower(preset.power)
    setHasAnimated(false)
    setPrediction('')
    setFeedback(null)
  }

  const reset = () => {
    setStartingNumber('34.6')
    setOperation('multiply')
    setPower(10)
    setHasAnimated(false)
    setPrediction('')
    setFeedback(null)
  }

  const changeNumber = (value) => {
    setStartingNumber(sanitizeNumberInput(value))
    setHasAnimated(false)
    setFeedback(null)
  }

  const changeOperation = (nextOperation) => {
    setOperation(nextOperation)
    setHasAnimated(false)
    setFeedback(null)
  }

  const changePower = (nextPower) => {
    setPower(nextPower)
    setHasAnimated(false)
    setFeedback(null)
  }

  const animateShift = () => {
    setHasAnimated(false)
    window.setTimeout(() => setHasAnimated(true), 20)
  }

  const checkPrediction = () => {
    const isCorrect = sameNumber(prediction, model.result)
    setHasAnimated(true)
    setFeedback({
      correct: isCorrect,
      message: isCorrect
        ? 'Correct! Each digit shifted to a new place value.'
        : 'Not quite. Count how many places each digit should shift on the place value chart.',
    })
  }

  const operationSymbol = operation === 'multiply' ? 'x' : '÷'
  const directionText = operation === 'multiply' ? 'left' : 'right'
  const arrow = operation === 'multiply' ? '←' : '→'

  return (
    <div className="box-border flex h-full w-full flex-col overflow-hidden bg-slate-50 px-4 py-3 text-slate-700">
      <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold leading-5 text-slate-900">
            Powers of 10 place value shift
          </h2>
          <p className="text-[11px] font-medium text-slate-500">
            Digits move to new places. The decimal marker stays between Ones and Tenths.
          </p>
        </div>
        <select
          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm"
          onChange={(event) => updateExample(presets[Number(event.target.value)])}
          value=""
          aria-label="Try a preset example"
        >
          <option value="" disabled>
            Try an example
          </option>
          {presets.map((preset, index) => (
            <option key={preset.label} value={index}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-[120px_160px_120px_1fr] gap-2">
        <label className="rounded border border-slate-200 bg-white p-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Start
          <input
            className="mt-1 h-8 w-full rounded border border-slate-300 px-2 text-center text-base font-black tabular-nums text-slate-800 outline-none focus:border-blue-500"
            onChange={(event) => changeNumber(event.target.value)}
            value={startingNumber}
            aria-label="Starting number"
          />
        </label>

        <div className="rounded border border-slate-200 bg-white p-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Operation
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {['multiply', 'divide'].map((item) => (
              <button
                className={`h-8 rounded border text-xs font-black ${
                  operation === item
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
                key={item}
                onClick={() => changeOperation(item)}
                type="button"
              >
                {item === 'multiply' ? 'Multiply' : 'Divide'}
              </button>
            ))}
          </div>
        </div>

        <label className="rounded border border-slate-200 bg-white p-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Power
          <select
            className="mt-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-sm font-black text-slate-800"
            onChange={(event) => changePower(Number(event.target.value))}
            value={power}
            aria-label="Power of 10"
          >
            {[10, 100, 1000].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 rounded border border-slate-200 bg-white p-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Predict
            <input
              className="mt-1 h-8 w-full rounded border border-slate-300 px-2 text-center text-sm font-black tabular-nums text-slate-800 outline-none focus:border-emerald-500"
              onChange={(event) => setPrediction(event.target.value)}
              value={prediction}
              aria-label="Predict the answer"
            />
          </label>
          <button
            className="h-8 rounded bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-500"
            onClick={checkPrediction}
            type="button"
          >
            Check
          </button>
          <button
            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-100"
            onClick={reset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="relative shrink-0 overflow-hidden rounded border border-slate-300 bg-white shadow-sm">
        <div className="grid grid-cols-9 bg-slate-100">
          {places.map((place) => (
            <div
              className={`border-r border-slate-200 px-1 py-1 text-center text-[10px] font-black text-slate-600 last:border-r-0 ${
                place.value === -1 ? 'border-l-4 border-l-slate-800' : ''
              }`}
              key={place.value}
            >
              {place.label}
            </div>
          ))}
        </div>

        <PlaceValueRow cards={model.startingCards} />
        <div className="grid grid-cols-[70px_1fr_70px] items-center border-t border-slate-200 bg-slate-50 px-2 py-1">
          <div className="text-xs font-black text-blue-700">Start</div>
          <div className="text-center text-xl font-black text-slate-700">
            {arrow.repeat(model.steps)}
          </div>
          <div className="text-right text-xs font-black text-emerald-700">
            Result
          </div>
        </div>
        <PlaceValueRow
          cards={hasAnimated ? model.resultCards : []}
          isResult
          shiftColumns={model.shiftColumns}
          shouldAnimate={hasAnimated}
        />
      </div>

      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-2">
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Equation
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums text-slate-900">
            {normalizeNumberText(startingNumber)} {operationSymbol} {power}
            <span className="mx-2 text-slate-400">=</span>
            <span className="text-emerald-700">
              {hasAnimated ? model.result : '?'}
            </span>
          </div>
          <button
            className="mt-2 h-8 rounded bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-700"
            onClick={animateShift}
            type="button"
          >
            Animate Shift
          </button>
        </div>

        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Explanation
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
            Because we {operationLabels[operation]} by {power}, each digit moved{' '}
            <span className="font-black text-slate-900">
              {model.steps} place{model.steps === 1 ? '' : 's'} to the {directionText}
            </span>
            . The digits stayed the same; their place values changed.
          </p>
          {feedback && (
            <div
              className={`mt-2 rounded border px-2 py-1 text-xs font-bold ${
                feedback.correct
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
