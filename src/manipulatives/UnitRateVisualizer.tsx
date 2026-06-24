import React, { useMemo, useState } from 'react'

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return ''
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

const emojiMap: Record<string, string> = {
  km: '🛣️',
  kms: '🛣️',
  miles: '🛣️',
  fuel: '⛽',
  gas: '⛽',
  lit: '⛽',
  lits: '⛽',
  liters: '⛽',
  money: '💵',
  '$': '💵',
  dollars: '💵',
  cash: '💵',
  cents: '🪙',
  chocolate: '🍫',
  chocolates: '🍫',
  chocs: '🍫',
  cookie: '🍪',
  cookies: '🍪',
  apple: '🍎',
  apples: '🍎',
  car: '🚗',
  cars: '🚗',
  pizza: '🍕',
  pizzas: '🍕',
  hours: '⏰',
  hrs: '⏰',
  time: '⏰',
  candy: '🍬',
  candies: '🍬',
}

const getUnitSymbol = (unit: string) => {
  const key = unit.toLowerCase().trim()
  return emojiMap[key] ?? unit.slice(0, 2).toUpperCase()
}

function UnitDot({ label, partial = 1, scale }: { label: string; partial?: number; scale: number }) {
  const size = Math.max(8, 28 * scale)
  const text = size < 13 ? '' : getUnitSymbol(label)

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-blue-500 bg-white font-black leading-none text-blue-700 shadow-sm"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(7, 10 * scale),
        clipPath: partial < 1 ? `inset(0 ${100 - partial * 100}% 0 0)` : undefined,
        opacity: partial < 1 ? 0.9 : 1,
      }}
    >
      {text}
    </div>
  )
}

function FractionInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-16 rounded-lg border-2 border-slate-300 bg-white text-center text-lg font-black text-slate-800 shadow-inner outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  )
}

export default function UnitRateVisualizer() {
  const [totalAmount, setTotalAmount] = useState('9')
  const [amountUnit, setAmountUnit] = useState('kms')
  const [totalGroups, setTotalGroups] = useState('3')
  const [groupUnit, setGroupUnit] = useState('lits')
  const [formulaNumerator, setFormulaNumerator] = useState('')
  const [formulaDenominator, setFormulaDenominator] = useState('')
  const [answer, setAnswer] = useState('')

  const amount = clampNumber(parsePositiveNumber(totalAmount), 0, 5000)
  const groups = clampNumber(parsePositiveNumber(totalGroups), 0, 5000)
  const answerValue = Number(answer)
  const hasAnswer = answer.trim() !== '' && Number.isFinite(answerValue) && answerValue > 0
  const expectedRate = groups > 0 ? amount / groups : 0
  const amountSymbol = getUnitSymbol(amountUnit)
  const groupSymbol = getUnitSymbol(groupUnit)
  const formulaIsFilled =
    Math.abs(Number(formulaNumerator) - amount) < 0.001 &&
    Math.abs(Number(formulaDenominator) - groups) < 0.001
  const answerIsCorrect = hasAnswer && Math.abs(expectedRate - answerValue) < 0.02

  const visual = useMemo(() => {
    const boardArea = 600 * 220
    const itemArea = hasAnswer ? 2200 : 1400
    const neededArea = amount * itemArea
    const scale = neededArea > boardArea ? Math.sqrt(boardArea / neededArea) * 0.85 : 1
    const displayScale = Math.max(0.08, Math.min(1, scale))
    const maxRendered = Math.min(amount, 220)

    if (!hasAnswer) {
      return {
        scale: displayScale,
        dots: Array.from({ length: maxRendered }, (_, index) => ({ id: `dot-${index}`, partial: 1 })),
        groups: [],
        omitted: amount - maxRendered,
      }
    }

    const builtGroups: Array<Array<{ id: string; partial: number }>> = []
    let itemsLeft = amount
    let rendered = 0
    let groupIndex = 0
    const groupSize = Math.max(0.01, answerValue)

    while (itemsLeft > 0.001 && groupIndex < 5000 && rendered < 220) {
      const currentSize = Math.min(itemsLeft, groupSize)
      const wholeCount = Math.floor(currentSize)
      let partial = currentSize - wholeCount
      const currentGroup: Array<{ id: string; partial: number }> = []

      for (let itemIndex = 0; itemIndex < wholeCount && rendered < 220; itemIndex += 1) {
        currentGroup.push({ id: `group-${groupIndex}-item-${itemIndex}`, partial: 1 })
        rendered += 1
      }

      if (partial > 0.001 && rendered < 220) {
        if (Math.abs(partial - 1) < 0.001) partial = 1
        currentGroup.push({ id: `group-${groupIndex}-partial`, partial })
        rendered += 1
      }

      builtGroups.push(currentGroup)
      itemsLeft -= currentSize
      groupIndex += 1
    }

    return {
      scale: displayScale,
      dots: [],
      groups: builtGroups,
      omitted: Math.max(0, amount - rendered),
    }
  }, [amount, answerValue, hasAnswer])

  const madeGroups = visual.groups.length
  const feedback = (() => {
    if (amount <= 0 || groups <= 0) return 'Enter positive values for amount and groups.'
    if (!hasAnswer) return 'Type your unit rate to divide the amount into equal groups.'
    if (!answerIsCorrect) {
      return madeGroups !== groups
        ? `You made ${madeGroups} group(s). Try ${formatNumber(amount)} divided by ${formatNumber(groups)}.`
        : "Look closely. The groups don't match the total amount yet."
    }
    if (!formulaIsFilled) return 'Good math. Now fill the fraction as total amount over total groups.'
    return `Great job. ${formatNumber(amount)} divided by ${formatNumber(groups)} is ${formatNumber(expectedRate)} ${amountUnit || 'units'} per ${groupUnit || 'group'}.`
  })()

  const boardTone = answerIsCorrect && formulaIsFilled ? 'border-green-300 bg-green-50' : answerIsCorrect ? 'border-amber-300 bg-amber-50' : hasAnswer ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
  const answerTone = answerIsCorrect && formulaIsFilled ? 'border-green-500 bg-green-50 text-green-700' : answerIsCorrect ? 'border-amber-500 bg-amber-50 text-amber-700' : hasAnswer ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 bg-slate-50 text-blue-600'

  return (
    <div className="flex h-[500px] w-[800px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 font-sans text-slate-700 shadow-xl">
      <header className="relative flex h-20 shrink-0 items-center justify-center border-b border-slate-200 bg-white px-5 shadow-sm">
        <h1 className="absolute left-6 text-2xl font-black tracking-tight text-blue-600">Unit Rates</h1>

        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{amountSymbol}</span>
              <input
                type="number"
                min="1"
                max="5000"
                aria-label="Total amount"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                className="h-8 w-14 rounded-lg border border-blue-200 bg-white text-center text-base font-black text-blue-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                type="text"
                aria-label="Amount unit"
                value={amountUnit}
                onChange={(event) => setAmountUnit(event.target.value)}
                className="h-8 w-16 rounded-lg border border-blue-200 bg-white text-center text-base font-black text-blue-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-blue-500">Total Amt</span>
          </div>
          <span className="pt-1 text-lg text-slate-400">:</span>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{groupSymbol}</span>
              <input
                type="number"
                min="1"
                max="5000"
                aria-label="Total groups"
                value={totalGroups}
                onChange={(event) => setTotalGroups(event.target.value)}
                className="h-8 w-14 rounded-lg border border-amber-200 bg-white text-center text-base font-black text-amber-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
              <input
                type="text"
                aria-label="Group unit"
                value={groupUnit}
                onChange={(event) => setGroupUnit(event.target.value)}
                className="h-8 w-16 rounded-lg border border-amber-200 bg-white text-center text-base font-black text-amber-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-amber-500">Total Groups</span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-auto bg-slate-50/70 p-10">
        <section className={`relative inline-flex min-h-[110px] min-w-[220px] max-w-[740px] items-center justify-center rounded-2xl border-2 p-8 shadow-sm transition ${boardTone}`}>
          <div className="absolute -top-3 right-6 z-10 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-sm font-black text-blue-700 shadow-sm">
            {amountSymbol} {formatNumber(amount)} {amountUnit}
          </div>
          {hasAnswer && (
            <div className="absolute -bottom-3 right-6 z-10 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm font-black text-amber-700 shadow-sm">
              {groupSymbol} {formatNumber(groups)} {groupUnit}
            </div>
          )}

          {!hasAnswer ? (
            <div className="flex w-full flex-row flex-wrap content-center justify-center" style={{ gap: `${12 * visual.scale}px` }}>
              {visual.dots.map((dot) => (
                <UnitDot key={dot.id} label={amountUnit} scale={visual.scale} />
              ))}
            </div>
          ) : (
            <div className="flex w-full flex-row flex-wrap content-center justify-center" style={{ gap: `${16 * visual.scale}px` }}>
              {visual.groups.map((group, groupIndex) => (
                <div
                  key={`group-${groupIndex}`}
                  className={`flex flex-wrap items-center justify-start rounded-full border p-2 shadow-sm transition ${
                    answerIsCorrect && formulaIsFilled
                      ? 'border-green-300 bg-green-100'
                      : answerIsCorrect
                        ? 'border-amber-300 bg-amber-100'
                        : 'border-red-300 bg-red-100'
                  }`}
                  style={{ gap: `${8 * visual.scale}px`, padding: `${8 * visual.scale}px ${12 * visual.scale}px` }}
                >
                  {group.map((dot) => (
                    <UnitDot key={dot.id} label={amountUnit} partial={dot.partial} scale={visual.scale} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {visual.omitted > 0 && (
            <div className="absolute bottom-2 left-4 text-[10px] font-bold text-slate-400">
              +{formatNumber(visual.omitted)} more shown by scale
            </div>
          )}
        </section>
      </main>

      <footer className="relative flex h-36 shrink-0 flex-col items-center justify-center border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center justify-center gap-5 text-xl font-black text-slate-700">
          <span className="text-slate-500">Unit Rate =</span>
          <div className="flex flex-col items-center text-sm font-bold text-slate-500">
            <span>Total Amount</span>
            <div className="my-1 h-[3px] w-full rounded bg-slate-400" />
            <span>Total Groups</span>
          </div>
          <span className="text-slate-400">=</span>
          <div className="flex flex-col items-center text-2xl text-slate-800">
            <FractionInput value={formulaNumerator} onChange={setFormulaNumerator} placeholder="?" />
            <div className="my-1 h-[3px] w-full rounded bg-slate-700" />
            <FractionInput value={formulaDenominator} onChange={setFormulaDenominator} placeholder="?" />
          </div>
          <span className="text-slate-400">=</span>
          <input
            type="number"
            step="any"
            value={answer}
            placeholder="?"
            onChange={(event) => setAnswer(event.target.value)}
            className={`h-16 w-24 rounded-lg border-2 text-center text-4xl font-black shadow-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${answerTone}`}
          />
        </div>

        <div className={`absolute bottom-3 w-full px-4 text-center text-base font-black ${answerIsCorrect && formulaIsFilled ? 'text-green-600' : answerIsCorrect ? 'text-amber-500' : hasAnswer ? 'text-red-500' : 'text-slate-500'}`}>
          {feedback}
        </div>
      </footer>
    </div>
  )
}
