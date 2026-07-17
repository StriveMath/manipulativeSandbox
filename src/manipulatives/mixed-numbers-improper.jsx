import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cream, ink, muted, border, green as wholeGreen, orange as fracOrange, purple as improperPurple } from './shared/palette'
import { useCanvasBox } from './shared/useCanvasBox'
import GhostButton from './shared/GhostButton'
import Stepper from './shared/Stepper'

const MIN_DEN = 2
const MAX_DEN = 8

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function MixedNumbersImproper() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const { w: canvasWidth } = useCanvasBox(wrapRef, { minW: 420 })
  const [den, setDen] = useState(4)
  const [num, setNum] = useState(7)
  const [hideMixed, setHideMixed] = useState(false)
  const draggingRef = useRef(false)

  const canvasHeight = 260
  const maxNum = den * 5
  const whole = Math.floor(num / den)
  const rem = num % den

  // Mixed-number pieces for the equation (and the canvas's text equivalent).
  const mixedParts = []
  if (whole > 0) mixedParts.push({ text: String(whole), color: wholeGreen })
  if (rem > 0) mixedParts.push({ text: `${rem}/${den}`, color: fracOrange })
  if (mixedParts.length === 0) mixedParts.push({ text: '0', color: muted })

  // The canvas is the whole point of this manipulative, so it needs a text
  // equivalent — otherwise a screen-reader user gets an unlabelled rectangle.
  const summary = `Bar model showing ${num}/${den}, split into ${den} equal parts per bar. ${
    hideMixed ? 'The mixed-number equivalent is hidden.' : `That equals ${mixedParts.map((p) => p.text).join(' and ')} as a mixed number.`
  }`

  const geo = useMemo(() => {
    const pad = 30
    const gap = 14
    const displayBars = clamp(whole + (rem > 0 ? 1 : 0) + 1, 1, 5)
    const barW = (canvasWidth - pad * 2 - gap * (displayBars - 1)) / displayBars
    const barH = 66
    const barY = canvasHeight * 0.42
    const barX = (b) => pad + b * (barW + gap)
    return { pad, gap, displayBars, barW, barH, barY, barX, segW: barW / den }
  }, [canvasWidth, den, whole, rem])

  const numFromPoint = useCallback(
    (px) => {
      const { displayBars, barW, barX, segW } = geo
      for (let b = 0; b < displayBars; b += 1) {
        const x0 = barX(b)
        if (px < x0) return b * den // before this bar
        if (px <= x0 + barW) {
          const seg = clamp(Math.round((px - x0) / segW), 0, den)
          return clamp(b * den + seg, 0, maxNum)
        }
      }
      return clamp(displayBars * den, 0, maxNum)
    },
    [geo, den, maxNum],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cw = Math.round(canvasWidth * dpr)
    const ch = Math.round(canvasHeight * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const { displayBars, barW, barH, barY, barX, segW } = geo

    for (let b = 0; b < displayBars; b += 1) {
      const x0 = barX(b)
      const isWhole = b < whole
      const isPartial = b === whole && rem > 0

      // Filled segments.
      for (let s = 0; s < den; s += 1) {
        const filled = b < whole || (b === whole && s < rem)
        ctx.fillStyle = filled ? (isWhole ? '#3FBE93' : fracOrange) : '#ffffff'
        ctx.fillRect(x0 + s * segW, barY, segW, barH)
        ctx.strokeStyle = '#E0DDD6'
        ctx.lineWidth = 1
        ctx.strokeRect(x0 + s * segW, barY, segW, barH)
      }

      // Bar outline (green if a full whole).
      ctx.strokeStyle = isWhole ? wholeGreen : isPartial ? fracOrange : '#C4C8D0'
      ctx.lineWidth = isWhole || isPartial ? 3 : 2
      ctx.strokeRect(x0, barY, barW, barH)

      // Label under the bar.
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      if (isWhole) {
        ctx.fillStyle = wholeGreen
        ctx.font = '900 18px Inter, system-ui, sans-serif'
        ctx.fillText('1 whole', x0 + barW / 2, barY + barH + 10)
      } else if (isPartial) {
        ctx.fillStyle = fracOrange
        ctx.font = '900 16px Inter, system-ui, sans-serif'
        ctx.fillText(`${rem}/${den}`, x0 + barW / 2, barY + barH + 10)
      }
    }

    // Hint above.
    ctx.fillStyle = muted
    ctx.font = '600 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`Each whole is split into ${den} equal parts. Drag across the bars or use the steppers.`, geo.pad, barY - 12)
  }, [canvasWidth, geo, den, whole, rem])

  useEffect(() => {
    draw()
  }, [draw])

  const getX = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return (event.clientX - rect.left) * (canvasWidth / rect.width)
  }
  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    setNum(numFromPoint(getX(event)))
  }
  const handlePointerMove = (event) => {
    if (!draggingRef.current) return
    setNum(numFromPoint(getX(event)))
  }
  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const changeDen = (d) => {
    const nd = clamp(d, MIN_DEN, MAX_DEN)
    setDen(nd)
    setNum((v) => clamp(v, 0, nd * 5))
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
        <span style={{ color: improperPurple }}>{num}/{den}</span>
        <span style={{ color: muted }}>=</span>
        {hideMixed ? (
          <span style={{ color: muted }}>?</span>
        ) : (
          <span className="flex items-baseline gap-1.5">
            {mixedParts.map((p, i) => (
              <span key={i} style={{ color: p.color }}>{p.text}</span>
            ))}
          </span>
        )}
      </div>

      <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: border }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={summary}
          className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <p className="text-center text-sm font-semibold" style={{ color: muted }}>
        The improper fraction and the mixed number are the <b>same amount</b> — every {den} parts make one whole.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Stepper
          label="Pieces"
          color={improperPurple}
          value={num}
          onDec={() => setNum((v) => clamp(v - 1, 0, maxNum))}
          onInc={() => setNum((v) => clamp(v + 1, 0, maxNum))}
          decLabel="Fewer Pieces"
          incLabel="More Pieces"
        />
        <Stepper
          label="Denominator"
          color={ink}
          value={den}
          onDec={() => changeDen(den - 1)}
          onInc={() => changeDen(den + 1)}
          decLabel="Fewer Denominator"
          incLabel="More Denominator"
        />
        <GhostButton onClick={() => setHideMixed((h) => !h)}>
          {hideMixed ? 'Show mixed number' : 'Hide mixed number'}
        </GhostButton>
      </div>
    </div>
  )
}
