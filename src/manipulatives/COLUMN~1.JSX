import { useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  operator: '#1E7A5E',
  decimalBg: '#BFE3F2',
  decimalText: '#134858',
  carryBg: '#FDF6EC',
  carryBorder: '#E0B579',
  carryText: '#8A4A12',
  divisorBg: '#EAF0FB',
  divisorText: '#2660C4',
  bar: '#A93226',
  correctBg: '#EAF3DE',
  correctText: '#27500A',
  wrongBg: '#FBE9ED',
  wrongText: '#8A2540',
  focus: '#7B3F9E',
  gridLine: 'rgba(26, 26, 46, 0.16)',
}

const OPS = ['+', '−', '×', '÷']

const PROBLEMS = {
  '+': [
    { a: 123.28, b: 34.9, result: 158.18 },
    { a: 45.67, b: 8.5, result: 54.17 },
    { a: 1234.567, b: 891.2, result: 2125.767 },
  ],
  '−': [
    { a: 45.6, b: 12.85, result: 32.75 },
    { a: 70.2, b: 34.56, result: 35.64 },
    { a: 2000.125, b: 456.4, result: 1543.725 },
  ],
  '×': [
    { a: 234, b: 6, result: 1404 },
    { a: 537, b: 4, result: 2148 },
  ],
  '÷': [
    { a: 936, b: 6, quotient: 156 },
    { a: 725, b: 5, quotient: 145 },
    { a: 1512, b: 8, quotient: 189 },
  ],
}

const HINTS = {
  '+': 'Add right to left. Past 9? Type the carry in the box above the next column and include it in that sum.',
  '−': 'Too small to subtract? Tap the digit to cross it out, type its new value above. If a column is already holding a value, its box can fit two digits — add the borrowed 1 right next to it.',
  '×': "Multiply each digit right to left; type carries above, add them into the next column's product.",
  '÷': 'Divide, multiply, subtract, bring down — repeat. 9 ÷ 6 = 1 remainder 3: type 1 on top, 6 below, subtract to get 3, bring down the next digit to make 33, and keep going.',
}

function splitDigits(n) {
  const s = Math.abs(n).toString()
  const [intPart, fracPart = ''] = s.split('.')
  return { int: intPart.split(''), frac: fracPart === '' ? [] : fracPart.split('') }
}

function finalizeRow(row, decIdx, active) {
  if (decIdx >= 0) row[decIdx] = { t: 'dec', active }
  return row
}

function linkSequence(ids, nextMap, prevMap) {
  ids.forEach((id, i) => {
    nextMap[id] = i < ids.length - 1 ? ids[i + 1] : null
    prevMap[id] = i > 0 ? ids[i - 1] : null
  })
}

function buildColumnar(operator, problem) {
  const { a, b, result } = problem
  const da = splitDigits(a)
  const db = splitDigits(b)
  const dr = splitDigits(result)
  const isAddSub = operator === '+' || operator === '−'
  const minIntCols = isAddSub ? 4 : 0
  const minFracCols = isAddSub ? 3 : 0
  const intCols = Math.max(minIntCols, da.int.length, db.int.length, dr.int.length)
  const fracCols = Math.max(minFracCols, da.frac.length, db.frac.length, dr.frac.length)
  const hasDecimal = fracCols > 0
  const totalCols = intCols + (hasDecimal ? 1 : 0) + fracCols
  const decIdx = hasDecimal ? intCols : -1

  function digitRow(d, { crossable } = {}) {
    const row = new Array(totalCols).fill(null)
    const offInt = intCols - d.int.length
    d.int.forEach((digit, i) => {
      row[offInt + i] = { t: 'static', v: digit, crossable: Boolean(crossable) }
    })
    d.frac.forEach((digit, i) => {
      if (i < fracCols) row[decIdx + 1 + i] = { t: 'static', v: digit, crossable: Boolean(crossable) }
    })
    return finalizeRow(row, decIdx, true)
  }

  const rowA = digitRow(da, { crossable: true })
  const rowB = digitRow(db)

  const carryRow = new Array(totalCols).fill(null)
  for (let col = 0; col < totalCols; col += 1) {
    if (col === decIdx) continue
    carryRow[col] = { t: 'input', id: `carry:${col}`, variant: 'carry' }
  }
  finalizeRow(carryRow, decIdx, false)

  const expectedMap = {}
  const answerRow = new Array(totalCols).fill(null)
  const offIntR = intCols - dr.int.length
  dr.int.forEach((digit, i) => {
    const col = offIntR + i
    const id = `ans:${col}`
    expectedMap[id] = digit
    answerRow[col] = { t: 'input', id, expected: digit, variant: 'answer' }
  })
  dr.frac.forEach((digit, i) => {
    if (i >= fracCols) return
    const col = decIdx + 1 + i
    const id = `ans:${col}`
    expectedMap[id] = digit
    answerRow[col] = { t: 'input', id, expected: digit, variant: 'answer' }
  })
  for (let col = 0; col < totalCols; col += 1) {
    if (col === decIdx) continue
    if (!answerRow[col]) answerRow[col] = { t: 'blank' }
  }
  finalizeRow(answerRow, decIdx, true)

  const nextMap = {}
  const prevMap = {}
  const answerIds = []
  for (let col = totalCols - 1; col >= 0; col -= 1) {
    const cell = answerRow[col]
    if (cell && cell.t === 'input') answerIds.push(cell.id)
  }
  linkSequence(answerIds, nextMap, prevMap)
  const carryIds = []
  for (let col = totalCols - 1; col >= 0; col -= 1) {
    if (col === decIdx) continue
    carryIds.push(`carry:${col}`)
  }
  linkSequence(carryIds, nextMap, prevMap)

  return {
    mode: 'columnar',
    operator,
    layout: { intCols, fracCols, totalCols, decIdx },
    rowA,
    rowB,
    carryRow,
    answerRow,
    expectedMap,
    nextMap,
    prevMap,
    display: { a, b, result },
  }
}

function buildDivision(problem) {
  const { a: dividend, b: divisor, quotient } = problem
  const dd = splitDigits(dividend)
  const intCols = dd.int.length
  const fracCols = dd.frac.length
  const hasDecimal = fracCols > 0
  const totalCols = intCols + (hasDecimal ? 1 : 0) + fracCols
  const decIdx = hasDecimal ? intCols : -1
  const digitColIndex = (idx) => (idx < intCols ? idx : idx + (hasDecimal ? 1 : 0))
  const digits = [...dd.int, ...dd.frac].map(Number)

  const dividendRow = new Array(totalCols).fill(null)
  digits.forEach((d, idx) => {
    dividendRow[digitColIndex(idx)] = { t: 'static', v: String(d) }
  })
  finalizeRow(dividendRow, decIdx, true)

  let remainder = 0
  let pending = []
  const quotientDigits = new Array(digits.length).fill(0)
  const cycles = []
  for (let idx = 0; idx < digits.length; idx += 1) {
    pending.push(idx)
    let cur = remainder
    pending.forEach((i) => {
      cur = cur * 10 + digits[i]
    })
    const qDigit = Math.floor(cur / divisor)
    const isLast = idx === digits.length - 1
    if (qDigit === 0 && !isLast) {
      quotientDigits[idx] = 0
      continue
    }
    const subtractVal = qDigit * divisor
    const newRemainder = cur - subtractVal
    quotientDigits[idx] = qDigit
    cycles.push({
      digitIndexes: [...pending],
      quotientDigit: qDigit,
      subtractVal,
      remainderBefore: remainder,
      newRemainder,
    })
    remainder = newRemainder
    pending = []
  }

  const expectedMap = {}

  const quotientRow = new Array(totalCols).fill(null)
  for (let idx = 0; idx < digits.length; idx += 1) {
    const id = `quo:${idx}`
    const expected = String(quotientDigits[idx])
    expectedMap[id] = expected
    quotientRow[digitColIndex(idx)] = { t: 'input', id, expected, variant: 'division' }
  }
  finalizeRow(quotientRow, decIdx, true)

  const cycleBlocks = cycles.map((cycle, i) => {
    const lastPrevIdx = i > 0 ? cycles[i - 1].digitIndexes[cycles[i - 1].digitIndexes.length - 1] : null
    const cols = i > 0 ? [lastPrevIdx, ...cycle.digitIndexes] : [...cycle.digitIndexes]
    const gridCols = cols.map((idx) => digitColIndex(idx))
    const width = cols.length

    let resultRow = null
    const resultIds = []
    if (i > 0) {
      resultRow = new Array(totalCols).fill(null)
      const rowValues = [cycle.remainderBefore, ...cycle.digitIndexes.map((di) => digits[di])]
      gridCols.forEach((gridCol, k) => {
        const id = `work:${i}:res:${k}`
        const expected = String(rowValues[k])
        expectedMap[id] = expected
        resultRow[gridCol] = { t: 'input', id, expected, variant: 'division' }
        resultIds.push(id)
      })
      finalizeRow(resultRow, decIdx, false)
    }

    const subtractRow = new Array(totalCols).fill(null)
    const subtractIds = []
    const padded = String(cycle.subtractVal).padStart(width, '0').split('')
    gridCols.forEach((gridCol, k) => {
      const id = `work:${i}:sub:${k}`
      const expected = padded[k]
      expectedMap[id] = expected
      subtractRow[gridCol] = { t: 'input', id, expected, variant: 'division' }
      subtractIds.push(id)
    })
    finalizeRow(subtractRow, decIdx, false)

    return { resultRow, subtractRow, cellIds: [...resultIds, ...subtractIds] }
  })

  const lastCycle = cycles[cycles.length - 1]
  const terminalCol = digitColIndex(lastCycle.digitIndexes[lastCycle.digitIndexes.length - 1])
  const terminalRow = new Array(totalCols).fill(null)
  expectedMap.term = String(remainder)
  terminalRow[terminalCol] = { t: 'input', id: 'term', expected: String(remainder), variant: 'division' }
  finalizeRow(terminalRow, decIdx, false)

  const nextMap = {}
  const prevMap = {}
  const quotientIds = []
  for (let idx = 0; idx < digits.length; idx += 1) quotientIds.push(`quo:${idx}`)
  linkSequence(quotientIds, nextMap, prevMap)

  const stepIds = []
  cycleBlocks.forEach((block) => stepIds.push(...block.cellIds))
  stepIds.push('term')
  linkSequence(stepIds, nextMap, prevMap)

  return {
    mode: 'division',
    divisor,
    layout: { intCols, fracCols, totalCols, decIdx },
    dividendRow,
    quotientRow,
    cycleBlocks,
    terminalRow,
    expectedMap,
    nextMap,
    prevMap,
    display: { dividend, divisor, quotient },
  }
}

function OperatorButton({ symbol, size, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Change operation"
      className="flex items-center justify-center rounded-xl font-mono font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
      style={{ width: size, height: size, background: colors.operator, fontSize: size * 0.5 }}
    >
      {symbol}
    </button>
  )
}

function CellBox({ cell, col, size, ctx }) {
  const gridBorder = `1px solid ${colors.gridLine}`

  if (!cell) return <div style={{ width: size, height: size, border: gridBorder }} />

  if (cell.t === 'dec') {
    return (
      <div
        style={{ width: size, height: size, background: colors.decimalBg, border: gridBorder }}
        className="flex items-end justify-center pb-1"
      >
        {cell.active ? (
          <span className="font-mono font-black" style={{ color: colors.decimalText, fontSize: Math.max(14, size * 0.5) }}>
            .
          </span>
        ) : null}
      </div>
    )
  }

  if (cell.t === 'static') {
    const isCrossed = cell.crossable && ctx.crossed.has(col)
    const digit = (
      <span
        className="relative inline-flex select-none items-center justify-center font-mono font-black"
        style={{ color: colors.ink, fontSize: Math.max(14, size * 0.42) }}
      >
        {cell.v}
        {isCrossed ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{ width: size * 0.75, height: 2, background: colors.wrongText, transform: 'translate(-50%, -50%) rotate(-24deg)' }}
          />
        ) : null}
      </span>
    )
    if (cell.crossable) {
      return (
        <button
          type="button"
          onClick={() => ctx.toggleCross(col)}
          style={{ width: size, height: size, border: gridBorder }}
          className="flex items-center justify-center"
          aria-label="Cross out digit"
        >
          {digit}
        </button>
      )
    }
    return (
      <div style={{ width: size, height: size, border: gridBorder }} className="flex items-center justify-center">
        {digit}
      </div>
    )
  }

  if (cell.t === 'blank') return <div style={{ width: size, height: size, border: gridBorder }} />

  const value = ctx.values[cell.id] ?? ''
  const hasStatus = ctx.checked && cell.expected !== undefined
  const status = hasStatus ? (value === cell.expected ? 'correct' : 'wrong') : null
  const isCarry = cell.variant === 'carry'

  let bg = '#ffffff'
  let border = colors.border
  let text = colors.ink
  if (isCarry) {
    bg = colors.carryBg
    border = colors.carryBorder
    text = colors.carryText
  }
  if (status === 'correct') {
    bg = colors.correctBg
    border = colors.correctText
    text = colors.correctText
  } else if (status === 'wrong') {
    bg = colors.wrongBg
    border = colors.wrongText
    text = colors.wrongText
  }

  const boxWidth = Math.round(isCarry ? size * 0.8 : size * 0.82)
  const boxHeight = Math.round(isCarry ? size * 0.56 : size * 0.82)

  return (
    <div style={{ width: size, height: size, border: gridBorder }} className="flex items-center justify-center">
      <input
        ref={(node) => ctx.registerRef(cell.id, node)}
        inputMode="numeric"
        maxLength={isCarry ? 2 : 1}
        value={value}
        disabled={ctx.disabled}
        onChange={(event) => {
          if (isCarry) {
            ctx.typeDigit(cell.id, event.target.value.replace(/[^0-9]/g, '').slice(0, 2))
            return
          }
          const digit = event.target.value.replace(/[^0-9]/g, '').slice(-1)
          ctx.typeDigit(cell.id, digit)
          if (digit) {
            const nextId = ctx.nextMap[cell.id]
            if (nextId) ctx.goFocus(nextId)
          }
        }}
        onKeyDown={(event) => {
          if (isCarry) return
          if (event.key === 'Backspace' && !value) {
            const prevId = ctx.prevMap[cell.id]
            if (prevId) {
              ctx.typeDigit(prevId, '')
              ctx.goFocus(prevId)
            }
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            const nextId = ctx.nextMap[cell.id]
            if (nextId) {
              event.preventDefault()
              ctx.goFocus(nextId)
            }
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            const prevId = ctx.prevMap[cell.id]
            if (prevId) {
              event.preventDefault()
              ctx.goFocus(prevId)
            }
          }
        }}
        className={`text-center font-mono font-black outline-none transition focus:shadow-[0_0_0_3px_rgba(123,63,158,.4)] disabled:cursor-not-allowed ${
          isCarry ? 'rounded-md border-2 border-dashed' : 'rounded-md border-2'
        }`}
        style={{ width: boxWidth, height: boxHeight, background: bg, borderColor: border, color: text, fontSize: Math.max(11, size * (isCarry ? 0.3 : 0.38)) }}
      />
    </div>
  )
}

function RowLine({ cells, size, ctx, prefix, underline }) {
  return (
    <div className="flex items-stretch" style={underline ? { borderBottom: `3px solid ${colors.bar}` } : undefined}>
      {prefix}
      {cells.map((cell, col) => (
        <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
      ))}
    </div>
  )
}

function ColumnarBlock({ engine, size, ctx, onCycleOperator }) {
  const { rowA, rowB, carryRow, answerRow, operator } = engine
  const spacer = <div style={{ width: size, height: size }} />
  return (
    <div className="inline-flex flex-col">
      <RowLine cells={carryRow} size={size} ctx={ctx} prefix={spacer} />
      <RowLine cells={rowA} size={size} ctx={ctx} prefix={spacer} />
      <RowLine
        cells={rowB}
        size={size}
        ctx={ctx}
        underline
        prefix={<OperatorButton symbol={operator} size={size} onClick={onCycleOperator} disabled={ctx.disabled} />}
      />
      <RowLine cells={answerRow} size={size} ctx={ctx} prefix={spacer} />
    </div>
  )
}

function DivisionBlock({ engine, size, ctx, revealCount, showTerminal, onCycleOperator }) {
  const { quotientRow, dividendRow, cycleBlocks, terminalRow, divisor } = engine
  const prefixWidth = size * 2

  return (
    <div className="inline-flex flex-col">
      <div className="flex items-stretch">
        <div style={{ width: prefixWidth, height: size }} />
        <div className="flex items-stretch" style={{ borderBottom: `3px solid ${colors.bar}` }}>
          {quotientRow.map((cell, col) => (
            <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
          ))}
        </div>
      </div>

      <div className="flex items-stretch">
        <OperatorButton symbol="÷" size={size} onClick={onCycleOperator} disabled={ctx.disabled} />
        <div
          style={{ width: size, height: size, background: colors.divisorBg, color: colors.divisorText }}
          className="flex items-center justify-center font-mono font-black"
        >
          {divisor}
        </div>
        <div className="flex items-stretch" style={{ borderLeft: `3px solid ${colors.bar}` }}>
          {dividendRow.map((cell, col) => (
            <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
          ))}
        </div>
      </div>

      {cycleBlocks.slice(0, revealCount).map((block, i) => (
        <div key={i}>
          {block.resultRow ? (
            <div className="flex items-stretch">
              <div style={{ width: prefixWidth, height: size }} />
              <div className="flex items-stretch" style={{ borderLeft: `3px solid ${colors.bar}` }}>
                {block.resultRow.map((cell, col) => (
                  <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex items-stretch">
            <div style={{ width: prefixWidth - size * 0.4, height: size }} />
            <div
              style={{ width: size * 0.4, height: size, color: colors.bar }}
              className="flex items-center justify-center font-mono font-black"
            >
              −
            </div>
            <div className="flex items-stretch" style={{ borderLeft: `3px solid ${colors.bar}`, borderBottom: `3px solid ${colors.bar}` }}>
              {block.subtractRow.map((cell, col) => (
                <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
              ))}
            </div>
          </div>
        </div>
      ))}

      {showTerminal ? (
        <div className="flex items-stretch">
          <div style={{ width: prefixWidth, height: size }} />
          <div className="flex items-stretch" style={{ borderLeft: `3px solid ${colors.bar}` }}>
            {terminalRow.map((cell, col) => (
              <CellBox key={col} cell={cell} col={col} size={size} ctx={ctx} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function ColumnArithmeticGrid() {
  const [operator, setOperator] = useState('+')
  const [problemIndex, setProblemIndex] = useState(0)

  const problem = PROBLEMS[operator][problemIndex]
  const engine = useMemo(
    () => (operator === '\u00f7' ? buildDivision(problem) : buildColumnar(operator, problem)),
    [operator, problem],
  )

  function cycleOperator() {
    const idx = OPS.indexOf(operator)
    setOperator(OPS[(idx + 1) % OPS.length])
    setProblemIndex(0)
  }

  function newProblem() {
    setProblemIndex((i) => (i + 1) % PROBLEMS[operator].length)
  }

  return (
    <ColumnArithmeticBoard
      key={`${operator}-${problemIndex}`}
      engine={engine}
      operator={operator}
      onCycleOperator={cycleOperator}
      onNewProblem={newProblem}
    />
  )
}

function ColumnArithmeticBoard({ engine, operator, onCycleOperator, onNewProblem }) {
  const [values, setValues] = useState({})
  const [checked, setChecked] = useState(false)
  const [solved, setSolved] = useState(false)
  const [crossed, setCrossed] = useState(() => new Set())
  const [cellSize, setCellSize] = useState(48)

  const wrapRef = useRef(null)
  const cellRefs = useRef({})

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const cols = engine.layout.totalCols
    let rows = 4
    if (engine.mode === 'division') {
      rows = 2
      engine.cycleBlocks.forEach((block) => {
        rows += block.resultRow ? 2 : 1
      })
      rows += 1
    }
    const update = () => {
      const width = el.clientWidth || 400
      const height = el.clientHeight || 300
      const byWidth = Math.floor(width / (cols + 1))
      const byHeight = Math.floor(height / rows)
      setCellSize(Math.max(26, Math.min(52, byWidth, byHeight)))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [engine])

  const revealCount = useMemo(() => {
    if (engine.mode !== 'division') return 0
    let count = 1
    for (let i = 0; i < engine.cycleBlocks.length - 1; i += 1) {
      const filled = engine.cycleBlocks[i].cellIds.every((id) => (values[id] ?? '') !== '')
      if (!filled) break
      count = i + 2
    }
    return Math.min(count, engine.cycleBlocks.length)
  }, [engine, values])

  const showTerminal = useMemo(() => {
    if (engine.mode !== 'division') return false
    if (revealCount !== engine.cycleBlocks.length) return false
    const last = engine.cycleBlocks[engine.cycleBlocks.length - 1]
    return last.cellIds.every((id) => (values[id] ?? '') !== '')
  }, [engine, revealCount, values])

  function registerRef(id, node) {
    if (node) cellRefs.current[id] = node
    else delete cellRefs.current[id]
  }

  function goFocus(id) {
    const node = cellRefs.current[id]
    if (node) node.focus()
  }

  function typeDigit(id, digit) {
    setValues((prev) => ({ ...prev, [id]: digit }))
    setChecked(false)
  }

  function toggleCross(col) {
    setCrossed((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
    goFocus(`carry:${col}`)
    setChecked(false)
  }

  function handleCheck() {
    setChecked(true)
    const ids = Object.keys(engine.expectedMap)
    const allCorrect = ids.every((id) => values[id] === engine.expectedMap[id])
    setSolved(allCorrect)
  }

  const ctx = {
    values,
    checked,
    disabled: solved,
    typeDigit,
    registerRef,
    goFocus,
    nextMap: engine.nextMap,
    prevMap: engine.prevMap,
    crossed,
    toggleCross,
  }

  const fmt = (n) => String(n)
  const taskText = engine.mode === 'division'
    ? `Solve ${fmt(engine.display.dividend)} \u00f7 ${fmt(engine.display.divisor)}`
    : `Solve ${fmt(engine.display.a)} ${operator} ${fmt(engine.display.b)}`
  const equationText = engine.mode === 'division'
    ? `${fmt(engine.display.dividend)} \u00f7 ${fmt(engine.display.divisor)} = ${fmt(engine.display.quotient)}`
    : `${fmt(engine.display.a)} ${operator} ${fmt(engine.display.b)} = ${fmt(engine.display.result)}`

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden p-3 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div
          ref={wrapRef}
          className="flex min-w-0 flex-1 items-center justify-center overflow-auto rounded-2xl border bg-white p-3"
          style={{ borderColor: colors.border }}
        >
          {engine.mode === 'columnar' ? (
            <ColumnarBlock engine={engine} size={cellSize} ctx={ctx} onCycleOperator={onCycleOperator} />
          ) : (
            <DivisionBlock
              engine={engine}
              size={cellSize}
              ctx={ctx}
              revealCount={revealCount}
              showTerminal={showTerminal}
              onCycleOperator={onCycleOperator}
            />
          )}
        </div>

        <div className="flex w-[168px] shrink-0 flex-col gap-2">
          <div
            className="rounded-xl border bg-white px-2.5 py-2 text-sm font-black leading-snug"
            style={{ borderColor: colors.border, color: solved ? colors.correctText : colors.ink }}
          >
            {solved ? (
              <>
                <div>\u2713 Correct!</div>
                <div className="mt-1 text-xs font-bold">{equationText}</div>
              </>
            ) : (
              taskText
            )}
          </div>
          <button
            type="button"
            onClick={onNewProblem}
            className="w-full rounded-full border-2 px-2 py-1 text-[11px] font-black transition"
            style={{ borderColor: colors.border, color: colors.muted, background: '#ffffff' }}
          >
            New problem
          </button>
          <button
            type="button"
            onClick={handleCheck}
            className="w-full rounded-full px-2 py-1 text-[11px] font-black text-white transition"
            style={{ background: colors.operator }}
          >
            Check
          </button>
        </div>
      </div>

      <div
        className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-bold leading-snug"
        style={{ borderColor: colors.border, color: colors.muted }}
      >
        {HINTS[operator]}
      </div>
    </div>
  )
}
