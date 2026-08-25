import { useCallback, useEffect, useRef, useState } from 'react'
import { cream, ink, muted, border, blue, amber as orange, green } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'

const MIN_DEN = 2
const MAX_DEN = 8
const MAX_WHOLE = 3

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
const lcm = (a, b) => (a / gcd(a, b)) * b

const BLUE_FILL = 'rgba(37, 99, 235, 0.30)'
const ORANGE_FILL = 'rgba(216, 90, 48, 0.30)'

function hBracket(ctx, y, xL, xR, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(xL, y)
  ctx.lineTo(xR, y)
  ctx.moveTo(xL, y)
  ctx.lineTo(xL, y + 7)
  ctx.moveTo(xR, y)
  ctx.lineTo(xR, y + 7)
  ctx.stroke()
}

function hLabel(ctx, x, y, text, color) {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, x, y)
}

// Full 1-unit boxes along the bar so the whole stays visible; each entry is how
// many of the `den` slices are shaded in that box.
function axisBoxes(whole, num, den) {
  const boxes = []
  for (let i = 0; i < whole; i += 1) boxes.push(den)
  if (num > 0) boxes.push(num)
  return boxes
}

const mixedText = (whole, num, den) => {
  if (whole > 0 && num > 0) return `${whole} ${num}/${den}`
  if (whole > 0) return `${whole}`
  return `${num}/${den}`
}

export default function AddingFractionsArea() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const size = useCanvasBox(wrapRef, { minW: 300, minH: 260 })

  const [whole1, setWhole1] = useState(1)
  const [num1, setNum1] = useState(1)
  const [den1, setDen1] = useState(2)
  const [whole2, setWhole2] = useState(0)
  const [num2, setNum2] = useState(1)
  const [den2, setDen2] = useState(4)
  const [showAnswer, setShowAnswer] = useState(true)

  const t1 = whole1 * den1 + num1
  const t2 = whole2 * den2 + num2
  const commonD = lcm(den1, den2)
  const sumN = t1 * (commonD / den1) + t2 * (commonD / den2)
  const g = gcd(sumN, commonD)
  const simpN = sumN / g
  const simpD = commonD / g
  const sumWhole = Math.floor(simpN / simpD)
  const sumRem = simpN % simpD

  const summary = `Area model for adding ${mixedText(whole1, num1, den1)} plus ${mixedText(whole2, num2, den2)}. The blue addend and the orange addend are each stacked as unit boxes, at most two wholes per column, with any fractional box continuing in the next column. The bottom sum row places both amounts end to end using the common denominator ${commonD}, giving ${sumN}/${commonD}.`

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr
      canvas.height = size.h * dpr
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    const marginL = 96
    const marginT = 40
    const marginR = 20
    const marginB = 20
    const availW = Math.max(40, size.w - marginL - marginR)
    const availH = Math.max(40, size.h - marginT - marginB)

    const boxes1 = axisBoxes(whole1, num1, den1)
    const boxes2 = axisBoxes(whole2, num2, den2)
    const sumBoxCount = Math.max(1, Math.ceil(sumN / commonD))

    // Each addend stacks column-major with at most two wholes per column,
    // wrapping into more columns (the partial box continues the sequence).
    // The sum stays a single horizontal row.
    const rows1 = boxes1.length >= 2 ? 2 : 1
    const rows2 = boxes2.length >= 2 ? 2 : 1
    const cols1 = Math.ceil(boxes1.length / 2)
    const cols2 = Math.ceil(boxes2.length / 2)
    const maxCols = Math.max(cols1, cols2, sumBoxCount)
    if (maxCols === 0) return

    const gap = 12
    const innerGap = 8
    const rowGap = 30
    const unitRows = rows1 + rows2 + (showAnswer ? 1 : 0)
    const gapsCount = showAnswer ? 2 : 1
    const uW = (availW - (maxCols - 1) * gap) / maxCols
    const uH =
      (availH - gapsCount * rowGap - (rows1 - 1) * innerGap - (rows2 - 1) * innerGap) / unitRows
    const boxSize = Math.max(24, Math.min(uW, uH, 130))

    const drawBlock = (boxes, den, topY, color, fill, label) => {
      const cellW = boxSize / den
      for (let i = 0; i < boxes.length; i += 1) {
        const col = Math.floor(i / 2)
        const row = i % 2
        const bx = marginL + col * (boxSize + gap)
        const by = topY + row * (boxSize + innerGap)
        const active = boxes[i]

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(bx, by, boxSize, boxSize)

        for (let c = 0; c < den; c += 1) {
          if (c < active) {
            ctx.fillStyle = fill
            ctx.fillRect(bx + c * cellW, by, cellW, boxSize)
          }
        }

        ctx.strokeStyle = 'rgba(26, 26, 46, 0.22)'
        ctx.lineWidth = 1
        for (let c = 1; c < den; c += 1) {
          ctx.beginPath()
          ctx.moveTo(bx + c * cellW, by)
          ctx.lineTo(bx + c * cellW, by + boxSize)
          ctx.stroke()
        }

        ctx.strokeStyle = ink
        ctx.lineWidth = 2
        ctx.strokeRect(bx, by, boxSize, boxSize)
      }
      const rows = boxes.length >= 2 ? 2 : 1
      const blockH = rows * boxSize + (rows - 1) * innerGap
      ctx.font = '800 15px Inter, system-ui, sans-serif'
      ctx.fillStyle = color
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, marginL - 12, topY + blockH / 2)
      return blockH
    }

    const topY1 = marginT
    const blockH1 = drawBlock(boxes1, den1, topY1, blue, BLUE_FILL, mixedText(whole1, num1, den1))

    // Gray "1" reference over the first unit box of the first addend.
    const gray = '#9AA0AA'
    ctx.font = '800 11px Inter, system-ui, sans-serif'
    hBracket(ctx, topY1 - 16, marginL, marginL + boxSize, gray)
    hLabel(ctx, marginL + boxSize / 2, topY1 - 18, '1', gray)

    const topY2 = topY1 + blockH1 + rowGap
    const blockH2 = drawBlock(boxes2, den2, topY2, orange, ORANGE_FILL, mixedText(whole2, num2, den2))

    if (!showAnswer) return

    // Sum: single horizontal row, blue length then orange length end to end,
    // subdivided into the common denominator so both fractions share the same cell size.
    const y = topY2 + blockH2 + rowGap
    const cellW = boxSize / commonD
    const blueCells = t1 * (commonD / den1)
    for (let bi = 0; bi < sumBoxCount; bi += 1) {
      const bx = marginL + bi * (boxSize + gap)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(bx, y, boxSize, boxSize)

      for (let c = 0; c < commonD; c += 1) {
        const globalCell = bi * commonD + c
        if (globalCell < sumN) {
          ctx.fillStyle = globalCell < blueCells ? BLUE_FILL : ORANGE_FILL
          ctx.fillRect(bx + c * cellW, y, cellW, boxSize)
        }
      }

      ctx.strokeStyle = 'rgba(26, 26, 46, 0.22)'
      ctx.lineWidth = 1
      for (let c = 1; c < commonD; c += 1) {
        ctx.beginPath()
        ctx.moveTo(bx + c * cellW, y)
        ctx.lineTo(bx + c * cellW, y + boxSize)
        ctx.stroke()
      }

      ctx.strokeStyle = ink
      ctx.lineWidth = 2
      ctx.strokeRect(bx, y, boxSize, boxSize)
    }

    ctx.font = '800 15px Inter, system-ui, sans-serif'
    ctx.fillStyle = green
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(mixedText(sumWhole, sumRem, simpD), marginL - 12, y + boxSize / 2)
  }, [size, whole1, num1, den1, whole2, num2, den2, t1, sumN, commonD, sumWhole, sumRem, simpD, showAnswer])

  useEffect(() => {
    draw()
  }, [draw])

  const makeSetters = (whole, num, den, setWhole, setNum, setDen) => ({
    onWhole: (v) => {
      const w = clamp(v, 0, MAX_WHOLE)
      setWhole(w)
      if (w === 0 && num === 0) setNum(1)
    },
    onNum: (v) => setNum(clamp(v, whole === 0 ? 1 : 0, den - 1)),
    onDen: (v) => {
      const d = clamp(v, MIN_DEN, MAX_DEN)
      setDen(d)
      if (num > d - 1) setNum(d - 1)
    },
  })

  const s1 = makeSetters(whole1, num1, den1, setWhole1, setNum1, setDen1)
  const s2 = makeSetters(whole2, num2, den2, setWhole2, setNum2, setDen2)

  return (
    <div className="flex h-[500px] flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex flex-nowrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <FractionStepper label="Fraction 1" color={blue} whole={whole1} num={num1} den={den1} {...s1} />
          <FractionStepper label="Fraction 2" color={orange} whole={whole2} num={num2} den={den2} {...s2} />
        </div>

        <span className="h-9 w-px flex-none" style={{ background: border }} />

        <div className="flex items-center gap-1.5 text-lg font-black">
          <MixedFrac whole={whole1} n={num1} d={den1} color={blue} />
          <span style={{ color: muted }}>+</span>
          <MixedFrac whole={whole2} n={num2} d={den2} color={orange} />
          <span style={{ color: muted }}>=</span>
          {showAnswer ? (
            <div className="flex items-center gap-1.5">
              <Frac n={sumN} d={commonD} color={green} />
              {(sumWhole > 0 || sumRem !== sumN || commonD !== simpD) && (
                <>
                  <span style={{ color: muted }}>=</span>
                  <MixedFrac whole={sumWhole} n={sumRem} d={simpD} color={green} />
                </>
              )}
            </div>
          ) : (
            <span
              className="rounded-md px-2 py-0.5 text-base"
              style={{ background: `${green}1a`, color: green }}
            >
              ?
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAnswer((s) => !s)}
          aria-pressed={showAnswer}
          className="flex flex-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50"
          style={{ borderColor: border, color: ink, background: 'white' }}
        >
          <EyeIcon open={showAnswer} />
          {showAnswer ? 'Hide answer' : 'Show answer'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
          <canvas ref={canvasRef} role="img" aria-label={summary} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

function Frac({ n, d, color }) {
  return (
    <span className="inline-flex flex-col items-center leading-none" style={{ color }}>
      <span>{n}</span>
      <span className="mt-1 border-t-2 pt-1" style={{ borderColor: color }}>{d}</span>
    </span>
  )
}

function MixedFrac({ whole, n, d, color }) {
  const showWhole = whole > 0
  const showFrac = n > 0
  if (!showWhole && !showFrac) return <span style={{ color }}>0</span>
  return (
    <span className="inline-flex items-center gap-1" style={{ color }}>
      {showWhole && <span>{whole}</span>}
      {showFrac && <Frac n={n} d={d} color={color} />}
    </span>
  )
}

function MiniStepper({ value, onDec, onInc, color, decLabel, incLabel }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onDec} className="h-6 w-5 text-base font-black" style={{ color: ink }} aria-label={decLabel}>−</button>
      <span className="min-w-[26px] rounded-md border border-[#E0DDD6] px-1 py-0.5 text-center text-sm font-black tabular-nums" style={{ color }}>{value}</span>
      <button type="button" onClick={onInc} className="h-6 w-5 text-base font-black" style={{ color: ink }} aria-label={incLabel}>+</button>
    </div>
  )
}

function EyeIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

function FractionStepper({ label, color, whole, num, den, onWhole, onNum, onDen }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
      <div className="px-3 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</div>
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: muted }}>whole</span>
          <MiniStepper
            value={whole}
            onDec={() => onWhole(whole - 1)}
            onInc={() => onWhole(whole + 1)}
            color={color}
            decLabel={`Decrease ${label} whole number`}
            incLabel={`Increase ${label} whole number`}
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MiniStepper
            value={num}
            onDec={() => onNum(num - 1)}
            onInc={() => onNum(num + 1)}
            color={color}
            decLabel={`Decrease ${label} numerator`}
            incLabel={`Increase ${label} numerator`}
          />
          <span className="h-0.5 w-7" style={{ background: color }} />
          <MiniStepper
            value={den}
            onDec={() => onDen(den - 1)}
            onInc={() => onDen(den + 1)}
            color={color}
            decLabel={`Decrease ${label} denominator`}
            incLabel={`Increase ${label} denominator`}
          />
        </div>
      </div>
    </div>
  )
}
