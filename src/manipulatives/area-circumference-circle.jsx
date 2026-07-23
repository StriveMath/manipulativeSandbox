import { useEffect, useMemo, useRef, useState } from 'react'

const sectorChoices = [8, 12, 16, 24]
const circumferenceSegmentCount = 48
const areaStageViewBox = { width: 420, height: 290 }
const getAreaSectorStagger = (sectorCount) => Math.max(24, Math.min(54, 520 / Math.max(1, sectorCount - 1)))
const circlePlot = { left: 30, top: 14, size: 260, cell: 26 }
const circleCenter = {
  x: circlePlot.left + circlePlot.size / 2,
  y: circlePlot.top + circlePlot.size / 2,
}

const clampRadius = (value) => Math.min(4, Math.max(1, Math.round(value * 2) / 2))
const formatNumber = (value) => Number(value.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatDecimal = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const piTerm = (coefficient) => `${Math.abs(coefficient - 1) < 0.0001 ? '' : formatNumber(coefficient)}π`

const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
})

const sectorPath = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarPoint(cx, cy, radius, startAngle)
  const end = polarPoint(cx, cy, radius, endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

const getAreaLayout = (sectorCount) => {
  const targetRadius = 58
  const angle = (Math.PI * 2) / sectorCount
  const chord = 2 * targetRadius * Math.sin(angle / 2)
  const pairs = sectorCount / 2
  const totalWidth = chord * (pairs + 0.5)
  const startX = (areaStageViewBox.width - totalWidth) / 2
  const topPointY = 42
  const bottomPointY = topPointY + targetRadius

  return {
    angle,
    bottomPointY,
    chord,
    startX,
    targetRadius,
    topPointY,
    totalWidth,
    targets: Array.from({ length: sectorCount }, (_, index) => {
      const pair = Math.floor(index / 2)
      const isBottom = index % 2 === 1
      return {
        rotation: isBottom ? 180 : 0,
        x: startX + chord / 2 + pair * chord + (isBottom ? chord / 2 : 0),
        y: isBottom ? topPointY : bottomPointY,
      }
    }),
  }
}

function CircleGrid({ activeModel, areaPhase, areaSourceRef, radius, sectorCount, setRadius, animationId, circumferenceSourceRef }) {
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const pixelRadius = radius * circlePlot.cell
  const handleX = circleCenter.x + pixelRadius

  const updateFromPointer = (event) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    setRadius(clampRadius((local.x - circleCenter.x) / circlePlot.cell))
  }

  const startDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    updateFromPointer(event)
  }

  const moveDrag = (event) => {
    if (!dragging) return
    updateFromPointer(event)
  }

  const finishDrag = (event) => {
    if (!dragging) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setRadius(clampRadius(radius + 0.5))
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setRadius(clampRadius(radius - 0.5))
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setRadius(1)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setRadius(4)
    }
  }

  const areaSectors = activeModel === 'area'
    ? Array.from({ length: sectorCount }, (_, index) => {
        const start = -Math.PI / 2 + (index * Math.PI * 2) / sectorCount
        const end = -Math.PI / 2 + ((index + 1) * Math.PI * 2) / sectorCount
        return (
          <path
            className="circle-source-sector"
            d={sectorPath(circleCenter.x, circleCenter.y, pixelRadius, start, end)}
            fill={index % 2 ? '#bfdbfe' : '#7dd3fc'}
            key={`${animationId}-${index}`}
            stroke="white"
            strokeWidth="1.1"
            style={{ '--circle-delay': `${index * 22}ms` }}
          />
        )
      })
    : null

  return (
    <svg
      aria-label={`Circle with radius ${formatNumber(radius)} units and diameter ${formatNumber(radius * 2)} units`}
      className="h-full w-full select-none"
      ref={svgRef}
      role="img"
      viewBox="0 0 320 300"
    >
      <rect fill="#f8fafc" height="260" rx="4" stroke="#cbd5e1" width="260" x="30" y="14" />
      {Array.from({ length: 11 }, (_, index) => {
        const position = circlePlot.left + index * circlePlot.cell
        return (
          <g key={`grid-${index}`}>
            <line stroke={index === 5 ? '#94a3b8' : '#dbeafe'} strokeWidth={index === 5 ? 1.5 : 1} x1={position} x2={position} y1="14" y2="274" />
            <line stroke={index === 5 ? '#94a3b8' : '#dbeafe'} strokeWidth={index === 5 ? 1.5 : 1} x1="30" x2="290" y1={position - 16} y2={position - 16} />
            {index % 2 === 0 && <text fill="#64748b" fontSize="8" fontWeight="800" textAnchor="middle" x={position} y="289">{index}</text>}
            {index % 2 === 0 && <text fill="#64748b" fontSize="8" fontWeight="800" textAnchor="end" x="24" y={278 - index * circlePlot.cell}>{index}</text>}
          </g>
        )
      })}

      <circle cx={circleCenter.x} cy={circleCenter.y} fill="#e0f2fe" r={pixelRadius} ref={areaSourceRef} stroke="none" />
      {areaSectors}
      <circle
        className={activeModel === 'circumference' ? 'circle-circumference-trace' : ''}
        cx={circleCenter.x}
        cy={circleCenter.y}
        fill="none"
        key={`circumference-${animationId}`}
        pathLength="1"
        r={pixelRadius}
        ref={circumferenceSourceRef}
        stroke="#7c3aed"
        strokeWidth="5"
      />
      {activeModel === 'area' && (areaPhase === 'lift' || areaPhase === 'transfer') && (
        <circle className="circle-area-source-lift" cx={circleCenter.x} cy={circleCenter.y} fill="none" r={pixelRadius + 7} stroke="#0ea5e9" strokeWidth="3" />
      )}
      <line stroke="#059669" strokeDasharray="5 3" strokeWidth="3" x1={circleCenter.x - pixelRadius} x2={circleCenter.x + pixelRadius} y1={circleCenter.y} y2={circleCenter.y} />
      <line stroke="#047857" strokeWidth="4" x1={circleCenter.x} x2={handleX} y1={circleCenter.y} y2={circleCenter.y} />
      <circle cx={circleCenter.x} cy={circleCenter.y} fill="#047857" r="5" />
      <text className="circle-measure-label" fill="#047857" fontSize="12" fontWeight="900" textAnchor="middle" x={(circleCenter.x + handleX) / 2} y={circleCenter.y - 10}>r = {formatNumber(radius)}</text>
      <text className="circle-measure-label" fill="#047857" fontSize="12" fontWeight="900" textAnchor="middle" x={circleCenter.x} y={circleCenter.y + 20}>d = {formatNumber(radius * 2)}</text>

      <g
        aria-label="Adjust radius"
        aria-valuemax="4"
        aria-valuemin="1"
        aria-valuenow={radius}
        className="cursor-ew-resize outline-none"
        onKeyDown={handleKeyDown}
        onPointerCancel={finishDrag}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        role="slider"
        tabIndex="0"
      >
        <circle cx={handleX} cy={circleCenter.y} fill="transparent" r="18" />
        <circle className="circle-radius-handle" cx={handleX} cy={circleCenter.y} fill="#10b981" r="9" stroke="white" strokeWidth="3" />
      </g>
    </svg>
  )
}

function CircumferenceTransferOverlay({ animationId, geometry }) {
  if (!geometry) return null

  const targetWidth = geometry.targetRight - geometry.targetLeft
  const sourceSegmentLength = (Math.PI * 2 * geometry.sourceRadius) / circumferenceSegmentCount
  const targetSegmentLength = targetWidth / circumferenceSegmentCount
  const temporaryWidth = Math.min(targetWidth * 0.72, 250)
  const temporaryLeft = Math.max(12, geometry.sourceX - temporaryWidth / 2)
  const temporaryY = Math.min(geometry.height - 94, geometry.sourceY + geometry.sourceRadius + 24)

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
      key={`circumference-transfer-${animationId}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
    >
      <circle
        className="circle-transfer-disc"
        cx={geometry.sourceX}
        cy={geometry.sourceY}
        fill="#ede9fe"
        r={geometry.sourceRadius}
        stroke="#7c3aed"
        strokeWidth="5"
      />
      {Array.from({ length: circumferenceSegmentCount }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / circumferenceSegmentCount
        const sourceX = geometry.sourceX + geometry.sourceRadius * Math.cos(angle)
        const sourceY = geometry.sourceY + geometry.sourceRadius * Math.sin(angle)
        const temporaryX = temporaryLeft + (index + 0.5) * (temporaryWidth / circumferenceSegmentCount)
        const targetX = geometry.targetLeft + (index + 0.5) * targetSegmentLength

        return (
          <line
            className="circle-circumference-segment-flight"
            key={`${animationId}-${index}`}
            stroke="#7c3aed"
            strokeLinecap="round"
            strokeWidth="7"
            style={{
              '--circle-source-x': `${sourceX}px`,
              '--circle-source-y': `${sourceY}px`,
              '--circle-source-angle': `${(angle * 180) / Math.PI + 90}deg`,
              '--circle-source-length': sourceSegmentLength,
              '--circle-temporary-x': `${temporaryX}px`,
              '--circle-temporary-y': `${temporaryY}px`,
              '--circle-temporary-length': temporaryWidth / circumferenceSegmentCount,
              '--circle-target-x': `${targetX}px`,
              '--circle-target-y': `${geometry.targetY}px`,
              '--circle-target-length': targetSegmentLength,
              '--circle-delay': `${index * 5}ms`,
            }}
            x1="-0.5"
            x2="0.5"
            y1="0"
            y2="0"
          />
        )
      })}
    </svg>
  )
}

function CircumferenceStage({ circumference, diameter, reveal, ribbonTargetRef, showMeasurements }) {
  const ribbonLeft = 34
  const ribbonWidth = 352
  const diameterWidth = ribbonWidth / Math.PI
  const remainderWidth = ribbonWidth - diameterWidth * 3
  const remainderValue = circumference - diameter * 3
  const exactCircumference = piTerm(diameter)
  const measurementTerms = [diameter, diameter, diameter, remainderValue]

  return (
    <svg aria-label="Circumference unrolled and measured with diameters" className="h-full w-full" viewBox="0 0 420 290">
      <rect fill="transparent" height="16" ref={ribbonTargetRef} width={ribbonWidth} x={ribbonLeft} y="78" />
      <g className={showMeasurements ? 'circle-circumference-land' : 'opacity-0'}>
        <text fill="#6d28d9" fontSize="17" fontWeight="900" textAnchor="middle" x="210" y="60">
          C = {exactCircumference} ≈ {formatDecimal(circumference)} units
        </text>
        <line stroke="#7c3aed" strokeLinecap="round" strokeWidth="9" x1={ribbonLeft} x2={ribbonLeft + ribbonWidth} y1="86" y2="86" />
      </g>

      {showMeasurements && (
        <>
          {[0, 1, 2].map((index) => (
            <g className="circle-diameter-strip" key={`diameter-${index}`} style={{ '--circle-delay': `${index * 190}ms` }}>
              <rect fill="#d1fae5" height="38" rx="4" stroke="#059669" strokeWidth="2" width={diameterWidth} x={ribbonLeft + index * diameterWidth} y="115" />
              <text fill="#047857" fontSize="11" fontWeight="900" textAnchor="middle" x={ribbonLeft + (index + 0.5) * diameterWidth} y="139">d = {formatNumber(diameter)} units</text>
            </g>
          ))}
          <g className="circle-diameter-strip" style={{ '--circle-delay': '570ms' }}>
            <rect fill="#fef3c7" height="38" rx="4" stroke="#d97706" strokeWidth="2" width={remainderWidth} x={ribbonLeft + 3 * diameterWidth} y="115" />
            <line stroke="#d97706" strokeWidth="1.5" x1={ribbonLeft + 3 * diameterWidth + remainderWidth / 2} x2={ribbonLeft + 3 * diameterWidth + remainderWidth / 2} y1="108" y2="115" />
            <text className="circle-measure-label" fill="#b45309" fontSize="9" fontWeight="900" textAnchor="end" x={ribbonLeft + ribbonWidth} y="105">≈ {formatNumber(remainderValue)} units</text>
          </g>
        </>
      )}

      <g className={reveal ? 'circle-transform-result' : 'opacity-0'}>
        <rect fill="#f5f3ff" height="74" rx="7" stroke="#c4b5fd" width="352" x="34" y="178" />
        <text fill="#475569" fontSize="14" fontWeight="900" textAnchor="middle" x="210" y="205">
          {measurementTerms.map(formatNumber).join(' + ')}
        </text>
        <text fill="#6d28d9" fontSize="22" fontWeight="900" textAnchor="middle" x="210" y="235">≈ {formatDecimal(circumference)} units</text>
      </g>
    </svg>
  )
}

function AreaSectorTransferOverlay({ animationId, geometry, sectorCount }) {
  if (!geometry) return null

  const angle = (Math.PI * 2) / sectorCount
  const halfAngle = angle / 2
  const stagger = getAreaSectorStagger(sectorCount)
  const normalizedSector = sectorPath(0, 0, 1, -Math.PI / 2 - halfAngle, -Math.PI / 2 + halfAngle)

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
      key={`area-transfer-${animationId}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
    >
      {geometry.targets.map((target, index) => {
        const sourceRotation = ((index + 0.5) * 360) / sectorCount
        const centerAngle = -Math.PI / 2 + ((index + 0.5) * Math.PI * 2) / sectorCount
        const liftDistance = Math.min(14, geometry.sourceRadius * 0.14)
        const liftX = geometry.sourceX + Math.cos(centerAngle) * liftDistance
        const liftY = geometry.sourceY + Math.sin(centerAngle) * liftDistance
        const middleX = (liftX + target.x) / 2
        const middleY = Math.max(72, Math.min(liftY, target.y) - 42)
        const sourceFill = index % 2 ? '#bfdbfe' : '#7dd3fc'
        const targetFill = index % 2 ? '#2563eb' : '#0ea5e9'

        return (
          <path
            className="circle-area-sector-flight"
            d={normalizedSector}
            key={`${animationId}-${index}`}
            stroke="white"
            strokeWidth={1 / Math.max(1, geometry.targetRadius)}
            style={{
              '--circle-delay': `${Math.round(index * stagger)}ms`,
              '--circle-lift-scale': geometry.sourceRadius * 1.045,
              '--circle-lift-x': `${liftX}px`,
              '--circle-lift-y': `${liftY}px`,
              '--circle-middle-scale': Math.max(geometry.targetRadius, geometry.sourceRadius * 0.82),
              '--circle-middle-x': `${middleX}px`,
              '--circle-middle-y': `${middleY}px`,
              '--circle-source-fill': sourceFill,
              '--circle-source-rotation': `${sourceRotation}deg`,
              '--circle-source-scale': geometry.sourceRadius,
              '--circle-source-x': `${geometry.sourceX}px`,
              '--circle-source-y': `${geometry.sourceY}px`,
              '--circle-target-fill': targetFill,
              '--circle-target-rotation': `${target.rotation}deg`,
              '--circle-target-scale': geometry.targetRadius,
              '--circle-target-scale-large': geometry.targetRadius * 1.035,
              '--circle-target-scale-small': geometry.targetRadius * 0.96,
              '--circle-target-x': `${target.x}px`,
              '--circle-target-y': `${target.y}px`,
            }}
          />
        )
      })}
    </svg>
  )
}

function AreaStage({ area, areaPhase, radius, sectorCount, targetSvgRef }) {
  const layout = getAreaLayout(sectorCount)
  const showArranged = ['settle', 'dimensions', 'calculate', 'complete'].includes(areaPhase)
  const showDimensions = ['dimensions', 'calculate', 'complete'].includes(areaPhase)
  const showCalculation = ['calculate', 'complete'].includes(areaPhase)
  const radiusSquared = radius * radius

  return (
    <svg
      aria-label={`${sectorCount} circle sectors rearranged to show the area formula`}
      className="h-full w-full"
      ref={targetSvgRef}
      viewBox={`0 0 ${areaStageViewBox.width} ${areaStageViewBox.height}`}
    >
      <defs>
        <marker id="circle-area-dimension-arrow" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3">
          <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
        </marker>
      </defs>

      {!showArranged && (
        <text fill="#64748b" fontSize="12" fontWeight="800" textAnchor="middle" x="210" y="25">
          {areaPhase === 'slice' ? `Dividing the circle into ${sectorCount} equal sectors` : 'Moving the sectors into a new arrangement'}
        </text>
      )}

      <g className={showArranged ? 'circle-area-arranged-settle' : 'opacity-0'}>
        {layout.targets.map((target, index) => (
          <g key={`arranged-${sectorCount}-${index}`} transform={`translate(${target.x} ${target.y}) rotate(${target.rotation})`}>
            <path
              d={sectorPath(0, 0, layout.targetRadius, -Math.PI / 2 - layout.angle / 2, -Math.PI / 2 + layout.angle / 2)}
              fill={index % 2 ? '#2563eb' : '#0ea5e9'}
              stroke="white"
              strokeWidth="1"
            />
          </g>
        ))}
      </g>

      <g className={showDimensions ? 'circle-area-dimensions' : 'opacity-0'}>
        <line markerEnd="url(#circle-area-dimension-arrow)" markerStart="url(#circle-area-dimension-arrow)" stroke="#64748b" strokeWidth="2" x1={layout.startX} x2={layout.startX + layout.totalWidth} y1="124" y2="124" />
        <text className="circle-measure-label" fill="#92400e" fontSize="12" fontWeight="900" textAnchor="middle" x="210" y="143">base ≈ πr = {formatNumber(Math.PI * radius)} units</text>
        <line markerEnd="url(#circle-area-dimension-arrow)" markerStart="url(#circle-area-dimension-arrow)" stroke="#64748b" strokeWidth="2" x1={layout.startX - 13} x2={layout.startX - 13} y1={layout.topPointY} y2={layout.bottomPointY} />
        <text className="circle-measure-label" fill="#047857" fontSize="12" fontWeight="900" textAnchor="middle" transform={`rotate(-90 ${layout.startX - 27} ${(layout.topPointY + layout.bottomPointY) / 2})`} x={layout.startX - 27} y={(layout.topPointY + layout.bottomPointY) / 2}>r = {formatNumber(radius)} units</text>
      </g>

      <g className={showCalculation ? `circle-area-calculation ${areaPhase === 'complete' ? 'circle-area-complete-glow' : ''}` : 'opacity-0'}>
        <rect fill="#eff6ff" height="126" rx="8" stroke="#93c5fd" width="352" x="34" y="154" />
        <text className="circle-area-calculation-step" fill="#0369a1" fontSize="15" fontWeight="900" textAnchor="middle" x="210" y="178">A = πr²</text>
        <text className="circle-area-calculation-step" fill="#0369a1" fontSize="15" fontWeight="900" style={{ '--circle-delay': '260ms' }} textAnchor="middle" x="210" y="204">A = π × {formatNumber(radius)}²</text>
        <text className="circle-area-calculation-step" fill="#1d4ed8" fontSize="18" fontWeight="900" style={{ '--circle-delay': '520ms' }} textAnchor="middle" x="210" y="232">A = {piTerm(radiusSquared)}</text>
        <text className="circle-area-calculation-step" fill="#075985" fontSize="19" fontWeight="900" style={{ '--circle-delay': '780ms' }} textAnchor="middle" x="210" y="263">A ≈ {formatDecimal(area)} square units</text>
      </g>
    </svg>
  )
}

function IdleStage({ radius }) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 p-5">
      <div className="flex flex-col items-center justify-center rounded border border-violet-200 bg-violet-50 text-center">
        <div className="mb-3 h-20 w-20 rounded-full border-[7px] border-violet-500 bg-white shadow-sm" />
        <div className="text-[11px] font-black uppercase text-violet-700">Circumference</div>
        <div className="mt-1 text-2xl font-black text-violet-800">C = πd</div>
        <div className="text-xs font-bold text-slate-500">d = {formatNumber(radius * 2)}</div>
      </div>
      <div className="flex flex-col items-center justify-center rounded border border-sky-200 bg-sky-50 text-center">
        <div className="mb-3 h-20 w-20 rounded-full border-4 border-sky-500 bg-sky-300/60 shadow-sm" />
        <div className="text-[11px] font-black uppercase text-sky-700">Area</div>
        <div className="mt-1 text-2xl font-black text-sky-800">A = πr²</div>
        <div className="text-xs font-bold text-slate-500">r = {formatNumber(radius)}</div>
      </div>
    </div>
  )
}

export default function AreaCircumferenceCircle() {
  const rootRef = useRef(null)
  const circumferenceSourceRef = useRef(null)
  const circumferenceTargetRef = useRef(null)
  const areaSourceRef = useRef(null)
  const areaTargetSvgRef = useRef(null)
  const timersRef = useRef([])
  const [radius, setRadiusState] = useState(2)
  const [sectorCount, setSectorCount] = useState(12)
  const [activeModel, setActiveModel] = useState('idle')
  const [animationId, setAnimationId] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [circumferencePhase, setCircumferencePhase] = useState('idle')
  const [transferGeometry, setTransferGeometry] = useState(null)
  const [areaPhase, setAreaPhase] = useState('idle')
  const [areaTransferGeometry, setAreaTransferGeometry] = useState(null)

  const diameter = radius * 2
  const circumference = Math.PI * diameter
  const area = Math.PI * radius * radius

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }

  const schedule = (callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  const measureCircumferenceTransfer = () => {
    const root = rootRef.current
    const source = circumferenceSourceRef.current
    const target = circumferenceTargetRef.current
    if (!root || !source || !target) return null

    const rootRect = root.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const scaleX = rootRect.width / root.offsetWidth || 1
    const scaleY = rootRect.height / root.offsetHeight || 1

    return {
      width: root.offsetWidth,
      height: root.offsetHeight,
      sourceX: (sourceRect.left + sourceRect.width / 2 - rootRect.left) / scaleX,
      sourceY: (sourceRect.top + sourceRect.height / 2 - rootRect.top) / scaleY,
      sourceRadius: Math.min(sourceRect.width / scaleX, sourceRect.height / scaleY) / 2,
      targetLeft: (targetRect.left - rootRect.left) / scaleX,
      targetRight: (targetRect.right - rootRect.left) / scaleX,
      targetY: (targetRect.top + targetRect.height / 2 - rootRect.top) / scaleY,
    }
  }

  const measureAreaTransfer = (count) => {
    const root = rootRef.current
    const source = areaSourceRef.current
    const targetSvg = areaTargetSvgRef.current
    const matrix = targetSvg?.getScreenCTM()
    if (!root || !source || !targetSvg || !matrix) return null

    const rootRect = root.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const scaleX = rootRect.width / root.offsetWidth || 1
    const scaleY = rootRect.height / root.offsetHeight || 1
    const layout = getAreaLayout(count)

    const pointToRoot = (x, y) => {
      const point = targetSvg.createSVGPoint()
      point.x = x
      point.y = y
      const screenPoint = point.matrixTransform(matrix)
      return {
        x: (screenPoint.x - rootRect.left) / scaleX,
        y: (screenPoint.y - rootRect.top) / scaleY,
      }
    }

    const targetOrigin = pointToRoot(0, 0)
    const targetRadiusPoint = pointToRoot(layout.targetRadius, 0)

    return {
      height: root.offsetHeight,
      sourceRadius: Math.min(sourceRect.width / scaleX, sourceRect.height / scaleY) / 2,
      sourceX: (sourceRect.left + sourceRect.width / 2 - rootRect.left) / scaleX,
      sourceY: (sourceRect.top + sourceRect.height / 2 - rootRect.top) / scaleY,
      targetRadius: Math.hypot(targetRadiusPoint.x - targetOrigin.x, targetRadiusPoint.y - targetOrigin.y),
      targets: layout.targets.map((target) => ({
        ...pointToRoot(target.x, target.y),
        rotation: target.rotation,
      })),
      width: root.offsetWidth,
    }
  }

  const clearTransformation = () => {
    clearTimers()
    setActiveModel('idle')
    setIsAnimating(false)
    setReveal(false)
    setCircumferencePhase('idle')
    setTransferGeometry(null)
    setAreaPhase('idle')
    setAreaTransferGeometry(null)
  }

  const setRadius = (nextRadius) => {
    const next = clampRadius(nextRadius)
    if (next === radius) return
    clearTransformation()
    setRadiusState(next)
  }

  const runTransformation = (model, requestedSectorCount = sectorCount) => {
    clearTimers()
    setActiveModel(model)
    setAnimationId((current) => current + 1)
    setReveal(false)
    setTransferGeometry(null)
    setAreaTransferGeometry(null)
    if (reducedMotion) {
      setIsAnimating(false)
      setReveal(true)
      setCircumferencePhase(model === 'circumference' ? 'complete' : 'idle')
      setAreaPhase(model === 'area' ? 'complete' : 'idle')
      return
    }
    setIsAnimating(true)
    if (model === 'circumference') {
      setAreaPhase('idle')
      setCircumferencePhase('trace')
      schedule(() => {
        const geometry = measureCircumferenceTransfer()
        if (!geometry) {
          setCircumferencePhase('complete')
          setReveal(true)
          setIsAnimating(false)
          return
        }
        setTransferGeometry(geometry)
        setCircumferencePhase('transfer')
      }, 620)
      schedule(() => setCircumferencePhase('measure'), 2700)
      schedule(() => {
        setCircumferencePhase('complete')
        setIsAnimating(false)
        setReveal(true)
      }, 3900)
      return
    }

    setCircumferencePhase('idle')
    setAreaPhase('slice')
    schedule(() => setAreaPhase('lift'), 650)
    schedule(() => {
      const geometry = measureAreaTransfer(requestedSectorCount)
      if (!geometry) {
        setAreaPhase('complete')
        setReveal(true)
        setIsAnimating(false)
        return
      }
      setAreaTransferGeometry(geometry)
      setAreaPhase('transfer')
    }, 950)
    const finalSectorLanding = 950 + 1850 + (requestedSectorCount - 1) * getAreaSectorStagger(requestedSectorCount)
    schedule(() => setAreaPhase('settle'), finalSectorLanding + 70)
    schedule(() => setAreaPhase('dimensions'), finalSectorLanding + 370)
    schedule(() => setAreaPhase('calculate'), finalSectorLanding + 740)
    schedule(() => {
      setAreaPhase('complete')
      setIsAnimating(false)
      setReveal(true)
    }, finalSectorLanding + 1920)
  }

  const changeSectors = (nextCount) => {
    setSectorCount(nextCount)
    if (activeModel === 'area') runTransformation('area', nextCount)
  }

  const reset = () => {
    clearTimers()
    setRadiusState(2)
    setSectorCount(12)
    setActiveModel('idle')
    setAnimationId((current) => current + 1)
    setIsAnimating(false)
    setReveal(false)
    setCircumferencePhase('idle')
    setTransferGeometry(null)
    setAreaPhase('idle')
    setAreaTransferGeometry(null)
  }

  const formulaContent = useMemo(() => {
    if (activeModel === 'circumference') {
      return {
        label: 'Circumference',
        exact: `C = πd = 2πr = ${piTerm(diameter)} units`,
        approximate: `C ≈ ${formatDecimal(circumference)} units`,
        observation: 'The circumference is a little more than 3 diameters long.',
        tone: 'violet',
      }
    }
    if (activeModel === 'area') {
      return {
        label: 'Area',
        exact: `A = πr² = ${piTerm(radius * radius)} square units`,
        approximate: `A ≈ ${formatDecimal(area)} square units`,
        observation: 'More sectors make the curved edges flatter, so the shape approaches a rectangle.',
        tone: 'sky',
      }
    }
    return {
      label: 'Circle measurements',
      exact: `r = ${formatNumber(radius)} units   •   d = ${formatNumber(diameter)} units`,
      approximate: `C ≈ ${formatDecimal(circumference)}   •   A ≈ ${formatDecimal(area)}`,
      observation: 'Choose a transformation to connect the circle to each formula.',
      tone: 'slate',
    }
  }, [activeModel, area, circumference, diameter, radius])

  const formulaTone = formulaContent.tone === 'violet'
    ? 'border-violet-300 bg-violet-50 text-violet-800'
    : formulaContent.tone === 'sky'
      ? 'border-sky-300 bg-sky-50 text-sky-800'
      : 'border-slate-300 bg-white text-slate-700'

  return (
    <div className="relative box-border flex h-[498px] flex-col gap-2 overflow-hidden bg-slate-50 p-3 text-slate-800" ref={rootRef}>
      <div className="grid h-[58px] shrink-0 grid-cols-[140px_1fr_174px_54px] items-stretch gap-2">
        <section className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2">
          <div className="mr-auto min-w-12">
            <div className="text-[9px] font-black uppercase text-emerald-700">Radius</div>
            <div className="text-xl font-black tabular-nums text-emerald-800">{formatNumber(radius)}</div>
          </div>
          <button aria-label="Decrease radius" className="h-8 w-8 rounded border border-emerald-300 bg-white text-lg font-black text-emerald-800 disabled:opacity-35" disabled={radius <= 1} onClick={() => setRadius(radius - 0.5)} type="button">−</button>
          <button aria-label="Increase radius" className="h-8 w-8 rounded border border-emerald-300 bg-white text-lg font-black text-emerald-800 disabled:opacity-35" disabled={radius >= 4} onClick={() => setRadius(radius + 0.5)} type="button">+</button>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button className={`rounded border px-2 text-[12px] font-black shadow-sm disabled:opacity-45 ${activeModel === 'circumference' ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-300 bg-white text-violet-800'}`} disabled={isAnimating} onClick={() => runTransformation('circumference')} type="button">
            {activeModel === 'circumference' && reveal ? 'Unroll again' : 'Unroll circumference'}
          </button>
          <button className={`rounded border px-2 text-[12px] font-black shadow-sm disabled:opacity-45 ${activeModel === 'area' ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-300 bg-white text-sky-800'}`} disabled={isAnimating} onClick={() => runTransformation('area')} type="button">
            {activeModel === 'area' && reveal ? 'Rearrange again' : 'Rearrange area'}
          </button>
        </div>

        <section className="rounded border border-sky-200 bg-sky-50 px-2 py-1">
          <div className="mb-1 text-[9px] font-black uppercase text-sky-700">Area sectors</div>
          <div className="grid grid-cols-4 gap-1">
            {sectorChoices.map((choice) => (
              <button className={`h-7 rounded border text-[10px] font-black disabled:opacity-45 ${sectorCount === choice ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-200 bg-white text-sky-800'}`} disabled={isAnimating} key={choice} onClick={() => changeSectors(choice)} type="button">{choice}</button>
            ))}
          </div>
        </section>
        <button className="rounded border border-slate-300 bg-white text-[10px] font-black text-slate-700 shadow-sm" onClick={reset} type="button">Reset</button>
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[328px_1fr] gap-2">
        <section className="relative min-h-0 overflow-hidden rounded border border-emerald-200 bg-white shadow-sm">
          <div className="absolute left-2 top-2 z-10 rounded bg-white/95 px-2 py-1 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-500">Circle model</div>
            <div className="text-[11px] font-bold text-emerald-800">Drag the radius point</div>
          </div>
          <CircleGrid activeModel={activeModel} animationId={animationId} areaPhase={areaPhase} areaSourceRef={areaSourceRef} circumferenceSourceRef={circumferenceSourceRef} radius={radius} sectorCount={sectorCount} setRadius={setRadius} />
        </section>

        <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="flex h-8 items-center justify-between border-b border-slate-200 px-3">
            <span className="text-[11px] font-black uppercase text-slate-600">Transformation</span>
            <span className="text-[10px] font-bold text-slate-400">exact relationships • visual approximation</span>
          </div>
          <div className="h-[calc(100%_-_2rem)]">
            {activeModel === 'idle' && <IdleStage radius={radius} />}
            {activeModel === 'circumference' && (
              <CircumferenceStage
                circumference={circumference}
                diameter={diameter}
                reveal={reveal}
                ribbonTargetRef={circumferenceTargetRef}
                showMeasurements={circumferencePhase === 'measure' || circumferencePhase === 'complete'}
              />
            )}
            {activeModel === 'area' && <AreaStage area={area} areaPhase={areaPhase} radius={radius} sectorCount={sectorCount} targetSvgRef={areaTargetSvgRef} />}
          </div>
        </section>
      </main>

      {activeModel === 'circumference' && circumferencePhase === 'transfer' && (
        <CircumferenceTransferOverlay animationId={animationId} geometry={transferGeometry} />
      )}
      {activeModel === 'area' && areaPhase === 'transfer' && (
        <AreaSectorTransferOverlay animationId={animationId} geometry={areaTransferGeometry} sectorCount={sectorCount} />
      )}

      <section className={`grid h-[78px] shrink-0 grid-cols-[145px_1.15fr_1fr_1.65fr] items-center gap-2 rounded border px-3 ${formulaTone}`} aria-live="polite">
        <div>
          <div className="text-[9px] font-black uppercase opacity-70">{formulaContent.label}</div>
          <div className="text-lg font-black text-amber-600">π ≈ 3.14</div>
        </div>
        <div className={reveal || activeModel === 'idle' ? 'circle-formula-reveal' : 'opacity-45'}>
          <div className="text-[9px] font-black uppercase opacity-65">Exact</div>
          <div className="text-[15px] font-black tabular-nums">{formulaContent.exact}</div>
        </div>
        <div className={reveal || activeModel === 'idle' ? 'circle-formula-reveal' : 'opacity-45'}>
          <div className="text-[9px] font-black uppercase opacity-65">Approximation</div>
          <div className="text-[14px] font-black tabular-nums">{formulaContent.approximate}</div>
        </div>
        <div className="rounded bg-white/75 px-2 py-2 text-[11px] font-bold leading-4 text-slate-700">
          {isAnimating ? (activeModel === 'area' ? 'The sectors are rearranging.' : 'The circle edge is unrolling.') : formulaContent.observation}
        </div>
      </section>
    </div>
  )
}
