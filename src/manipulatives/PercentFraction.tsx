import React, { useMemo, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Grid3X3,
  PlusCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

interface FractionRow {
  id: string
  denominator: number
  userNumerator: string
  userPercent: string
}

const DENOMINATOR_OPTIONS = [2, 4, 5, 10, 20, 25, 50, 100]

function gcd(a: number, b: number) {
  let first = Math.abs(Math.round(a))
  let second = Math.abs(Math.round(b))

  while (second) {
    const next = second
    second = first % second
    first = next
  }

  return first || 1
}

function reduceFraction(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator)
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  }
}

function formatPercent(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)
}

function fractionToPercent(numerator: number, denominator: number) {
  return (numerator / denominator) * 100
}

function HundredGrid({ percent }: { percent: number }) {
  const filled = Math.round(percent)

  return (
    <div className="grid grid-cols-10 grid-rows-10 gap-[2px] rounded-lg border border-slate-300 bg-slate-100 p-1 shadow-inner">
      {Array.from({ length: 100 }).map((_, index) => (
        <motion.div
          key={index}
          animate={{
            backgroundColor: index < filled ? '#2563eb' : '#e2e8f0',
            scale: index < filled ? 1 : 0.92,
          }}
          transition={{ duration: 0.12 }}
          className="h-2.5 w-2.5 rounded-[2px]"
        />
      ))}
    </div>
  )
}

function FractionStrip({
  numerator,
  denominator,
}: {
  numerator: number
  denominator: number
}) {
  return (
    <div
      className="grid h-12 overflow-hidden rounded-lg border border-amber-300 bg-amber-50 shadow-inner"
      style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: denominator }).map((_, index) => (
        <motion.div
          key={index}
          animate={{ backgroundColor: index < numerator ? '#f59e0b' : '#fff7ed' }}
          transition={{ duration: 0.12 }}
          className="border-r border-amber-200 last:border-r-0"
        />
      ))}
    </div>
  )
}

function FractionVisual({
  numerator,
  denominator,
  percent,
}: {
  numerator: number
  denominator: number
  percent: number
}) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Visual Model
        </span>
        <span className="rounded-md bg-blue-100 px-2 py-1 font-mono text-[10px] font-black text-blue-700">
          {formatPercent(percent)}%
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
            <span>Percent grid</span>
            <span>{Math.round(percent)} out of 100</span>
          </div>
          <HundredGrid percent={percent} />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
            <span>Fraction strip</span>
            <span>
              {numerator} out of {denominator}
            </span>
          </div>
          <FractionStrip numerator={numerator} denominator={denominator} />
        </div>
      </div>
    </div>
  )
}

export default function PercentFraction() {
  const [baseNumerator, setBaseNumerator] = useState(3)
  const [baseDenominator, setBaseDenominator] = useState(4)
  const [showVisual, setShowVisual] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [rows, setRows] = useState<FractionRow[]>([
    { id: 'row-1', denominator: 100, userNumerator: '', userPercent: '' },
    { id: 'row-2', denominator: 20, userNumerator: '', userPercent: '' },
  ])

  const basePercent = fractionToPercent(baseNumerator, baseDenominator)
  const reduced = reduceFraction(baseNumerator, baseDenominator)
  const exactRows = useMemo(
    () =>
      rows.map((row) => {
        const numerator = (baseNumerator / baseDenominator) * row.denominator
        const percent = fractionToPercent(numerator, row.denominator)

        return {
          ...row,
          numerator,
          percent,
          hasWholeNumerator: Number.isInteger(numerator),
        }
      }),
    [baseDenominator, baseNumerator, rows],
  )

  const selected = focusedIndex === 0 ? null : exactRows[focusedIndex - 1]
  const visualNumerator = selected?.hasWholeNumerator
    ? selected.numerator
    : baseNumerator
  const visualDenominator = selected?.hasWholeNumerator
    ? selected.denominator
    : baseDenominator

  const updateBase = (nextNumerator: number, nextDenominator: number) => {
    const safeDenominator = Math.max(1, nextDenominator)
    const safeNumerator = Math.min(Math.max(0, nextNumerator), safeDenominator)
    setBaseNumerator(safeNumerator)
    setBaseDenominator(safeDenominator)
    setFocusedIndex(0)
  }

  const addRow = () => {
    const used = rows.map((row) => row.denominator)
    const nextDenominator =
      DENOMINATOR_OPTIONS.find((option) => !used.includes(option)) ?? 100

    setRows([
      ...rows,
      {
        id: `row-${Date.now()}`,
        denominator: nextDenominator,
        userNumerator: '',
        userPercent: '',
      },
    ])
    setFocusedIndex(rows.length + 1)
  }

  const updateRow = (
    id: string,
    updates: Partial<Pick<FractionRow, 'denominator' | 'userNumerator' | 'userPercent'>>,
  ) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...updates } : row)))
  }

  const solveRow = (row: (typeof exactRows)[number], rowIndex: number) => {
    updateRow(row.id, {
      userNumerator: row.hasWholeNumerator ? String(row.numerator) : '',
      userPercent: formatPercent(row.percent),
    })
    setFocusedIndex(rowIndex)
  }

  const reset = () => {
    setBaseNumerator(3)
    setBaseDenominator(4)
    setShowVisual(false)
    setFocusedIndex(0)
    setRows([
      { id: 'row-1', denominator: 100, userNumerator: '', userPercent: '' },
      { id: 'row-2', denominator: 20, userNumerator: '', userPercent: '' },
    ])
  }

  return (
    <div className="flex h-[500px] w-[800px] select-none items-center justify-center overflow-hidden bg-slate-100 p-2 font-sans text-slate-800">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-xl">
        <header className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-700">
              <Grid3X3 className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-black leading-none tracking-tight text-slate-900">
                Percent - Fraction Table
              </h1>
              <p className="mt-1 text-[10px] font-bold text-slate-500">
                Build equivalent fractions and connect each one to a percent.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowVisual(!showVisual)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[9.5px] font-extrabold transition ${
                showVisual
                  ? 'border-slate-700 bg-slate-700 text-white'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
              title={showVisual ? 'Hide visual model' : 'Show visual model'}
            >
              {showVisual ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showVisual ? 'Hide Model' : 'Show Model'}</span>
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <section
            className={`flex min-h-0 flex-col transition-all duration-200 ${
              showVisual ? 'w-[62%]' : 'w-full'
            }`}
          >
            <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Starting Fraction
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateBase(baseNumerator - 1, baseDenominator)}
                      className="h-5 w-5 rounded bg-slate-100 text-xs font-black hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-black">
                      {baseNumerator}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateBase(baseNumerator + 1, baseDenominator)}
                      className="h-5 w-5 rounded bg-slate-100 text-xs font-black hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-lg font-black text-slate-300">/</span>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateBase(baseNumerator, baseDenominator - 1)}
                      className="h-5 w-5 rounded bg-slate-100 text-xs font-black hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-black">
                      {baseDenominator}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateBase(baseNumerator, baseDenominator + 1)}
                      className="h-5 w-5 rounded bg-slate-100 text-xs font-black hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center text-lg font-black text-slate-300">=</div>

              <div className="text-right">
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Percent Form
                </p>
                <div className="font-mono text-2xl font-black text-blue-700">
                  {formatPercent(basePercent)}%
                </div>
                <p className="text-[10px] font-bold text-slate-500">
                  simplified: {reduced.numerator}/{reduced.denominator}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border-2 border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="divide-x divide-slate-300 border-b-2 border-slate-300 bg-slate-50 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                    <th className="w-[25%] py-2 text-center">denominator</th>
                    <th className="w-[25%] py-2 text-center text-amber-700">fraction</th>
                    <th className="w-[25%] py-2 text-center text-blue-700">percent</th>
                    <th className="w-[25%] py-2 text-center">action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr
                    onClick={() => setFocusedIndex(0)}
                    className={`h-[44px] divide-x divide-slate-200 ${
                      focusedIndex === 0 ? 'bg-blue-50/40' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="text-center font-mono text-[11px] font-black text-slate-500">
                      base
                    </td>
                    <td className="text-center font-mono text-xs font-black text-amber-700">
                      {baseNumerator}/{baseDenominator}
                    </td>
                    <td className="text-center font-mono text-xs font-black text-blue-700">
                      {formatPercent(basePercent)}%
                    </td>
                    <td className="text-center">
                      <span className="rounded bg-slate-100 px-1.5 py-1 text-[8.5px] font-black text-slate-400">
                        Start
                      </span>
                    </td>
                  </tr>

                  {exactRows.map((row, index) => {
                    const rowIndex = index + 1
                    const typedNumerator = Number(row.userNumerator)
                    const typedPercent = Number(row.userPercent)
                    const numeratorCorrect =
                      row.userNumerator.trim() !== '' &&
                      row.hasWholeNumerator &&
                      typedNumerator === row.numerator
                    const percentCorrect =
                      row.userPercent.trim() !== '' &&
                      Math.abs(typedPercent - row.percent) < 0.05

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setFocusedIndex(rowIndex)}
                        className={`h-[48px] divide-x divide-slate-200 transition ${
                          focusedIndex === rowIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="text-center">
                          <select
                            value={row.denominator}
                            onChange={(event) =>
                              updateRow(row.id, {
                                denominator: Number(event.target.value),
                                userNumerator: '',
                                userPercent: '',
                              })
                            }
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-mono text-[11px] font-black text-slate-700 outline-none focus:border-blue-400"
                          >
                            {DENOMINATOR_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                /{option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3">
                          <div className="relative mx-auto flex max-w-[94px] items-center gap-1">
                            <input
                              value={row.userNumerator}
                              onChange={(event) =>
                                updateRow(row.id, { userNumerator: event.target.value })
                              }
                              onFocus={() => setFocusedIndex(rowIndex)}
                              inputMode="numeric"
                              placeholder={row.hasWholeNumerator ? '?' : 'n/a'}
                              disabled={!row.hasWholeNumerator}
                              className={`w-full rounded-lg border px-2 py-1 text-center font-mono text-xs font-black outline-none transition ${
                                numeratorCorrect
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                  : row.userNumerator.trim() !== ''
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-slate-300 bg-white text-slate-800 focus:border-amber-400'
                              } disabled:bg-slate-100 disabled:text-slate-400`}
                            />
                            <span className="font-mono text-[11px] font-black text-slate-400">
                              /{row.denominator}
                            </span>
                            {numeratorCorrect && (
                              <Check className="absolute right-8 h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-3">
                          <div className="relative mx-auto flex max-w-[88px] items-center gap-1">
                            <input
                              value={row.userPercent}
                              onChange={(event) =>
                                updateRow(row.id, { userPercent: event.target.value })
                              }
                              onFocus={() => setFocusedIndex(rowIndex)}
                              inputMode="decimal"
                              placeholder="?"
                              className={`w-full rounded-lg border px-2 py-1 text-center font-mono text-xs font-black outline-none transition ${
                                percentCorrect
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                  : row.userPercent.trim() !== ''
                                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                                    : 'border-slate-300 bg-white text-slate-800 focus:border-blue-400'
                              }`}
                            />
                            <span className="font-mono text-[11px] font-black text-slate-400">%</span>
                            {percentCorrect && (
                              <Check className="absolute right-5 h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-2 text-center">
                          <div className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => solveRow(row, rowIndex)}
                              className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[8.5px] font-black text-blue-700 hover:bg-blue-100"
                            >
                              Solve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRows(rows.filter((item) => item.id !== row.id))
                                setFocusedIndex(0)
                              }}
                              className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <footer className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-bold text-slate-500">
                Keep the fraction value constant while the denominator changes.
              </span>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1 text-[10px] font-black text-white shadow-sm hover:bg-blue-700"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
            </footer>
          </section>

          <AnimatePresence>
            {showVisual && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '38%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-h-0 shrink-0 overflow-hidden"
              >
                <FractionVisual
                  numerator={visualNumerator}
                  denominator={visualDenominator}
                  percent={basePercent}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
