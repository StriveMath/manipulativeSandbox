import { useCallback, useEffect, useRef, useState } from 'react'

const colors = {
  page: '#EAF4F8',
  ink: '#1A1A2E',
  border: '#E0DDD6',
  scale: '#2E3440',
  display: '#3BE08A',
  dollars: '#1E7A5E',
  quantity: '#185FA5',
  rate: '#7B3F9E',
  better: '#3B9E4E',
  apple: '#D63A3A',
  orange: '#E88A2E',
}

const productBases = [
  { id: 'apple', name: 'Apple', plural: 'apples', color: colors.apple, light: '#FBEAEA' },
  { id: 'orange', name: 'Orange', plural: 'oranges', color: colors.orange, light: '#FFF0DF' },
]

function money(value) {
  return `$${value.toFixed(2)}`
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeRoundProducts() {
  const appleCents = randomInt(50, 90)
  let orangeCents = randomInt(50, 90)
  while (Math.abs(orangeCents - appleCents) < 8) {
    orangeCents = randomInt(50, 90)
  }

  const appleQty = randomInt(5, 8)
  let orangeQty = randomInt(5, 8)
  if (orangeQty === appleQty) orangeQty = orangeQty === 8 ? 5 : orangeQty + 1

  return [
    { ...productBases[0], qty: appleQty, unitCents: appleCents, total: (appleQty * appleCents) / 100 },
    { ...productBases[1], qty: orangeQty, unitCents: orangeCents, total: (orangeQty * orangeCents) / 100 },
  ]
}

function unitRate(product) {
  return product.unitCents / 100
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function MiniNumberLine({ product, revealed }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(320)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const height = 60
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    drawRoundRect(ctx, 0, 0, width, height, 12)
    ctx.fill()

    const pad = 34
    const lineW = width - pad * 2
    const toX = (value) => pad + (value / product.qty) * lineW
    const dollarY = 20
    const qtyY = 42

    ctx.strokeStyle = '#DBD7CE'
    ctx.lineWidth = 1
    for (let tick = 0; tick <= product.qty; tick += 1) {
      const x = toX(tick)
      ctx.beginPath()
      ctx.moveTo(x, dollarY - 5)
      ctx.lineTo(x, qtyY + 5)
      ctx.stroke()
    }

    ;[
      { y: dollarY, color: colors.dollars, label: '$' },
      { y: qtyY, color: colors.quantity, label: 'qty' },
    ].forEach((line) => {
      ctx.strokeStyle = line.color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(pad, line.y)
      ctx.lineTo(width - pad, line.y)
      ctx.stroke()
      ctx.fillStyle = line.color
      ctx.font = '900 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(line.label, 8, line.y)
    })

    const endpointX = toX(product.qty)
    ctx.strokeStyle = product.color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(endpointX, dollarY - 8)
    ctx.lineTo(endpointX, qtyY + 8)
    ctx.stroke()

    ctx.fillStyle = product.color
    ctx.beginPath()
    ctx.arc(endpointX, dollarY, 6, 0, Math.PI * 2)
    ctx.arc(endpointX, qtyY, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = '900 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = colors.dollars
    ctx.fillText(money(product.total), endpointX, dollarY - 13)
    ctx.fillStyle = colors.quantity
    ctx.fillText(String(product.qty), endpointX, qtyY + 13)

    if (revealed) {
      const oneX = toX(1)
      ctx.strokeStyle = colors.rate
      ctx.lineWidth = 3
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(oneX, dollarY - 10)
      ctx.lineTo(oneX, qtyY + 10)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = colors.rate
      ctx.font = '900 12px Inter, system-ui, sans-serif'
      ctx.fillText(money(unitRate(product)), oneX, dollarY - 13)
      ctx.fillText('1', oneX, qtyY + 13)
    }
  }, [product, revealed, width])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(250, Math.floor(entry.contentRect.width))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.border }}>
      <canvas ref={canvasRef} className="block" aria-label={`${product.name} quantity and price number line`} />
    </div>
  )
}

function FruitDot({ product, small = false }) {
  return (
    <span
      className={`relative inline-block rounded-full ${small ? 'h-5 w-5' : 'h-7 w-7'} shadow-sm`}
      style={{ background: product.color }}
    >
      <span className="absolute left-1/2 top-0 h-1.5 w-2 -translate-x-1/2 -translate-y-1 rounded-full bg-[#5D8E35]" />
      {product.id === 'apple' && <span className="absolute left-1/2 top-0 h-2 w-1 -translate-x-1/2 -translate-y-1 rounded bg-[#7C4A22]" />}
      <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/45" />
    </span>
  )
}

function FruitCrate({ product }) {
  return (
    <div className="rounded-2xl border bg-white p-2 shadow-sm" style={{ borderColor: product.color }}>
      <div className="grid grid-cols-4 gap-1 rounded-xl p-2" style={{ background: product.light }}>
        {Array.from({ length: product.qty }).map((_, index) => (
          <FruitDot key={`${product.id}-crate-${index}`} product={product} />
        ))}
      </div>
      <div className="mt-1 text-center text-xs font-black uppercase tracking-wide" style={{ color: product.color }}>
        {product.qty} {product.plural}
      </div>
    </div>
  )
}

function ScaleGraphic({ product, revealed }) {
  return (
    <div className="relative mx-auto flex h-[88px] max-w-[320px] flex-col items-center justify-end">
      <div className="h-4 w-40 rounded-t-[28px]" style={{ background: '#59606E' }} />
      <div className="w-[17.5rem] rounded-3xl px-4 py-3 shadow-xl" style={{ background: colors.scale }}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-[#06130C] px-3 py-1.5 font-mono font-black">
          <div className="min-w-0 text-right">
            <div className="text-[10px] uppercase tracking-wide text-white/45">{product.qty} total</div>
            <div className="text-2xl leading-none" style={{ color: colors.display }}>
              {money(product.total)}
            </div>
          </div>
          {revealed && (
            <div className="animate-[unitPop_420ms_ease-out_both] rounded-lg bg-white px-2 py-1 text-xs shadow-sm" style={{ color: colors.rate }}>
              <div className="flex items-center gap-1.5">
                <FruitDot product={product} small />
                <span className="whitespace-nowrap">{money(unitRate(product))}</span>
              </div>
              <div className="text-center text-[9px] font-black uppercase leading-none tracking-wide">for 1</div>
            </div>
          )}
        </div>
        <div className="mt-1 text-center text-[10px] font-black uppercase tracking-wide text-white/70">total price given</div>
      </div>
    </div>
  )
}

function ProductPanel({ product, input, revealed, status, chosen, winner, onInput, onCheck }) {
  const isBetter = winner && chosen
  const isChosenWrong = chosen && !winner

  return (
    <section
      className="flex min-h-0 flex-col gap-2 rounded-2xl border bg-white p-2 transition-all"
      style={{
        borderColor: isBetter ? colors.better : product.color,
        boxShadow: isBetter ? '0 0 0 3px rgba(59, 158, 78, 0.14)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2" style={{ background: product.light }}>
        <div>
          <div className="text-xl font-black" style={{ color: product.color }}>{product.name}s</div>
          <div className="text-sm font-black text-neutral-700">{product.qty} {product.plural} for {money(product.total)}</div>
        </div>
        <FruitCrate product={product} />
      </div>

      <ScaleGraphic product={product} revealed={revealed} />
      <MiniNumberLine product={product} revealed={revealed} />

      <div className="mx-auto w-full max-w-[360px] rounded-2xl border bg-white p-2" style={{ borderColor: colors.rate }}>
        <label className="text-xs font-black uppercase tracking-wide text-neutral-500" htmlFor={`${product.id}-rate`}>
          Price for one {product.name.toLowerCase()}
        </label>
        <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="text-lg font-black">$</span>
          <input
            id={`${product.id}-rate`}
            value={input}
            onChange={(event) => onInput(event.target.value)}
            inputMode="decimal"
            className="min-w-0 rounded-xl border px-3 py-1.5 text-center font-mono text-lg font-black outline-none"
            style={{ borderColor: colors.rate }}
            placeholder="0.00"
          />
          <button type="button" onClick={onCheck} className="rounded-xl px-4 py-1.5 text-sm font-black text-white" style={{ background: colors.rate }}>
            Check
          </button>
        </div>
        <div className="mt-1 min-h-[18px] text-center text-sm font-black">
          {status === 'wrong' && <span className="text-[#D64550]">Try again. Divide total price by quantity.</span>}
          {revealed && status !== 'wrong' && <span style={{ color: colors.rate }}>Correct. See the unit price on the scale.</span>}
        </div>
        {isChosenWrong && <div className="mt-2 text-sm font-black text-[#D64550]">This costs more per one.</div>}
      </div>
    </section>
  )
}

export default function UnitRateExplorer() {
  const [roundProducts, setRoundProducts] = useState(() => makeRoundProducts())
  const [rateInputs, setRateInputs] = useState(['', ''])
  const [revealed, setRevealed] = useState([false, false])
  const [rateStatus, setRateStatus] = useState([null, null])
  const [choice, setChoice] = useState(null)

  const betterIndex = unitRate(roundProducts[0]) <= unitRate(roundProducts[1]) ? 0 : 1
  const bothRevealed = revealed.every(Boolean)

  const reset = () => {
    setRoundProducts(makeRoundProducts())
    setRateInputs(['', ''])
    setRevealed([false, false])
    setRateStatus([null, null])
    setChoice(null)
  }

  const checkRate = (index) => {
    const guess = Number(rateInputs[index])
    if (Math.abs(guess - unitRate(roundProducts[index])) <= 0.01) {
      setRevealed((current) => current.map((value, itemIndex) => itemIndex === index ? true : value))
      setRateStatus((current) => current.map((value, itemIndex) => itemIndex === index ? 'correct' : value))
    } else {
      setRateStatus((current) => current.map((value, itemIndex) => itemIndex === index ? 'wrong' : value))
    }
  }

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-2.5" style={{ background: colors.page, color: colors.ink }}>
      <style>
        {`
          @keyframes unitLift {
            0% { opacity: 0; transform: translate(-50%, 58px) scale(0.82); }
            35% { opacity: 1; transform: translate(-50%, 12px) scale(1.08); }
            100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          }
          @keyframes unitPop {
            0% { opacity: 0; transform: scale(0.76); }
            65% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      <section className="shrink-0 rounded-2xl border bg-white px-4 py-2 text-center shadow-sm" style={{ borderColor: colors.border }}>
        <div className="text-xs font-black uppercase tracking-wide" style={{ color: colors.rate }}>Objective</div>
        <div className="mt-0.5 text-sm font-bold text-neutral-700">
          Different amounts are hard to compare. Find the price for ONE of each, then choose the better buy.
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 max-[700px]:grid-cols-1 max-[700px]:overflow-y-auto">
        {roundProducts.map((product, index) => (
          <ProductPanel
            key={product.id}
            product={product}
            input={rateInputs[index]}
            revealed={revealed[index]}
            status={rateStatus[index]}
            chosen={choice === index}
            winner={index === betterIndex}
            onInput={(value) => setRateInputs((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
            onCheck={() => checkRate(index)}
          />
        ))}
      </div>

      <section className={`${bothRevealed && choice === null ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]'} grid shrink-0 items-center gap-2 max-[560px]:grid-cols-1`}>
        {bothRevealed && choice === null && roundProducts.map((product, index) => (
          <button
            key={product.id}
            type="button"
            onClick={() => setChoice(index)}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-black transition"
            style={{
              borderColor: choice === index ? colors.better : colors.border,
              background: choice === index ? '#E9F5EF' : '#ffffff',
              color: choice === index ? colors.better : colors.ink,
            }}
          >
            {product.name}s are cheaper
          </button>
        ))}
        {choice !== null && (
          <div className="rounded-xl border px-3 py-2 text-center text-base font-black" style={{ borderColor: colors.better, background: '#E9F5EF', color: colors.better }}>
            Better buy: lower price for one.
          </div>
        )}
        {!bothRevealed && <div />}
        <button type="button" onClick={reset} className="rounded-xl border bg-white px-4 py-2 text-sm font-black" style={{ borderColor: colors.border }}>
          New round
        </button>
      </section>
    </div>
  )
}
