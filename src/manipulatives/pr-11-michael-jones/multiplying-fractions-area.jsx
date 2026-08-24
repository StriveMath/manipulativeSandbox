import { useCallback, useEffect, useRef, useState } from 'react'
import { cream, ink, muted, border, blue, amber as orange, green, purple } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'

const MIN_DEN = 2
const MAX_DEN = 8
const MAX_WHOLE = 3

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Partial-product region fills. Green = the main whole x whole block; the other
// three are lighter so it reads as "extra" pieces.
const FILL = {
  ww: 'rgba(29, 158, 117, 0.60)',
  wf: 'rgba(37, 99, 235, 0.26)',
  fw: 'rgba(216, 90, 48, 0.26)',
  ff: 'rgba(124, 58, 237, 0.26)',
}
const regionKey = (wholeRow, wholeCol) =>
  wholeRow ? (wholeCol ? 'ww' : 'wf') : wholeCol ? 'fw' : 'ff'

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

// Full 1-unit boxes along an axis so the whole stays visible; each entry is how
// many of the `den` cells are active (shaded) by default.
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

export default function MultiplyingFractionsArea() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const geoRef = useRef(null)
  const size = useCanvasBox(wrapRef, { minW: 300, minH: 260 })

  const [whole1, setWhole1] = useState(1)
  const [num1, setNum1] = useState(1)
  const [den1, setDen1] = useState(2)
  const [whole2, setWhole2] = useState(1)
  const [num2, setNum2] = useState(1)
  const [den2, setDen2] = useState(4)
  const [toggled, setToggled] = useState(() => new Set())

  // Reset per-cell toggles whenever the grid shape changes.
  useEffect(() => {
    setToggled(new Set())
  }, [whole1, num1, den1, whole2, num2, den2])

  const t1 = whole1 * den1 + num1
  const t2 = whole2 * den2 + num2
  const prodN = t1 * t2
  const prodD = den1 * den2
  const prodWhole = Math.floor(prodN / prodD)
  const prodRem = prodN % prodD

  const summary = `Grid multiplication area model for ${mixedText(whole1, num1, den1)} times ${mixedText(whole2, num2, den2)}. The rectangle is split into partial products: whole times whole in green, plus lighter whole-by-fraction, fraction-by-whole and fraction-by-fraction pieces. Together they equal ${prodN}/${prodD}.`

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

    const marginL = 64
    const marginT = 60
    const marginR = 16
    const marginB = 16
    const availW = Math.max(40, size.w - marginL - marginR)
    const availH = Math.max(40, size.h - marginT - marginB)

    const colBoxes = axisBoxes(whole2, num2, den2)
    const rowBoxes = axisBoxes(whole1, num1, den1)
    const nCols = colBoxes.length
    const nRows = rowBoxes.length
    if (nCols === 0 || nRows === 0) return

    const gap = 14
    const uW = (availW - (nCols - 1) * gap) / nCols
    const uH = (availH - (nRows - 1) * gap) / nRows
    const U = Math.max(24, Math.min(uW, uH))
    const cellW = U / den2
    const cellH = U / den1

    const drawnW = nCols * U + (nCols - 1) * gap
    const drawnH = nRows * U + (nRows - 1) * gap
    const x0 = marginL + Math.max(0, (availW - drawnW) / 2)
    const y0 = marginT + Math.max(0, (availH - drawnH) / 2)

    const colX = colBoxes.map((_, i) => x0 + i * (U + gap))
    const rowY = rowBoxes.map((_, i) => y0 + i * (U + gap))
    geoRef.current = { colX, rowY, U, cellW, cellH, den1, den2 }

    for (let ri = 0; ri < nRows; ri += 1) {
      const wholeRow = ri < whole1
      const rowActive = rowBoxes[ri]
      for (let ci = 0; ci < nCols; ci += 1) {
        const wholeCol = ci < whole2
        const colActive = colBoxes[ci]
        const bx = colX[ci]
        const by = rowY[ri]
        const fill = FILL[regionKey(wholeRow, wholeCol)]

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(bx, by, U, U)

        for (let r = 0; r < den1; r += 1) {
          for (let c = 0; c < den2; c += 1) {
            const def = r < rowActive && c < colActive
            const on = toggled.has(`${ri}:${r}:${ci}:${c}`) ? !def : def
            if (on) {
              ctx.fillStyle = fill
              ctx.fillRect(bx + c * cellW, by + r * cellH, cellW, cellH)
            }
          }
        }

        ctx.strokeStyle = 'rgba(26, 26, 46, 0.22)'
        ctx.lineWidth = 1
        for (let c = 1; c < den2; c += 1) {
          ctx.beginPath()
          ctx.moveTo(bx + c * cellW, by)
          ctx.lineTo(bx + c * cellW, by + U)
          ctx.stroke()
        }
        for (let r = 1; r < den1; r += 1) {
          ctx.beginPath()
          ctx.moveTo(bx, by + r * cellH)
          ctx.lineTo(bx + U, by + r * cellH)
          ctx.stroke()
        }

        ctx.strokeStyle = ink
        ctx.lineWidth = 2
        ctx.strokeRect(bx, by, U, U)
      }
    }

    // Dimension bars: whole bar separate from the fraction bar on each side.
    ctx.font = '800 13px Inter, system-ui, sans-serif'
    if (whole1 > 0) {
      const yB = rowY[whole1 - 1] + U
      vBracket(ctx, x0 - 24, y0, yB, blue)
      vLabel(ctx, x0 - 26, (y0 + yB) / 2, `${whole1}`, blue)
    }
    if (num1 > 0) {
      const yT = rowY[whole1]
      const yB = yT + num1 * cellH
      vBracket(ctx, x0 - 24, yT, yB, blue)
      vLabel(ctx, x0 - 26, (yT + yB) / 2, `${num1}/${den1}`, blue)
    }
    if (whole2 > 0) {
      const xR = colX[whole2 - 1] + U
      hBracket(ctx, y0 - 22, x0, xR, orange)
      hLabel(ctx, (x0 + xR) / 2, y0 - 24, `${whole2}`, orange)
    }
    if (num2 > 0) {
      const xL = colX[whole2]
      const xR = xL + num2 * cellW
      hBracket(ctx, y0 - 22, xL, xR, orange)
      hLabel(ctx, (xL + xR) / 2, y0 - 24, `${num2}/${den2}`, orange)
    }

    // Gray "1" scale reference over the first unit box on each axis.
    const gray = '#9AA0AA'
    ctx.font = '800 11px Inter, system-ui, sans-serif'
    vBracket(ctx, x0 - 48, y0, y0 + U, gray)
    vLabel(ctx, x0 - 50, y0 + U / 2, '1', gray)
    hBracket(ctx, y0 - 44, x0, x0 + U, gray)
    hLabel(ctx, x0 + U / 2, y0 - 46, '1', gray)
  }, [size, whole1, num1, den1, whole2, num2, den2, toggled])

  useEffect(() => {
    draw()
  }, [draw])

  const handleCanvasClick = (e) => {
    const g = geoRef.current
    const canvas = canvasRef.current
    if (!g || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    let ci = -1
    for (let i = 0; i < g.colX.length; i += 1) {
      if (px >= g.colX[i] && px <= g.colX[i] + g.U) { ci = i; break }
    }
    let ri = -1
    for (let i = 0; i < g.rowY.length; i += 1) {
      if (py >= g.rowY[i] && py <= g.rowY[i] + g.U) { ri = i; break }
    }
    if (ci < 0 || ri < 0) return
    const c = clamp(Math.floor((px - g.colX[ci]) / g.cellW), 0, g.den2 - 1)
    const r = clamp(Math.floor((py - g.rowY[ri]) / g.cellH), 0, g.den1 - 1)
    const key = `${ri}:${r}:${ci}:${c}`
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
      {/* Equation + editors in one row */}
      <div className="flex flex-nowrap items-center justify-center gap-x-3">
        <div className="flex items-center gap-1.5 text-xl font-black">
          <MixedFrac whole={whole1} n={num1} d={den1} color={blue} />
          <span style={{ color: muted }}>×</span>
          <MixedFrac whole={whole2} n={num2} d={den2} color={orange} />
          <span style={{ color: muted }}>=</span>
          <div className="flex items-center gap-2">
            <Frac n={prodN} d={prodD} color={green} />
            {prodN > prodD && (
              <>
                <span style={{ color: muted }}>=</span>
                <MixedFrac whole={prodWhole} n={prodRem} d={prodD} color={green} />
              </>
            )}
          </div>
        </div>
        <FractionStepper label="Fraction 1" color={blue} whole={whole1} num={num1} den={den1} {...s1} />
        <FractionStepper label="Fraction 2" color={orange} whole={whole2} num={num2} den={den2} {...s2} />
      </div>

      {/* Grid + thin area key */}
      <div className="flex min-h-0 flex-1 gap-2">
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
          <canvas ref={canvasRef} role="img" aria-label={summary} onClick={handleCanvasClick} className="h-full w-full cursor-pointer" />
        </div>
        <div className="flex w-14 flex-none flex-col gap-1.5 rounded-xl border border-[#E0DDD6] bg-white p-1.5">
          {whole1 * whole2 > 0 && <AreaSwatch color={green} n={whole1 * whole2} d={1} />}
          {whole1 * num2 > 0 && <AreaSwatch color={blue} n={whole1 * num2} d={den2} />}
          {num1 * whole2 > 0 && <AreaSwatch color={orange} n={num1 * whole2} d={den1} />}
          {num1 * num2 > 0 && <AreaSwatch color={purple} n={num1 * num2} d={prodD} />}
        </div>
      </div>
    </div>
  )
}

function AreaSwatch({ color, n, d }) {
  const whole = n % d === 0
  return (
    <div
      className="flex flex-1 items-center justify-center rounded-lg border"
      style={{ background: `${color}22`, borderColor: color }}
    >
      {whole ? (
        <span className="text-lg font-black leading-none" style={{ color }}>{n / d}</span>
      ) : (
        <Frac n={n} d={d} color={color} />
      )}
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

function FractionStepper({ label, color, whole, num, den, onWhole, onNum, onDen }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
      <div className="px-3 py-0.5 text-center text-[11px] font-semibold" style={{ color }}>{label}</div>
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
