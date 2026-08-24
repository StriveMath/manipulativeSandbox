import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const colors = {
  ink: '#1A1A2E',
  grid: 'rgba(26, 26, 46, 0.15)',
  green: '#3B6D11',
  red: '#A32D2D',
  purple: '#7C3AED',
  border: '#E0DDD6',
}

const minCoord = -12
const maxCoord = 12
const gridSpan = maxCoord - minCoord

const challenges = [
  {
    name: 'House',
    segments: [
      [[-3, -5], [3, -5], [3, -1], [0, 3], [-3, -1], [-3, -5]],
    ],
  },
  {
    name: 'Boat',
    segments: [
      [[-10, 5], [-4, 5], [-5, 3], [-9, 3], [-10, 5]],
      [[-7, 5], [-7, 9], [-2, 5], [-7, 5]],
    ],
  },
  {
    name: 'Star',
    segments: [
      [[0, 8], [2, 2], [9, 2], [3, -1], [5, -8], [0, -4], [-5, -8], [-3, -1], [-9, 2], [-2, 2], [0, 8]],
    ],
  },
  {
    name: 'Fish',
    segments: [
      [[-6, -1], [-1, -3], [2, -1], [-1, 1], [-6, -1]],
      [[2, -1], [5, 1], [5, -3], [2, -1]],
    ],
  },
  {
    name: 'Rocket',
    segments: [
      [[5, -4], [5, 2], [7, 5], [9, 2], [9, -4], [5, -4]],
      [[5, -2], [3, -4], [5, -4]],
      [[9, -2], [11, -4], [9, -4]],
    ],
  },
]

function flattenChallenge(challenge) {
  const points = []
  challenge.segments.forEach((segment, segmentIndex) => {
    segment.forEach(([x, y], pointIndex) => {
      points.push({ x, y, segmentIndex, pointIndex })
    })
  })
  return points
}

function easeOutBack(t) {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function easeInCubic(t) {
  return t * t * t
}

function getConstants(size) {
  const pad = 30
  const cell = (size - pad * 2) / gridSpan
  return {
    pad,
    cell,
    originX: pad + Math.abs(minCoord) * cell,
    originY: size - pad - Math.abs(minCoord) * cell,
  }
}

function toPx(point, constants) {
  return {
    x: constants.originX + point.x * constants.cell,
    y: constants.originY - point.y * constants.cell,
  }
}

function fireConfetti() {
  if (typeof window === 'undefined' || typeof window.confetti !== 'function') return
  window.confetti({
    particleCount: 90,
    spread: 65,
    origin: { y: 0.62 },
  })
}

function CoordinateText({ point }) {
  return (
    <span className="font-['Fredoka_One']">
      <span className="text-[#1A1A2E]">(</span>
      <span className="text-[#D85A30]">{point.x}</span>
      <span className="text-slate-400">, </span>
      <span className="text-[#7C3AED]">{point.y}</span>
      <span className="text-[#1A1A2E]">)</span>
    </span>
  )
}

export default function CoordinateConnectDots() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const launchFrameRef = useRef(null)
  const wrongTimerRef = useRef(null)
  const [gridSize, setGridSize] = useState(486)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [completedChallenges, setCompletedChallenges] = useState(0)
  const [placedCount, setPlacedCount] = useState(0)
  const [drop, setDrop] = useState(null)
  const [wrong, setWrong] = useState(null)
  const [complete, setComplete] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [launchProgress, setLaunchProgress] = useState(0)

  const challenge = challenges[challengeIndex]
  const points = useMemo(() => flattenChallenge(challenge), [challenge])

  const clearTimers = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    if (launchFrameRef.current) cancelAnimationFrame(launchFrameRef.current)
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current)
    frameRef.current = null
    launchFrameRef.current = null
    wrongTimerRef.current = null
  }, [])

  const resetChallenge = useCallback(() => {
    clearTimers()
    setPlacedCount(0)
    setDrop(null)
    setWrong(null)
    setComplete(false)
    setLaunchProgress(0)
  }, [clearTimers])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = gridSize * dpr
    canvas.height = gridSize * dpr
    canvas.style.width = `${gridSize}px`
    canvas.style.height = `${gridSize}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, gridSize, gridSize)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, gridSize, gridSize)

    const constants = getConstants(gridSize)
    const isRocketLaunch = complete && challengeIndex === challenges.length - 1
    const launchDelay = 0.52
    const liftProgress = isRocketLaunch ? Math.max(0, (launchProgress - launchDelay) / (1 - launchDelay)) : 0
    const launchT = easeInCubic(Math.min(1, liftProgress))
    const launchShake = isRocketLaunch && launchProgress < launchDelay ? Math.sin(launchProgress * 120) * 2.8 : 0
    const launchOffset = launchT * gridSize * 0.92
    const launchedPoint = (point) => {
      const px = toPx(point, constants)
      return { x: px.x + launchShake, y: px.y - launchOffset }
    }
    const shakeX = wrong ? Math.sin(Date.now() / 28) * 3 : 0
    ctx.save()
    ctx.translate(shakeX, 0)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    for (let value = minCoord; value <= maxCoord; value += 1) {
      const x = constants.originX + value * constants.cell
      const y = constants.originY - value * constants.cell
      ctx.beginPath()
      ctx.moveTo(x, constants.pad)
      ctx.lineTo(x, gridSize - constants.pad)
      ctx.moveTo(constants.pad, y)
      ctx.lineTo(gridSize - constants.pad, y)
      ctx.stroke()
    }

    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(constants.pad, constants.originY)
    ctx.lineTo(gridSize - constants.pad + 12, constants.originY)
    ctx.moveTo(constants.originX, gridSize - constants.pad)
    ctx.lineTo(constants.originX, constants.pad - 12)
    ctx.stroke()

    ctx.fillStyle = colors.ink
    ctx.font = '700 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let value = minCoord; value <= maxCoord; value += 2) {
      const x = constants.originX + value * constants.cell
      const y = constants.originY - value * constants.cell
      ctx.fillText(String(value), x, constants.originY + 7)
      if (value !== 0) {
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(value), constants.originX - 8, y)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
      }
    }
    ctx.font = '800 16px Inter, system-ui, sans-serif'
    ctx.fillText('x', gridSize - constants.pad + 22, constants.originY - 8)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('y', constants.originX + 8, constants.pad - 18)

    if (complete) {
      ctx.fillStyle = 'rgba(59, 109, 17, 0.12)'
      ctx.globalAlpha = Math.max(0.15, 1 - launchT * 0.3)
      challenge.segments.forEach((segment) => {
        ctx.beginPath()
        segment.forEach(([x, y], index) => {
          const point = launchedPoint({ x, y })
          if (index === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.closePath()
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    const visiblePoints = points.slice(0, placedCount)
    ctx.strokeStyle = colors.green
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    visiblePoints.forEach((point, index) => {
      if (index === 0) return
      const previous = visiblePoints[index - 1]
      if (previous.segmentIndex !== point.segmentIndex) return
      const prevPx = launchedPoint(previous)
      const pointPx = launchedPoint(point)
      const isDropping = drop?.index === index
      const dropProgress = isDropping ? Math.min(1, drop.progress) : 1
      const animatedY = pointPx.y - (1 - dropProgress) * 22
      ctx.beginPath()
      ctx.moveTo(prevPx.x, prevPx.y)
      ctx.lineTo(pointPx.x, animatedY)
      ctx.stroke()
    })

    visiblePoints.forEach((point, index) => {
      const pointPx = launchedPoint(point)
      const isDropping = drop?.index === index
      const dropProgress = isDropping ? easeOutBack(Math.min(1, drop.progress)) : 1
      const y = pointPx.y - (1 - Math.min(1, dropProgress)) * 22
      ctx.fillStyle = colors.green
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pointPx.x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })

    if (isRocketLaunch && launchProgress > launchDelay && launchProgress < 1) {
      const baseLeft = launchedPoint({ x: 5, y: -4 })
      const baseRight = launchedPoint({ x: 9, y: -4 })
      const flameY = Math.max(baseLeft.y, baseRight.y) + 6
      ctx.fillStyle = 'rgba(216, 90, 48, 0.72)'
      ctx.beginPath()
      ctx.moveTo((baseLeft.x + baseRight.x) / 2, flameY + 34)
      ctx.lineTo(baseLeft.x + 8, flameY)
      ctx.lineTo(baseRight.x - 8, flameY)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(232, 169, 78, 0.9)'
      ctx.beginPath()
      ctx.moveTo((baseLeft.x + baseRight.x) / 2, flameY + 22)
      ctx.lineTo(baseLeft.x + 15, flameY + 2)
      ctx.lineTo(baseRight.x - 15, flameY + 2)
      ctx.closePath()
      ctx.fill()
    }

    if (showHints && !complete && placedCount < points.length) {
      const target = toPx(points[placedCount], constants)
      ctx.strokeStyle = colors.green
      ctx.lineWidth = 2.5
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(target.x, target.y, 13, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(59, 109, 17, 0.10)'
      ctx.beginPath()
      ctx.arc(target.x, target.y, 10, 0, Math.PI * 2)
      ctx.fill()
    }

    if (wrong) {
      const wrongPx = toPx(wrong, constants)
      ctx.fillStyle = colors.red
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(wrongPx.x, wrongPx.y, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    ctx.restore()
  }, [challenge.segments, challengeIndex, complete, drop, gridSize, launchProgress, placedCount, points, showHints, wrong])

  useEffect(() => {
    if (allDone) return undefined
    const node = wrapRef.current
    if (!node) return undefined
    const update = () => {
      const rect = node.getBoundingClientRect()
      setGridSize(Math.max(280, Math.min(500, Math.floor(Math.min(rect.width, rect.height) - 2))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [allDone])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => () => clearTimers(), [clearTimers])

  const animateDrop = (index) => {
    const start = performance.now()
    const duration = 200
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      setDrop({ index, progress })
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      frameRef.current = null
      setDrop(null)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const startRocketLaunch = () => {
    if (launchFrameRef.current) cancelAnimationFrame(launchFrameRef.current)
    const start = performance.now()
    const duration = 3900
    setLaunchProgress(0)
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      setLaunchProgress(progress)
      if (progress < 1) {
        launchFrameRef.current = requestAnimationFrame(tick)
        return
      }
      launchFrameRef.current = null
    }
    launchFrameRef.current = requestAnimationFrame(tick)
  }

  const handlePointerDown = (event) => {
    if (complete || allDone || drop) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const constants = getConstants(gridSize)
    const gx = Math.round((px - constants.originX) / constants.cell)
    const gy = Math.round((constants.originY - py) / constants.cell)
    if (gx < minCoord || gx > maxCoord || gy < minCoord || gy > maxCoord) return
    const snap = toPx({ x: gx, y: gy }, constants)
    const distance = Math.hypot(px - snap.x, py - snap.y)
    if (distance > constants.cell * 0.42) return

    const target = points[placedCount]
    if (target.x === gx && target.y === gy) {
      const nextCount = placedCount + 1
      setPlacedCount(nextCount)
      animateDrop(nextCount - 1)
      if (nextCount === points.length) {
        setComplete(true)
        setCompletedChallenges((current) => Math.max(current, challengeIndex + 1))
        fireConfetti()
        if (challengeIndex === challenges.length - 1) startRocketLaunch()
      }
      return
    }

    clearTimers()
    setWrong({ x: gx, y: gy })
    wrongTimerRef.current = setTimeout(() => {
      setPlacedCount(0)
      setWrong(null)
      setDrop(null)
      setComplete(false)
    }, 360)
  }

  const nextChallenge = () => {
    if (challengeIndex >= challenges.length - 1) {
      clearTimers()
      setAllDone(true)
      return
    }
    clearTimers()
    setChallengeIndex((current) => current + 1)
    setPlacedCount(0)
    setDrop(null)
    setWrong(null)
    setComplete(false)
    setLaunchProgress(0)
  }

  const playAgain = () => {
    clearTimers()
    setChallengeIndex(0)
    setCompletedChallenges(0)
    setPlacedCount(0)
    setDrop(null)
    setWrong(null)
    setComplete(false)
    setLaunchProgress(0)
    setAllDone(false)
  }

  if (allDone) {
    return (
      <div className="flex h-[500px] w-[800px] items-center justify-center bg-[#F8F6F0] p-4 font-['Inter'] text-[#1A1A2E]">
        <div className="max-w-md rounded-2xl border border-[#E0DDD6] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 font-['Fredoka_One'] text-3xl text-[#3B6D11]">All pictures revealed!</p>
          <p className="mb-5 text-sm font-semibold text-[#5F5E5A]">You plotted every coordinate in order.</p>
          <button type="button" onClick={playAgain} className="rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-black text-white">
            Play again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-[500px] w-[800px] grid-cols-[238px_1fr] gap-1.5 overflow-hidden bg-[#F8F6F0] p-1.5 font-['Inter'] text-[#1A1A2E]">
      <aside className="flex min-h-0 flex-col gap-1.5">
        <section className="rounded-xl border border-[#E0DDD6] bg-white p-3">
          <p className="font-['Fredoka_One'] text-2xl leading-tight text-[#1A1A2E]">Challenge {challengeIndex + 1} of {challenges.length}</p>
          <p className="mt-1 text-xs font-semibold text-[#5F5E5A]">Plot each point in order. A wrong point restarts this challenge.</p>
          <div className="mt-3 flex gap-1">
            {challenges.map((item, index) => (
              <span
                key={item.name}
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: index < completedChallenges ? colors.green : index === challengeIndex ? colors.purple : '#D8D6CF' }}
              />
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setShowHints((current) => !current)}
          className="h-10 shrink-0 rounded-full border text-sm font-black"
          style={{
            borderColor: showHints ? colors.green : colors.border,
            backgroundColor: showHints ? '#ECF6E8' : '#ffffff',
            color: showHints ? colors.green : '#5F5E5A',
          }}
        >
          {showHints ? 'Hide hints' : 'Show hints'}
        </button>

        <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white p-2">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-[#5F5E5A]">Coordinates</p>
          <div className="flex h-[calc(100%-24px)] flex-col gap-1 overflow-y-auto pr-1">
            {points.map((point, index) => {
              const done = index < placedCount
              const active = index === placedCount && !complete
              return (
                <div
                  key={`${point.segmentIndex}-${point.pointIndex}-${index}`}
                  className="flex items-center justify-between rounded-xl border px-2 py-1 text-sm"
                  style={{
                    borderColor: active ? colors.purple : done ? colors.green : colors.border,
                    backgroundColor: active ? 'rgba(124, 58, 237, 0.10)' : done ? 'rgba(59, 109, 17, 0.10)' : '#ffffff',
                    color: active ? colors.purple : colors.ink,
                  }}
                >
                  <CoordinateText point={point} />
                  {done ? <span className="font-black text-[#3B6D11]">{'\u2713'}</span> : null}
                </div>
              )
            })}
          </div>
        </section>

        <section className="shrink-0 rounded-xl border border-[#E0DDD6] bg-white p-2">
          <p className="mb-2 text-sm font-semibold text-[#5F5E5A]">
            Next: {complete ? 'picture complete' : <CoordinateText point={points[placedCount]} />}
          </p>
          <div className="grid gap-2">
            <button type="button" onClick={resetChallenge} className="h-9 rounded-full border border-[#E0DDD6] bg-white text-sm font-black text-[#5F5E5A]">
              Reset challenge
            </button>
            {complete ? (
              <button type="button" onClick={nextChallenge} className="h-9 rounded-full bg-[#3B6D11] text-sm font-black text-white">
                {challengeIndex === challenges.length - 1 ? 'Finish' : 'Next challenge \u2192'}
              </button>
            ) : null}
          </div>
        </section>

        {complete ? (
          <div className="shrink-0 rounded-xl border border-[#3B6D11] bg-[#ECF6E8] px-3 py-2 text-center text-sm font-black text-[#3B6D11]">
            Challenge complete!
          </div>
        ) : null}
      </aside>

      <section ref={wrapRef} className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-[#E0DDD6] bg-white p-0">
        <canvas ref={canvasRef} onPointerDown={handlePointerDown} className="touch-none" />
      </section>
    </div>
  )
}
