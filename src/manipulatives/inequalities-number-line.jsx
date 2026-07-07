import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const cream = '#F8F6F0'
const ink = '#1A1A2E'
const muted = '#5F5E5A'
const solGreen = '#1D9E75'
const boundPurple = '#7C3AED'
const testBlue = '#2563EB'
const noRed = '#D8402F'
const axisColor = '#1A1A2E'

const MIN = -10
const MAX = 10
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const OPS = [
  { key: 'lt', sym: '<', inclusive: false, right: false },
  { key: 'le', sym: '≤', inclusive: true, right: false },
  { key: 'gt', sym: '>', inclusive: false, right: true },
  { key: 'ge', sym: '≥', inclusive: true, right: true },
]

export default function InequalitiesNumberLine() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(720)
  const [opKey, setOpKey] = useState('gt')
  const [bound, setBound] = useState(3)
  const [test, setTest] = useState(6)
  const dragRef = useRef(null) // 'bound' | 'test'

  const canvasHeight = 260
  const op = OPS.find((o) => o.key === opKey)

  const testOk = op.right ? (op.inclusive ? test >= bound : test > bound) : op.inclusive ? test <= bound : test < bound

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => setCanvasWidth(Math.max(420, Math.round(node.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const geo = useMemo(() => {
    const PAD = 54
    const axisY = canvasHeight * 0.58
    const spanX = canvasWidth - PAD * 2
    const xFor = (v) => PAD + ((v - MIN) / (MAX - MIN)) * spanX
    const vFor = (x) => clamp(Math.round(((x - PAD) / spanX) * (MAX - MIN) + MIN), MIN, MAX)
    return { PAD, axisY, spanX, xFor, vFor }
  }, [canvasWidth])

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

    const { PAD, axisY, xFor } = geo
    const bx = xFor(bound)

    // Axis + arrowheads.
    ctx.strokeStyle = axisColor
    ctx.fillStyle = axisColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(PAD - 14, axisY)
    ctx.lineTo(canvasWidth - PAD + 14, axisY)
    ctx.stroke()
    ;[[PAD - 14, -1], [canvasWidth - PAD + 14, 1]].forEach(([x, dir]) => {
      ctx.beginPath()
      ctx.moveTo(x, axisY)
      ctx.lineTo(x - dir * 9, axisY - 5)
      ctx.lineTo(x - dir * 9, axisY + 5)
      ctx.closePath()
      ctx.fill()
    })

    // Ticks + labels.
    for (let v = MIN; v <= MAX; v += 1) {
      const x = xFor(v)
      ctx.strokeStyle = '#B9BDC6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, axisY - 6)
      ctx.lineTo(x, axisY + 6)
      ctx.stroke()
      if (v % 2 === 0) {
        ctx.fillStyle = '#8B8F99'
        ctx.font = '600 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(String(v), x, axisY + 12)
      }
    }

    // Solution ray (shaded direction) + arrowhead.
    const endX = op.right ? canvasWidth - PAD + 8 : PAD - 8
    ctx.strokeStyle = solGreen
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(bx, axisY)
    ctx.lineTo(endX, axisY)
    ctx.stroke()
    const dir = op.right ? 1 : -1
    ctx.fillStyle = solGreen
    ctx.beginPath()
    ctx.moveTo(endX + dir * 8, axisY)
    ctx.lineTo(endX - dir * 6, axisY - 8)
    ctx.lineTo(endX - dir * 6, axisY + 8)
    ctx.closePath()
    ctx.fill()

    // Boundary dot: open (strict) or closed (inclusive).
    ctx.lineWidth = 3.5
    ctx.strokeStyle = boundPurple
    ctx.beginPath()
    ctx.arc(bx, axisY, 9, 0, Math.PI * 2)
    if (op.inclusive) {
      ctx.fillStyle = boundPurple
      ctx.fill()
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = boundPurple
    ctx.font = '900 15px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(String(bound), bx, axisY - 16)

    // Test point above the line with a check / cross.
    const tx = xFor(test)
    const ty = axisY - 46
    ctx.strokeStyle = testBlue
    ctx.setLineDash([3, 4])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tx, ty + 10)
    ctx.lineTo(tx, axisY - 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = testBlue
    ctx.beginPath()
    ctx.arc(tx, ty, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(test), tx, ty)
    // verdict badge
    ctx.fillStyle = testOk ? solGreen : noRed
    ctx.font = '900 18px Inter, system-ui, sans-serif'
    ctx.fillText(testOk ? '✓' : '✗', tx + 22, ty)
  }, [canvasWidth, geo, op, bound, test, testOk])

  useEffect(() => {
    draw()
  }, [draw])

  const getPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }
  const handlePointerDown = (event) => {
    const pt = getPoint(event)
    const bx = geo.xFor(bound)
    const tx = geo.xFor(test)
    const ty = geo.axisY - 46
    event.currentTarget.setPointerCapture(event.pointerId)
    if (Math.hypot(pt.x - tx, pt.y - ty) <= 20) {
      dragRef.current = 'test'
      setTest(geo.vFor(pt.x))
    } else if (Math.abs(pt.x - bx) <= 18 || Math.abs(pt.y - geo.axisY) <= 22) {
      dragRef.current = 'bound'
      setBound(geo.vFor(pt.x))
    }
  }
  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const v = geo.vFor(getPoint(event).x)
    if (dragRef.current === 'test') setTest(v)
    else setBound(v)
  }
  const handlePointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 font-['Inter']" style={{ background: cream, color: ink }}>
      <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
        <span style={{ color: boundPurple }}>x</span>
        <span style={{ color: solGreen }}>{op.sym}</span>
        <span style={{ color: boundPurple }}>{bound}</span>
      </div>

      <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <p className="text-center text-sm font-semibold" style={{ color: muted }}>
        The <b style={{ color: boundPurple }}>{op.inclusive ? 'closed' : 'open'} dot</b> shows {bound} is {op.inclusive ? 'included' : 'not included'}. Drag the blue <b style={{ color: testBlue }}>test number</b> — the green ray is every value that works.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-[#E0DDD6]">
          {OPS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOpKey(o.key)}
              className="px-4 py-2 text-lg font-black"
              style={{ background: opKey === o.key ? boundPurple : '#ffffff', color: opKey === o.key ? '#ffffff' : muted }}
            >
              {o.sym}
            </button>
          ))}
        </div>
        <Stepper label="Boundary" color={boundPurple} value={bound} onDec={() => setBound((v) => clamp(v - 1, MIN, MAX))} onInc={() => setBound((v) => clamp(v + 1, MIN, MAX))} />
        <Stepper label="Test" color={testBlue} value={test} onDec={() => setTest((v) => clamp(v - 1, MIN, MAX))} onInc={() => setTest((v) => clamp(v + 1, MIN, MAX))} />
      </div>
    </div>
  )
}

function Stepper({ label, value, color, onDec, onInc }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
      <div className="grid grid-cols-[36px_46px_36px] items-center overflow-hidden rounded-full border border-[#E0DDD6] bg-white">
        <button type="button" onClick={onDec} className="h-10 text-2xl font-black" style={{ color: '#D85A30' }} aria-label={`Decrease ${label}`}>−</button>
        <span className="border-x border-[#E0DDD6] py-2 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={onInc} className="h-10 text-2xl font-black" style={{ color: solGreen }} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}
