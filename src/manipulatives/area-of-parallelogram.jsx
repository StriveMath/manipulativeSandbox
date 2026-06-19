import { useCallback, useEffect, useRef, useState } from 'react'

const canvasWidth = 800
const base = 240
const height = 140
const skew = 60
const shapeWidth = base + skew
const originX = (canvasWidth - shapeWidth) / 2
const originY = 72
const dragDistance = base

function trianglePoints(progress) {
  const dx = progress * dragDistance
  return {
    top: { x: originX + skew + dx, y: originY },
    bottomLeft: { x: originX + dx, y: originY + height },
    bottomRight: { x: originX + skew + dx, y: originY + height },
  }
}

function pointsToPath(points) {
  return `M ${points.top.x} ${points.top.y} L ${points.bottomLeft.x} ${points.bottomLeft.y} L ${points.bottomRight.x} ${points.bottomRight.y} Z`
}

export default function AreaOfParallelogram() {
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const dragStartRef = useRef({ x: 0, progress: 0 })
  const animationRef = useRef(null)

  const isComplete = progress >= 0.995
  const triangle = trianglePoints(progress)

  const mainBodyPath = [
    `M ${originX + skew} ${originY}`,
    `L ${originX + base + skew} ${originY}`,
    `L ${originX + base} ${originY + height}`,
    `L ${originX + skew} ${originY + height}`,
    'Z',
  ].join(' ')

  const parallelogramPath = [
    `M ${originX} ${originY + height}`,
    `L ${originX + base} ${originY + height}`,
    `L ${originX + base + skew} ${originY}`,
    `L ${originX + skew} ${originY}`,
    'Z',
  ].join(' ')

  const rectanglePath = [
    `M ${originX + skew} ${originY}`,
    `L ${originX + skew + base} ${originY}`,
    `L ${originX + skew + base} ${originY + height}`,
    `L ${originX + skew} ${originY + height}`,
    'Z',
  ].join(' ')

  const snapProgress = useCallback((value) => {
    if (value >= 0.92) return 1
    if (value <= 0.08) return 0
    return value
  }, [])

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsAnimating(false)
  }, [])

  const animateTo = useCallback(
    (target) => {
      stopAnimation()
      setIsAnimating(true)
      const start = progress
      const startTime = performance.now()
      const duration = 650

      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = 1 - (1 - t) ** 3
        const next = start + (target - start) * eased
        setProgress(snapProgress(next))

        if (t < 1) {
          animationRef.current = requestAnimationFrame(step)
        } else {
          setProgress(target)
          setIsAnimating(false)
          animationRef.current = null
        }
      }

      animationRef.current = requestAnimationFrame(step)
    },
    [progress, snapProgress, stopAnimation]
  )

  useEffect(() => stopAnimation, [stopAnimation])

  const handlePointerDown = (event) => {
    if (isAnimating || isComplete) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    dragStartRef.current = { x: event.clientX, progress }
  }

  const handlePointerMove = (event) => {
    if (!isDragging) return
    const delta = event.clientX - dragStartRef.current.x
    const next = dragStartRef.current.progress + delta / dragDistance
    setProgress(Math.min(1, Math.max(0, next)))
  }

  const handlePointerUp = (event) => {
    if (!isDragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)
    setProgress((value) => snapProgress(value))
  }

  const cutX = originX + skew

  return (
    <div className="box-border flex h-[500px] flex-col overflow-hidden p-4">
      <svg
        width={canvasWidth - 32}
        height={340}
        viewBox={`0 0 ${canvasWidth} 340`}
        className="mx-auto shrink-0 touch-none select-none"
      >
        {!isComplete && (
          <path
            d={parallelogramPath}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )}

        {isComplete ? (
          <path d={rectanglePath} fill="#dbeafe" stroke="#2563eb" strokeWidth="2.5" />
        ) : (
          <path d={mainBodyPath} fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
        )}

        {!isComplete && (
          <>
            <path
              d={pointsToPath(triangle)}
              fill="#fdba74"
              stroke="#ea580c"
              strokeWidth="2"
              className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />

            <line
              x1={cutX}
              y1={originY - 8}
              x2={cutX}
              y2={originY + height + 8}
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeDasharray="8 5"
            />
            <text
              x={cutX - 6}
              y={originY - 16}
              textAnchor="end"
              className="fill-red-600 text-xs font-medium"
            >
              cut
            </text>
          </>
        )}

        <line
          x1={originX + skew - 6}
          y1={originY + height + 18}
          x2={originX + skew + base + 6}
          y2={originY + height + 18}
          stroke="#475569"
          strokeWidth="1.5"
          markerStart="url(#arrow)"
          markerEnd="url(#arrow)"
        />
        <text
          x={originX + skew + base / 2}
          y={originY + height + 36}
          textAnchor="middle"
          className="fill-slate-700 text-sm font-medium"
        >
          base
        </text>

        <line
          x1={originX + skew + base + 24}
          y1={originY}
          x2={originX + skew + base + 24}
          y2={originY + height}
          stroke="#475569"
          strokeWidth="1.5"
          markerStart="url(#arrow)"
          markerEnd="url(#arrow)"
        />
        <text
          x={originX + skew + base + 38}
          y={originY + height / 2 + 4}
          className="fill-slate-700 text-sm font-medium"
        >
          height
        </text>

        {isComplete && (
          <text
            x={canvasWidth / 2}
            y={originY + height + 72}
            textAnchor="middle"
            className="fill-emerald-700 text-base font-semibold"
          >
            The parallelogram becomes a rectangle — area = base × height
          </text>
        )}

        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#475569" />
          </marker>
        </defs>
      </svg>

      <div className="mt-auto shrink-0 text-center">
        <p className="mb-3 text-sm text-slate-600">
          {isComplete
            ? 'Same area as before — the triangle fills the gap on the right.'
            : 'Drag the orange triangle right, or use the button to rearrange the shape.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isComplete || isAnimating}
            onClick={() => animateTo(1)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move triangle →
          </button>
          <button
            type="button"
            disabled={progress === 0 || isAnimating}
            onClick={() => animateTo(0)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
