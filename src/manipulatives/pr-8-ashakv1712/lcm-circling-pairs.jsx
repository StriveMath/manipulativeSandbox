import { useEffect, useMemo, useRef, useState } from 'react'

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
  result: '#B25A1E',
  resultTint: '#FBEEDD',
  resultBorder: '#E0B579',
  win: '#27500A',
  winTint: '#EAF3DE',
}

const pairs = [
  [60, 90],
  [12, 18],
  [8, 12],
  [10, 15],
  [9, 12],
  [16, 24],
  [6, 8],
  [20, 30],
  [15, 20],
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
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

function lcm(a, b) {
  return (a * b) / gcd(a, b)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rowColor(row) {
  return row === 'a' ? colors.a : colors.b
}

function rowTint(row) {
  return row === 'a' ? colors.aTint : colors.bTint
}

function makeTokens(row, factors) {
  return factors.map((value, index) => ({
    id: `${row}-${index}-${value}`,
    row,
    value,
    status: 'open',
  }))
}

function tokenTheme(token) {
  if (token.origin === 'shared') {
    return { color: colors.shared, tint: colors.sharedTint }
  }
  return { color: rowColor(token.row ?? token.origin), tint: rowTint(token.row ?? token.origin) }
}

function PrimeToken({ token, selected, disabled, ghost, register, onClick }) {
  const { color, tint } = tokenTheme(token)
  const isUsed = token.status === 'used'
  const isMerging = token.status === 'merging'

  return (
    <button
      ref={(node) => register(token.id, node)}
      type="button"
      onClick={onClick}
      disabled={disabled || isUsed || isMerging}
      className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 font-mono text-2xl font-black transition duration-200 ${
        selected ? 'scale-110 shadow-[0_0_0_7px_rgba(123,63,158,.2)]' : ''
      } ${ghost || isUsed ? 'opacity-25 grayscale' : ''} ${isMerging ? 'opacity-0' : ''} ${
        !ghost && !isUsed && !isMerging ? 'opacity-100' : ''
      } ${token.shake ? 'animate-[lcmShake_260ms_ease-in-out]' : ''}`}
      style={{
        color,
        background: tint,
        borderColor: color,
        cursor: disabled || isUsed || isMerging ? 'default' : 'pointer',
      }}
    >
      {token.value}
    </button>
  )
}

function SortedToken({ item, visible = true }) {
  const { color, tint } = tokenTheme(item)
  return (
    <div
      className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 font-mono text-2xl font-black transition duration-300 ${
        visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      } ${item.fresh ? 'animate-[lcmPop_420ms_ease-out]' : ''}`}
      style={{ color, background: tint, borderColor: color }}
    >
      {item.value}
    </div>
  )
}

function FactorList({ items, visibleCount = items.length, showAnswer = false, answer }) {
  const visibleItems = items.slice(0, visibleCount)
  if (!visibleItems.length) return null
  return (
    <div className="flex flex-wrap items-center gap-0">
      {visibleItems.map((item, index) => (
        <span key={item.id} className="flex items-center">
          <SortedToken item={item} />
          {index < visibleItems.length - 1 ? (
            <span className="flex w-[34px] justify-center font-mono text-2xl font-black" style={{ color: colors.muted }}>
              x
            </span>
          ) : null}
        </span>
      ))}
      {showAnswer ? (
        <span className="flex items-center gap-3 pl-2 font-mono font-black">
          <span className="text-3xl" style={{ color: colors.muted }}>=</span>
          <span className="animate-[lcmAnswerPulse_2s_ease-in-out_1] text-4xl" style={{ color: colors.result }}>
            {answer}
          </span>
        </span>
      ) : null}
    </div>
  )
}

function Lane({ value, onValueChange, onValueCommit, children, color, ariaLabel }) {
  return (
    <div className="grid grid-cols-[116px_1fr] items-center gap-5">
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
        className="h-[52px] rounded-xl border px-3 text-center font-mono text-2xl font-black outline-none transition focus:shadow-[0_0_0_5px_rgba(123,63,158,.16)]"
        style={{ color, background: color === colors.a ? colors.aTint : color === colors.b ? colors.bTint : colors.resultTint, borderColor: color }}
      />
      <div className="flex min-h-[62px] flex-wrap items-center gap-4">{children}</div>
    </div>
  )
}

export default function LcmCirclingPairs() {
  const [pairIndex, setPairIndex] = useState(0)
  const [[aValue, bValue], setValues] = useState(pairs[0])
  const [aText, setAText] = useState(String(pairs[0][0]))
  const [bText, setBText] = useState(String(pairs[0][1]))
  const finalLcm = lcm(aValue, bValue)
  const [aTokens, setATokens] = useState(() => makeTokens('a', primeFactors(aValue)))
  const [bTokens, setBTokens] = useState(() => makeTokens('b', primeFactors(bValue)))
  const [selected, setSelected] = useState(null)
  const [sorted, setSorted] = useState([])
  const [mergeFx, setMergeFx] = useState(null)
  const [buildStarted, setBuildStarted] = useState(false)
  const [building, setBuilding] = useState(false)
  const stageRef = useRef(null)
  const tokenRefs = useRef({})
  const lcmLaneRef = useRef(null)
  const timersRef = useRef([])

  const allTokens = [...aTokens, ...bTokens]
  const openTokens = allTokens.filter((token) => token.status === 'open')
  const buildReady = openTokens.length === 0 && !mergeFx && !building && !buildStarted
  const buildItems = useMemo(() => sorted, [sorted])

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
    setSorted([])
    setMergeFx(null)
    setBuildStarted(false)
    setBuilding(false)
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

  function lcmTarget(newItem) {
    const stage = stageRef.current
    const lane = lcmLaneRef.current
    if (!stage || !lane) return { x: 480, y: 250 }
    const stageBox = stage.getBoundingClientRect()
    const box = lane.getBoundingClientRect()
    const index = newItem ? sorted.length : sorted.length
    const offset = Math.min(index, 7) * 86
    return {
      x: box.left - stageBox.left + 46 + offset,
      y: box.top - stageBox.top + box.height / 2,
    }
  }

  function mergePosition(point) {
    if (!mergeFx || mergeFx.phase === 'start') return point
    if (mergeFx.phase === 'lift') {
      return {
        x: (point.x + mergeFx.target.x) / 2,
        y: Math.min(mergeFx.target.y - 86, point.y - 38),
      }
    }
    return mergeFx.target
  }

  function hasPartner(token) {
    const otherTokens = token.row === 'a' ? bTokens : aTokens
    return otherTokens.some((other) => other.status === 'open' && other.value === token.value)
  }

  function markLeftover(token) {
    updateToken(token.row, token.id, { status: 'used' })
    setSelected(null)
    setSorted((items) => [
      ...items,
      { id: `left-${token.id}`, value: token.value, origin: token.row, row: token.row, fresh: true },
    ])
    const timer = window.setTimeout(() => {
      setSorted((items) => items.map((item) => ({ ...item, fresh: false })))
    }, 450)
    timersRef.current.push(timer)
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
    const mergedItem = { id: `shared-${fromA.id}-${fromB.id}`, value: first.value, origin: 'shared', fresh: true }
    const target = lcmTarget(mergedItem)
    if (!startA || !startB) return

    updateToken(fromA.row, fromA.id, { status: 'merging' })
    updateToken(fromB.row, fromB.id, { status: 'merging' })
    setSelected(null)
    setMergeFx({ value: first.value, startA, startB, target, phase: 'start' })
    const liftTimer = window.setTimeout(() => setMergeFx((fx) => (fx ? { ...fx, phase: 'lift' } : fx)), 30)
    const dropTimer = window.setTimeout(() => setMergeFx((fx) => (fx ? { ...fx, phase: 'land' } : fx)), 470)
    const landTimer = window.setTimeout(() => {
      updateToken(fromA.row, fromA.id, { status: 'used' })
      updateToken(fromB.row, fromB.id, { status: 'used' })
      setSorted((items) => [...items, mergedItem])
      setMergeFx(null)
    }, 840)
    const settleTimer = window.setTimeout(() => {
      setSorted((items) => items.map((item) => ({ ...item, fresh: false })))
    }, 880)
    timersRef.current.push(liftTimer, dropTimer, landTimer, settleTimer)
  }

  function handleToken(token) {
    if (buildStarted || building || mergeFx || token.status !== 'open') return

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

  function startBuild() {
    if (!buildReady) return
    setBuildStarted(true)
    setBuilding(true)
    const done = window.setTimeout(() => setBuilding(false), 520)
    timersRef.current.push(done)
  }

  function nextPair() {
    reset((pairIndex + 1) % pairs.length)
  }

  const hint = (() => {
    if (buildStarted && !building) {
      return `Each shared pair became one purple prime, so the LCM is ${finalLcm}, not ${aValue} x ${bValue}.`
    }
    if (buildReady) return 'Every prime is sorted. Build the LCM and watch them combine.'
    if (selected) return `You picked a ${selected.value}. Tap a ${selected.value} in the other number to merge them.`
    return 'Tap a prime, then tap its match in the other number. If no match is left, it becomes a leftover.'
  })()

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden px-3 py-2 text-[1.08rem]" style={{ background: colors.page }}>
      <style>{`
        @keyframes lcmShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes lcmPop {
          0% { transform: scale(.72); filter: brightness(1.2); }
          60% { transform: scale(1.15); filter: brightness(1.08); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes lcmAnswerPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          18% { transform: scale(1.22); filter: brightness(1.15); }
          36% { transform: scale(.92); filter: brightness(1.02); }
          54% { transform: scale(1.18); filter: brightness(1.14); }
          72% { transform: scale(.96); filter: brightness(1.04); }
        }
      `}</style>

      <div className="flex w-full items-center justify-between gap-4">
        <div className="text-[15px] font-semibold" style={{ color: colors.muted }}>
          Shared primes merge into one purple token. Leftovers keep their original colour.
        </div>
        <button
          type="button"
          onClick={nextPair}
          className="rounded-full border bg-white px-5 py-2 text-base font-black shadow-sm"
          style={{ borderColor: colors.border, color: colors.ink }}
        >
          New pair
        </button>
      </div>

      <section
        ref={stageRef}
        className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[16px] border bg-white p-6 shadow-sm"
        style={{ borderColor: colors.border }}
      >
        {mergeFx ? (
          <>
            {[mergeFx.startA, mergeFx.startB].map((point, index) => (
              <div
                key={index}
                className="pointer-events-none absolute z-30 flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 font-mono text-2xl font-black shadow-lg transition-transform duration-[360ms] ease-in-out"
                style={{
                  left: 0,
                  top: 0,
                  color: colors.shared,
                  background: colors.sharedTint,
                  borderColor: colors.shared,
                  transform: `translate(${mergePosition(point).x - 26}px, ${mergePosition(point).y - 26}px) scale(${
                    mergeFx.phase === 'land' ? 0.76 : 1
                  })`,
                }}
              >
                {mergeFx.value}
              </div>
            ))}
          </>
        ) : null}

        <div className="relative z-10 grid w-full gap-5">
          <Lane
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
                disabled={Boolean(mergeFx) || building || buildStarted}
                register={(id, node) => {
                  if (node) tokenRefs.current[id] = node
                }}
                onClick={() => handleToken(token)}
              />
            ))}
          </Lane>

          <Lane
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
                disabled={Boolean(mergeFx) || building || buildStarted}
                register={(id, node) => {
                  if (node) tokenRefs.current[id] = node
                }}
                onClick={() => handleToken(token)}
              />
            ))}
          </Lane>

          <div className="h-px w-full" style={{ background: colors.border }} />

          <div className="grid grid-cols-[116px_1fr] items-center gap-5">
            <div
              className="flex h-[52px] items-center justify-center rounded-xl border px-3 font-mono text-xl font-black"
              style={{ color: colors.result, background: colors.resultTint, borderColor: colors.resultBorder }}
            >
              LCM
            </div>
            <div
              ref={lcmLaneRef}
              className="flex min-h-[78px] flex-wrap items-center rounded-[14px] border px-5 py-3"
              style={{ borderColor: colors.resultBorder, background: colors.resultTint }}
            >
              {sorted.length ? (
                <FactorList items={buildItems} showAnswer={buildStarted && !building} answer={finalLcm} />
              ) : (
                <span className="text-base font-bold" style={{ color: colors.muted }}>
                  Shared primes and leftovers will build the LCM here.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid w-full grid-cols-[1fr_auto] items-stretch gap-3">
        <div className="rounded-[14px] border bg-white px-4 py-3 text-base font-bold" style={{ borderColor: colors.border, color: colors.ink }}>
          {hint}
        </div>
        <button
          type="button"
          onClick={startBuild}
          disabled={!buildReady}
          className="rounded-[14px] px-6 py-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: colors.result }}
        >
          Show LCM
        </button>
      </div>

      <div
        className="min-h-[64px] w-full rounded-[14px] border bg-white px-4 py-2"
        style={{ borderColor: buildStarted && !building ? colors.resultBorder : colors.border }}
      >
        {buildStarted && !building ? (
          <div className="flex h-full items-center text-base font-bold" style={{ color: colors.muted }}>
            Check: {finalLcm} / {aValue} = {finalLcm / aValue} and {finalLcm} / {bValue} = {finalLcm / bValue}. Shared pairs merged once, so {finalLcm} is smaller than {aValue} x {bValue}.
          </div>
        ) : (
          <div className="flex h-full items-center text-base font-bold" style={{ color: colors.muted }}>
            Sort every prime first: shared factors become purple, unshared factors stay blue or green.
          </div>
        )}
      </div>
    </div>
  )
}
