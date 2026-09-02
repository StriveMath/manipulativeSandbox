import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const places = [
  { value: 4, label: 'Ten thousands', labelLines: ['Ten', 'thousands'] },
  { value: 3, label: 'Thousands' },
  { value: 2, label: 'Hundreds' },
  { value: 1, label: 'Tens' },
  { value: 0, label: 'Ones' },
  { value: -1, label: 'Tenths' },
  { value: -2, label: 'Hundredths' },
  { value: -3, label: 'Thousandths' },
  { value: -4, label: 'Ten-thousandths', labelLines: ['Ten-', 'thousandths'] },
]

const placeIndex = new Map(places.map((place, index) => [place.value, index]))

const operations = [
  { id: 'multiply-10', label: '×10', operation: 'multiply', power: 10 },
  { id: 'multiply-100', label: '×100', operation: 'multiply', power: 100 },
  { id: 'multiply-1000', label: '×1000', operation: 'multiply', power: 1000 },
  { id: 'divide-10', label: '÷10', operation: 'divide', power: 10 },
  { id: 'divide-100', label: '÷100', operation: 'divide', power: 100 },
  { id: 'divide-1000', label: '÷1000', operation: 'divide', power: 1000 },
]

const chartGridClass = 'grid-cols-[78px_repeat(9,minmax(0,1fr))]'
const powerSteps = { 10: 1, 100: 2, 1000: 3 }
const phaseDurations = {
  default: { expression: 600, move: 850, zero: 220, zeroTransfer: 900, pause: 500 },
  reduced: { expression: 260, move: 220, zero: 140, zeroTransfer: 180, pause: 220 },
}

const cardThemes = {
  neutral: { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-800' },
  multiply: { border: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  divide: { border: 'border-violet-300', bg: 'bg-violet-100', text: 'text-violet-800' },
  placeholder: { border: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-800' },
}

const getCardTheme = (theme, source) => (
  source === 'zero' ? cardThemes.placeholder : cardThemes[theme] ?? cardThemes.neutral
)

const sanitizeNumberInput = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('')
  if (cleaned.includes('.')) return `${integer || '0'}.${decimal.slice(0, 4)}`
  return (integer || '0').slice(0, 4)
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
    cards.push({ digit, id: `i-${index}-${digit}`, place: integer.length - 1 - index, source: 'digit' })
  })
  decimal.split('').forEach((digit, index) => {
    cards.push({ digit, id: `d-${index}-${digit}`, place: -(index + 1), source: 'digit' })
  })
  return cards
}

const formatResultFromCards = (cards) => {
  if (cards.length === 0) return '0'
  const placesUsed = cards.map((card) => card.place)
  const maxPlace = Math.max(...placesUsed, 0)
  const minPlace = Math.min(...placesUsed, 0)
  const byPlace = new Map(cards.map((card) => [card.place, card.digit]))
  const integerDigits = []
  const decimalDigits = []

  for (let place = maxPlace; place >= 0; place -= 1) integerDigits.push(byPlace.get(place) ?? '0')
  for (let place = -1; place >= minPlace; place -= 1) decimalDigits.push(byPlace.get(place) ?? '0')

  const integer = integerDigits.join('').replace(/^0+(?=\d)/, '') || '0'
  const decimal = decimalDigits.join('').replace(/0+$/, '')
  return decimal.length > 0 ? `${integer}.${decimal}` : integer
}

const trimInsignificantZeros = (cards) => {
  const sorted = [...cards].sort((a, b) => b.place - a.place)
  while (sorted.length > 1 && sorted[0].digit === '0' && sorted[0].place > 0) sorted.shift()
  while (sorted.length > 1 && sorted.at(-1).digit === '0' && sorted.at(-1).place < 0) sorted.pop()

  if (sorted.every((card) => card.digit === '0')) {
    return [{ ...sorted[0], place: 0, startPlace: sorted[0].place }]
  }
  return sorted
}

const buildResultCards = (shiftedCards, step) => {
  const usedPlaces = shiftedCards.map((card) => card.place)
  const maxPlace = Math.max(...usedPlaces, 0)
  const minPlace = Math.min(...usedPlaces, 0)
  const byPlace = new Map(shiftedCards.map((card) => [
    card.place,
    { ...card, animationKind: 'settled', startPlace: card.place },
  ]))
  const cards = []

  for (let place = maxPlace; place >= minPlace; place -= 1) {
    cards.push(byPlace.get(place) ?? {
      digit: '0',
      id: `zero-${step}-${place}`,
      place,
      source: 'zero',
      startPlace: place,
      animationKind: 'zero',
    })
  }
  return cards
}

const buildOperationFrames = (originalCards, selectedOperation) => {
  if (!selectedOperation) return []
  const totalSteps = powerSteps[selectedOperation.power]
  const direction = selectedOperation.operation === 'multiply' ? 1 : -1
  const frames = []
  let previousCards = originalCards.map((card) => ({ ...card, animationKind: 'settled' }))

  for (let step = 1; step <= totalSteps; step += 1) {
    const movingCards = previousCards.map((card) => ({
      ...card,
      place: card.place + direction,
      startPlace: card.place,
      animationKind: 'move',
    }))
    const significantCards = trimInsignificantZeros(movingCards)
    const settledCards = buildResultCards(significantCards, step)
    frames.push({ movingCards, result: formatResultFromCards(settledCards), settledCards })
    previousCards = settledCards
  }
  return frames
}

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(query.matches)
    updatePreference()
    query.addEventListener('change', updatePreference)
    return () => query.removeEventListener('change', updatePreference)
  }, [])
  return reducedMotion
}

const toLocalPoint = (rect, rootRect, scaleX, scaleY) => ({
  x: (rect.left + rect.width / 2 - rootRect.left) / scaleX,
  y: (rect.top + rect.height / 2 - rootRect.top) / scaleY,
})

function ZeroTransferOverlay({ animationToken, currentStep, phase, reducedMotion, rootRef, targetPlace }) {
  const [geometry, setGeometry] = useState(null)

  useLayoutEffect(() => {
    if (phase !== 'zero' || reducedMotion || targetPlace == null) {
      return undefined
    }

    const root = rootRef.current
    const source = root?.querySelector(`[data-power-factor-zero="${currentStep}"]`)
    const target = root?.querySelector(`[data-power-chart="result"] [data-power-place="${targetPlace}"]`)
    if (!root || !source || !target) return undefined

    const frame = window.requestAnimationFrame(() => {
      const rootRect = root.getBoundingClientRect()
      const scaleX = rootRect.width / root.offsetWidth || 1
      const scaleY = rootRect.height / root.offsetHeight || 1
      const start = toLocalPoint(source.getBoundingClientRect(), rootRect, scaleX, scaleY)
      const end = toLocalPoint(target.getBoundingClientRect(), rootRect, scaleX, scaleY)
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y

      setGeometry({
        animationToken,
        currentStep,
        deltaX,
        deltaY,
        midX: deltaX * 0.52 + 28,
        midY: deltaY * 0.5 - 24,
        startX: start.x,
        startY: start.y,
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [animationToken, currentStep, phase, reducedMotion, rootRef, targetPlace])

  if (
    phase !== 'zero' ||
    reducedMotion ||
    targetPlace == null ||
    !geometry ||
    geometry.animationToken !== animationToken ||
    geometry.currentStep !== currentStep
  ) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <span
        className="power-zero-transfer-ghost absolute flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100 text-xl font-black text-amber-800 shadow-lg"
        key={`${animationToken}-${currentStep}-${targetPlace}`}
        style={{
          '--power-zero-delta-x': `${geometry.deltaX}px`,
          '--power-zero-delta-y': `${geometry.deltaY}px`,
          '--power-zero-mid-x': `${geometry.midX}px`,
          '--power-zero-mid-y': `${geometry.midY}px`,
          left: geometry.startX - 20,
          top: geometry.startY - 20,
        }}
      >
        0
      </span>
    </div>
  )
}

function DigitCard({ animationToken, card, theme = 'neutral' }) {
  const startIndex = placeIndex.get(card.startPlace ?? card.place)
  const endIndex = placeIndex.get(card.place)
  const color = getCardTheme(theme, card.source)
  const shift = Number.isFinite(startIndex) && Number.isFinite(endIndex) ? startIndex - endIndex : 0
  const animationClass = card.animationKind === 'transfer-target'
    ? 'power-zero-transfer-target'
    : card.animationKind === 'move'
      ? 'power-step-digit-move'
      : ''

  return (
    <div
      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-xl font-black shadow-sm ${color.border} ${color.bg} ${color.text} ${animationClass}`}
      key={`${card.id}-${animationToken}-${card.animationKind}`}
      style={{ '--power-step-shift': `${shift * 76}px` }}
    >
      {card.digit}
    </div>
  )
}

function ColoredNumber({ cards, theme = 'neutral' }) {
  const sortedCards = [...cards].sort((a, b) => b.place - a.place)
  const minPlace = Math.min(...sortedCards.map((card) => card.place), 0)
  const pieces = []

  sortedCards.forEach((card, index) => {
    if (index > 0 && sortedCards[index - 1].place === 0 && minPlace < 0) {
      pieces.push(<span className="mx-0.5 text-slate-400" key="decimal">.</span>)
    }
    pieces.push(<span className={getCardTheme(theme, card.source).text} key={card.id}>{card.digit}</span>)
  })
  return <>{pieces}</>
}

function PlaceValueChart({ animationToken = 0, label, resultCards, showHeader = true, theme = 'neutral' }) {
  const byPlace = new Map(resultCards.map((card) => [card.place, card]))

  return (
    <div className="relative flex h-full flex-col rounded border border-slate-200 bg-white shadow-sm" data-power-chart={label.toLowerCase()}>
      {showHeader && (
        <div className={`grid ${chartGridClass}`}>
          <div className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-[10px] font-black uppercase text-slate-500">{label}</div>
          {places.map((place) => (
            <div className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-center text-[10px] font-black leading-[11px] text-slate-500 last:border-r-0" key={place.value}>
              {place.labelLines
                ? place.labelLines.map((line, index) => (
                    <span className="block" key={line}>{line}{index === 0 && !line.endsWith('-') ? ' ' : ''}</span>
                  ))
                : place.label}
            </div>
          ))}
        </div>
      )}
      <div className={`relative grid min-h-0 flex-1 ${chartGridClass}`}>
        <span
          aria-label="Decimal point between ones and tenths"
          className="pointer-events-none absolute z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          role="img"
          style={{
            left: 'calc(78px + ((100% - 78px) / 9) * 5)',
            top: 'calc(50% + 12px)',
          }}
        >
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-slate-900 ring-2 ring-white" />
        </span>
        <div className="flex h-full min-h-16 items-center border-r border-t border-slate-200 px-2 text-sm font-black text-slate-700">{label}</div>
        {places.map((place) => {
          const card = byPlace.get(place.value)
          return (
            <div
              className="relative flex h-full min-h-16 items-center justify-center border-r border-t border-slate-200 last:border-r-0"
              data-power-place={place.value}
              key={place.value}
            >
              {card && <DigitCard animationToken={animationToken} card={card} theme={theme} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OperationButton({ disabled, isSelected, operation, onSelect }) {
  const isMultiply = operation.operation === 'multiply'
  return (
    <button
      aria-pressed={isSelected}
      className={`h-9 min-w-0 rounded border-2 px-2 text-sm font-black shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-55 ${
        isSelected
          ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-amber-200'
          : isMultiply
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
            : 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400 hover:bg-violet-100'
      }`}
      disabled={disabled}
      onClick={() => onSelect(operation)}
      type="button"
    >
      {operation.label}
    </button>
  )
}

function ExpressionDisplay({ currentStep, frames, originalCards, phase, reducedMotion, selectedOperation }) {
  if (!selectedOperation) {
    return <div className="text-sm font-bold text-slate-500">Choose an operation to move the digits one place at a time.</div>
  }

  const totalSteps = powerSteps[selectedOperation.power]
  const symbol = selectedOperation.operation === 'multiply' ? '×' : '÷'
  const operationTheme = selectedOperation.operation
  const operationColor = selectedOperation.operation === 'multiply' ? 'text-emerald-600' : 'text-violet-600'
  const settledPhase = phase === 'zero' || phase === 'pause'
  const currentResult = currentStep > 0 ? frames[currentStep - 1]?.result : ''
  const finalCards = frames.at(-1)?.settledCards ?? []
  const stepCreatesZero = frames[currentStep - 1]?.settledCards.some((card) => card.animationKind === 'zero') ?? false

  if (phase === 'expression') {
    return (
      <div className="power-expression-enter flex items-baseline gap-2 text-xl font-black tabular-nums text-slate-900">
        <span><ColoredNumber cards={originalCards} /></span>
        <span className={operationColor}>{symbol} {selectedOperation.power}</span>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="power-final-result flex flex-wrap items-baseline gap-x-2 text-xl font-black tabular-nums text-slate-900">
        <span><ColoredNumber cards={originalCards} /></span>
        <span className={operationColor}>{symbol} {selectedOperation.power} =</span>
        <span><ColoredNumber cards={finalCards} theme={operationTheme} /></span>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-lg font-black tabular-nums text-slate-900">
        <span><ColoredNumber cards={originalCards} /></span>
        {Array.from({ length: totalSteps }, (_, index) => {
          const factorStep = index + 1
          const isActive = factorStep === currentStep
          const isComplete = factorStep < currentStep || (factorStep === currentStep && settledPhase)
          return (
            <span
              className={`rounded px-1.5 py-0.5 transition ${
                isActive
                  ? 'power-factor-active bg-amber-100 text-amber-800 ring-1 ring-amber-400'
                  : isComplete
                    ? operationColor
                    : 'text-slate-400'
              }`}
              key={factorStep}
            >
              <span>{symbol}</span>
              <span>1</span>
              <span
                className={phase === 'zero' && factorStep === currentStep && stepCreatesZero
                  ? reducedMotion
                    ? 'power-factor-zero-source-reduced'
                    : 'power-factor-zero-source'
                  : ''}
                data-power-factor-zero={factorStep}
              >
                0
              </span>
            </span>
          )
        })}
        {settledPhase && (
          <span className={`power-step-value ${operationColor} ${phase === 'zero' && stepCreatesZero && !reducedMotion ? 'power-zero-delayed-value' : ''}`}>
            = {currentResult}
          </span>
        )}
      </div>
      <div className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  )
}

export default function PowerOf10BlobExplorer() {
  const rootRef = useRef(null)
  const [startingNumber, setStartingNumber] = useState('3.6')
  const [selectedOperation, setSelectedOperation] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [animationToken, setAnimationToken] = useState(0)
  const reducedMotion = useReducedMotion()
  const originalCards = useMemo(() => parseDigitCards(startingNumber), [startingNumber])
  const frames = useMemo(() => buildOperationFrames(originalCards, selectedOperation), [originalCards, selectedOperation])
  const totalSteps = selectedOperation ? powerSteps[selectedOperation.power] : 0
  const isAnimating = Boolean(selectedOperation) && phase !== 'complete'
  const currentFrame = currentStep > 0 ? frames[currentStep - 1] : null
  const transferTarget = currentFrame?.settledCards.find((card) => card.animationKind === 'zero') ?? null
  const stepCreatesZero = Boolean(transferTarget)

  useEffect(() => {
    if (!selectedOperation || phase === 'idle' || phase === 'complete') return undefined

    const timing = reducedMotion ? phaseDurations.reduced : phaseDurations.default
    const phaseDuration = phase === 'zero' && stepCreatesZero ? timing.zeroTransfer : timing[phase]
    const timeout = window.setTimeout(() => {
      if (phase === 'expression') {
        setCurrentStep(1)
        setAnimationToken((token) => token + 1)
        setPhase('move')
      } else if (phase === 'move') {
        setAnimationToken((token) => token + 1)
        setPhase('zero')
      } else if (phase === 'zero') {
        setPhase(currentStep >= totalSteps ? 'complete' : 'pause')
      } else if (phase === 'pause') {
        setCurrentStep((step) => step + 1)
        setAnimationToken((token) => token + 1)
        setPhase('move')
      }
    }, phaseDuration)

    return () => window.clearTimeout(timeout)
  }, [currentStep, phase, reducedMotion, selectedOperation, stepCreatesZero, totalSteps])

  const selectOperation = (operation) => {
    setSelectedOperation(operation)
    setCurrentStep(0)
    setAnimationToken((token) => token + 1)
    setPhase('expression')
  }

  const changeStartingNumber = (value) => {
    setStartingNumber(value)
    setSelectedOperation(null)
    setCurrentStep(0)
    setPhase('idle')
  }

  const resultCards = phase === 'idle'
    ? []
    : phase === 'expression'
      ? originalCards
      : phase === 'move'
        ? currentFrame?.movingCards ?? []
        : phase === 'zero' && stepCreatesZero && !reducedMotion
          ? currentFrame.settledCards.map((card) => (
              card.animationKind === 'zero' ? { ...card, animationKind: 'transfer-target' } : card
            ))
          : currentFrame?.settledCards ?? []
  const directionWord = selectedOperation?.operation === 'multiply' ? 'toward a larger place value' : 'toward a smaller place value'
  const liveMessage = !selectedOperation
    ? 'Choose a power of 10 operation.'
    : phase === 'expression'
      ? `${normalizeNumberText(startingNumber)} ${selectedOperation.operation === 'multiply' ? 'times' : 'divided by'} ${selectedOperation.power}.`
      : phase === 'move'
        ? `Step ${currentStep} of ${totalSteps}. Digits move one place ${directionWord}.`
        : phase === 'zero' && stepCreatesZero
          ? `A zero from step ${currentStep} moves from the active ${selectedOperation.operation === 'multiply' ? 'times ten' : 'divide by ten'} factor into the ${places.find((place) => place.value === transferTarget.place)?.label.toLowerCase()} place.`
          : phase === 'zero' || phase === 'pause'
          ? `Step ${currentStep} of ${totalSteps} gives ${currentFrame?.result}.`
          : `${normalizeNumberText(startingNumber)} ${selectedOperation.operation === 'multiply' ? 'times' : 'divided by'} ${selectedOperation.power} equals ${frames.at(-1)?.result}.`

  return (
    <div className="relative box-border flex h-[500px] w-[800px] flex-col overflow-hidden bg-slate-50 px-4 py-3 text-slate-700" ref={rootRef}>
      <div className="mb-2 grid h-[158px] shrink-0 grid-cols-[170px_1fr] gap-2">
        <label className="rounded border border-slate-200 bg-white p-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
          Starting number
          <input
            aria-label="Starting number"
            className="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={isAnimating}
            onChange={(event) => changeStartingNumber(sanitizeNumberInput(event.target.value))}
            value={startingNumber}
          />
        </label>

        <div className="grid min-w-0 grid-rows-[92px_1fr] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-0 grid-cols-[68px_repeat(3,minmax(0,1fr))] items-center gap-x-2 gap-y-2 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="rounded-full bg-emerald-50 px-1 py-1 text-center text-[9px] font-black uppercase tracking-wide text-emerald-700">Multiply</div>
            {operations.slice(0, 3).map((operation) => (
              <OperationButton disabled={isAnimating} isSelected={selectedOperation?.id === operation.id} key={operation.id} onSelect={selectOperation} operation={operation} />
            ))}
            <div className="rounded-full bg-violet-50 px-1 py-1 text-center text-[9px] font-black uppercase tracking-wide text-violet-700">Divide</div>
            {operations.slice(3).map((operation) => (
              <OperationButton disabled={isAnimating} isSelected={selectedOperation?.id === operation.id} key={operation.id} onSelect={selectOperation} operation={operation} />
            ))}
          </div>

          <div className="flex min-w-0 items-center gap-3 px-2 py-1">
            <div className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">{phase === 'complete' ? 'Result' : 'Expression'}</div>
            <div className="min-w-0 flex-1">
              <ExpressionDisplay currentStep={currentStep} frames={frames} originalCards={originalCards} phase={phase} reducedMotion={reducedMotion} selectedOperation={selectedOperation} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2">
        <PlaceValueChart label="Original" resultCards={originalCards} />
        <PlaceValueChart
          animationToken={animationToken}
          label="Result"
          resultCards={resultCards}
          showHeader={false}
          theme={selectedOperation?.operation ?? 'neutral'}
        />
      </div>

      <ZeroTransferOverlay
        animationToken={animationToken}
        currentStep={currentStep}
        phase={phase}
        reducedMotion={reducedMotion}
        rootRef={rootRef}
        targetPlace={transferTarget?.place}
      />

      <div aria-live="polite" className="sr-only" role="status">{liveMessage}</div>
    </div>
  )
}
