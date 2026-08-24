import { useCallback, useEffect, useRef, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  ink: '#1A1A2E',
  parallel: '#1E2D5A',
  transversal: '#6B7280',
  grid: '#E8E5DE',
  label: '#9CA3AF',
  angleText: '#5F6B7A',
  faintArc: '#4B5563',
  corresponding: '#7C3AED',
  alternateInterior: '#D97706',
  alternateExterior: '#059669',
  coInterior: '#DC2626',
}

const angleTypes = [
  {
    id: 'corresponding',
    label: 'Corresponding',
    sublabel: 'Equal - F shape',
    color: colors.corresponding,
    hint: 'Same corner at both crossings. They are equal.',
  },
  {
    id: 'alternateInterior',
    label: 'Alternate interior',
    sublabel: 'Equal - Z shape',
    color: colors.alternateInterior,
    hint: 'Inside the lines, opposite sides. They are equal.',
  },
  {
    id: 'alternateExterior',
    label: 'Alternate exterior',
    sublabel: 'Equal - Z shape',
    color: colors.alternateExterior,
    hint: 'Outside the lines, opposite sides. They are equal.',
  },
  {
    id: 'coInterior',
    label: 'Co-interior',
    sublabel: 'Sum to 180° - C shape',
    color: colors.coInterior,
    hint: 'Inside the lines, same side. They add to 180°.',
  },
]

const wedgePairs = {
  corresponding: [['upper', 'topLeft'], ['lower', 'topLeft']],
  alternateInterior: [['upper', 'bottomRight'], ['lower', 'topLeft']],
  alternateExterior: [['upper', 'topLeft'], ['lower', 'bottomRight']],
  coInterior: [['upper', 'bottomRight'], ['lower', 'topRight']],
}

const allWedgePairs = {
  corresponding: [
    [['upper', 'topLeft'], ['lower', 'topLeft']],
    [['upper', 'topRight'], ['lower', 'topRight']],
    [['upper', 'bottomLeft'], ['lower', 'bottomLeft']],
    [['upper', 'bottomRight'], ['lower', 'bottomRight']],
  ],
  alternateInterior: [
    [['upper', 'bottomRight'], ['lower', 'topLeft']],
    [['upper', 'bottomLeft'], ['lower', 'topRight']],
  ],
  alternateExterior: [
    [['upper', 'topLeft'], ['lower', 'bottomRight']],
    [['upper', 'topRight'], ['lower', 'bottomLeft']],
  ],
  coInterior: [
    [['upper', 'bottomRight'], ['lower', 'topRight']],
    [['upper', 'bottomLeft'], ['lower', 'topLeft']],
  ],
}

const secondPairColors = {
  corresponding: '#5B21B6',
  alternateInterior: '#92400E',
  alternateExterior: '#065F46',
  coInterior: '#7F1D1D',
}

const pairShadeColors = {
  corresponding: ['#7C3AED', '#5B21B6', '#8B5CF6', '#4C1D95'],
  alternateInterior: ['#D97706', '#92400E'],
  alternateExterior: ['#059669', '#065F46'],
  coInterior: ['#DC2626', '#7F1D1D'],
}

const getPairTotal = (typeId) => allWedgePairs[typeId].length

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeAngle(angle) {
  let next = angle
  while (next < 0) next += Math.PI * 2
  while (next >= Math.PI * 2) next -= Math.PI * 2
  return next
}

function shortestSweep(start, end) {
  const from = normalizeAngle(start)
  let to = normalizeAngle(end)
  let sweep = to - from
  if (sweep <= 0) sweep += Math.PI * 2
  if (sweep > Math.PI) {
    to = from - (Math.PI * 2 - sweep)
  }
  return { start: from, end: to }
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1)
  const x = start.x + t * dx
  const y = start.y + t * dy
  return Math.hypot(point.x - x, point.y - y)
}

function getIntersectionAtY(top, bottom, y) {
  const dy = bottom.y - top.y || 1
  const t = (y - top.y) / dy
  return {
    x: top.x + (bottom.x - top.x) * t,
    y,
  }
}

function drawSector(ctx, center, firstAngle, secondAngle, color, radius, fillAlpha = '33', strokeAlpha = 'ff') {
  const { start, end } = shortestSweep(firstAngle, secondAngle)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(center.x, center.y)
  ctx.arc(center.x, center.y, radius, start, end, false)
  ctx.closePath()
  ctx.fillStyle = `${color}${fillAlpha}`
  ctx.strokeStyle = `${color}${strokeAlpha}`
  ctx.lineWidth = 2
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawGuideArc(ctx, center, firstAngle, secondAngle) {
  const { start, end } = shortestSweep(firstAngle, secondAngle)
  const outerRadius = 29
  const innerRadius = 27

  ctx.save()
  ctx.beginPath()
  ctx.arc(center.x, center.y, outerRadius, start, end, false)
  ctx.arc(center.x, center.y, innerRadius, end, start, true)
  ctx.closePath()
  ctx.fillStyle = `${colors.faintArc}18`
  ctx.strokeStyle = `${colors.faintArc}88`
  ctx.lineWidth = 0.8
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawHandle(ctx, x, y, fillColor) {
  ctx.save()
  ctx.fillStyle = fillColor
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function labelAngle(ctx, center, angle, value, color) {
  const distance = 46
  ctx.fillStyle = color
  ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${value}°`, center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance)
}

export default function AngleRelationships() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)
  const pulseFrameRef = useRef(null)
  const countTimersRef = useRef({})
  const pairDemoTimersRef = useRef([])
  const latestPointerRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(580)
  const [lineFractions, setLineFractions] = useState({ p: 0.34, q: 0.66 })
  const [transversalFractions, setTransversalFractions] = useState({
    top: { x: 0.26, y: 0.12 },
    bottom: { x: 0.74, y: 0.88 },
  })
  const [activeTypes, setActiveTypes] = useState({
    corresponding: false,
    alternateInterior: false,
    alternateExterior: false,
    coInterior: false,
  })
  const [dragTarget, setDragTarget] = useState(null)
  const [hoverTarget, setHoverTarget] = useState(null)
  const [pairCounts, setPairCounts] = useState({
    corresponding: 0,
    alternateInterior: 0,
    alternateExterior: 0,
    coInterior: 0,
  })
  const [expandedPairType, setExpandedPairType] = useState(null)
  const [pairDemo, setPairDemo] = useState(null)
  const [pulseState, setPulseState] = useState(null)
  const [pulseNow, setPulseNow] = useState(0)

  const canvasHeight = 400

  const getGeometry = useCallback(() => {
    const width = canvasWidth
    const height = canvasHeight
    const edgePad = width * 0.05
    const lineLeft = edgePad
    const lineRight = width - edgePad
    const topY = clamp(lineFractions.p * height, height * 0.16, height * 0.72)
    const bottomY = clamp(lineFractions.q * height, topY + 60, height * 0.84)
    const topHandle = {
      x: clamp(transversalFractions.top.x * width, edgePad, width - edgePad),
      y: clamp(transversalFractions.top.y * height, height * 0.06, topY - 18),
    }
    const bottomHandle = {
      x: clamp(transversalFractions.bottom.x * width, edgePad, width - edgePad),
      y: clamp(transversalFractions.bottom.y * height, bottomY + 18, height * 0.94),
    }
    const upperIntersection = getIntersectionAtY(topHandle, bottomHandle, topY)
    const lowerIntersection = getIntersectionAtY(topHandle, bottomHandle, bottomY)
    const theta = Math.round(Math.atan2(Math.abs(bottomHandle.y - topHandle.y), Math.abs(bottomHandle.x - topHandle.x)) * 180 / Math.PI)
    const acute = clamp(theta, 1, 90)
    const obtuse = 180 - acute

    return {
      width,
      height,
      edgePad,
      lineLeft,
      lineRight,
      topY,
      bottomY,
      topHandle,
      bottomHandle,
      upperIntersection,
      lowerIntersection,
      acute,
      obtuse,
    }
  }, [canvasWidth, lineFractions, transversalFractions])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const geo = getGeometry()
    const {
      width,
      height,
      edgePad,
      lineLeft,
      lineRight,
      topY,
      bottomY,
      topHandle,
      bottomHandle,
      upperIntersection,
      lowerIntersection,
      acute,
      obtuse,
    } = geo

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = colors.page
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    const gridStep = 40
    for (let y = gridStep; y < height; y += gridStep) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    ctx.strokeStyle = colors.parallel
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(lineLeft, topY)
    ctx.lineTo(lineRight, topY)
    ctx.moveTo(lineLeft, bottomY)
    ctx.lineTo(lineRight, bottomY)
    ctx.stroke()

    ctx.fillStyle = colors.label
    ctx.font = 'italic 700 17px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('p', edgePad * 0.35, topY - 8)
    ctx.fillText('q', edgePad * 0.35, bottomY - 8)

    ctx.strokeStyle = colors.transversal
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(topHandle.x, topHandle.y)
    ctx.lineTo(bottomHandle.x, bottomHandle.y)
    ctx.stroke()

    const transAngle = Math.atan2(bottomHandle.y - topHandle.y, bottomHandle.x - topHandle.x)
    ctx.save()
    ctx.fillStyle = colors.label
    ctx.font = 'italic 700 17px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const tOffsetX = topHandle.x > width * 0.82 ? -18 : 12
    ctx.fillText('t', topHandle.x + tOffsetX, topHandle.y)
    ctx.restore()

    const upRay = normalizeAngle(transAngle + Math.PI)
    const downRay = normalizeAngle(transAngle)
    const leftRay = Math.PI
    const rightRay = 0
    const wedgeAngles = {
      topLeft: [leftRay, upRay],
      topRight: [upRay, rightRay],
      bottomLeft: [downRay, leftRay],
      bottomRight: [rightRay, downRay],
    }

    const centers = { upper: upperIntersection, lower: lowerIntersection }
    const hasActiveType = angleTypes.some((type) => activeTypes[type.id])
    const activePulse = pulseState && pulseNow - pulseState.startTime <= 400

    if (!hasActiveType) {
      Object.values(centers).forEach((center) => {
        Object.values(wedgeAngles).forEach(([firstAngle, secondAngle]) => {
          drawGuideArc(ctx, center, firstAngle, secondAngle)
        })
      })
    } else {
      const activeWedges = {}
      angleTypes.forEach((type) => {
        if (!activeTypes[type.id]) return
        if (expandedPairType === type.id) {
          const pairs = allWedgePairs[type.id]
          const visiblePairs = pairDemo?.type === type.id
            ? (pairDemo.pairIndex === null ? [] : [[pairDemo.pairIndex, pairs[pairDemo.pairIndex]]])
            : pairs.map((pair, pairIndex) => [pairIndex, pair])

          visiblePairs.forEach(([pairIndex, pair]) => {
            pair.forEach(([intersectionId, wedgeId]) => {
              const key = `${intersectionId}:${wedgeId}`
              const pairColor = pairShadeColors[type.id][pairIndex] ?? secondPairColors[type.id]
              activeWedges[key] = [...(activeWedges[key] ?? []), { ...type, color: pairColor }]
            })
          })
          return
        }

        wedgePairs[type.id].forEach(([intersectionId, wedgeId]) => {
          const key = `${intersectionId}:${wedgeId}`
          activeWedges[key] = [...(activeWedges[key] ?? []), type]
        })
      })

      Object.entries(activeWedges).forEach(([key, types]) => {
        const [intersectionId, wedgeId] = key.split(':')
        const [firstAngle, secondAngle] = wedgeAngles[wedgeId]
        const baseRadius = 28
        const radiusGap = 8
        types.forEach((type, index) => {
          const isPulseType = activePulse && pulseState.type === type.id
          const progress = isPulseType ? clamp((pulseNow - pulseState.startTime) / 400, 0, 1) : 0
          const pulseRadius = isPulseType ? 12 * Math.sin(progress * Math.PI) : 0
          const radius = baseRadius + index * radiusGap + pulseRadius
          const fillAlpha = isPulseType ? '66' : '33'
          drawSector(ctx, centers[intersectionId], firstAngle, secondAngle, type.color, radius, fillAlpha)
        })
      })
    }

    const getLabelColor = (intersectionId, wedgeId) => {
      const match = angleTypes.find((type) => (
        activeTypes[type.id]
        && (
          expandedPairType === type.id
            ? (
              pairDemo?.type === type.id
                ? (pairDemo.pairIndex === null ? [] : allWedgePairs[type.id][pairDemo.pairIndex])
                : allWedgePairs[type.id].flat()
            )
            : wedgePairs[type.id]
        )
          .some(([pairIntersection, pairWedge]) => pairIntersection === intersectionId && pairWedge === wedgeId)
      ))
      if (!match) return colors.angleText

      if (expandedPairType === match.id) {
        const pairIndex = allWedgePairs[match.id].findIndex((pair) => (
          pair.some(([pairIntersection, pairWedge]) => pairIntersection === intersectionId && pairWedge === wedgeId)
        ))
        return pairShadeColors[match.id][pairIndex] ?? match.color
      }

      return match.color
    }

    ;[
      ['upper', upperIntersection],
      ['lower', lowerIntersection],
    ].forEach(([intersectionId, center]) => {
      labelAngle(ctx, center, normalizeAngle((leftRay + upRay) / 2), acute, getLabelColor(intersectionId, 'topLeft'))
      labelAngle(ctx, center, normalizeAngle((upRay + rightRay + Math.PI * 2) / 2), obtuse, getLabelColor(intersectionId, 'topRight'))
      labelAngle(ctx, center, normalizeAngle((downRay + leftRay) / 2), obtuse, getLabelColor(intersectionId, 'bottomLeft'))
      labelAngle(ctx, center, normalizeAngle((rightRay + downRay) / 2), acute, getLabelColor(intersectionId, 'bottomRight'))

      ctx.fillStyle = colors.corresponding
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(center.x, center.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })

    drawHandle(ctx, topHandle.x, topHandle.y, colors.transversal)
    drawHandle(ctx, bottomHandle.x, bottomHandle.y, colors.transversal)
    drawHandle(ctx, edgePad, topY, colors.parallel)
    drawHandle(ctx, edgePad, bottomY, colors.parallel)

  }, [activeTypes, expandedPairType, getGeometry, pairDemo, pulseNow, pulseState])

  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const update = () => {
      setCanvasWidth(Math.max(280, Math.round(wrapper.clientWidth)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const countTimers = countTimersRef.current
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (pulseFrameRef.current) cancelAnimationFrame(pulseFrameRef.current)
      Object.values(countTimers).flat().forEach((timerId) => clearTimeout(timerId))
      pairDemoTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    }
  }, [])

  useEffect(() => {
    if (!pulseState) return undefined

    const animatePulse = (now) => {
      setPulseNow(now)
      if (now - pulseState.startTime < 400) {
        pulseFrameRef.current = requestAnimationFrame(animatePulse)
        return
      }
      pulseFrameRef.current = null
      setPulseState(null)
    }

    pulseFrameRef.current = requestAnimationFrame(animatePulse)
    return () => {
      if (pulseFrameRef.current) cancelAnimationFrame(pulseFrameRef.current)
      pulseFrameRef.current = null
    }
  }, [pulseState])

  const getCanvasPoint = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvasWidth / rect.width),
      y: (event.clientY - rect.top) * (canvasHeight / rect.height),
    }
  }, [canvasWidth])

  const getHitTarget = useCallback((point) => {
    const geo = getGeometry()
    const handles = [
      { id: 'topTransversal', x: geo.topHandle.x, y: geo.topHandle.y },
      { id: 'bottomTransversal', x: geo.bottomHandle.x, y: geo.bottomHandle.y },
      { id: 'lineP', x: geo.edgePad, y: geo.topY },
      { id: 'lineQ', x: geo.edgePad, y: geo.bottomY },
    ]
    const handle = handles.find((item) => Math.hypot(item.x - point.x, item.y - point.y) <= 16)
    if (handle) return handle.id

    if (pointToSegmentDistance(point, geo.topHandle, geo.bottomHandle) <= 10) {
      return point.y < (geo.topY + geo.bottomY) / 2 ? 'topTransversal' : 'bottomTransversal'
    }

    return null
  }, [getGeometry])

  const scheduleDrag = useCallback((target, point) => {
    latestPointerRef.current = { target, point }
    if (frameRef.current) return

    frameRef.current = requestAnimationFrame(() => {
      const latest = latestPointerRef.current
      frameRef.current = null
      if (!latest) return

      const geo = getGeometry()
      if (latest.target === 'lineP') {
        const nextY = clamp(latest.point.y, canvasHeight * 0.16, geo.bottomY - 60)
        setLineFractions((current) => ({ ...current, p: nextY / canvasHeight }))
      }
      if (latest.target === 'lineQ') {
        const nextY = clamp(latest.point.y, geo.topY + 60, canvasHeight * 0.84)
        setLineFractions((current) => ({ ...current, q: nextY / canvasHeight }))
      }
      if (latest.target === 'topTransversal') {
        const nextX = clamp(latest.point.x, geo.edgePad, canvasWidth - geo.edgePad)
        const nextY = clamp(latest.point.y, canvasHeight * 0.06, geo.topY - 18)
        setTransversalFractions((current) => ({ ...current, top: { x: nextX / canvasWidth, y: nextY / canvasHeight } }))
      }
      if (latest.target === 'bottomTransversal') {
        const nextX = clamp(latest.point.x, geo.edgePad, canvasWidth - geo.edgePad)
        const nextY = clamp(latest.point.y, geo.bottomY + 18, canvasHeight * 0.94)
        setTransversalFractions((current) => ({ ...current, bottom: { x: nextX / canvasWidth, y: nextY / canvasHeight } }))
      }
    })
  }, [canvasWidth, getGeometry])

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event)
    const target = getHitTarget(point)
    if (!target) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragTarget(target)
    scheduleDrag(target, point)
  }

  const handlePointerMove = (event) => {
    const point = getCanvasPoint(event)
    if (dragTarget) {
      scheduleDrag(dragTarget, point)
      return
    }
    setHoverTarget(getHitTarget(point))
  }

  const stopDragging = () => {
    setDragTarget(null)
    latestPointerRef.current = null
  }

  const toggleAngleType = (typeId) => {
    setActiveTypes((current) => {
      const nextChecked = !current[typeId]
      const existingTimers = countTimersRef.current[typeId] ?? []
      existingTimers.forEach((timerId) => clearTimeout(timerId))

      if (nextChecked) {
        const now = performance.now()
        const pairTotal = getPairTotal(typeId)
        setPairCounts((counts) => ({ ...counts, [typeId]: 0 }))
        setPulseNow(now)
        setPulseState({ type: typeId, startTime: now })
        countTimersRef.current[typeId] = Array.from({ length: pairTotal }, (_, index) => (
          setTimeout(() => {
            setPairCounts((counts) => ({ ...counts, [typeId]: index + 1 }))
          }, 80 * (index + 1))
        ))
      } else {
        setExpandedPairType((current) => current === typeId ? null : current)
        setPairDemo((current) => current?.type === typeId ? null : current)
        countTimersRef.current[typeId] = [
          setTimeout(() => {
            setPairCounts((counts) => ({ ...counts, [typeId]: 0 }))
            countTimersRef.current[typeId] = []
          }, 150),
        ]
      }

      return { ...current, [typeId]: nextChecked }
    })
  }

  const showAllPairs = (event, typeId) => {
    event.stopPropagation()
    pairDemoTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    pairDemoTimersRef.current = []

    requestAnimationFrame(() => {
      const now = performance.now()
      setPulseNow(now)
      setPulseState({ type: typeId, startTime: now })
    })
    setExpandedPairType(typeId)
    setPairDemo({ type: typeId, pairIndex: 0 })
    const timers = []
    let delay = 700
    for (let pairIndex = 1; pairIndex < getPairTotal(typeId); pairIndex += 1) {
      timers.push(setTimeout(() => {
        setPairDemo({ type: typeId, pairIndex: null })
      }, delay))
      delay += 220
      timers.push(setTimeout(() => {
        setPairDemo({ type: typeId, pairIndex })
        requestAnimationFrame(() => {
          const now = performance.now()
          setPulseNow(now)
          setPulseState({ type: typeId, startTime: now })
        })
      }, delay))
      delay += 700
    }
    pairDemoTimersRef.current = timers
    if (!activeTypes[typeId]) toggleAngleType(typeId)
  }

  const clearAll = () => {
    pairDemoTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    pairDemoTimersRef.current = []
    Object.values(countTimersRef.current).flat().forEach((timerId) => clearTimeout(timerId))
    countTimersRef.current = {}
    setActiveTypes({
      corresponding: false,
      alternateInterior: false,
      alternateExterior: false,
      coInterior: false,
    })
    setPairCounts({
      corresponding: 0,
      alternateInterior: 0,
      alternateExterior: 0,
      coInterior: 0,
    })
    setExpandedPairType(null)
    setPairDemo(null)
    setPulseState(null)
  }

  const checkedType = angleTypes.find((type) => activeTypes[type.id])
  const instructionTitle = checkedType ? "What's the rule?" : 'Try this'
  const instructionText = checkedType
    ? `${checkedType.hint} Press the pair button to see the pairs.`
    : 'Drag the lines, then click an angle row. Press the pair button to see the pairs.'

  return (
    <div className="h-full overflow-auto bg-[#F8F6F0] p-3 font-['Inter'] text-[#1A1A2E]">
      <style>
        {`
          @keyframes popIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 min-[560px]:h-[400px] min-[560px]:flex-row">
          <div ref={wrapRef} className="h-[400px] min-w-[280px] flex-1 overflow-hidden rounded-xl border border-[#E0DDD6] bg-white">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className={`h-full w-full touch-none ${dragTarget ? 'cursor-grabbing' : hoverTarget ? 'cursor-grab' : 'cursor-default'}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onPointerLeave={() => {
                if (!dragTarget) setHoverTarget(null)
              }}
            />
          </div>

          <aside className="w-full shrink-0 min-[560px]:w-[240px]">
          <section className="flex h-full flex-col rounded-xl border border-[#E0DDD6] bg-white p-3">
            <h2 className="mb-3 text-sm font-black">Show angles</h2>
            <div className="flex-1 space-y-3">
              {angleTypes.map((type) => {
                const checked = activeTypes[type.id]
                return (
                  <div
                    key={type.id}
                    className="grid w-full grid-cols-[14px_minmax(0,1fr)_52px] items-start gap-3 rounded-lg p-2 text-left hover:bg-[#F8F6F0]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAngleType(type.id)}
                      className="contents text-left"
                    >
                      <span
                        className="mt-0.5 h-[14px] w-[14px] shrink-0 rounded-[3px]"
                        style={{ backgroundColor: type.color, opacity: checked ? 1 : 0.3 }}
                      />
                      <span className="min-w-0 pr-1">
                        <span className="block text-[13px] font-bold leading-tight">{type.label}</span>
                        <span className="block text-[11px] leading-tight text-[#6B7280]">{type.sublabel}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!checked}
                      onClick={(event) => showAllPairs(event, type.id)}
                      aria-label={`Show all ${type.label} pairs`}
                      className="w-[52px] justify-self-end whitespace-nowrap text-center text-[10px] leading-none"
                      style={{
                        padding: '3px 5px',
                        borderRadius: 20,
                        backgroundColor: `${type.color}26`,
                        color: type.color,
                        border: `0.5px solid ${type.color}`,
                        opacity: checked ? 1 : 0,
                        transform: checked ? 'scale(1)' : 'scale(0)',
                        transition: checked ? undefined : 'opacity 150ms ease-out',
                        animation: checked ? 'popIn 200ms ease-out' : undefined,
                        boxShadow: expandedPairType === type.id ? `0 0 0 2px ${type.color}26` : 'none',
                        cursor: checked ? 'pointer' : 'default',
                      }}
                    >
                      {pairCounts[type.id]} pairs
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 w-full rounded-full border border-[#E0DDD6] px-3 py-2 text-xs font-black text-[#5F6B7A] hover:bg-[#F8F6F0]"
            >
              Clear all
            </button>
          </section>
          </aside>
        </div>

        <section className="rounded-xl border border-[#E0DDD6] bg-white px-4 py-2.5">
          <p className="text-sm leading-relaxed text-[#6B7280]">
            <span className="font-black text-[#1A1A2E]">{instructionTitle}: </span>
            {instructionText}
          </p>
        </section>
      </div>
    </div>
  )
}
