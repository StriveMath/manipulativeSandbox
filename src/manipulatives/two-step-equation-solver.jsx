import { useMemo, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  left: '#2660C4',
  leftTint: '#EAF0FB',
  leftBorder: '#8AA8DD',
  right: '#B25A1E',
  rightTint: '#FBEEDD',
  rightBorder: '#E0B579',
  x: '#7B3F9E',
  xTint: '#F3EEFA',
  xBorder: '#C99BE0',
  solved: '#27500A',
  solvedTint: '#EAF3DE',
  solvedBorder: '#97C459',
  invalid: '#B23050',
  invalidTint: '#FBE9ED',
  teal: '#1E5F74',
  tealTint: '#E4F3F7',
  tealBorder: '#7FC5D6',
}

const equations = [
  { a: 3, b: 5, x: 5 },
  { a: 2, b: 7, x: 6 },
  { a: 4, b: -3, x: 4 },
  { a: 5, b: 2, x: 3 },
  { a: 2, b: -8, x: 9 },
  { a: 6, b: 4, x: 2 },
  { a: 3, b: -6, x: 7 },
  { a: 4, b: 9, x: 5 },
]

const ops = ['+', '-', '\u00d7', '\u00f7']

function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100
  if (Object.is(rounded, -0)) return '0'
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatSigned(value) {
  if (Math.abs(value) < 0.0001) return ''
  return value > 0 ? ` + ${formatNumber(value)}` : ` - ${formatNumber(Math.abs(value))}`
}

function formatMove(op, value) {
  return `${op} ${formatNumber(value)}`
}

function expressionText(coeff, constant) {
  const coeffPart = Math.abs(coeff - 1) < 0.0001
    ? 'x'
    : Math.abs(coeff + 1) < 0.0001
      ? '-x'
      : `${formatNumber(coeff)}x`
  return `${coeffPart}${formatSigned(constant)}`
}

function makeState(index) {
  const item = equations[index]
  return {
    coeff: item.a,
    constant: item.b,
    right: item.a * item.x + item.b,
    targetX: item.x,
    start: item,
  }
}

function isSolved(state) {
  return Math.abs(state.coeff - 1) < 0.0001 && Math.abs(state.constant) < 0.0001
}

function applyOperation(state, op, value) {
  if (op === '+') return { ...state, constant: state.constant + value, right: state.right + value }
  if (op === '-') return { ...state, constant: state.constant - value, right: state.right - value }
  if (op === '\u00d7') return { ...state, coeff: state.coeff * value, constant: state.constant * value, right: state.right * value }
  return { ...state, coeff: state.coeff / value, constant: state.constant / value, right: state.right / value }
}

function moveProgress(before, after) {
  const constantImproved = Math.abs(after.constant) < Math.abs(before.constant) - 0.0001
  const coeffImproved = Math.abs(after.coeff - 1) < Math.abs(before.coeff - 1) - 0.0001
  return constantImproved || coeffImproved
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-5 py-2 text-sm font-black transition"
      style={{
        color: active ? '#ffffff' : colors.teal,
        background: active ? colors.teal : '#ffffff',
        borderColor: active ? colors.teal : colors.tealBorder,
      }}
    >
      {children}
    </button>
  )
}

function EquationPanel({ label, children, color, tint, border, flash }) {
  return (
    <section
      className={`flex min-h-[92px] flex-1 flex-col justify-center rounded-[16px] border-2 px-4 py-3 transition ${
        flash ? 'animate-[equationFlash_520ms_ease-out]' : ''
      }`}
      style={{ background: tint, borderColor: border }}
    >
      <div className="mb-1 text-xs font-black uppercase tracking-wide" style={{ color }}>
        {label}
      </div>
      <div className="text-center font-mono text-4xl font-black leading-tight" style={{ color }}>
        {children}
      </div>
    </section>
  )
}

function MoveButton({ op, value, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(op, value)}
      className="rounded-[14px] border-2 px-5 py-3 font-mono text-xl font-black transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{ color: colors.x, background: colors.xTint, borderColor: colors.xBorder }}
    >
      {formatMove(op, value)}
    </button>
  )
}

function HistoryRow({ item, index }) {
  return (
    <div className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-xl border bg-white px-3 py-2" style={{ borderColor: colors.border }}>
      <div className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: colors.x }}>
        {index + 1}
      </div>
      <div className="font-mono text-base font-black" style={{ color: colors.ink }}>
        {expressionText(item.after.coeff, item.after.constant)} = {formatNumber(item.after.right)}
      </div>
      <div className="rounded-full px-3 py-1 font-mono text-sm font-black" style={{ color: colors.x, background: colors.xTint }}>
        {formatMove(item.op, item.value)}
      </div>
    </div>
  )
}

export default function TwoStepEquationSolver() {
  const [tab, setTab] = useState('explorer')
  const [equationIndex, setEquationIndex] = useState(0)
  const [state, setState] = useState(() => makeState(0))
  const [history, setHistory] = useState([])
  const [moveText, setMoveText] = useState('')
  const [moveOp, setMoveOp] = useState('-')
  const [feedback, setFeedback] = useState('')
  const [flash, setFlash] = useState(0)
  const solved = isSolved(state)

  const explorerMove = useMemo(() => {
    if (Math.abs(state.constant) > 0.0001) {
      return { op: state.constant > 0 ? '-' : '+', value: Math.abs(state.constant) }
    }
    if (Math.abs(state.coeff - 1) > 0.0001 && Math.abs(state.coeff) > 0.0001) {
      return { op: '\u00f7', value: state.coeff }
    }
    return null
  }, [state])

  function reset(index) {
    setEquationIndex(index)
    setState(makeState(index))
    setHistory([])
    setMoveText('')
    setMoveOp('-')
    setFeedback('')
    setFlash(0)
  }

  function newEquation() {
    reset((equationIndex + 1) % equations.length)
  }

  function switchTab(nextTab) {
    if (nextTab === tab) return
    setTab(nextTab)
    reset((equationIndex + 1) % equations.length)
  }

  function cycleOperation() {
    setMoveOp((current) => ops[(ops.indexOf(current) + 1) % ops.length])
  }

  function applyMove(op, rawValue, source = 'explorer') {
    const value = Number(rawValue)
    if (!Number.isFinite(value) || rawValue === '' || (op === '\u00f7' && Math.abs(value) < 0.0001)) {
      setFeedback('Enter a valid number. Division by 0 is not allowed.')
      return
    }

    const before = state
    const after = applyOperation(before, op, value)
    const progress = moveProgress(before, after)
    const nextSolved = isSolved(after)
    setState(after)
    setHistory((items) => [...items, { op, value, before, after }])
    setFeedback(() => {
      if (nextSolved && history.length + 1 === 2) return 'Solved in reverse order: constant off first, then the coefficient.'
      if (nextSolved) return `Solved in ${history.length + 1} steps. Try dividing last for the cleanest path.`
      if (source === 'solver' && !progress) return "Legal move - still balanced - but x is not closer to being alone. What's stuck to x?"
      if (op === '\u00f7' && Math.abs(before.constant) > 0.0001) return 'Notice the fractions? Dividing first works, but it is messier.'
      if (Math.abs(after.constant) < 0.0001 && Math.abs(after.coeff - 1) > 0.0001) return `Constant gone. Now divide both sides by ${formatNumber(after.coeff)}.`
      return `Applied ${formatMove(op, value)} to both sides.`
    })
    setFlash((count) => count + 1)
    setMoveText('')
  }

  const taskText = solved
    ? `Solved: x = ${formatNumber(state.right)}`
    : `Solve ${expressionText(state.start.a, state.start.b)} = ${formatNumber(state.start.a * state.start.x + state.start.b)}`

  const moveLine = history.length ? `\u2193 ${formatMove(history.at(-1).op, history.at(-1).value)} to both sides` : 'Every move applies to both sides.'

  const hint = (() => {
    if (solved && history.length === 2) return 'You undid it in reverse order - constant off first, then the coefficient.'
    if (solved) return `Solved, but it took ${history.length} steps. Try peeling off the constant before dividing.`
    if (Math.abs(state.constant) < 0.0001) return `Constant gone. Divide both sides by ${formatNumber(state.coeff)} to leave x alone.`
    if (feedback) return feedback
    return 'To get x alone, undo operations in reverse: peel off the added number first, then divide by the coefficient.'
  })()

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <style>{`
        @keyframes equationFlash {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(123,63,158,0); }
          45% { transform: scale(1.025); box-shadow: 0 0 0 7px rgba(123,63,158,.16); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(123,63,158,0); }
        }
      `}</style>

      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex rounded-full border bg-white p-1" style={{ borderColor: colors.tealBorder }}>
          <TabButton active={tab === 'explorer'} onClick={() => switchTab('explorer')}>Explorer</TabButton>
          <TabButton active={tab === 'solver'} onClick={() => switchTab('solver')}>Solver</TabButton>
        </div>
        <button type="button" onClick={newEquation} className="rounded-full border bg-white px-4 py-2 text-sm font-black shadow-sm" style={{ borderColor: colors.border }}>
          New equation
        </button>
      </div>

      <section
        className="shrink-0 rounded-[14px] border px-4 py-2 text-lg font-black"
        style={{ background: solved ? colors.solvedTint : colors.tealTint, borderColor: solved ? colors.solvedBorder : colors.tealBorder, color: solved ? colors.solved : colors.teal }}
      >
        {taskText}
      </section>

      <section className="shrink-0 rounded-[16px] border bg-white p-3 shadow-sm" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-4">
          <EquationPanel key={`left-${flash}`} label="Left side" color={colors.left} tint={colors.leftTint} border={colors.leftBorder} flash={flash > 0}>
            <span style={{ color: colors.x }}>
              {Math.abs(state.coeff - 1) < 0.0001 ? '' : Math.abs(state.coeff + 1) < 0.0001 ? '-' : formatNumber(state.coeff)}
            </span>
            <span style={{ color: colors.x }}>x</span>
            <span>{formatSigned(state.constant)}</span>
          </EquationPanel>
          <div className="text-4xl font-black" style={{ color: colors.ink }}>=</div>
          <EquationPanel key={`right-${flash}`} label="Right side" color={colors.right} tint={colors.rightTint} border={colors.rightBorder} flash={flash > 0}>
            {formatNumber(state.right)}
          </EquationPanel>
        </div>
        <div className="pt-2 text-center font-mono text-base font-black" style={{ color: colors.x }}>
          {moveLine}
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_270px] gap-2">
        <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <section className="rounded-[14px] border bg-white p-3" style={{ borderColor: colors.border }}>
            {tab === 'explorer' ? (
              <div className="flex min-h-[76px] flex-col items-center justify-center gap-2">
                <div className="text-sm font-black" style={{ color: colors.muted }}>Tap the next undo move:</div>
                {explorerMove ? (
                  <MoveButton op={explorerMove.op} value={explorerMove.value} disabled={solved} onClick={(op, value) => applyMove(op, value, 'explorer')} />
                ) : (
                  <span className="font-bold" style={{ color: colors.solved }}>x is isolated.</span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-sm font-black" style={{ color: colors.muted }}>Apply to both sides</span>
                <button
                  type="button"
                  disabled={solved}
                  onClick={cycleOperation}
                  className="flex h-14 w-16 items-center justify-center rounded-2xl border-2 font-mono text-3xl font-black transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ color: colors.x, background: colors.xTint, borderColor: colors.xBorder }}
                  aria-label="Change operation"
                >
                  {moveOp}
                </button>
                <input
                  type="number"
                  value={moveText}
                  disabled={solved}
                  placeholder="number"
                  onChange={(event) => setMoveText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyMove(moveOp, moveText, 'solver')
                  }}
                  className="h-14 w-32 rounded-2xl border-2 px-4 text-center font-mono text-xl font-black outline-none transition placeholder:font-sans placeholder:text-sm focus:shadow-[0_0_0_5px_rgba(123,63,158,.14)]"
                  style={{ borderColor: colors.xBorder, color: colors.x, background: '#ffffff' }}
                />
                <button
                  type="button"
                  disabled={solved}
                  onClick={() => applyMove(moveOp, moveText, 'solver')}
                  className="h-14 rounded-2xl px-6 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ background: colors.x }}
                >
                  Apply
                </button>
              </div>
            )}
          </section>

          <section
            className="min-h-[48px] rounded-[14px] border bg-white px-4 py-2 text-sm font-bold leading-snug"
            style={{ borderColor: feedback.includes('valid') ? colors.invalid : colors.border, color: feedback.includes('valid') ? colors.invalid : colors.muted, background: feedback.includes('valid') ? colors.invalidTint : '#ffffff' }}
          >
            {hint}
          </section>

          {solved ? (
            <section className="rounded-[14px] border px-4 py-2 font-mono text-base font-black" style={{ color: colors.solved, background: colors.solvedTint, borderColor: colors.solvedBorder }}>
              Check: {state.start.a}({formatNumber(state.right)}) {state.start.b >= 0 ? '+' : '-'} {Math.abs(state.start.b)} = {state.start.a * state.targetX + state.start.b} ✓
            </section>
          ) : null}
        </section>

        <section className="flex min-h-0 flex-col rounded-[14px] border bg-white p-2" style={{ borderColor: colors.border }}>
          <div className="mb-2 shrink-0 text-xs font-black uppercase tracking-wide" style={{ color: colors.muted }}>Step history</div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {history.length ? history.map((item, index) => <HistoryRow key={index} item={item} index={index} />) : (
              <div className="flex h-full items-center justify-center text-center text-sm font-bold" style={{ color: colors.muted }}>
                Moves will appear here as equivalent equations.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
