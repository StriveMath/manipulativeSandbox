import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  muted: '#5F5E5A',
  border: '#E0DDD6',
  a: '#2660C4',
  aTint: '#EAF0FB',
  aBorder: '#8AA8DD',
  b: '#B25A1E',
  bTint: '#FBEEDD',
  bBorder: '#E0B579',
  purple: '#7B3F9E',
  purpleTint: '#F3EEFA',
  purpleBorder: '#C99BE0',
  different: '#B23050',
  differentTint: '#FBE9ED',
  differentBorder: '#E8A0B0',
  overlap: '#1E7A5E',
  overlapTint: '#EAF3DE',
  overlapBorder: '#97C459',
  correct: '#27500A',
  wrong: '#B23050',
  choiceDifferent: '#7B3F9E',
  choiceDifferentTint: '#F3EEFA',
  choiceDifferentBorder: '#C99BE0',
  choiceOverlap: '#2660C4',
  choiceOverlapTint: '#EAF0FB',
  choiceOverlapBorder: '#8AA8DD',
  amber: '#B25A1E',
  grid: '#DEDAD1',
}

const scenarios = [
  {
    title: 'Homework time',
    question: 'Do Year 7 or Year 9 students spend longer on homework each night?',
    aName: 'Year 7',
    bName: 'Year 9',
    units: 'min',
    a: [25, 28, 30, 32, 35, 36, 38, 40, 42, 45],
    b: [58, 60, 62, 65, 66, 68, 70, 72, 75, 78],
  },
  {
    title: 'Test scores',
    question: 'Does Class B really score higher than Class A?',
    aName: 'Class A',
    bName: 'Class B',
    units: 'pts',
    a: [68, 72, 75, 78, 80, 83, 86, 89, 92, 96],
    b: [70, 74, 78, 81, 84, 87, 90, 94, 97, 99],
  },
  {
    title: 'Player height',
    question: 'Are basketball players and football players clearly different in height?',
    aName: 'Football',
    bName: 'Basketball',
    units: 'in',
    a: [58, 60, 61, 62, 64, 65, 66, 68, 69, 70],
    b: [68, 70, 72, 73, 74, 76, 78, 79, 80, 82],
  },
  {
    title: 'Sleep hours',
    question: 'Do cats and dogs in this sample sleep different amounts?',
    aName: 'Dogs',
    bName: 'Cats',
    units: 'hr',
    a: [8, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    b: [10, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    title: 'Plant growth',
    question: 'Did fertiliser make a real difference in plant growth?',
    aName: 'No fertiliser',
    bName: 'Fertiliser',
    units: 'cm',
    a: [4, 5, 5, 6, 6, 7, 7, 8, 8, 9],
    b: [14, 15, 16, 16, 17, 18, 18, 19, 20, 21],
  },
  {
    title: 'Running times',
    question: 'Do runners with music have clearly different times?',
    aName: 'No music',
    bName: 'Music',
    units: 'sec',
    a: [22, 24, 25, 26, 27, 28, 30, 31, 33, 35],
    b: [20, 23, 24, 25, 26, 27, 29, 30, 32, 34],
  },
]

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function mad(values, center) {
  return values.reduce((sum, value) => sum + Math.abs(value - center), 0) / values.length
}

function format(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function rounded(value) {
  return Number(value.toFixed(1))
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function StatCard({ label, value, sub, color, tint, border, hidden }) {
  return (
    <div className="h-[90px] rounded-[14px] border bg-white px-3 py-2" style={{ borderColor: border }}>
      <div className="text-[11px] font-black uppercase tracking-wide" style={{ color }}>
        {label}
      </div>
      <div
        className="mt-1 rounded-lg px-3 py-1 font-mono text-2xl font-black"
        style={{ color, background: tint }}
      >
        {hidden ? '--' : value}
      </div>
      <div className="mt-1 min-h-[16px] text-xs font-bold" style={{ color: colors.muted }}>
        {hidden ? 'judge first' : sub}
      </div>
    </div>
  )
}

function JudgeButton({ type, disabled, onClick }) {
  const isDifferent = type === 'different'
  const color = isDifferent ? colors.choiceDifferent : colors.choiceOverlap
  const tint = isDifferent ? colors.choiceDifferentTint : colors.choiceOverlapTint
  const border = isDifferent ? colors.choiceDifferentBorder : colors.choiceOverlapBorder
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex-1 rounded-[14px] border-2 px-4 py-3 text-base font-black transition disabled:cursor-default disabled:opacity-60"
      style={{ color, background: tint, borderColor: border }}
    >
      {isDifferent ? 'Really different' : 'Too much overlap to tell'}
    </button>
  )
}

export default function ComparingTwoPopulations() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 270 })
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [judgement, setJudgement] = useState(null)

  const scenario = scenarios[scenarioIndex]
  const stats = useMemo(() => {
    const aMean = mean(scenario.a)
    const bMean = mean(scenario.b)
    const aMad = mad(scenario.a, aMean)
    const bMad = mad(scenario.b, bMean)
    const gap = Math.abs(bMean - aMean)
    const spread = (aMad + bMad) / 2
    const ratio = spread === 0 ? 0 : gap / spread
    return {
      aMean: rounded(aMean),
      bMean: rounded(bMean),
      aMad: rounded(aMad),
      bMad: rounded(bMad),
      gap: rounded(gap),
      spread: rounded(spread),
      ratio: rounded(ratio),
      reallyDifferent: ratio >= 2,
    }
  }, [scenario])

  const revealed = judgement !== null
  const correct = revealed && judgement === (stats.reallyDifferent ? 'different' : 'overlap')

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 0, 0, canvasSize.width, canvasSize.height, 14)
    ctx.fill()

    const allValues = [...scenario.a, ...scenario.b]
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const range = Math.max(8, maxValue - minValue)
    const padValue = range * 0.12
    const domainMin = Math.floor(minValue - padValue)
    const domainMax = Math.ceil(maxValue + padValue)
    const pad = 44
    const left = pad
    const right = canvasSize.width - pad
    const axisY = canvasSize.height - 40
    const aBaseY = 88
    const bBaseY = 174
    const toX = (value) => left + ((value - domainMin) / (domainMax - domainMin)) * (right - left)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    const tickStep = Math.max(1, Math.ceil((domainMax - domainMin) / 6 / 5) * 5)
    ctx.font = '700 11px Inter, sans-serif'
    ctx.fillStyle = colors.muted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let tick = Math.ceil(domainMin / tickStep) * tickStep; tick <= domainMax; tick += tickStep) {
      const x = toX(tick)
      ctx.beginPath()
      ctx.moveTo(x, 34)
      ctx.lineTo(x, axisY)
      ctx.stroke()
      ctx.fillText(String(tick), x, axisY + 9)
    }

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(left, axisY)
    ctx.lineTo(right, axisY)
    ctx.stroke()

    if (revealed) {
      const overlapMin = Math.max(Math.min(...scenario.a), Math.min(...scenario.b))
      const overlapMax = Math.min(Math.max(...scenario.a), Math.max(...scenario.b))
      if (overlapMin <= overlapMax) {
        const x1 = toX(overlapMin)
        const x2 = toX(overlapMax)
        ctx.fillStyle = 'rgba(123,63,158,.13)'
        roundRect(ctx, x1, 46, Math.max(8, x2 - x1), 156, 12)
        ctx.fill()
        ctx.fillStyle = colors.purple
        ctx.font = '900 12px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('overlap', (x1 + x2) / 2, 58)
      }

      ;[
        { meanValue: stats.aMean, madValue: stats.aMad, y: aBaseY + 32, color: colors.a },
        { meanValue: stats.bMean, madValue: stats.bMad, y: bBaseY + 32, color: colors.b },
      ].forEach((item) => {
        const x1 = toX(item.meanValue - item.madValue)
        const x2 = toX(item.meanValue + item.madValue)
        ctx.strokeStyle = item.color
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, item.y)
        ctx.lineTo(x2, item.y)
        ctx.stroke()
      })

      const ax = toX(stats.aMean)
      const bx = toX(stats.bMean)
      const arrowY = 226
      ctx.strokeStyle = colors.purple
      ctx.fillStyle = colors.purple
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ax, arrowY)
      ctx.lineTo(bx, arrowY)
      ctx.stroke()
      const direction = bx >= ax ? 1 : -1
      ctx.beginPath()
      ctx.moveTo(bx, arrowY)
      ctx.lineTo(bx - direction * 9, arrowY - 6)
      ctx.lineTo(bx - direction * 9, arrowY + 6)
      ctx.closePath()
      ctx.fill()
      ctx.font = '900 12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`gap ${format(stats.gap)}`, (ax + bx) / 2, arrowY - 14)
    }

    function drawMeanLine(value, color, yTop, yBottom) {
      const x = toX(value)
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([6, 5])
      ctx.beginPath()
      ctx.moveTo(x, yTop)
      ctx.lineTo(x, yBottom)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    function drawDots(values, baseY, color, label) {
      const stacks = new Map()
      values.forEach((value) => {
        const count = stacks.get(value) ?? 0
        stacks.set(value, count + 1)
        const x = toX(value)
        const y = baseY - count * 15
        ctx.fillStyle = color
        ctx.strokeStyle = colors.ink
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 5.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
      ctx.fillStyle = color
      ctx.font = '900 13px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 12, baseY - 2)
    }

    drawDots(scenario.a, aBaseY, colors.a, scenario.aName)
    drawDots(scenario.b, bBaseY, colors.b, scenario.bName)
    if (revealed) {
      drawMeanLine(stats.aMean, colors.a, 42, aBaseY + 42)
      drawMeanLine(stats.bMean, colors.b, 130, bBaseY + 42)
    }
  }, [canvasSize, revealed, scenario, stats])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => {
      setCanvasSize({
        width: Math.max(360, Math.floor(node.clientWidth)),
        height: Math.max(250, Math.floor(node.clientHeight)),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  function nextScenario() {
    const next = (scenarioIndex + 1) % scenarios.length
    setScenarioIndex(next)
    setJudgement(null)
  }

  const truthLabel = stats.reallyDifferent ? 'really different' : 'too much overlap to tell'

  const hint = !revealed
    ? 'Do not just compare the means. Check how much the groups overlap; if they blend together, the difference may not be real.'
    : stats.reallyDifferent
      ? `The gap between means is ${format(stats.ratio)}x the spread, so the difference is bigger than the natural variation.`
      : `Different means are not enough. The gap is only ${format(stats.ratio)}x the spread, so the dots overlap too much.`

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-2 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <section className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] border px-4 py-3" style={{ background: colors.purpleTint, borderColor: colors.purpleBorder }}>
        <div>
          <div className="text-xs font-black uppercase tracking-wide" style={{ color: colors.purple }}>
            {scenario.title}
          </div>
          <div className="text-lg font-black leading-tight">{scenario.question}</div>
        </div>
        <button type="button" onClick={nextScenario} className="rounded-full border bg-white px-4 py-2 text-sm font-black shadow-sm" style={{ borderColor: colors.border }}>
          New comparison
        </button>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <JudgeButton type="different" disabled={revealed} onClick={() => setJudgement('different')} />
        <JudgeButton type="overlap" disabled={revealed} onClick={() => setJudgement('overlap')} />
      </div>

      <section
        className="flex h-[58px] items-center rounded-[14px] border px-4 py-2 text-base font-black"
        style={{ background: revealed ? colors.purpleTint : '#ffffff', borderColor: revealed ? colors.purpleBorder : colors.border }}
      >
        {revealed ? (
          <div className="leading-tight">
            <span className="text-lg" style={{ color: correct ? colors.correct : colors.wrong }}>
              {correct ? '✓ Correct' : 'Not quite'}
            </span>
            <span> — these groups show </span>
            <span style={{ color: colors.ink }}>{truthLabel}</span>
            <span>. The mean gap is {format(stats.ratio)}x the typical spread.</span>
          </div>
        ) : (
          <span style={{ color: colors.muted }}>Make a prediction, then the graph will reveal the overlap and spread.</span>
        )}
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_220px] gap-2">
        <section ref={wrapRef} className="min-h-0 overflow-hidden rounded-[14px] border bg-white shadow-sm" style={{ borderColor: colors.border }}>
          <canvas ref={canvasRef} className="block h-full w-full" aria-label="Two stacked dot plots comparing two populations" />
        </section>

        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <StatCard
            label={scenario.aName}
            value={`mean ${format(stats.aMean)}`}
            sub={`MAD ${format(stats.aMad)} ${scenario.units}`}
            color={colors.a}
            tint={colors.aTint}
            border={colors.aBorder}
            hidden={!revealed}
          />
          <StatCard
            label={scenario.bName}
            value={`mean ${format(stats.bMean)}`}
            sub={`MAD ${format(stats.bMad)} ${scenario.units}`}
            color={colors.b}
            tint={colors.bTint}
            border={colors.bBorder}
            hidden={!revealed}
          />
          <div className="h-[90px] rounded-[14px] border bg-white px-3 py-2" style={{ borderColor: colors.purpleBorder }}>
            <div className="text-[11px] font-black uppercase tracking-wide" style={{ color: colors.purple }}>
              Gap ÷ spread
            </div>
            <div className="mt-1 rounded-lg px-3 py-2 font-mono text-xl font-black" style={{ color: colors.purple, background: colors.purpleTint }}>
              {revealed ? `${format(stats.gap)} ÷ ${format(stats.spread)} = ${format(stats.ratio)}x` : '--'}
            </div>
            <div className="mt-1 text-xs font-bold" style={{ color: colors.muted }}>
              {revealed ? '2x or more means the gap is large compared with variation.' : 'judge first'}
            </div>
          </div>
        </aside>
      </div>

      <div className="rounded-[14px] border bg-white px-4 py-2 text-sm font-bold" style={{ borderColor: colors.border, color: colors.muted }}>
        {hint}
      </div>
    </div>
  )
}
