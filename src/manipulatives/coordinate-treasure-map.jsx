import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const minCoord = -10
const maxCoord = 10
const round1 = (value) => Math.round(value * 10) / 10

const landmarks = [
  { name: 'Skull Rock', x: -4, y: 6, kind: 'skull' },
  { name: 'Palm Beach', x: 5, y: 7, kind: 'palm' },
  { name: 'Sunken Ship', x: -7, y: -5, kind: 'ship' },
  { name: 'Lost Cave', x: -3, y: -8, kind: 'cave' },
  { name: 'Parrot Perch', x: 4, y: -3, kind: 'perch' },
  { name: 'Gold Lagoon', x: -6, y: 3, kind: 'lagoon' },
  { name: 'Volcano Peak', x: 7, y: 4, kind: 'volcano' },
  { name: 'Treasure Chest', x: 3, y: -7, kind: 'chest' },
]

const activities = [
  {
    id: 'landmark',
    title: 'Find the landmark',
    description: 'Click the matching coordinate.',
    stars: '★☆☆',
  },
  {
    id: 'point',
    title: 'Name that point',
    description: 'Type the x and y values.',
    stars: '★★☆',
  },
  {
    id: 'hunt',
    title: 'Treasure Hunt',
    description: 'Solve five coordinate clues.',
    stars: '★★★',
  },
]

const huntClues = [
  {
    prompt: 'Reflect Skull Rock (-4, 6) across the y-axis. What are the new coordinates?',
    answer: { x: 4, y: 6 },
    hint: 'Across the y-axis changes x, but keeps y.',
  },
  {
    prompt: 'What is the distance between (-3, 2) and (5, 2)?',
    answer: { distance: 8 },
    hint: 'Same y-value, so count horizontally.',
  },
  {
    prompt: 'Name any landmark in Quadrant III.',
    answer: { landmark: ['Sunken Ship', 'Lost Cave'] },
    hint: 'Quadrant III has negative x and negative y.',
  },
  {
    prompt: 'Plot (4, -3) and reflect it across the x-axis. What is the reflection?',
    answer: { x: 4, y: 3 },
    hint: 'Across the x-axis changes y, but keeps x.',
  },
  {
    prompt: 'What is the distance from Volcano Peak (7, 4) to the origin? Round to nearest whole number.',
    answer: { distance: 8 },
    hint: 'Use sqrt(7^2 + 4^2), then round.',
  },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getQuadrant(point) {
  if (!point) return '-'
  if (point.x === 0 && point.y === 0) return 'Origin'
  if (point.x === 0) return 'y-axis'
  if (point.y === 0) return 'x-axis'
  if (point.x > 0 && point.y > 0) return 'I'
  if (point.x < 0 && point.y > 0) return 'II'
  if (point.x < 0 && point.y < 0) return 'III'
  return 'IV'
}

function getQuadrantDescription(point) {
  const quadrant = getQuadrant(point)
  const descriptions = {
    I: 'I - top right',
    II: 'II - top left',
    III: 'III - bottom left',
    IV: 'IV - bottom right',
    Origin: 'Origin',
    'x-axis': 'x-axis',
    'y-axis': 'y-axis',
  }
  return descriptions[quadrant] ?? quadrant
}

function distanceFromOrigin(point) {
  return round1(Math.sqrt(point.x * point.x + point.y * point.y))
}

function parseCoordinateAnswer(value) {
  const matches = value.match(/-?\d+/g)
  if (!matches || matches.length < 2) return null
  return { x: Number(matches[0]), y: Number(matches[1]) }
}

function loadConfetti() {
  if (window.confetti) return Promise.resolve(window.confetti)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-coordinate-confetti]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.confetti))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js'
    script.async = true
    script.dataset.coordinateConfetti = 'true'
    script.addEventListener('load', () => resolve(window.confetti))
    script.addEventListener('error', reject)
    document.body.appendChild(script)
  })
}

function CoordinateText({ x, y }) {
  return (
    <span className="font-['Fredoka_One']">
      <span className="text-[#D85A30]">{x}</span>
      <span className="text-slate-400">, </span>
      <span className="text-[#7F77DD]">{y}</span>
    </span>
  )
}

function drawIcon(ctx, kind, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  const s = Math.min(size, 20)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#1A1A2E'

  if (kind === 'skull') {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1A1A2E'
    ctx.beginPath()
    ctx.arc(-s * 0.12, -2, 1.8, 0, Math.PI * 2)
    ctx.arc(s * 0.12, -2, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, 1)
    ctx.lineTo(-2, 5)
    ctx.lineTo(2, 5)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'palm') {
    ctx.strokeStyle = '#7a5b2e'
    ctx.beginPath()
    ctx.moveTo(0, s * 0.42)
    ctx.lineTo(2, -s * 0.22)
    ctx.stroke()
    ctx.fillStyle = '#3B6D11'
    ;[
      [-8, -7, -0.65],
      [2, -10, 0],
      [10, -5, 0.65],
    ].forEach(([leafX, leafY, rotation]) => {
      ctx.save()
      ctx.translate(2, -s * 0.22)
      ctx.rotate(rotation)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(leafX * 0.5, leafY * 0.7, leafX, leafY)
      ctx.quadraticCurveTo(leafX * 0.2, leafY * 0.45, 0, 0)
      ctx.fill()
      ctx.restore()
    })
  } else if (kind === 'ship') {
    ctx.strokeStyle = '#4b5563'
    ctx.fillStyle = '#4b5563'
    ctx.beginPath()
    ctx.arc(0, 2, s * 0.38, 0, Math.PI)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-2, 2)
    ctx.lineTo(-4, -s * 0.35)
    ctx.moveTo(-4, -s * 0.35)
    ctx.lineTo(2, -s * 0.18)
    ctx.stroke()
  } else if (kind === 'cave') {
    ctx.fillStyle = '#4b5563'
    ctx.beginPath()
    ctx.arc(0, s * 0.25, s * 0.4, Math.PI, Math.PI * 2)
    ctx.lineTo(s * 0.4, s * 0.38)
    ctx.lineTo(-s * 0.4, s * 0.38)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (kind === 'perch') {
    ctx.strokeStyle = '#D85A30'
    ctx.fillStyle = '#D85A30'
    ctx.beginPath()
    ctx.moveTo(-s * 0.35, s * 0.25)
    ctx.lineTo(0, -s * 0.35)
    ctx.lineTo(s * 0.35, s * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.08, 0)
    ctx.lineTo(-s * 0.42, -s * 0.18)
    ctx.moveTo(s * 0.08, 0)
    ctx.lineTo(s * 0.42, -s * 0.18)
    ctx.stroke()
  } else if (kind === 'lagoon') {
    ctx.fillStyle = '#378ADD'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (kind === 'volcano') {
    ctx.fillStyle = '#D85A30'
    ctx.beginPath()
    ctx.moveTo(-s * 0.42, s * 0.36)
    ctx.lineTo(0, -s * 0.38)
    ctx.lineTo(s * 0.42, s * 0.36)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(-3, -s * 0.18)
    ctx.lineTo(0, -s * 0.38)
    ctx.lineTo(3, -s * 0.18)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = '#8b5a2b'
    ctx.fillRect(-s * 0.36, -s * 0.16, s * 0.72, s * 0.42)
    ctx.strokeRect(-s * 0.36, -s * 0.16, s * 0.72, s * 0.42)
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function createPointRound(index) {
  const points = [
    { x: -8, y: 4 },
    { x: 6, y: -2 },
    { x: -5, y: -6 },
    { x: 2, y: 9 },
    { x: 0, y: -7 },
    { x: -9, y: 0 },
    { x: 7, y: 7 },
    { x: 3, y: -8 },
    { x: -2, y: 5 },
    { x: 9, y: -4 },
  ]
  return points[index % points.length]
}

export default function CoordinateTreasureMap() {
  const canvasRef = useRef(null)
  const canvasWrapRef = useRef(null)
  const [mode, setMode] = useState('explore')
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 })
  const [selected, setSelected] = useState({ x: 3, y: 2 })
  const [manualX, setManualX] = useState(3)
  const [manualY, setManualY] = useState(2)
  const [showReflections, setShowReflections] = useState(false)
  const [hoveredLandmark, setHoveredLandmark] = useState(null)
  const [activityId, setActivityId] = useState('landmark')
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [activityInput, setActivityInput] = useState({ x: '', y: '', text: '', distance: '' })
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [complete, setComplete] = useState(false)

  const activeActivity = activities.find((item) => item.id === activityId)
  const landmarkTarget = landmarks[round % landmarks.length]
  const pointTarget = useMemo(() => createPointRound(round), [round])
  const huntTarget = huntClues[round % huntClues.length]
  const scoreMax = activityId === 'landmark' ? 8 : activityId === 'point' ? 10 : 5
  const progress = Math.min(100, (round / scoreMax) * 100)

  useEffect(() => {
    const wrapper = canvasWrapRef.current
    if (!wrapper) return

    const updateSize = () => {
      const rect = wrapper.getBoundingClientRect()
      const size = Math.max(360, Math.round(rect.width))
      setCanvasSize({
        width: size,
        height: size,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const resetActivity = useCallback((nextId = activityId) => {
    setActivityId(nextId)
    setRound(0)
    setScore(0)
    setActivityInput({ x: '', y: '', text: '', distance: '' })
    setFeedback({ type: '', text: '' })
    setComplete(false)
  }, [activityId])

  const toScreen = useCallback((point) => {
    const effectiveWidth = canvasSize.width
    const padding = 18
    const CELL = Math.min(
      (effectiveWidth - padding * 2) / (maxCoord - minCoord),
      (canvasSize.height - padding * 2) / (maxCoord - minCoord),
    )
    const ORIGIN_X = effectiveWidth / 2
    const ORIGIN_Y = canvasSize.height / 2
    return { x: ORIGIN_X + point.x * CELL, y: ORIGIN_Y - point.y * CELL, CELL, ORIGIN_X, ORIGIN_Y }
  }, [canvasSize])

  const fromScreen = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const pointX = ((clientX - rect.left) / rect.width) * canvas.width
    const pointY = ((clientY - rect.top) / rect.height) * canvas.height
    const { CELL, ORIGIN_X, ORIGIN_Y } = toScreen({ x: 0, y: 0 })
    return {
      x: clamp(Math.round((pointX - ORIGIN_X) / CELL), minCoord, maxCoord),
      y: clamp(Math.round((ORIGIN_Y - pointY) / CELL), minCoord, maxCoord),
    }
  }, [toScreen])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { width, height } = canvasSize
    const effectiveWidth = width
    const padding = 18
    const CELL = Math.min(
      (effectiveWidth - padding * 2) / 20,
      (height - padding * 2) / 20,
    )
    const ORIGIN_X = effectiveWidth / 2
    const ORIGIN_Y = height / 2
    const plot = (point) => ({ x: ORIGIN_X + point.x * CELL, y: ORIGIN_Y - point.y * CELL })

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#C8E6F5'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#B5CC7A'
    ctx.strokeStyle = '#8FAA4A'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const island = [
      [-9.7, 5.0],
      [-7.6, 8.5],
      [-2.5, 9.6],
      [2.7, 9.0],
      [7.8, 7.0],
      [9.6, 2.7],
      [9.2, -1.7],
      [9.7, -6.4],
      [5.1, -9.6],
      [0.1, -8.5],
      [-5.6, -9.8],
      [-9.2, -6.2],
      [-9.7, -1.3],
    ]
    island.forEach(([xValue, yValue], index) => {
      const p = plot({ x: xValue, y: yValue })
      if (index === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = 'rgba(26,26,46,0.15)'
    ctx.lineWidth = 1
    for (let i = minCoord; i <= maxCoord; i += 1) {
      const xLine = ORIGIN_X + i * CELL
      const yLine = ORIGIN_Y - i * CELL
      ctx.beginPath()
      ctx.moveTo(xLine, ORIGIN_Y - maxCoord * CELL)
      ctx.lineTo(xLine, ORIGIN_Y - minCoord * CELL)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ORIGIN_X + minCoord * CELL, yLine)
      ctx.lineTo(ORIGIN_X + maxCoord * CELL, yLine)
      ctx.stroke()
    }

    ctx.strokeStyle = '#1A1A2E'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(ORIGIN_X + minCoord * CELL, ORIGIN_Y)
    ctx.lineTo(ORIGIN_X + maxCoord * CELL, ORIGIN_Y)
    ctx.moveTo(ORIGIN_X, ORIGIN_Y - maxCoord * CELL)
    ctx.lineTo(ORIGIN_X, ORIGIN_Y - minCoord * CELL)
    ctx.stroke()

    ctx.fillStyle = '#5F5E5A'
    ctx.font = '15px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('x', ORIGIN_X + maxCoord * CELL - 8, ORIGIN_Y - 7)
    ctx.fillText('y', ORIGIN_X + 12, ORIGIN_Y - maxCoord * CELL + 16)
    for (let i = minCoord; i <= maxCoord; i += 2) {
      if (i === 0) continue
      ctx.fillText(String(i), ORIGIN_X + i * CELL, ORIGIN_Y + 14)
      ctx.fillText(String(i), ORIGIN_X - 14, ORIGIN_Y - i * CELL + 4)
    }

    landmarks.forEach((landmark) => {
      const p = plot(landmark)
      drawIcon(ctx, landmark.kind, p.x, p.y - 6, 20)
      if (mode === 'explore' && hoveredLandmark === landmark.name) {
        const label = landmark.name
        ctx.font = '12px Inter, sans-serif'
        const labelWidth = ctx.measureText(label).width + 12
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(p.x - labelWidth / 2, p.y + 10, labelWidth, 18, 9)
        ctx.fill()
        ctx.fillStyle = '#1A1A2E'
        ctx.textAlign = 'center'
        ctx.fillText(label, p.x, p.y + 23)
      }
    })

    const pointsToDraw = []
    if (mode === 'explore' && selected) {
      pointsToDraw.push({ point: selected, color: '#7F77DD', label: `(${selected.x}, ${selected.y})` })
      if (showReflections) {
        pointsToDraw.push({ point: { x: selected.x, y: -selected.y }, color: '#378ADD', label: 'x-axis' })
        pointsToDraw.push({ point: { x: -selected.x, y: selected.y }, color: '#639922', label: 'y-axis' })
      }
    }
    if (mode === 'activity' && activityId === 'point' && !complete) {
      pointsToDraw.push({ point: pointTarget, color: '#7F77DD', label: '?' })
    }

    if (showReflections && mode === 'explore' && selected) {
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1
      pointsToDraw.slice(1).forEach((item) => {
        const a = plot(selected)
        const b = plot(item.point)
        ctx.strokeStyle = `${item.color}80`
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      })
      ctx.setLineDash([])
    }

    pointsToDraw.forEach((item) => {
      const p = plot(item.point)
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, item.point === selected ? 10 : 7, 0, Math.PI * 2)
      ctx.fill()
      if (item.point === selected) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
        const tooltip = `(${selected.x}, ${selected.y})`
        ctx.font = '18px Fredoka One, Inter, sans-serif'
        const widthText = ctx.measureText(tooltip).width + 18
        const tooltipX = clamp(p.x - widthText / 2, 4, canvasSize.width - widthText - 4)
        const tooltipY = Math.max(4, p.y - 42)
        ctx.fillStyle = '#1A1A2E'
        ctx.beginPath()
        ctx.roundRect(tooltipX, tooltipY, widthText, 30, 15)
        ctx.fill()
        let cursor = tooltipX + 9
        ctx.textAlign = 'left'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('(', cursor, tooltipY + 21)
        cursor += ctx.measureText('(').width
        ctx.fillStyle = '#D85A30'
        ctx.fillText(String(selected.x), cursor, tooltipY + 21)
        cursor += ctx.measureText(String(selected.x)).width
        ctx.fillStyle = '#9ca3af'
        ctx.fillText(', ', cursor, tooltipY + 21)
        cursor += ctx.measureText(', ').width
        ctx.fillStyle = '#7F77DD'
        ctx.fillText(String(selected.y), cursor, tooltipY + 21)
        cursor += ctx.measureText(String(selected.y)).width
        ctx.fillStyle = '#ffffff'
        ctx.fillText(')', cursor, tooltipY + 21)
        ctx.textAlign = 'center'
      }
    })
  }, [activityId, canvasSize, complete, hoveredLandmark, mode, pointTarget, selected, showReflections])

  const completeIfNeeded = useCallback((nextRound, nextScore) => {
    const max = activityId === 'landmark' ? 8 : activityId === 'point' ? 10 : 5
    if (nextRound >= max) {
      setComplete(true)
      if (activityId === 'hunt') {
        loadConfetti().then((confetti) => confetti?.({ particleCount: 90, spread: 70 })).catch(() => {})
      }
      setFeedback({
        type: 'correct',
        text: nextScore >= Math.ceil(max * 0.7) ? 'Trophy unlocked!' : 'Activity complete.',
      })
      return true
    }
    return false
  }, [activityId])

  const checkActivityPoint = useCallback((point) => {
    if (activityId === 'landmark') {
      const correct = Math.abs(point.x - landmarkTarget.x) <= 0.5 && Math.abs(point.y - landmarkTarget.y) <= 0.5
      if (!correct) {
        setFeedback({ type: 'wrong', text: 'Try again. Check the signs and quadrant.' })
        return
      }
      const nextScore = score + 1
      const nextRound = round + 1
      setScore(nextScore)
      setRound(nextRound)
      setFeedback({ type: 'correct', text: '+1 Correct landmark!' })
      completeIfNeeded(nextRound, nextScore)
    }
  }, [activityId, completeIfNeeded, landmarkTarget, round, score])

  const handleCanvasClick = (event) => {
    const point = fromScreen(event.clientX, event.clientY)
    if (mode === 'explore') {
      setSelected(point)
      setManualX(point.x)
      setManualY(point.y)
    } else {
      setSelected(point)
      checkActivityPoint(point)
    }
  }

  const handleCanvasMove = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pointerX = ((event.clientX - rect.left) / rect.width) * canvas.width
    const pointerY = ((event.clientY - rect.top) / rect.height) * canvas.height
    const hit = landmarks.find((landmark) => {
      const p = toScreen(landmark)
      return Math.hypot(pointerX - p.x, pointerY - (p.y - 6)) <= 18
    })

    setHoveredLandmark(hit?.name ?? null)
  }

  const plotManual = () => {
    const point = { x: clamp(Number(manualX), minCoord, maxCoord), y: clamp(Number(manualY), minCoord, maxCoord) }
    setSelected(point)
  }

  const checkTypedAnswer = () => {
    if (activityId === 'point') {
      const xGuess = Number(activityInput.x)
      const yGuess = Number(activityInput.y)
      const correct = xGuess === pointTarget.x && yGuess === pointTarget.y
      if (!correct) {
        const xText = xGuess === pointTarget.x ? 'x was right' : `x should be ${pointTarget.x}`
        const yText = yGuess === pointTarget.y ? 'y was right' : `y should be ${pointTarget.y}; negative y goes down`
        setFeedback({ type: 'wrong', text: `${xText} — ${yText}.` })
        return
      }
      const nextScore = score + 1
      const nextRound = round + 1
      setScore(nextScore)
      setRound(nextRound)
      setActivityInput({ x: '', y: '', text: '', distance: '' })
      setFeedback({ type: 'correct', text: '+1 Correct point!' })
      completeIfNeeded(nextRound, nextScore)
    }

    if (activityId === 'hunt') {
      const clue = huntTarget
      const answerText = activityInput.text.trim()
      const coordinateGuess = parseCoordinateAnswer(answerText)
      const distanceGuess = Number(answerText)
      const textGuess = activityInput.text.trim().toLowerCase()
      const correct =
        ('x' in clue.answer && coordinateGuess?.x === clue.answer.x && coordinateGuess?.y === clue.answer.y) ||
        ('distance' in clue.answer && distanceGuess === clue.answer.distance) ||
        ('landmark' in clue.answer && clue.answer.landmark.some((name) => name.toLowerCase() === textGuess))

      if (!correct) {
        setFeedback({ type: 'wrong', text: 'Not quite. Check the signs, quadrant, or distance.' })
        return
      }

      const nextScore = score + 1
      const nextRound = round + 1
      setScore(nextScore)
      setRound(nextRound)
      setActivityInput({ x: '', y: '', text: '', distance: '' })
      setFeedback({ type: 'correct', text: '+1 Clue solved!' })
      completeIfNeeded(nextRound, nextScore)
    }
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (mode !== 'activity') {
        if (event.key === 'ArrowUp') setManualY((value) => clamp(Number(value) + 1, minCoord, maxCoord))
        if (event.key === 'ArrowDown') setManualY((value) => clamp(Number(value) - 1, minCoord, maxCoord))
        if (event.key === 'ArrowRight') setManualX((value) => clamp(Number(value) + 1, minCoord, maxCoord))
        if (event.key === 'ArrowLeft') setManualX((value) => clamp(Number(value) - 1, minCoord, maxCoord))
      }
      if (event.key === 'Enter') {
        if (mode === 'explore') plotManual()
        if (mode === 'activity') checkTypedAnswer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const activityPrompt = activityId === 'landmark'
    ? <>Find <span className="font-black">{landmarkTarget.name}</span> at (<CoordinateText x={landmarkTarget.x} y={landmarkTarget.y} />)</>
    : activityId === 'point'
      ? 'Name the point shown on the map.'
      : huntTarget.prompt
  const activitySummaryPoint = activityId === 'point' ? pointTarget : selected

  return (
    <div className="min-h-full overflow-auto bg-[#F8F6F0] p-2 font-['Inter'] text-[#1A1A2E]">
      <div className="mx-auto flex max-w-[900px] flex-col gap-1.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          {['explore', 'activity'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-full px-4 py-1.5 text-sm font-black capitalize ${
                mode === item ? 'bg-[#7F77DD] text-white' : 'text-slate-600'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#3B6D11] shadow-sm">
          Score {score}
        </span>
      </header>

      {mode === 'activity' && (
        <section className="grid grid-cols-3 gap-2 max-[700px]:grid-cols-1">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => resetActivity(activity.id)}
              className={`rounded-xl border border-[#E0DDD6] bg-white p-2 text-left ${
                activityId === activity.id ? 'ring-2 ring-[#7F77DD]' : ''
              }`}
            >
              <p className="text-sm font-black">{activity.title} <span className="text-[#D85A30]">{activity.stars}</span></p>
              <p className="text-xs text-slate-600">{activity.description}</p>
            </button>
          ))}
        </section>
      )}

      <main className="grid grid-cols-[minmax(360px,560px)_minmax(250px,1fr)] justify-center gap-2 max-[760px]:grid-cols-1">
        <div
          ref={canvasWrapRef}
          className="aspect-square w-full max-w-[560px] overflow-hidden rounded-xl border border-[#E0DDD6] bg-white"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredLandmark(null)}
            className="h-full w-full cursor-crosshair"
            aria-label="Coordinate treasure map"
          />
        </div>

        <aside className="grid min-w-0 content-start gap-2 overflow-y-auto overflow-x-hidden rounded-xl border border-[#E0DDD6] bg-white p-2 shadow-sm max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
          {!(mode === 'activity' && activityId === 'hunt') && (
            <div className="grid gap-2 max-[760px]:col-span-2 max-[520px]:col-span-1">
            <div className="rounded-xl border border-[#E0DDD6] bg-white px-3 py-2">
              <p className="text-[12px] text-[#5F5E5A]">Coordinate</p>
              <p className="text-2xl">
                <CoordinateText
                  x={mode === 'activity' ? activitySummaryPoint.x : selected.x}
                  y={mode === 'activity' ? activitySummaryPoint.y : selected.y}
                />
              </p>
            </div>
            <div className="rounded-xl border border-[#E0DDD6] bg-white px-3 py-2">
              <p className="text-[12px] text-[#5F5E5A]">Quadrant</p>
              <p className="font-['Fredoka_One'] text-lg leading-tight">
                {getQuadrantDescription(mode === 'activity' ? activitySummaryPoint : selected)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E0DDD6] bg-white px-3 py-2">
              <p className="text-[12px] text-[#5F5E5A]">Distance</p>
              <p className="font-['Fredoka_One'] text-lg leading-tight">
                {distanceFromOrigin(mode === 'activity' ? activitySummaryPoint : selected).toFixed(1)} units
              </p>
            </div>
            </div>
          )}

          {!(mode === 'activity' && activityId === 'hunt') && (
          <div className="flex flex-wrap items-center gap-3 px-1 text-[15px] text-[#5F5E5A]">
          {[
            ['#7F77DD', 'I'],
            ['#D85A30', 'II'],
            ['#639922', 'III'],
            ['#378ADD', 'IV'],
          ].map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
          </div>
          )}

          {mode === 'explore' ? (
            <div className="grid min-w-0 gap-3 rounded-xl border border-[#E0DDD6] bg-white p-3 max-[760px]:col-span-2 max-[520px]:col-span-1">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[13px] text-[#5F5E5A]">x
                  <input value={manualX} onChange={(event) => setManualX(Math.round(Number(event.target.value)))} className="mt-1 w-full rounded border border-[#E0DDD6] px-2 py-1.5 text-base" type="number" min={minCoord} max={maxCoord} step="1" />
                </label>
                <label className="text-[13px] text-[#5F5E5A]">y
                  <input value={manualY} onChange={(event) => setManualY(Math.round(Number(event.target.value)))} className="mt-1 w-full rounded border border-[#E0DDD6] px-2 py-1.5 text-base" type="number" min={minCoord} max={maxCoord} step="1" />
                </label>
              </div>
              <button type="button" onClick={plotManual} className="rounded-full bg-[#7F77DD] px-4 py-2 font-black text-white">Plot</button>
              <label className="flex items-center gap-3 text-[15px] text-[#5F5E5A]">
                <button
                  type="button"
                  onClick={() => setShowReflections((value) => !value)}
                  className={`relative h-6 w-11 rounded-full transition ${showReflections ? 'bg-[#7F77DD]' : 'bg-[#E0DDD6]'}`}
                  aria-pressed={showReflections}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${showReflections ? 'left-6' : 'left-1'}`} />
                </button>
                Show mirror points across both axes
              </label>
              {showReflections && (
                <div className="flex gap-4 text-[15px] text-[#5F5E5A]">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#378ADD]" /> Flip over x-axis</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#639922]" /> Flip over y-axis</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 rounded-xl border border-[#E0DDD6] bg-white p-3 max-[760px]:col-span-2 max-[520px]:col-span-1">
              <div className="h-2 overflow-hidden rounded-full bg-[#F1EFE8]">
                <div className="h-full bg-[#7F77DD]" style={{ width: `${progress}%` }} />
              </div>
              {complete ? (
                <div className="grid gap-3 text-center">
                  <p className="font-['Fredoka_One'] text-3xl text-[#3B6D11]">Complete!</p>
                  <p className="font-black">Score: {score}/{scoreMax}</p>
                  <p>{score >= Math.ceil(scoreMax * 0.7) ? 'Trophy earned.' : 'Try again for a trophy.'}</p>
                  <button type="button" onClick={() => resetActivity(activityId)} className="rounded-full bg-[#7F77DD] px-4 py-2 font-black text-white">Play Again</button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-black uppercase text-slate-500">{activeActivity.title}</p>
                  <div className="min-w-0 rounded-xl bg-[#F1EFE8] p-3 text-base font-bold leading-snug break-words">{activityPrompt}</div>
                  {activityId === 'point' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="x" value={activityInput.x} onChange={(event) => setActivityInput({ ...activityInput, x: event.target.value })} className="rounded border border-[#E0DDD6] px-2 py-2" type="number" />
                      <input placeholder="y" value={activityInput.y} onChange={(event) => setActivityInput({ ...activityInput, y: event.target.value })} className="rounded border border-[#E0DDD6] px-2 py-2" type="number" />
                    </div>
                  )}
                  {activityId === 'hunt' && (
                    <div className="grid gap-2">
                      <input
                        placeholder="Type your answer"
                        value={activityInput.text}
                        onChange={(event) => setActivityInput({ ...activityInput, text: event.target.value })}
                        className="mx-auto w-[88%] rounded border border-[#E0DDD6] px-3 py-2 text-base"
                      />
                    </div>
                  )}
                  {activityId !== 'landmark' && (
                    <button
                      type="button"
                      onClick={checkTypedAnswer}
                      className={`${activityId === 'hunt' ? 'mx-auto w-[88%]' : 'w-full'} rounded-full bg-[#7F77DD] px-4 py-2 font-black text-white`}
                    >
                      Check
                    </button>
                  )}
                  <p className={`min-w-0 rounded-md px-2 py-1 text-sm font-bold break-words ${feedback.type === 'correct' ? 'bg-green-100 text-[#3B6D11]' : feedback.type === 'wrong' ? 'bg-red-100 text-red-700' : 'bg-[#F1EFE8]'}`}>
                    {feedback.text || 'Ready.'}
                  </p>
                </>
              )}
            </div>
          )}
        </aside>
      </main>
      </div>
    </div>
  )
}
