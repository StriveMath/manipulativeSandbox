import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cream, ink, muted, border, blue, amber as orange, green } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'
import ToggleChip from './shared/ToggleChip'

const MIN_DEN = 2
const MAX_DEN = 8

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))

// Dimension brackets (a line with two end caps) + labels.
function vBracket(ctx, x, yTop, yBot, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, yTop)
  ctx.lineTo(x, yBot)
  ctx.moveTo(x, yTop)
  ctx.lineTo(x + 7, yTop)
  ctx.moveTo(x, yBot)
  ctx.lineTo(x + 7, yBot)
  ctx.stroke()
}

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

function vLabel(ctx, x, y, text, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function hLabel(ctx, x, y, text, color) {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, x, y)
}

export default function MultiplyingFractionsArea() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const size = useCanvasBox(wrapRef, { minW: 300, minH: 260 })
  const [num1, setNum1] = useState(1)
  const [den1, setDen1] = useState(2)
  const [num2, setNum2] = useState(1)
  const [den2, setDen2] = useState(3)
  const [hideAnswer, setHideAnswer] = useState(false)

  const prodN = num1 * num2
  const prodD = den1 * den2
  const divisor = gcd(prodN, prodD)
  const simpN = prodN / divisor
  const simpD = prodD / divisor
  const reduces = divisor > 1

  // The canvas is the whole point of this manipulative, so it needs a text
  // equivalent — otherwise a screen-reader user gets an unlabelled rectangle.
  const summary = `Area model: a square split into ${den1} rows and ${den2} columns, ${prodD} equal pieces total. ${num1}/${den1} of the height is shaded blue, ${num2}/${den2} of the width is shaded orange, and their green overlap of ${prodN} piece${prodN === 1 ? '' : 's'} shows the product ${num1}/${den1} times ${num2}/${den2}${reduces ? `, which simplifies to ${simpN}/${simpD}` : ''}.`

  const geometry = useMemo(() => {
    // Reserve margin on the left and top for the "1 whole" + fraction brackets.
    const marginL = 56
    const marginT = 56
    const marginR = 16
    const marginB = 16
    const square = Math.max(80, Math.min(size.w - marginL - marginR, size.h - marginT - marginB))
    const x0 = marginL
    const y0 = marginT + Math.max(0, (size.h - marginT - marginB - square) / 2)
    return { square, x0, y0, cellH: square / den1, cellW: square / den2 }
  }, [size, den1, den2])

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

    const { square, x0, y0, cellH, cellW } = geometry

    // White unit square.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x0, y0, square, square)

    // Fraction 1 — horizontal bands (top num1 of den1 rows).
    ctx.fillStyle = 'rgba(37, 99, 235, 0.28)'
    ctx.fillRect(x0, y0, square, num1 * cellH)
    // Fraction 2 — vertical bands (left num2 of den2 columns).
    ctx.fillStyle = 'rgba(217, 119, 6, 0.30)'
    ctx.fillRect(x0, y0, num2 * cellW, square)
    // Overlap = product.
    ctx.fillStyle = 'rgba(29, 158, 117, 0.80)'
    ctx.fillRect(x0, y0, num2 * cellW, num1 * cellH)

    // Grid lines.
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.22)'
    ctx.lineWidth = 1
    for (let r = 1; r < den1; r += 1) {
      ctx.beginPath()
      ctx.moveTo(x0, y0 + r * cellH)
      ctx.lineTo(x0 + square, y0 + r * cellH)
      ctx.stroke()
    }
    for (let c = 1; c < den2; c += 1) {
      ctx.beginPath()
      ctx.moveTo(x0 + c * cellW, y0)
      ctx.lineTo(x0 + c * cellW, y0 + square)
      ctx.stroke()
    }

    // Outer border.
    ctx.strokeStyle = ink
    ctx.lineWidth = 2.5
    ctx.strokeRect(x0, y0, square, square)

    // Dimension brackets: show each fraction as a PART OF the whole side length.
    const gray = '#9AA0AA'

    // Brackets: gray = the whole side (1), colored = the shaded fraction.
    vBracket(ctx, x0 - 42, y0, y0 + square, gray)
    vBracket(ctx, x0 - 20, y0, y0 + num1 * cellH, blue)
    hBracket(ctx, y0 - 38, x0, x0 + square, gray)
    hBracket(ctx, y0 - 16, x0, x0 + num2 * cellW, orange)

    // Fraction labels.
    ctx.font = '800 13px Inter, system-ui, sans-serif'
    vLabel(ctx, x0 - 22, y0 + (num1 * cellH) / 2, `${num1}/${den1}`, blue)
    hLabel(ctx, x0 + (num2 * cellW) / 2, y0 - 18, `${num2}/${den2}`, orange)

    // Whole-side labels: just "1", slightly smaller so they stay readable.
    ctx.font = '800 11px Inter, system-ui, sans-serif'
    vLabel(ctx, x0 - 44, y0 + square / 2, '1', gray)
    hLabel(ctx, x0 + square / 2, y0 - 40, '1', gray)
  }, [size, geometry, num1, den1, num2, den2])

  useEffect(() => {
    draw()
  }, [draw])

  const setDenClamped = (setNum, setDen, num) => (nextDen) => {
    const d = clamp(nextDen, MIN_DEN, MAX_DEN)
    setDen(d)
    if (num > d) setNum(d)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      {/* Equation */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-3 text-3xl font-black">
          <Frac n={num1} d={den1} color={blue} />
          <span style={{ color: muted }}>×</span>
          <Frac n={num2} d={den2} color={orange} />
          <span style={{ color: muted }}>=</span>
          {hideAnswer ? (
            <span style={{ color: green }}>?</span>
          ) : (
            <div className="flex items-center gap-2">
              <Frac n={prodN} d={prodD} color={green} />
              {reduces && (
                <>
                  <span style={{ color: muted }}>=</span>
                  <Frac n={simpN} d={simpD} color={green} />
                </>
              )}
            </div>
          )}
        </div>
        <ToggleChip label="Show product" color={green} on={!hideAnswer} onClick={() => setHideAnswer((h) => !h)} compact />
      </div>

      {/* Square + legend */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div ref={wrapRef} className="relative min-w-0 flex-[3] overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
          <canvas ref={canvasRef} role="img" aria-label={summary} className="h-full w-full" />
        </div>
        <div className="flex flex-[2] flex-col justify-center gap-3 rounded-xl border border-[#E0DDD6] bg-white p-4 text-sm">
          <LegendRow color={blue} label={`${num1}/${den1} of the height`} />
          <LegendRow color={orange} label={`${num2}/${den2} of the width`} />
          <LegendRow color={green} label="Overlap = the product" solid />
          <p className="mt-1 leading-relaxed" style={{ color: muted }}>
            The whole is cut into <b style={{ color: ink }}>{den1} × {den2} = {prodD}</b> equal
            pieces. The green overlap is{' '}
            <b style={{ color: green }}>{hideAnswer ? '?' : `${num1} × ${num2} = ${prodN}`}</b> of them.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-5">
        <FractionStepper
          label="Fraction 1"
          color={blue}
          num={num1}
          den={den1}
          onNum={(v) => setNum1(clamp(v, 1, den1))}
          onDen={setDenClamped(setNum1, setDen1, num1)}
        />
        <FractionStepper
          label="Fraction 2"
          color={orange}
          num={num2}
          den={den2}
          onNum={(v) => setNum2(clamp(v, 1, den2))}
          onDen={setDenClamped(setNum2, setDen2, num2)}
        />
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

function LegendRow({ color, label, solid }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-4 w-4 rounded"
        style={{ background: solid ? color : `${color}55`, border: `1.5px solid ${color}` }}
      />
      <span className="font-semibold">{label}</span>
    </div>
  )
}

function MiniStepper({ value, onDec, onInc, color, decLabel, incLabel }) {
  return (
    <div className="grid grid-cols-[32px_32px_32px] items-center overflow-hidden rounded-full border border-[#E0DDD6] bg-white">
      <button type="button" onClick={onDec} className="h-8 text-xl font-black" style={{ color: '#D85A30' }} aria-label={decLabel}>−</button>
      <span className="border-x border-[#E0DDD6] py-1 text-center text-base font-black tabular-nums" style={{ color }}>{value}</span>
      <button type="button" onClick={onInc} className="h-8 text-xl font-black" style={{ color: green }} aria-label={incLabel}>+</button>
    </div>
  )
}

function FractionStepper({ label, color, num, den, onNum, onDen }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E0DDD6] bg-white px-4 py-2">
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
      <div className="flex flex-col items-center gap-1">
        <MiniStepper
          value={num}
          onDec={() => onNum(num - 1)}
          onInc={() => onNum(num + 1)}
          color={color}
          decLabel={`Decrease ${label} numerator`}
          incLabel={`Increase ${label} numerator`}
        />
        <span className="h-0.5 w-8" style={{ background: color }} />
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
  )
}
