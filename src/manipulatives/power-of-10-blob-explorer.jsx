import { useEffect, useMemo, useRef, useState } from 'react'

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

const switches = [
  { id: 'multiply-10', label: 'x10', operation: 'multiply', power: 10 },
  { id: 'multiply-100', label: 'x100', operation: 'multiply', power: 100 },
  { id: 'multiply-1000', label: 'x1000', operation: 'multiply', power: 1000 },
  { id: 'divide-10', label: '÷10', operation: 'divide', power: 10 },
  { id: 'divide-100', label: '÷100', operation: 'divide', power: 100 },
  { id: 'divide-1000', label: '÷1000', operation: 'divide', power: 1000 },
]

const generatedNumbers = ['3.6', '4.2', '5.08', '36.5', '420', '63.5', '7.4', '82', '9.06']

const chartGridClass = 'grid-cols-[78px_repeat(9,minmax(0,1fr))]'

const powerSteps = {
  10: 1,
  100: 2,
  1000: 3,
}

const placeStyles = {
  4: {
    border: 'border-rose-300',
    bg: 'bg-rose-500',
    softBg: 'bg-rose-100',
    text: 'text-rose-700',
  },
  3: {
    border: 'border-indigo-300',
    bg: 'bg-indigo-500',
    softBg: 'bg-indigo-100',
    text: 'text-indigo-700',
  },
  2: {
    border: 'border-cyan-300',
    bg: 'bg-cyan-500',
    softBg: 'bg-cyan-100',
    text: 'text-cyan-700',
  },
  1: {
    border: 'border-orange-300',
    bg: 'bg-orange-500',
    softBg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  0: {
    border: 'border-emerald-300',
    bg: 'bg-emerald-500',
    softBg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  '-1': {
    border: 'border-sky-300',
    bg: 'bg-sky-500',
    softBg: 'bg-sky-100',
    text: 'text-sky-700',
  },
  '-2': {
    border: 'border-amber-300',
    bg: 'bg-amber-500',
    softBg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  '-3': {
    border: 'border-violet-300',
    bg: 'bg-violet-500',
    softBg: 'bg-violet-100',
    text: 'text-violet-700',
  },
  '-4': {
    border: 'border-fuchsia-300',
    bg: 'bg-fuchsia-500',
    softBg: 'bg-fuchsia-100',
    text: 'text-fuchsia-700',
  },
}

const getPlaceStyle = (place) => placeStyles[place] ?? placeStyles[0]

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
  const placesUsed = cards.map((card) => card.place)
  const maxPlace = Math.max(...placesUsed, 0)
  const minPlace = Math.min(...placesUsed, 0)
  const byPlace = new Map(cards.map((card) => [card.place, card.digit]))
  const integerDigits = []
  const decimalDigits = []

  for (let place = maxPlace; place >= 0; place -= 1) {
    integerDigits.push(byPlace.get(place) ?? '0')
  }

  for (let place = -1; place >= minPlace; place -= 1) {
    decimalDigits.push(byPlace.get(place) ?? '0')
  }

  const integer = integerDigits.join('').replace(/^0+(?=\d)/, '') || '0'
  const decimal = decimalDigits.join('').replace(/0+$/, '')

  return decimal.length > 0 ? `${integer}.${decimal}` : integer
}

const buildResultCards = (shiftedCards) => {
  const usedPlaces = shiftedCards.map((card) => card.place)
  const maxPlace = Math.max(Math.max(...usedPlaces), 0)
  const minPlace = Math.min(Math.min(...usedPlaces), 0)
  const byPlace = new Map(shiftedCards.map((card) => [card.place, card]))
  const cards = []

  for (let place = maxPlace; place >= minPlace; place -= 1) {
    const card = byPlace.get(place)
    if (card) {
      cards.push(card)
    } else {
      cards.push({
        digit: '0',
        id: `zero-${place}`,
        place,
        source: 'zero',
        startPlace: place,
      })
    }
  }

  return cards
}

const getModel = (startingNumber, activeSwitch) => {
  const originalCards = parseDigitCards(startingNumber)
  if (!activeSwitch) {
    return {
      originalCards,
      result: '',
      resultCards: [],
      shiftedDigitCards: [],
      steps: 0,
    }
  }

  const steps = powerSteps[activeSwitch.power]
  const direction = activeSwitch.operation === 'multiply' ? 1 : -1
  const shiftedDigitCards = originalCards.map((card) => ({
    ...card,
    id: `${card.id}-${activeSwitch.id}`,
    place: card.place + direction * steps,
    source: 'digit',
    startPlace: card.place,
  }))
  const resultCards = buildResultCards(shiftedDigitCards)

  return {
    originalCards,
    result: formatResultFromCards(shiftedDigitCards),
    resultCards,
    shiftedDigitCards,
    steps,
  }
}

function DigitCard({ card, animate }) {
  const startIndex = placeIndex.get(card.startPlace ?? card.place)
  const endIndex = placeIndex.get(card.place)
  const color = getPlaceStyle(card.place)
  const shift = Number.isFinite(startIndex) && Number.isFinite(endIndex)
    ? startIndex - endIndex
    : 0

  return (
    <div
      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-xl font-black shadow-sm ${
        card.source === 'zero'
          ? `${color.border} ${color.softBg} ${color.text} blob-zero-pop`
          : animate
            ? `${color.border} ${color.bg} text-white blob-digit-shift`
            : `${color.border} ${color.bg} text-white`
      }`}
      style={{ '--blob-shift-from': `${shift * 100}%` }}
    >
      {card.digit}
    </div>
  )
}

function ColoredNumber({ cards }) {
  const sortedCards = [...cards].sort((a, b) => b.place - a.place)
  const minPlace = Math.min(...sortedCards.map((card) => card.place), 0)
  const pieces = []

  sortedCards.forEach((card, index) => {
    if (index > 0 && sortedCards[index - 1].place === 0 && minPlace < 0) {
      pieces.push(
        <span className="mx-0.5 text-slate-400" key="decimal">
          .
        </span>
      )
    }

    pieces.push(
      <span className={getPlaceStyle(card.place).text} key={card.id}>
        {card.digit}
      </span>
    )
  })

  return <>{pieces}</>
}

function PlaceValueChart({ animate, label, resultCards }) {
  const byPlace = new Map(resultCards.map((card) => [card.place, card]))

  return (
    <div className="relative flex h-full flex-col rounded border border-slate-200 bg-white shadow-sm">
      <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-1 bg-slate-800" style={{ left: 'calc(78px + ((100% - 78px) / 9) * 5)' }} />
      <div className={`grid ${chartGridClass}`}>
        <div className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-[10px] font-black uppercase text-slate-500">
          {label}
        </div>
        {places.map((place) => (
          <div
            className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-center text-[10px] font-black leading-[11px] text-slate-500 last:border-r-0"
            key={place.value}
          >
            {place.labelLines
              ? place.labelLines.map((line, index) => (
                  <span className="block" key={line}>
                    {line}
                    {index === 0 && !line.endsWith('-') ? ' ' : ''}
                  </span>
                ))
              : place.label}
          </div>
        ))}
      </div>
      <div className={`grid min-h-0 flex-1 ${chartGridClass}`}>
        <div className="flex h-full min-h-16 items-center border-r border-t border-slate-200 px-2 text-sm font-black text-slate-700">
          {label}
        </div>
        {places.map((place) => {
          const card = byPlace.get(place.value)

          return (
            <div
              className="relative flex h-full min-h-16 items-center justify-center border-r border-t border-slate-200 last:border-r-0"
              key={place.value}
            >
              {card && <DigitCard animate={animate} card={card} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OperationSwitch({ hoverProgress, isActive, isHovered, switchItem, switchRef }) {
  const isMultiply = switchItem.operation === 'multiply'
  const progressDegrees = Math.round(hoverProgress * 360)

  return (
    <div
      className={`relative flex h-14 w-24 items-center justify-center rounded-xl border-2 text-xl font-black shadow-sm transition ${
        isActive
          ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-amber-200'
          : isHovered
            ? 'border-sky-400 bg-sky-50 text-sky-900'
            : isMultiply
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-violet-200 bg-violet-50 text-violet-800'
      }`}
      ref={switchRef}
    >
      <div
        className="absolute -top-2 right-1 h-6 w-6 rounded-full"
        style={{
          background: `conic-gradient(#f59e0b ${progressDegrees}deg, #e2e8f0 0deg)`,
        }}
      >
        <div className="m-1 h-4 w-4 rounded-full bg-white" />
      </div>
      {switchItem.label}
    </div>
  )
}

export default function PowerOf10BlobExplorer() {
  const [startingNumber, setStartingNumber] = useState('3.6')
  const [activeSwitch, setActiveSwitch] = useState(null)
  const [blob, setBlob] = useState({ x: 385, y: 90 })
  const [hoveredSwitchId, setHoveredSwitchId] = useState(null)
  const [hoverProgress, setHoverProgress] = useState(0)
  const arenaRef = useRef(null)
  const switchRefs = useRef(new Map())
  const targetRef = useRef({ x: 385, y: 90 })
  const blobRef = useRef({ x: 385, y: 90 })
  const hoverStartRef = useRef(null)
  const activatedHoverRef = useRef(null)
  const generatedIndexRef = useRef(0)

  const model = useMemo(
    () => getModel(startingNumber, activeSwitch),
    [activeSwitch, startingNumber]
  )

  useEffect(() => {
    let frameId

    const tick = (time) => {
      const current = blobRef.current
      const target = targetRef.current
      const next = {
        x: current.x + (target.x - current.x) * 0.16,
        y: current.y + (target.y - current.y) * 0.16,
      }
      blobRef.current = next
      setBlob(next)

      const arenaRect = arenaRef.current?.getBoundingClientRect()
      let nextHover = null

      if (arenaRect) {
        switchRefs.current.forEach((element, id) => {
          const rect = element.getBoundingClientRect()
          const centerX = arenaRect.left + next.x
          const centerY = arenaRect.top + next.y
          if (
            centerX >= rect.left &&
            centerX <= rect.right &&
            centerY >= rect.top &&
            centerY <= rect.bottom
          ) {
            nextHover = id
          }
        })
      }

      if (nextHover !== hoveredSwitchId) {
        hoverStartRef.current = nextHover ? time : null
        activatedHoverRef.current = null
        setHoveredSwitchId(nextHover)
        setHoverProgress(0)
      } else if (nextHover) {
        const elapsed = time - (hoverStartRef.current ?? time)
        const progress = Math.min(1, elapsed / 850)
        setHoverProgress(progress)

        if (progress >= 1 && activatedHoverRef.current !== nextHover) {
          const switchItem = switches.find((item) => item.id === nextHover)
          if (switchItem) {
            setActiveSwitch(switchItem)
            activatedHoverRef.current = nextHover
          }
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [hoveredSwitchId])

  const setExample = (value) => {
    setStartingNumber(value)
    setActiveSwitch(null)
    setHoverProgress(0)
  }

  const generateNumber = () => {
    generatedIndexRef.current =
      (generatedIndexRef.current + 1) % generatedNumbers.length
    setExample(generatedNumbers[generatedIndexRef.current])
  }

  const handlePointerMove = (event) => {
    const rect = arenaRef.current.getBoundingClientRect()
    targetRef.current = {
      x: Math.max(22, Math.min(rect.width - 22, event.clientX - rect.left)),
      y: Math.max(22, Math.min(rect.height - 22, event.clientY - rect.top)),
    }
  }

  const reset = () => {
    setStartingNumber('3.6')
    setActiveSwitch(null)
    setHoverProgress(0)
    targetRef.current = { x: 385, y: 90 }
  }

  return (
    <div className="box-border flex h-[500px] w-[800px] flex-col overflow-hidden bg-sky-50 px-4 py-3 text-slate-700">
      <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black leading-5 text-slate-900">
            Multiplying & Dividing by Powers of 10
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Move the blob onto a switch and hold it there to see how the digits shift.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-sky-300 bg-white px-3 py-1.5 text-xs font-black text-sky-700 hover:bg-sky-50"
            onClick={generateNumber}
            type="button"
          >
            New Number
          </button>
          <button
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700"
            onClick={reset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-[170px_1fr] gap-2">
        <label className="rounded border border-slate-200 bg-white p-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
          Starting number
          <input
            className="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-sky-500"
            onChange={(event) => setExample(sanitizeNumberInput(event.target.value))}
            value={startingNumber}
            aria-label="Starting number"
          />
        </label>
        <div className="rounded border border-slate-200 bg-white p-2">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Result
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-2xl font-black tabular-nums text-slate-900">
            <span>
              <ColoredNumber cards={model.originalCards} />
            </span>
            {activeSwitch && (
              <>
                <span
                  className={
                    activeSwitch.operation === 'multiply'
                      ? 'text-emerald-600'
                      : 'text-violet-600'
                  }
                >
                  {activeSwitch.operation === 'multiply' ? 'x' : '÷'} {activeSwitch.power} =
                </span>
                <span>
                  <ColoredNumber cards={model.resultCards} />
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-2">
        <div className="grid shrink-0 grid-rows-2 gap-2">
          <PlaceValueChart label="Original" resultCards={model.originalCards} />
          <PlaceValueChart
            animate={Boolean(activeSwitch)}
            label="Result"
            resultCards={activeSwitch ? model.resultCards : []}
          />
        </div>

        <div
          className="relative min-h-0 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-inner"
          onPointerMove={handlePointerMove}
          ref={arenaRef}
        >
          <div className="absolute inset-x-10 top-2 grid grid-cols-[112px_repeat(3,1fr)] items-center justify-items-center gap-x-5 gap-y-1">
            <div className="w-24 rounded-full bg-emerald-50 px-3 py-1 text-center text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Multiply
            </div>
            {switches.slice(0, 3).map((switchItem) => (
              <OperationSwitch
                hoverProgress={hoveredSwitchId === switchItem.id ? hoverProgress : 0}
                isActive={activeSwitch?.id === switchItem.id}
                isHovered={hoveredSwitchId === switchItem.id}
                key={switchItem.id}
                switchItem={switchItem}
                switchRef={(element) => {
                  if (element) switchRefs.current.set(switchItem.id, element)
                }}
              />
            ))}
            <div className="w-24 rounded-full bg-violet-50 px-3 py-1 text-center text-[11px] font-black uppercase tracking-wide text-violet-700">
              Divide
            </div>
            {switches.slice(3).map((switchItem) => (
              <OperationSwitch
                hoverProgress={hoveredSwitchId === switchItem.id ? hoverProgress : 0}
                isActive={activeSwitch?.id === switchItem.id}
                isHovered={hoveredSwitchId === switchItem.id}
                key={switchItem.id}
                switchItem={switchItem}
                switchRef={(element) => {
                  if (element) switchRefs.current.set(switchItem.id, element)
                }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 text-xl shadow-lg ring-4 ring-sky-100 blob-character"
            style={{
              left: blob.x - 24,
              top: blob.y - 24,
            }}
          >
            <span className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-slate-900" />
            <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-slate-900" />
            <span className="absolute bottom-3 h-1 w-4 rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  )
}
