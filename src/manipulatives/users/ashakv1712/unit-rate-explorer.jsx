import { useMemo, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  packA: '#2660C4',
  packATint: '#EAF0FB',
  packABorder: '#8AA8DD',
  packB: '#1E7A5E',
  packBTint: '#E9F5EF',
  packBBorder: '#7FCBAC',
  rate: '#7B3F9E',
  rateTint: '#F3EEFA',
  rateBorder: '#C99BE0',
  wrong: '#B23050',
  win: '#27500A',
  winTint: '#EAF3DE',
}

const rounds = [
  { item: 'Granola bar', icon: '🍫', a: { qty: 6, total: 3 }, b: { qty: 10, total: 4.5 } },
  { item: 'Juice box', icon: '🧃', a: { qty: 4, total: 3 }, b: { qty: 8, total: 6.4 } },
  { item: 'Pencil', icon: '✏️', a: { qty: 5, total: 2.5 }, b: { qty: 12, total: 5.4 } },
  { item: 'Notebook', icon: '📓', a: { qty: 3, total: 3.3 }, b: { qty: 7, total: 7 } },
  { item: 'Snack pack', icon: '🥨', a: { qty: 8, total: 4.8 }, b: { qty: 12, total: 7.8 } },
  { item: 'Water bottle', icon: '💧', a: { qty: 6, total: 4.2 }, b: { qty: 9, total: 6.75 } },
]

function money(value) {
  return `$${value.toFixed(2)}`
}

function unitRate(pack) {
  return pack.total / pack.qty
}

function cleanInput(raw) {
  return raw.replace(/[$,\s]/g, '')
}

function PackIcons({ count, icon, color, lifted }) {
  return (
    <div className="flex min-h-[62px] flex-wrap items-center justify-center gap-1.5 rounded-[14px] bg-white/70 p-2">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 bg-white text-xl font-black shadow-sm transition-transform ${
            lifted && index === 0 ? 'animate-[unitItemLift_680ms_ease-out_both]' : ''
          }`}
          style={{ color, borderColor: color }}
        >
          {icon}
        </span>
      ))}
    </div>
  )
}

function RateInput({ packKey, color, value, onChange, onCheck }) {
  return (
    <form
      className="grid grid-cols-[auto_1fr_auto] items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onCheck()
      }}
    >
      <span className="text-xl font-black" style={{ color }}>$</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder="0.00"
        aria-label={`One costs for ${packKey}`}
        className="min-w-0 rounded-xl border px-3 py-2 text-center font-mono text-xl font-black outline-none"
        style={{ borderColor: colors.rateBorder, color: colors.rate }}
      />
      <button type="submit" className="rounded-xl px-4 py-2 text-sm font-black text-white" style={{ background: colors.rate }}>
        Check
      </button>
    </form>
  )
}

function PackCard({ label, pack, item, icon, color, tint, border, input, revealed, status, chosen, winner, onInput, onCheck }) {
  const rate = unitRate(pack)
  const isWinner = chosen && winner
  const isWrongChoice = chosen && !winner

  return (
    <section
      className="flex min-h-0 flex-col gap-2 rounded-[14px] border bg-white p-3 transition-all"
      style={{
        borderColor: isWinner ? colors.win : border,
        boxShadow: isWinner ? '0 0 0 4px rgba(39,80,10,0.12)' : 'none',
      }}
    >
      <div className="rounded-[14px] p-3" style={{ background: tint }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-black uppercase tracking-wide" style={{ color }}>{label}</p>
            <h2 className="text-2xl font-black leading-none" style={{ color }}>{item}s</h2>
          </div>
          <p className="rounded-full bg-white px-3 py-1 font-mono text-lg font-black" style={{ color }}>
            {pack.qty} for {money(pack.total)}
          </p>
        </div>
        <PackIcons count={pack.qty} icon={icon} color={color} lifted={revealed} />
      </div>

      <div className="rounded-[14px] border bg-white p-3" style={{ borderColor: colors.rateBorder }}>
        {!revealed ? (
          <>
            <label className="mb-2 block text-sm font-black" style={{ color: colors.rate }}>
              One costs
            </label>
            <RateInput packKey={label} color={color} value={input} onChange={onInput} onCheck={onCheck} />
            <div className="mt-2 min-h-[36px] text-sm font-bold">
              {status === 'wrong' ? (
                <span style={{ color: colors.wrong }}>
                  {money(pack.total)} shared by {pack.qty} — try {money(pack.total)} ÷ {pack.qty}.
                </span>
              ) : (
                <span className="text-[#77736B]">Divide total price by quantity.</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[86px] flex-col items-center justify-center gap-2 text-center">
            <div className="animate-[unitRatePop_460ms_ease-out_both] rounded-full px-4 py-2 font-mono text-2xl font-black" style={{ color: colors.rate, background: colors.rateTint, border: `1.5px solid ${colors.rateBorder}` }}>
              {money(rate)} each
            </div>
            <p className="text-sm font-bold text-[#5F5E5A]">
              {money(pack.total)} ÷ {pack.qty} = {money(rate)}
            </p>
          </div>
        )}
      </div>

      {isWrongChoice && (
        <p className="rounded-xl px-3 py-2 text-center text-sm font-black" style={{ color: colors.wrong, background: '#FBEAEE' }}>
          This pack costs more per item.
        </p>
      )}
    </section>
  )
}

export default function UnitRateExplorer() {
  const [roundIndex, setRoundIndex] = useState(0)
  const [inputs, setInputs] = useState(['', ''])
  const [revealed, setRevealed] = useState([false, false])
  const [statuses, setStatuses] = useState([null, null])
  const [choice, setChoice] = useState(null)

  const round = rounds[roundIndex]
  const packs = useMemo(() => [round.a, round.b], [round])
  const betterIndex = unitRate(packs[0]) <= unitRate(packs[1]) ? 0 : 1
  const bothRevealed = revealed.every(Boolean)
  const hasChoice = choice !== null

  const resetForRound = (nextIndex) => {
    setRoundIndex(nextIndex)
    setInputs(['', ''])
    setRevealed([false, false])
    setStatuses([null, null])
    setChoice(null)
  }

  const nextRound = () => {
    resetForRound((roundIndex + 1) % rounds.length)
  }

  const checkRate = (index) => {
    const guess = Number(cleanInput(inputs[index]))
    const correct = unitRate(packs[index])
    if (Number.isFinite(guess) && Math.abs(guess - correct) <= 0.005) {
      setRevealed((current) => current.map((value, itemIndex) => (itemIndex === index ? true : value)))
      setStatuses((current) => current.map((value, itemIndex) => (itemIndex === index ? 'correct' : value)))
    } else {
      setStatuses((current) => current.map((value, itemIndex) => (itemIndex === index ? 'wrong' : value)))
    }
  }

  const choosePack = (index) => {
    if (!bothRevealed) return
    setChoice(index)
  }

  const hint = (() => {
    const aRate = unitRate(packs[0])
    const bRate = unitRate(packs[1])
    const winner = betterIndex === 0 ? 'Pack A' : 'Pack B'
    if (hasChoice) {
      return `${money(packs[0].total)} ÷ ${packs[0].qty} = ${money(aRate)} and ${money(packs[1].total)} ÷ ${packs[1].qty} = ${money(bRate)}. ${winner} is cheaper per one.`
    }
    if (bothRevealed) return 'Both packs are now priced per one. Lower per-one wins.'
    return `You can't compare ${packs[0].qty} for ${money(packs[0].total)} against ${packs[1].qty} for ${money(packs[1].total)} directly. Divide each total by its quantity.`
  })()

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <style>
        {`
          @keyframes unitItemLift {
            0% { transform: translateY(0) scale(1); }
            58% { transform: translateY(-16px) scale(1.22); }
            100% { transform: translateY(-10px) scale(1.14); }
          }
          @keyframes unitRatePop {
            0% { transform: scale(0.72); opacity: 0; }
            68% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      <section className="shrink-0 rounded-[14px] border bg-white px-4 py-2 text-center" style={{ borderColor: colors.border }}>
        <p className="text-[12px] font-black uppercase tracking-wide" style={{ color: colors.rate }}>Unit Rate — Better Buy</p>
        <p className="text-sm font-bold text-[#5F5E5A]">Find the price for one item in each pack, then choose the lower price per item.</p>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 max-[620px]:grid-cols-1 max-[620px]:overflow-y-auto">
        <PackCard
          label="Pack A"
          pack={packs[0]}
          item={round.item}
          icon={round.icon}
          color={colors.packA}
          tint={colors.packATint}
          border={colors.packABorder}
          input={inputs[0]}
          revealed={revealed[0]}
          status={statuses[0]}
          chosen={choice === 0}
          winner={betterIndex === 0}
          onInput={(value) => setInputs((current) => current.map((item, index) => (index === 0 ? value : item)))}
          onCheck={() => checkRate(0)}
        />
        <PackCard
          label="Pack B"
          pack={packs[1]}
          item={round.item}
          icon={round.icon}
          color={colors.packB}
          tint={colors.packBTint}
          border={colors.packBBorder}
          input={inputs[1]}
          revealed={revealed[1]}
          status={statuses[1]}
          chosen={choice === 1}
          winner={betterIndex === 1}
          onInput={(value) => setInputs((current) => current.map((item, index) => (index === 1 ? value : item)))}
          onCheck={() => checkRate(1)}
        />
      </div>

      <section className="shrink-0 rounded-[14px] border bg-white p-2" style={{ borderColor: colors.border }}>
        {!bothRevealed && (
          <div className="text-center text-sm font-black text-[#5F5E5A]">Find both unit prices to unlock the better-buy choice.</div>
        )}

        {bothRevealed && !hasChoice && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choosePack(0)} className="rounded-xl px-3 py-2 text-base font-black text-white" style={{ background: colors.packA }}>
              Pack A is cheaper
            </button>
            <button type="button" onClick={() => choosePack(1)} className="rounded-xl px-3 py-2 text-base font-black text-white" style={{ background: colors.packB }}>
              Pack B is cheaper
            </button>
          </div>
        )}

        {hasChoice && (
          <div
            className="rounded-xl px-3 py-2 text-center text-base font-black"
            style={{
              color: choice === betterIndex ? colors.win : colors.wrong,
              background: choice === betterIndex ? colors.winTint : '#FBEAEE',
            }}
          >
            {choice === betterIndex
              ? `${betterIndex === 0 ? 'Pack A' : 'Pack B'} wins: fewer dollars per item.`
              : `${betterIndex === 0 ? 'Pack A' : 'Pack B'} is actually cheaper per item.`}
          </div>
        )}
      </section>

      <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-2">
        <p className="rounded-[14px] bg-white px-3 py-2 text-center text-sm font-semibold text-[#5F5E5A]">{hint}</p>
        <button type="button" onClick={nextRound} className="rounded-xl border bg-white px-4 py-2 text-sm font-black" style={{ borderColor: colors.border }}>
          New packs
        </button>
      </div>
    </div>
  )
}
