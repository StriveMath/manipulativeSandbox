import { useMemo, useRef, useState } from 'react'

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

const chartGridClass = 'grid-cols-[78px_repeat(9,minmax(0,1fr))]'
const chartMinPlace = places.at(-1).value
const chartMaxPlace = places[0].value

const cardThemes = {
  neutral: { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-800' },
  multiply: { border: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  divide: { border: 'border-violet-300', bg: 'bg-violet-100', text: 'text-violet-800' },
  placeholder: { border: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-800' },
}

const getCardTheme = (theme, source) => (
  source === 'zero' ? cardThemes.placeholder : cardThemes[theme] ?? cardThemes.neutral
)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const sanitizeNumberInput = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('')
  if (cleaned.includes('.')) return `${(integer || '0').slice(0, 4)}.${decimal.slice(0, 4)}`
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

const trimInsignificantZeros = (cards) => {
  const sorted = [...cards].sort((a, b) => b.place - a.place)
  while (sorted.length > 1 && sorted[0].digit === '0' && sorted[0].place > 0) sorted.shift()
  while (sorted.length > 1 && sorted.at(-1).digit === '0' && sorted.at(-1).place < 0) sorted.pop()

  if (sorted.every((card) => card.digit === '0')) {
    return [{ ...sorted[0], place: 0 }]
  }
  return sorted
}

const buildShiftedCards = (originalCards, shift) => {
  const shiftedCards = trimInsignificantZeros(originalCards.map((card) => ({
    ...card,
    place: card.place + shift,
  })))
  const usedPlaces = shiftedCards.map((card) => card.place)
  const maxPlace = Math.max(...usedPlaces, 0)
  const minPlace = Math.min(...usedPlaces, 0)
  const byPlace = new Map(shiftedCards.map((card) => [card.place, card]))
  const cards = []

  for (let place = maxPlace; place >= minPlace; place -= 1) {
    cards.push(byPlace.get(place) ?? {
      digit: '0',
      id: `zero-${shift}-${place}`,
      place,
      source: 'zero',
    })
  }
  return cards
}

const formatResultFromCards = (cards) => {
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

function ColoredNumber({ cards, theme = 'neutral' }) {
  const sortedCards = [...cards].sort((a, b) => b.place - a.place)
  const minPlace = Math.min(...sortedCards.map((card) => card.place), 0)
  const pieces = []

  sortedCards.forEach((card, index) => {
    if (index > 0 && sortedCards[index - 1].place === 0 && minPlace < 0) {
      pieces.push(<span className="mx-0.5 text-slate-400" key="decimal">.</span>)
    }
    pieces.push(
      <span className={getCardTheme(theme, card.source).text} key={card.id}>
        {card.digit}
      </span>,
    )
  })
  return <>{pieces}</>
}

function DigitCard({ card, dragOffset, theme }) {
  const color = getCardTheme(theme, card.source)

  return (
    <div
      className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl font-black shadow-sm ${color.border} ${color.bg} ${color.text}`}
      data-power-digit="true"
      style={{ transform: `translateX(${dragOffset}px)` }}
    >
      {card.digit}
    </div>
  )
}

function PlaceValueChart({
  dragOffset = 0,
  interactive = false,
  label,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resultCards,
  theme = 'neutral',
}) {
  const byPlace = new Map(resultCards.map((card) => [card.place, card]))

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className={`grid ${chartGridClass}`}>
        <div className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-[10px] font-black uppercase text-slate-500">{label}</div>
        {places.map((place) => (
          <div className="border-r border-slate-200 bg-slate-100 px-1 py-1 text-center text-[10px] font-black leading-[11px] text-slate-500 last:border-r-0" key={place.value}>
            {place.labelLines
              ? place.labelLines.map((line) => <span className="block" key={line}>{line}</span>)
              : place.label}
          </div>
        ))}
      </div>
      <div
        aria-label={interactive ? 'Draggable result number. Use left and right arrow keys or drag horizontally.' : undefined}
        className={`relative grid min-h-0 flex-1 ${chartGridClass} ${interactive ? 'touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400' : ''}`}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role={interactive ? 'slider' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
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
        <div className="flex h-full min-h-20 items-center border-r border-t border-slate-200 px-2 text-sm font-black text-slate-700">
          {interactive ? 'Drag me' : label}
        </div>
        {places.map((place) => {
          const card = byPlace.get(place.value)
          return (
            <div
              className={`relative flex h-full min-h-20 items-center justify-center border-r border-t border-slate-200 last:border-r-0 ${interactive && card ? 'cursor-grab active:cursor-grabbing' : ''}`}
              key={place.value}
            >
              {card && <DigitCard card={card} dragOffset={dragOffset} theme={theme} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Equation({ originalCards, resultCards, shift }) {
  if (shift === 0) {
    return (
      <div className="text-sm font-bold text-slate-500">
        Drag the bottom number left or right.
      </div>
    )
  }

  const isMultiply = shift > 0
  const theme = isMultiply ? 'multiply' : 'divide'
  const symbol = isMultiply ? '×' : '÷'
  const power = 10 ** Math.abs(shift)

  return (
    <div className="flex flex-wrap items-baseline gap-2 text-2xl font-black tabular-nums text-slate-900">
      <span><ColoredNumber cards={originalCards} /></span>
      <span className={isMultiply ? 'text-emerald-600' : 'text-violet-600'}>
        {symbol} {power} =
      </span>
      <span><ColoredNumber cards={resultCards} theme={theme} /></span>
    </div>
  )
}

export default function PowerOf10BlobExplorer() {
  const [startingNumber, setStartingNumber] = useState('3.6')
  const [shift, setShift] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const dragRef = useRef(null)
  const originalCards = useMemo(() => parseDigitCards(startingNumber), [startingNumber])
  const resultCards = useMemo(() => buildShiftedCards(originalCards, shift), [originalCards, shift])
  const bounds = useMemo(() => {
    const cardPlaces = originalCards.map((card) => card.place)
    return {
      max: chartMaxPlace - Math.max(...cardPlaces),
      min: chartMinPlace - Math.min(...cardPlaces),
    }
  }, [originalCards])
  const theme = shift > 0 ? 'multiply' : shift < 0 ? 'divide' : 'neutral'
  const result = formatResultFromCards(resultCards)

  const changeStartingNumber = (value) => {
    setStartingNumber(value)
    setShift(0)
    setDragOffset(0)
  }

  const moveOnePlace = (direction) => {
    setShift((currentShift) => clamp(currentShift + direction, bounds.min, bounds.max))
    setDragOffset(0)
  }

  const handlePointerDown = (event) => {
    if (!event.target.closest('[data-power-digit="true"]')) return
    const chart = event.currentTarget
    const chartRect = chart.getBoundingClientRect()
    const cellWidth = (chartRect.width - 78) / places.length
    chart.setPointerCapture(event.pointerId)
    dragRef.current = {
      cellWidth,
      pointerId: event.pointerId,
      startShift: shift,
      startX: event.clientX,
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const minOffset = -(bounds.max - drag.startShift) * drag.cellWidth
    const maxOffset = (drag.startShift - bounds.min) * drag.cellWidth
    setDragOffset(clamp(event.clientX - drag.startX, minOffset, maxOffset))
  }

  const finishDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const placeDelta = Math.round((event.clientX - drag.startX) / drag.cellWidth)
    setShift(clamp(drag.startShift - placeDelta, bounds.min, bounds.max))
    setDragOffset(0)
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const cancelDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    setDragOffset(0)
    dragRef.current = null
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveOnePlace(1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveOnePlace(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setShift(0)
      setDragOffset(0)
    }
  }

  return (
    <div className="box-border flex h-[500px] w-[800px] flex-col overflow-hidden bg-slate-50 px-4 py-3 text-slate-700">
      <div className="mb-2 grid h-[92px] shrink-0 grid-cols-[170px_1fr] gap-2">
        <label className="rounded border border-slate-200 bg-white p-2 text-[11px] font-black uppercase tracking-wide text-slate-400 shadow-sm">
          Starting number
          <input
            aria-label="Starting number"
            className="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-amber-500"
            onChange={(event) => changeStartingNumber(sanitizeNumberInput(event.target.value))}
            value={startingNumber}
          />
        </label>
        <div className="flex min-w-0 flex-col justify-center rounded border border-slate-200 bg-white px-4 shadow-sm">
          <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            Math operation
          </div>
          <Equation originalCards={originalCards} resultCards={resultCards} shift={shift} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2">
        <PlaceValueChart label="Original" resultCards={originalCards} />
        <PlaceValueChart
          dragOffset={dragOffset}
          interactive
          label="Result"
          onKeyDown={handleKeyDown}
          onPointerCancel={cancelDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          resultCards={resultCards}
          theme={theme}
        />
      </div>

      <div aria-live="polite" className="sr-only" role="status">
        {shift === 0
          ? `${normalizeNumberText(startingNumber)} is in its original place.`
          : `${normalizeNumberText(startingNumber)} ${shift > 0 ? 'times' : 'divided by'} ${10 ** Math.abs(shift)} equals ${result}.`}
      </div>
    </div>
  )
}
