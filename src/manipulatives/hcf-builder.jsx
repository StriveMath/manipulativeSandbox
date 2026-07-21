import { useEffect, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  a: '#2660C4',
  aTint: '#EAF0FB',
  b: '#1E7A5E',
  bTint: '#E9F5EF',
  shared: '#7B3F9E',
  sharedTint: '#F3EEFA',
  result: '#1E5F74',
  resultTint: '#E4F3F7',
  resultBorder: '#7FC5D6',
  amber: '#8A4A12',
  amberTint: '#FBEEDD',
  win: '#27500A',
  winTint: '#EAF3DE',
}

const pairs = [
  [60, 90],
  [12, 18],
  [8, 12],
  [20, 30],
  [16, 24],
  [18, 24],
  [10, 15],
  [9, 12],
  [24, 36],
  [8, 9],
]

function primeFactors(value) {
  const factors = []
  let n = value
  let divisor = 2
  while (divisor * divisor <= n) {
    while (n % divisor === 0) {
      factors.push(divisor)
      n /= divisor
    }
    divisor += divisor === 2 ? 1 : 2
  }
  if (n > 1) factors.push(n)
  return factors
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = y
    y = x % y
    x = next
  }
  return x
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeTokens(row, factors) {
  return factors.map((value, index) => ({
    id: `${row}-${index}-${value}`,
    row,
    value,
    status: 'open',
  }))
}

function rowColor(row) {
  return row === 'a' ? colors.a : colors.b
}

function rowTint(row) {
  return row === 'a' ? colors.aTint : colors.bTint
}

function tokenTheme(token) {
  if (token.origin === 'shared') return { color: colors.shared, tint: colors.sharedTint }
  return { color: rowColor(token.row ?? token.origin), tint: rowTint(token.row ?? token.origin) }
}

function PrimeToken({ token, selected, disabled, register, onClick, built }) {
  const { color, tint } = tokenTheme(token)
  const isUsed = token.status === 'used'
  const isMerging = token.status === 'merging'
  const isLeftover = token.status === 'leftover'

  return (
    <button
      ref={(node) => register(token.id, node)}
      type="button"
      disabled={disabled || isUsed || isMerging || isLeftover}
      onClick={onClick}
      className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-xl border-2 font-mono text-xl font-black transition duration-300 ${
        selected ? 'scale-110 shadow-[0_0_0_7px_rgba(123,63,158,.18)]' : ''
      } ${isUsed ? 'opacity-20 grayscale' : ''} ${isMerging ? 'opacity-0' : ''} ${
        isLeftover ? 'shadow-[0_0_0_4px_rgba(138,74,18,.16)]' : ''
      } ${built && isLeftover ? 'translate-y-4 opacity-15' : ''} ${token.shake ? 'animate-[hcfShake_260ms_ease-in-out]' : ''}`}
      style={{
        color,
        background: isLeftover ? '#fffaf3' : tint,
        borderColor: isLeftover ? colors.amber : color,
        cursor: disabled || isUsed || isMerging || isLeftover ? 'default' : 'pointer',
      }}
    >
      {token.value}
      {isLeftover ? (
        <span
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-black text-white"
          style={{ background: colors.amber }}
        >
          !
        </span>
      ) : null}
    </button>
  )
}

function SharedToken({ item, built }) {
  return (
    <div
      className={`flex h-[46px] w-[46px] items-center justify-center rounded-xl border-2 font-mono text-xl font-black transition duration-500 ${
        item.fresh ? 'animate-[hcfPop_420ms_ease-out]' : ''
      } ${built ? '-translate-y-1 shadow-[0_8px_18px_rgba(123,63,158,.18)]' : ''}`}
      style={{ color: colors.shared, background: colors.sharedTint, borderColor: colors.shared }}
    >
      {item.value}
    </div>
  )
}

function NumberLane({ value, children, color, ariaLabel, onValueChange, onValueCommit }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-4">
      <input
        type="number"
        min="2"
        max="120"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onValueCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        aria-label={ariaLabel}
        className="h-[48px] rounded-xl border px-3 text-center font-mono text-2xl font-black outline-none transition focus:shadow-[0_0_0_5px_rgba(123,63,158,.16)]"
        style={{ color, background: color === colors.a ? colors.aTint : colors.bTint, borderColor: color }}
      />
      <div className="flex min-h-[52px] flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function HcfEquation({ factors, hcf, built }) {
  if (!built) {
    return (
      <span className="text-sm font-bold" style={{ color: colors.muted }}>
        Build to keep only the shared primes.
      </span>
    )
  }
  if (!factors.length) {
    return (
      <div className="flex items-center gap-3 font-mono font-black">
        <span style={{ color: colors.result }}>HCF</span>
        <span style={{ color: colors.muted }}>=</span>
        <span className="animate-[hcfAnswerPulse_1.7s_ease-in-out_1] text-3xl" style={{ color: colors.result }}>
          1
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xl font-black">
      <span style={{ color: colors.result }}>HCF</span>
      <span style={{ color: colors.muted }}>=</span>
      {factors.map((factor, index) => (
        <span key={factor.id} className="flex items-center gap-2">
          <span style={{ color: colors.shared }}>{factor.value}</span>
          {index < factors.length - 1 ? <span style={{ color: colors.muted }}>x</span> : null}
        </span>
      ))}
      <span style={{ color: colors.muted }}>=</span>
      <span className="animate-[hcfAnswerPulse_1.7s_ease-in-out_1] text-3xl" style={{ color: colors.result }}>
        {hcf}
      </span>
    </div>
  )
}

function GroupingRow({ value, hcf, row }) {
  const count = value / hcf
  const color = rowColor(row)
  const tint = rowTint(row)
  return (
    <div className="grid grid-cols-[58px_1fr_104px] items-center gap-2">
      <div className="font-mono text-base font-black" style={{ color }}>
        {value}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex h-7 min-w-10 animate-[hcfBlockIn_520ms_ease-out_both] items-center justify-center rounded-lg border px-2 font-mono text-xs font-black"
            style={{ animationDelay: `${index * 90}ms`, color, background: tint, borderColor: color }}
          >
            {hcf}
          </div>
        ))}
      </div>
      <div className="font-mono text-xs font-black" style={{ color }}>
        {count} x {hcf} = {value}
      </div>
    </div>
  )
}

export default function HcfBuilder() {
  const [pairIndex, setPairIndex] = useState(0)
  const [[aValue, bValue], setValues] = useState(pairs[0])
  const [aText, setAText] = useState(String(pairs[0][0]))
  const [bText, setBText] = useState(String(pairs[0][1]))
  const hcf = gcd(aValue, bValue)
  const [aTokens, setATokens] = useState(() => makeTokens('a', primeFactors(aValue)))
  const [bTokens, setBTokens] = useState(() => makeTokens('b', primeFactors(bValue)))
  const [selected, setSelected] = useState(null)
  const [shared, setShared] = useState([])
  const [mergeFx, setMergeFx] = useState(null)
  const [buildStarted, setBuildStarted] = useState(false)
  const [buildDone, setBuildDone] = useState(false)
  const stageRef = useRef(null)
  const tokenRefs = useRef({})
  const sharedLaneRef = useRef(null)
  const timersRef = useRef([])

  const allTokens = [...aTokens, ...bTokens]
  const openTokens = allTokens.filter((token) => token.status === 'open')
  const canBuild = !mergeFx && !buildStarted && openTokens.every((token) => !hasPartner(token))

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  function resetToValues(nextA, nextB, nextIndex = pairIndex) {
    clearTimers()
    setPairIndex(nextIndex)
    setValues([nextA, nextB])
    setAText(String(nextA))
    setBText(String(nextB))
    setATokens(makeTokens('a', primeFactors(nextA)))
    setBTokens(makeTokens('b', primeFactors(nextB)))
    setSelected(null)
    setShared([])
    setMergeFx(null)
    setBuildStarted(false)
    setBuildDone(false)
  }

  function reset(nextIndex = pairIndex) {
    const [nextA, nextB] = pairs[nextIndex]
    resetToValues(nextA, nextB, nextIndex)
  }

  function normalizeValue(raw, fallback) {
    const next = Number(raw)
    if (!Number.isFinite(next)) return fallback
    return clamp(Math.round(next), 2, 120)
  }

  function changeNumber(row, raw) {
    if (row === 'a') {
      setAText(raw)
      const nextA = Number(raw)
      if (Number.isFinite(nextA) && nextA >= 2 && nextA <= 120) {
        resetToValues(Math.round(nextA), bValue)
      }
      return
    }
    setBText(raw)
    const nextB = Number(raw)
    if (Number.isFinite(nextB) && nextB >= 2 && nextB <= 120) {
      resetToValues(aValue, Math.round(nextB))
    }
  }

  function commitNumber(row) {
    if (row === 'a') {
      resetToValues(normalizeValue(aText, aValue), bValue)
      return
    }
    resetToValues(aValue, normalizeValue(bText, bValue))
  }

  function updateToken(row, id, patch) {
    const setter = row === 'a' ? setATokens : setBTokens
    setter((tokens) => tokens.map((token) => (token.id === id ? { ...token, ...patch } : token)))
  }

  function tokenCenter(id) {
    const stage = stageRef.current
    const node = tokenRefs.current[id]
    if (!stage || !node) return null
    const stageBox = stage.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    return {
      x: box.left - stageBox.left + box.width / 2,
      y: box.top - stageBox.top + box.height / 2,
    }
  }

  function sharedTarget() {
    const stage = stageRef.current
    const lane = sharedLaneRef.current
    if (!stage || !lane) return { x: 420, y: 255 }
    const stageBox = stage.getBoundingClientRect()
    const box = lane.getBoundingClientRect()
    return {
      x: box.left - stageBox.left + 38 + shared.length * 60,
      y: box.top - stageBox.top + box.height / 2,
    }
  }

  function mergePosition(point) {
    if (!mergeFx || mergeFx.phase === 'start') return point
    if (mergeFx.phase === 'lift') {
      return {
        x: (point.x + mergeFx.target.x) / 2,
        y: Math.min(point.y - 38, mergeFx.target.y - 70),
      }
    }
    return mergeFx.target
  }

  function hasPartner(token) {
    const otherTokens = token.row === 'a' ? bTokens : aTokens
    return otherTokens.some((other) => other.status === 'open' && other.value === token.value)
  }

  function markLeftover(token) {
    updateToken(token.row, token.id, { status: 'leftover' })
    setSelected(null)
  }

  function markRemainingLeftovers() {
    setATokens((tokens) => tokens.map((token) => (token.status === 'open' ? { ...token, status: 'leftover' } : token)))
    setBTokens((tokens) => tokens.map((token) => (token.status === 'open' ? { ...token, status: 'leftover' } : token)))
    setSelected(null)
  }

  function markShake(token) {
    updateToken(token.row, token.id, { shake: true })
    const timer = window.setTimeout(() => updateToken(token.row, token.id, { shake: false }), 280)
    timersRef.current.push(timer)
  }

  function mergeTokens(first, second) {
    const fromA = first.row === 'a' ? first : second
    const fromB = first.row === 'b' ? first : second
    const startA = tokenCenter(fromA.id)
    const startB = tokenCenter(fromB.id)
    const target = sharedTarget()
    if (!startA || !startB) return

    updateToken(fromA.row, fromA.id, { status: 'merging' })
    updateToken(fromB.row, fromB.id, { status: 'merging' })
    setSelected(null)
    setMergeFx({ value: first.value, startA, startB, target, phase: 'start' })
    const liftTimer = window.setTimeout(() => setMergeFx((fx) => (fx ? { ...fx, phase: 'lift' } : fx)), 30)
    const dropTimer = window.setTimeout(() => setMergeFx((fx) => (fx ? { ...fx, phase: 'land' } : fx)), 410)
    const landTimer = window.setTimeout(() => {
      updateToken(fromA.row, fromA.id, { status: 'used' })
      updateToken(fromB.row, fromB.id, { status: 'used' })
      setShared((items) => [
        ...items,
        { id: `shared-${fromA.id}-${fromB.id}`, value: first.value, origin: 'shared', fresh: true },
      ])
      setMergeFx(null)
    }, 760)
    const settleTimer = window.setTimeout(() => {
      setShared((items) => items.map((item) => ({ ...item, fresh: false })))
    }, 820)
    timersRef.current.push(liftTimer, dropTimer, landTimer, settleTimer)
  }

  function handleToken(token) {
    if (buildStarted || mergeFx || token.status !== 'open') return

    if (!hasPartner(token)) {
      markLeftover(token)
      return
    }

    if (!selected) {
      setSelected(token)
      return
    }

    if (selected.id === token.id) {
      setSelected(null)
      return
    }

    if (selected.row !== token.row && selected.value === token.value) {
      mergeTokens(selected, token)
      return
    }

    markShake(token)
    setSelected(token)
  }

  function buildHcf() {
    if (!canBuild) return
    markRemainingLeftovers()
    setBuildStarted(true)
    const done = window.setTimeout(() => setBuildDone(true), 900)
    timersRef.current.push(done)
  }

  function nextPair() {
    reset((pairIndex + 1) % pairs.length)
  }

  const hint = (() => {
    if (buildDone && hcf === 1) return 'These share no primes at all. Their only common factor is 1, so they are coprime.'
    if (buildDone) return 'The leftovers fell away because they belong to only one number. Only the shared primes survive.'
    if (canBuild) return 'All shared pairs are merged. Build the HCF; any remaining primes will fall away as leftovers.'
    if (selected) return `You picked a ${selected.value}. Tap a ${selected.value} in the other number to merge them.`
    return 'Find primes that appear in both numbers. A prime with no partner is a leftover; tap it on its own.'
  })()

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-1.5 overflow-hidden px-3 py-2 text-[1rem]" style={{ background: colors.page }}>
      <style>{`
        @keyframes hcfShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes hcfPop {
          0% { transform: scale(.72); filter: brightness(1.18); }
          62% { transform: scale(1.15); filter: brightness(1.08); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes hcfAnswerPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          25% { transform: scale(1.18); filter: brightness(1.15); }
          50% { transform: scale(.94); filter: brightness(1.02); }
          75% { transform: scale(1.12); filter: brightness(1.1); }
        }
        @keyframes hcfBlockIn {
          0% { transform: translateY(10px) scale(.82); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold" style={{ color: colors.muted }}>
          Merge shared primes. On build, leftovers fall away and only the HCF survives.
        </div>
        <button
          type="button"
          onClick={nextPair}
          className="rounded-full border bg-white px-5 py-2 text-sm font-black shadow-sm"
          style={{ borderColor: colors.border, color: colors.ink }}
        >
          New pair
        </button>
      </div>

      <section
        ref={stageRef}
        className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[16px] border bg-white p-4 shadow-sm"
        style={{ borderColor: colors.border }}
      >
        {mergeFx ? (
          <>
            {[mergeFx.startA, mergeFx.startB].map((point, index) => (
              <div
                key={index}
                className="pointer-events-none absolute z-30 flex h-[46px] w-[46px] items-center justify-center rounded-xl border-2 font-mono text-xl font-black shadow-lg transition-transform duration-[340ms] ease-in-out"
                style={{
                  left: 0,
                  top: 0,
                  color: colors.shared,
                  background: colors.sharedTint,
                  borderColor: colors.shared,
                  transform: `translate(${mergePosition(point).x - 23}px, ${mergePosition(point).y - 23}px) scale(${
                    mergeFx.phase === 'land' ? 0.72 : 1
                  })`,
                }}
              >
                {mergeFx.value}
              </div>
            ))}
          </>
        ) : null}

        <div className="relative z-10 grid gap-3">
          <NumberLane
            value={aText}
            color={colors.a}
            ariaLabel="First number"
            onValueChange={(value) => changeNumber('a', value)}
            onValueCommit={() => commitNumber('a')}
          >
            {aTokens.map((token) => (
              <PrimeToken
                key={token.id}
                token={token}
                selected={selected?.id === token.id}
                disabled={Boolean(mergeFx) || buildStarted}
                built={buildStarted}
                register={(id, node) => {
                  if (node) tokenRefs.current[id] = node
                }}
                onClick={() => handleToken(token)}
              />
            ))}
          </NumberLane>

          <NumberLane
            value={bText}
            color={colors.b}
            ariaLabel="Second number"
            onValueChange={(value) => changeNumber('b', value)}
            onValueCommit={() => commitNumber('b')}
          >
            {bTokens.map((token) => (
              <PrimeToken
                key={token.id}
                token={token}
                selected={selected?.id === token.id}
                disabled={Boolean(mergeFx) || buildStarted}
                built={buildStarted}
                register={(id, node) => {
                  if (node) tokenRefs.current[id] = node
                }}
                onClick={() => handleToken(token)}
              />
            ))}
          </NumberLane>

          <div className="h-px w-full" style={{ background: colors.border }} />

          <div className="grid grid-cols-[94px_1fr] items-center gap-4">
            <div
              className="flex h-[48px] items-center justify-center rounded-xl border px-3 font-mono text-lg font-black"
              style={{ color: colors.shared, background: colors.sharedTint, borderColor: colors.shared }}
            >
              Shared
            </div>
            <div
              ref={sharedLaneRef}
              className="flex min-h-[58px] flex-wrap items-center gap-3 rounded-[14px] border px-4 py-2"
              style={{ borderColor: colors.shared, background: colors.sharedTint }}
            >
              {shared.length ? (
                shared.map((item) => <SharedToken key={item.id} item={item} built={buildStarted} />)
              ) : (
                <span className="text-sm font-bold" style={{ color: colors.muted }}>
                  Shared primes will merge here.
                </span>
              )}
            </div>
          </div>

          <div
            className="flex min-h-[48px] items-center justify-center rounded-[14px] border px-4 py-1.5"
            style={{ borderColor: colors.resultBorder, background: colors.resultTint }}
          >
            <HcfEquation factors={shared} hcf={hcf} built={buildDone} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="rounded-[14px] border bg-white px-3 py-2 text-sm font-bold" style={{ borderColor: colors.border, color: colors.ink }}>
          {hint}
        </div>
        <button
          type="button"
          onClick={buildHcf}
          disabled={!canBuild}
          className="rounded-[14px] px-5 py-2 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: colors.result }}
        >
          Build the HCF
        </button>
      </div>

      <section
        className="min-h-[92px] rounded-[14px] border bg-white px-4 py-2"
        style={{ borderColor: buildDone ? colors.resultBorder : colors.border }}
      >
        {buildDone ? (
          <div className="grid gap-1.5">
            <div className="text-xs font-black" style={{ color: colors.result }}>
              {hcf} is the biggest equal group that fits into both.
            </div>
            <GroupingRow value={aValue} hcf={hcf} row="a" />
            <GroupingRow value={bValue} hcf={hcf} row="b" />
          </div>
        ) : (
          <div className="flex h-full items-center text-sm font-bold" style={{ color: colors.muted }}>
            After building, the shared primes will become the HCF and show equal groups for both numbers.
          </div>
        )}
      </section>
    </div>
  )
}
