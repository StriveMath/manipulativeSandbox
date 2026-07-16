import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  input: '#2660C4',
  inputTint: '#EAF0FB',
  inputBorder: '#8AA8DD',
  output: '#1E7A5E',
  outputTint: '#E9F5EF',
  outputBorder: '#7FCBAC',
  rule: '#7B3F9E',
  ruleDark: '#6B2E92',
  ruleLight: '#8B54AE',
  wrong: '#B23050',
  win: '#27500A',
  winTint: '#EAF3DE',
  amber: '#8A4A12',
  amberTint: '#FBEEDD',
}

const rulePool = [
  { op: 'multiply', value: 2 },
  { op: 'multiply', value: 3 },
  { op: 'multiply', value: 4 },
  { op: 'multiply', value: 5 },
  { op: 'add', value: 3 },
  { op: 'add', value: 5 },
  { op: 'add', value: 7 },
  { op: 'add', value: 10 },
]

function applyRule(rule, input) {
  return rule.op === 'multiply' ? input * rule.value : input + rule.value
}

function ruleText(rule) {
  return rule.op === 'multiply' ? `out = in × ${rule.value}` : `out = in + ${rule.value}`
}

function ruleWindowText(rule) {
  return rule.op === 'multiply' ? `× ${rule.value}` : `+ ${rule.value}`
}

function pickRule(previous) {
  const choices = previous ? rulePool.filter((rule) => rule.op !== previous.op || rule.value !== previous.value) : rulePool
  return choices[Math.floor(Math.random() * choices.length)]
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function MachineScene({ anim, rule, cracked }) {
  const process = anim.active ? clamp((anim.t - 0.62) / 0.16, 0, 1) : 0
  const outPhase = anim.active && anim.t > 0.76
  const outputResting = !anim.active && anim.t === 1
  const inPhase = anim.active && anim.t <= 0.72
  const inT = easeInOut(clamp((anim.t - 0.34) / 0.28, 0, 1))
  const outT = easeInOut(clamp((anim.t - 0.76) / 0.17, 0, 1))
  const blueX = 92 + (338 - 92) * inT
  const greenX = outputResting ? 708 : 462 + (708 - 462) * outT
  const ballY = 94

  return (
    <div className="relative h-[178px] overflow-hidden rounded-[18px] border bg-white" style={{ borderColor: colors.border }}>
      <div className="absolute left-7 top-[70px] h-12 w-28 rounded-full border-2 border-dashed px-4 py-3 text-center text-sm font-black uppercase tracking-wide" style={{ borderColor: colors.input, color: colors.input, background: colors.inputTint }}>
        In
      </div>
      <div className="absolute right-7 top-[70px] h-12 w-28 rounded-full border-2 border-dashed px-4 py-3 text-center text-sm font-black uppercase tracking-wide" style={{ borderColor: colors.output, color: colors.output, background: colors.outputTint }}>
        Out
      </div>
      <div className="absolute left-[140px] top-[93px] h-2 w-[132px] rounded-full" style={{ background: `linear-gradient(90deg, ${colors.input}55, ${colors.rule}88)` }} />
      <div className="absolute right-[140px] top-[93px] h-2 w-[132px] rounded-full" style={{ background: `linear-gradient(90deg, ${colors.rule}88, ${colors.output}55)` }} />
      <div className="absolute left-1/2 top-[87px] h-[18px] w-[286px] -translate-x-1/2 rounded-full bg-white/20 shadow-inner" />

      <div
        className="absolute left-1/2 top-5 z-20 h-[136px] w-[244px] -translate-x-1/2 rounded-[24px] border-4 p-4 text-center text-white"
        style={{
          borderColor: '#ffffff66',
          background: `linear-gradient(135deg, ${colors.ruleLight}, ${colors.ruleDark})`,
          boxShadow: '0 6px 18px rgba(107,46,146,.25)',
        }}
      >
        <div className="absolute left-4 top-4 h-2 w-2 rounded-full bg-white/45" />
        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-white/45" />
        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-white/80">Secret rule</p>
        <div
          className={`mx-auto mt-3 flex h-14 w-[164px] items-center justify-center rounded-2xl bg-white px-4 font-mono text-3xl font-black leading-none shadow-inner ${process > 0 && process < 1 ? 'animate-[rulePulse_420ms_ease-in-out_infinite]' : ''}`}
          style={{ color: colors.rule }}
        >
          {cracked ? ruleWindowText(rule) : '?'}
        </div>
        <div className="mt-2 flex justify-center gap-4">
          <span className="h-3.5 w-3.5 rounded-full border-[3px] border-white/90" />
          <span className="h-3.5 w-3.5 rounded-full border-[3px] border-white/90" />
          <span className="h-3.5 w-3.5 rounded-full border-[3px] border-white/90" />
        </div>
      </div>

      {anim.active && inPhase && (
        <div
          className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white font-mono text-xl font-black text-white shadow-lg"
          style={{
            left: `${blueX}px`,
            top: `${ballY}px`,
            background: colors.input,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 10px 22px rgba(38,96,196,.28)',
          }}
        >
          {anim.input}
        </div>
      )}
      {((anim.active && outPhase) || outputResting) && (
        <div
          className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white font-mono text-xl font-black text-white shadow-lg"
          style={{
            left: `${greenX}px`,
            top: `${ballY}px`,
            background: colors.output,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 10px 22px rgba(30,122,94,.28)',
          }}
        >
          {anim.output}
        </div>
      )}
    </div>
  )
}

function CluesTable({ rows, highlightKey }) {
  return (
    <section className="min-h-0 rounded-[16px] border bg-white p-3" style={{ borderColor: colors.border }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-black uppercase tracking-wide text-[#5F5E5A]">Clues</p>
        <p className="text-xs font-bold text-[#5F5E5A]">{rows.length} unique {rows.length === 1 ? 'input' : 'inputs'}</p>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border" style={{ borderColor: colors.border }}>
        <div className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide" style={{ color: colors.input, background: colors.inputTint }}>In</div>
        <div className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide" style={{ color: colors.output, background: colors.outputTint }}>Out</div>
        {rows.length === 0 ? (
          <div className="col-span-2 px-3 py-8 text-center text-sm font-bold text-[#5F5E5A]">Run a number to collect your first clue.</div>
        ) : rows.map((row) => (
          <div key={row.input} className="contents">
            <div className={`border-t px-3 py-2 text-center font-mono text-lg font-black transition ${highlightKey === row.input ? 'bg-[#F3EEFA]' : 'bg-white'}`} style={{ borderColor: colors.border, color: colors.input }}>{row.input}</div>
            <div className={`border-t px-3 py-2 text-center font-mono text-lg font-black transition ${highlightKey === row.input ? 'bg-[#F3EEFA]' : 'bg-white'}`} style={{ borderColor: colors.border, color: colors.output }}>{row.output}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function FunctionMachineDetective() {
  const frameRef = useRef(null)
  const [rule, setRule] = useState(() => pickRule())
  const [input, setInput] = useState('3')
  const [rows, setRows] = useState([])
  const [highlightKey, setHighlightKey] = useState(null)
  const [guess, setGuess] = useState({ op: 'multiply', value: 2 })
  const [message, setMessage] = useState({ kind: 'quiet', text: 'Feed in numbers and gather clues. Look at how each IN becomes its OUT.' })
  const [cracked, setCracked] = useState(false)
  const [anim, setAnim] = useState({ active: false, t: 0, input: 0, output: 0 })

  const distinctInputs = rows.length
  const canRun = !anim.active && input !== ''
  const quickValues = [1, 2, 3, 5, 10]
  const guessMin = guess.op === 'multiply' ? 2 : 1
  const guessMax = guess.op === 'multiply' ? 5 : 12

  const stopAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const logRow = useCallback((inValue, outValue) => {
    setRows((current) => {
      if (current.some((row) => row.input === inValue)) {
        setMessage({ kind: 'quiet', text: `Same input, same output: ${inValue} always becomes ${outValue}.` })
        return current
      }
      return [{ input: inValue, output: outValue }, ...current]
    })
    setHighlightKey(inValue)
    setTimeout(() => setHighlightKey(null), 900)
    setCracked(false)
  }, [])

  const runInput = useCallback((rawValue = input) => {
    if (anim.active) return
    const inValue = Number(rawValue)
    if (!Number.isFinite(inValue)) return
    const roundedInput = Math.round(inValue)
    const output = applyRule(rule, roundedInput)
    stopAnimation()
    setMessage({ kind: 'quiet', text: 'Watch what the machine does, then add the clue to your pattern.' })
    const start = performance.now()
    const duration = 3000
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setAnim({ active: true, t, input: roundedInput, output })
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setAnim({ active: false, t: 1, input: roundedInput, output })
        logRow(roundedInput, output)
        setMessage((current) => {
          if (current.text.startsWith('Same input')) return current
          return {
            kind: rows.length === 0 ? 'amber' : 'quiet',
            text: rows.length === 0 ? 'Feed one more different number to confirm the pattern holds.' : 'What single operation turns each IN into its OUT?',
          }
        })
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [anim.active, input, logRow, rows.length, rule, stopAnimation])

  const setGuessOperation = (op) => {
    setGuess((current) => ({
      op,
      value: op === 'multiply' ? clamp(current.value, 2, 5) : clamp(current.value, 1, 12),
    }))
  }

  const testGuess = () => {
    if (rows.length === 0) {
      setMessage({ kind: 'amber', text: 'Feed the machine first so your rule has clues to match.' })
      return
    }
    const broken = rows.find((row) => applyRule(guess, row.input) !== row.output)
    if (broken) {
      setCracked(false)
      setMessage({
        kind: 'wrong',
        text: `Your rule turns ${broken.input} into ${applyRule(guess, broken.input)}, but the machine made ${broken.output}.`,
      })
      return
    }
    if (distinctInputs < 2) {
      setCracked(false)
      setMessage({ kind: 'amber', text: 'Fits so far — feed a different number to be sure.' })
      return
    }
    setCracked(true)
    setMessage({ kind: 'win', text: `Rule cracked: ${ruleText(rule)}. Every clue matches.` })
  }

  const newRule = () => {
    stopAnimation()
    const next = pickRule(rule)
    setRule(next)
    setRows([])
    setHighlightKey(null)
    setCracked(false)
    setAnim({ active: false, t: 0, input: 0, output: 0 })
    setMessage({ kind: 'quiet', text: 'New secret rule. Feed in numbers and gather clues.' })
  }

  useEffect(() => () => stopAnimation(), [stopAnimation])

  const hint = useMemo(() => {
    if (message.kind !== 'quiet') return message.text
    if (rows.length === 0) return 'Feed in numbers and gather clues. Look at how each IN becomes its OUT.'
    if (rows.length === 1) return 'Feed one more different number to confirm the pattern holds.'
    return 'What single operation turns each IN into its OUT?'
  }, [message, rows.length])

  const messageStyle = {
    quiet: { color: colors.muted, background: '#ffffff', borderColor: colors.border },
    amber: { color: colors.amber, background: colors.amberTint, borderColor: colors.amber },
    wrong: { color: colors.wrong, background: '#FBEAEE', borderColor: colors.wrong },
    win: { color: colors.win, background: colors.winTint, borderColor: colors.win },
  }[message.kind]

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <style>
        {`
          @keyframes rulePulse {
            0%, 100% { transform: scale(1); box-shadow: inset 0 0 0 0 rgba(123,63,158,0.18); }
            50% { transform: scale(1.035); box-shadow: inset 0 0 0 5px rgba(123,63,158,0.12); }
          }
        `}
      </style>

      <MachineScene anim={anim} rule={rule} cracked={cracked} />

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_250px] gap-2">
        <section className="flex min-h-0 flex-col gap-2 rounded-[16px] border bg-white p-3" style={{ borderColor: colors.border }}>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <form
              className="grid grid-cols-[1fr_auto] gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (canRun) runInput()
              }}
            >
              <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-[14px] border px-3 py-2" style={{ borderColor: colors.inputBorder, background: colors.inputTint }}>
                <span className="text-sm font-black uppercase tracking-wide" style={{ color: colors.input }}>Input</span>
                <input
                  type="number"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="min-w-0 bg-transparent text-center font-mono text-2xl font-black outline-none"
                  style={{ color: colors.input }}
                />
              </label>
              <button type="submit" disabled={!canRun} className="rounded-[14px] px-5 py-2 text-base font-black text-white disabled:opacity-45" style={{ background: colors.input }}>
                Run
              </button>
            </form>
            <button type="button" onClick={newRule} className="rounded-[14px] border bg-white px-3 py-2 text-sm font-black" style={{ borderColor: colors.rule, color: colors.rule }}>
              New secret rule
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-[#5F5E5A]">Quick feed</span>
            {quickValues.map((value) => (
              <button
                key={value}
                type="button"
                disabled={anim.active}
                onClick={() => {
                  setInput(String(value))
                  runInput(value)
                }}
                className="rounded-full border bg-white px-4 py-1.5 font-mono text-sm font-black disabled:opacity-45"
                style={{ borderColor: colors.inputBorder, color: colors.input }}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[16px] border p-3" style={{ borderColor: colors.rule, background: '#F3EEFA' }}>
            <div>
              <p className="text-[12px] font-black uppercase tracking-wide" style={{ color: colors.rule }}>Crack the rule</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-lg font-black">
                <span>out = in</span>
                <select
                  value={guess.op}
                  onChange={(event) => setGuessOperation(event.target.value)}
                  className="h-10 rounded-xl border bg-white px-3 text-center font-mono text-xl font-black outline-none"
                  style={{ borderColor: colors.rule, color: colors.rule }}
                  aria-label="Choose operation"
                >
                  <option value="multiply">×</option>
                  <option value="add">+</option>
                </select>
                <input
                  type="number"
                  min={guessMin}
                  max={guessMax}
                  value={guess.value}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (Number.isFinite(next)) {
                      setGuess((current) => ({ ...current, value: clamp(Math.round(next), guessMin, guessMax) }))
                    }
                  }}
                  className="h-10 w-20 rounded-xl border bg-white px-2 text-center font-mono text-xl font-black outline-none"
                  style={{ borderColor: colors.rule, color: colors.rule }}
                  aria-label="Guess number"
                />
              </div>
            </div>
            <button type="button" onClick={testGuess} className="rounded-[14px] px-4 py-3 text-sm font-black text-white" style={{ background: colors.rule }}>
              Test my rule
            </button>
          </div>
        </section>

        <CluesTable rows={rows} highlightKey={highlightKey} />
      </div>

      <div className="shrink-0 rounded-[14px] border px-3 py-2 text-center text-sm font-black" style={messageStyle}>
        {hint}
      </div>
    </div>
  )
}
