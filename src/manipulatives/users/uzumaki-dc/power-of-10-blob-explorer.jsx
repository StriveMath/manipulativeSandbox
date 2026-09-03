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

function FormattedResult({ cards }) {
  const sortedCards = [...cards].sort((a, b) => b.place - a.place)
  const minPlace = Math.min(...sortedCards.map((card) => card.place), 0)
  const pieces = []

  sortedCards.forEach((card, index) => {
    if (index > 0 && sortedCards[index - 1].place === 0 && minPlace < 0) {
      pieces.push(<span key="decimal">.</span>)
    }
    pieces.push(
      <span className={card.source === 'zero' ? 'text-amber-600' : 'text-slate-950'} key={card.id}>
        {card.digit}
      </span>,
    )
  })
  return <>{pieces}</>
}

function DecimalMarker() {
  return (
    <span
      aria-label="Decimal point between ones and tenths"
      className="pointer-events-none absolute z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      role="img"
      style={{
        left: 'calc(78px + ((100% - 78px) / 9) * 5)',
        top: '50%',
      }}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
    </span>
  )
}

function NumberRow({
  dragOffset = 0,
  fadingZeros = [],
  interactive = false,
  label,
  onFadeEnd,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resultCards,
}) {
  const byPlace = new Map(resultCards.map((card) => [card.place, card]))

  return (
    <div
      aria-label={interactive ? 'Draggable answer row. Use left and right arrow keys or drag horizontally.' : undefined}
      className={`relative grid h-[82px] ${chartGridClass} ${interactive ? 'touch-none select-none cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400' : ''}`}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <DecimalMarker />
      <div className="flex h-full items-center border-r border-t border-slate-200 px-2 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {places.map((place) => {
        const card = byPlace.get(place.value)
        const exitingZeros = fadingZeros.filter((zero) => zero.place === place.value)
        return (
          <div
            className="relative flex h-full items-center justify-center border-r border-t border-slate-200 last:border-r-0"
            key={place.value}
          >
            {card && (
              <span
                className={`text-2xl font-black tabular-nums ${card.source === 'zero' ? 'text-amber-600' : 'text-slate-950'}`}
                style={{ transform: `translateX(${dragOffset}px)` }}
              >
                {card.digit}
              </span>
            )}
            {exitingZeros.map((zero) => (
              <span
                className="power-zero-fade pointer-events-none absolute text-2xl font-black tabular-nums text-amber-600"
                key={zero.id}
                onAnimationEnd={() => onFadeEnd(zero.id)}
              >
                0
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function PlaceValueTable({
  dragOffset,
  fadingZeros,
  onFadeEnd,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  originalCards,
  resultCards,
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className={`grid h-[38px] ${chartGridClass}`}>
        <div className="flex items-center border-r border-slate-200 bg-slate-100 px-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
          Place value
        </div>
        {places.map((place) => (
          <div className="flex items-center justify-center border-r border-slate-200 bg-slate-100 px-1 text-center text-[10px] font-black leading-[11px] text-slate-500 last:border-r-0" key={place.value}>
            <span>
              {place.labelLines
                ? place.labelLines.map((line) => <span className="block" key={line}>{line}</span>)
                : place.label}
            </span>
          </div>
        ))}
      </div>
      <NumberRow label="Original" resultCards={originalCards} />
      <NumberRow
        dragOffset={dragOffset}
        fadingZeros={fadingZeros}
        interactive
        label="Answer"
        onFadeEnd={onFadeEnd}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        resultCards={resultCards}
      />
    </div>
  )
}

export default function PowerOf10BlobExplorer() {
  const [startingNumber, setStartingNumber] = useState('3.6')
  const [shift, setShift] = useState(0)
  const [direction, setDirection] = useState('multiply')
  const [factorInput, setFactorInput] = useState('1')
  const [dragOffset, setDragOffset] = useState(0)
  const [fadingZeros, setFadingZeros] = useState([])
  const dragRef = useRef(null)
  const fadeIdRef = useRef(0)
  const originalCards = useMemo(() => parseDigitCards(startingNumber), [startingNumber])
  const resultCards = useMemo(() => buildShiftedCards(originalCards, shift), [originalCards, shift])
  const bounds = useMemo(() => {
    const cardPlaces = originalCards.map((card) => card.place)
    return {
      max: chartMaxPlace - Math.max(...cardPlaces),
      min: chartMinPlace - Math.min(...cardPlaces),
    }
  }, [originalCards])
  const result = formatResultFromCards(resultCards)

  const applyShift = (requestedShift) => {
    const nextShift = clamp(requestedShift, bounds.min, bounds.max)
    if (nextShift === shift) {
      setFactorInput(String(10 ** Math.abs(nextShift)))
      setDragOffset(0)
      return
    }

    const shiftDelta = nextShift - shift
    const nextCards = buildShiftedCards(originalCards, nextShift)
    const nextZeroPlaces = new Set(
      nextCards.filter((card) => card.digit === '0').map((card) => card.place),
    )
    const removedZeros = resultCards
      .filter((card) => card.digit === '0')
      .map((card) => ({ ...card, place: card.place + shiftDelta }))
      .filter((card) => (
        card.place >= chartMinPlace &&
        card.place <= chartMaxPlace &&
        !nextZeroPlaces.has(card.place)
      ))
      .map((card) => {
        fadeIdRef.current += 1
        return {
          id: `fade-${fadeIdRef.current}`,
          place: card.place,
        }
      })

    if (removedZeros.length > 0) {
      setFadingZeros((current) => [...current, ...removedZeros])
    }
    setShift(nextShift)
    setFactorInput(String(10 ** Math.abs(nextShift)))
    setDragOffset(0)
    if (nextShift !== 0) setDirection(nextShift > 0 ? 'multiply' : 'divide')
  }

  const changeStartingNumber = (value) => {
    setStartingNumber(value)
    setShift(0)
    setDirection('multiply')
    setFactorInput('1')
    setDragOffset(0)
    setFadingZeros([])
  }

  const changeFactor = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 5)
    setFactorInput(digits)
    if (!/^10{0,4}$/.test(digits)) return

    const magnitude = digits.length - 1
    applyShift(magnitude === 0 ? 0 : direction === 'divide' ? -magnitude : magnitude)
  }

  const handlePointerDown = (event) => {
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
    applyShift(drag.startShift - placeDelta)
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
      applyShift(shift + 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      applyShift(shift - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      applyShift(0)
    }
  }

  const removeFadingZero = (id) => {
    setFadingZeros((current) => current.filter((zero) => zero.id !== id))
  }

  return (
    <div className="box-border h-[500px] w-[800px] overflow-hidden bg-slate-50 px-4 py-3 text-slate-700">
      <div className="mb-3 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
          Math operation
        </div>
        <div className="flex items-center gap-3 text-2xl font-black tabular-nums text-slate-950">
          <input
            aria-label="Starting number"
            className="h-11 w-36 rounded border border-slate-300 bg-white px-2 text-center text-2xl font-black tabular-nums text-slate-950 outline-none focus:border-amber-500"
            onChange={(event) => changeStartingNumber(sanitizeNumberInput(event.target.value))}
            value={startingNumber}
          />
          <span>{direction === 'multiply' ? '×' : '÷'}</span>
          <input
            aria-label="Power of ten"
            className="h-11 w-28 rounded border border-amber-300 bg-amber-50 px-2 text-center text-2xl font-black tabular-nums text-amber-700 outline-none focus:border-amber-500"
            inputMode="numeric"
            onBlur={() => setFactorInput(String(10 ** Math.abs(shift)))}
            onChange={(event) => changeFactor(event.target.value)}
            value={factorInput}
          />
          <span>=</span>
          <span className="min-w-0 truncate">
            <FormattedResult cards={resultCards} />
          </span>
        </div>
      </div>

      <PlaceValueTable
        dragOffset={dragOffset}
        fadingZeros={fadingZeros}
        onFadeEnd={removeFadingZero}
        onKeyDown={handleKeyDown}
        onPointerCancel={cancelDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        originalCards={originalCards}
        resultCards={resultCards}
      />

      <div aria-live="polite" className="sr-only" role="status">
        {normalizeNumberText(startingNumber)} {direction === 'multiply' ? 'times' : 'divided by'} {10 ** Math.abs(shift)} equals {result}.
      </div>
    </div>
  )
}
