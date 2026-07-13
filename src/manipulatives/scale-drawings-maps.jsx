import { useRef, useState } from 'react'

const scaleOptions = [
  { id: 'scale-10', label: '1 cm = 10 m', metersPerCm: 10 },
  { id: 'scale-20', label: '1 cm = 20 m', metersPerCm: 20 },
  { id: 'scale-50', label: '1 cm = 50 m', metersPerCm: 50 },
]

const plan = { widthCm: 10, heightCm: 6 }
const toleranceMeters = 2

const objectDefinitions = [
  {
    id: 'school',
    type: 'building',
    label: 'School',
    shortLabel: 'SCH',
    color: '#10b981',
    targetRealWidthM: 40,
    targetRealHeightM: 30,
    initialWidthCm: 2.8,
    initialHeightCm: 2.1,
  },
  {
    id: 'library',
    type: 'building',
    label: 'Library',
    shortLabel: 'LIB',
    color: '#8b5cf6',
    targetRealWidthM: 30,
    targetRealHeightM: 20,
    initialWidthCm: 2.1,
    initialHeightCm: 1.4,
  },
  {
    id: 'gym',
    type: 'building',
    label: 'Gym',
    shortLabel: 'GYM',
    color: '#0ea5e9',
    targetRealWidthM: 50,
    targetRealHeightM: 30,
    initialWidthCm: 3,
    initialHeightCm: 1.8,
  },
  {
    id: 'park',
    type: 'park',
    label: 'Park',
    shortLabel: 'PARK',
    color: '#22c55e',
    targetRealWidthM: 60,
    targetRealHeightM: 40,
    initialWidthCm: 4.2,
    initialHeightCm: 2.8,
  },
  {
    id: 'garden',
    type: 'park',
    label: 'Garden',
    shortLabel: 'GDN',
    color: '#f59e0b',
    targetRealWidthM: 30,
    targetRealHeightM: 30,
    initialWidthCm: 2.1,
    initialHeightCm: 2.1,
  },
  {
    id: 'main-road',
    type: 'road',
    orientation: 'horizontal',
    label: 'Main Road',
    shortLabel: 'ROAD',
    color: '#64748b',
    targetRealWidthM: 80,
    targetRealHeightM: 8,
    initialWidthCm: 5.6,
    initialHeightCm: 0.55,
  },
  {
    id: 'side-road',
    type: 'road',
    orientation: 'vertical',
    label: 'Side Road',
    shortLabel: 'ROAD',
    color: '#475569',
    targetRealWidthM: 8,
    targetRealHeightM: 50,
    initialWidthCm: 0.55,
    initialHeightCm: 3.5,
  },
]

const requiredObjectIds = ['school', 'park', 'main-road']

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const formatNumber = (value) => {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
}

const definitionById = new Map(objectDefinitions.map((definition) => [definition.id, definition]))

const getObjectDefinition = (item) => definitionById.get(item.definitionId)

const realDimensions = (item, scale) => ({
  width: item.widthCm * scale.metersPerCm,
  height: item.heightCm * scale.metersPerCm,
})

const isObjectComplete = (item, scale) => {
  const definition = getObjectDefinition(item)
  const real = realDimensions(item, scale)

  if (definition.type === 'road') {
    const currentLength = definition.orientation === 'vertical' ? real.height : real.width
    const targetLength =
      definition.orientation === 'vertical' ? definition.targetRealHeightM : definition.targetRealWidthM
    return Math.abs(currentLength - targetLength) <= toleranceMeters
  }

  return (
    Math.abs(real.width - definition.targetRealWidthM) <= toleranceMeters &&
    Math.abs(real.height - definition.targetRealHeightM) <= toleranceMeters
  )
}

const targetDrawingSize = (definition, scale) => ({
  widthCm: definition.targetRealWidthM / scale.metersPerCm,
  heightCm: definition.targetRealHeightM / scale.metersPerCm,
})

const getPlanPoint = (event, element) => {
  const rect = element.getBoundingClientRect()
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * plan.widthCm, 0, plan.widthCm),
    y: clamp(((event.clientY - rect.top) / rect.height) * plan.heightCm, 0, plan.heightCm),
  }
}

const clampObjectToPlan = (item) => ({
  ...item,
  xCm: clamp(item.xCm, 0, Math.max(0, plan.widthCm - item.widthCm)),
  yCm: clamp(item.yCm, 0, Math.max(0, plan.heightCm - item.heightCm)),
})

const createPlacedObject = (definition, point, scale) => {
  const target = targetDrawingSize(definition, scale)
  const widthCm =
    definition.type === 'road' && definition.orientation === 'vertical'
      ? definition.initialWidthCm
      : Math.min(definition.initialWidthCm, Math.max(0.8, target.widthCm * 0.72))
  const heightCm =
    definition.type === 'road' && definition.orientation === 'horizontal'
      ? definition.initialHeightCm
      : Math.min(definition.initialHeightCm, Math.max(0.6, target.heightCm * 0.72))

  return clampObjectToPlan({
    id: `${definition.id}-${Date.now()}`,
    definitionId: definition.id,
    xCm: point.x - widthCm / 2,
    yCm: point.y - heightCm / 2,
    widthCm,
    heightCm,
  })
}

function ScaleButton({ active, scale, onClick }) {
  return (
    <button
      className={`rounded border px-2 py-1 text-left shadow-sm transition ${
        active
          ? 'border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-200'
          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="text-[9px] font-black uppercase text-slate-500">Scale</div>
      <div className="text-[11px] font-black tabular-nums">{scale.label}</div>
    </button>
  )
}

function PaletteItem({ definition, onPointerDown }) {
  return (
    <button
      className="scale-town-palette-item flex h-8 items-center gap-1.5 rounded border border-slate-200 bg-white px-1.5 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
      onPointerDown={(event) => onPointerDown(event, definition.id)}
      type="button"
    >
      <span
        className="h-5 w-7 shrink-0 rounded border-2"
        style={{ backgroundColor: `${definition.color}24`, borderColor: definition.color }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-black text-slate-800">{definition.label}</span>
        <span className="block text-[9px] font-black uppercase text-slate-400">
          {definition.type === 'road' ? 'Road' : definition.type}
        </span>
      </span>
    </button>
  )
}

function MissionCard({ completeCount, totalRequired }) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-1.5 shadow-sm">
      <div className="text-[10px] font-black uppercase text-amber-700">Planner mission</div>
      <div className="mt-0.5 text-[11px] font-black leading-3 text-slate-900">
        Build a mini town with a 40 m x 30 m school, a 60 m x 40 m park, and an 80 m road.
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${(completeCount / totalRequired) * 100}%` }}
        />
      </div>
      <div className="mt-0.5 text-[9px] font-black text-amber-800">
        {completeCount}/{totalRequired} required objects correct
      </div>
    </div>
  )
}

function SelectedReadout({ item, scale }) {
  if (!item) {
    return (
      <div className="rounded border border-slate-200 bg-white p-1.5 text-[10px] font-bold leading-3 text-slate-500 shadow-sm">
        Select a town object to see its drawing size, real size, and target.
      </div>
    )
  }

  const definition = getObjectDefinition(item)
  const real = realDimensions(item, scale)
  const complete = isObjectComplete(item, scale)
  const targetText =
    definition.type === 'road'
      ? `${definition.orientation === 'vertical' ? definition.targetRealHeightM : definition.targetRealWidthM} m long`
      : `${definition.targetRealWidthM} m x ${definition.targetRealHeightM} m`

  return (
    <div
      className={`rounded border p-1.5 shadow-sm ${
        complete ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="text-[10px] font-black uppercase text-slate-500">Selected object</div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-black" style={{ color: definition.color }}>
          {definition.label}
        </div>
        <div
          className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
            complete ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {complete ? 'Correct size' : 'Resize'}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-[9px] font-black">
        <div className="rounded bg-slate-50 p-1 text-slate-600">
          Drawing
          <div className="text-[11px] text-teal-700 tabular-nums">
            {formatNumber(item.widthCm)} x {formatNumber(item.heightCm)} cm
          </div>
        </div>
        <div className="rounded bg-slate-50 p-1 text-slate-600">
          Real
          <div className="text-[11px] text-sky-700 tabular-nums">
            {formatNumber(real.width)} x {formatNumber(real.height)} m
          </div>
        </div>
      </div>
      <div className="mt-0.5 text-[9px] font-black text-slate-500">Target: {targetText}</div>
    </div>
  )
}

function TownObject({ item, scale, selected, onPointerDown, onResizePointerDown, onSelect }) {
  const definition = getObjectDefinition(item)
  const complete = isObjectComplete(item, scale)
  const real = realDimensions(item, scale)
  const left = (item.xCm / plan.widthCm) * 100
  const top = (item.yCm / plan.heightCm) * 100
  const width = (item.widthCm / plan.widthCm) * 100
  const height = (item.heightCm / plan.heightCm) * 100

  return (
    <div
      className={`scale-town-object absolute flex select-none items-center justify-center rounded border-2 text-center shadow-sm ${
        complete ? 'scale-town-object-complete' : ''
      } ${selected ? 'z-20 ring-4 ring-sky-200' : 'z-10'}`}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(item.id)
      }}
      onPointerDown={(event) => onPointerDown(event, item.id)}
      style={{
        backgroundColor: `${definition.color}1f`,
        borderColor: definition.color,
        color: definition.color,
        height: `${height}%`,
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
      }}
    >
      <div className="pointer-events-none">
        <div className="text-[11px] font-black leading-3">{definition.shortLabel}</div>
        {selected ? (
          <div className="mt-0.5 rounded bg-white/90 px-1 text-[9px] font-black text-slate-700 shadow-sm">
            {definition.type === 'road'
              ? `${formatNumber(definition.orientation === 'vertical' ? real.height : real.width)} m`
              : `${formatNumber(real.width)} x ${formatNumber(real.height)} m`}
          </div>
        ) : null}
      </div>
      {selected ? (
        <>
          <div className="scale-town-dimension-label absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-teal-700 shadow">
            {formatNumber(item.widthCm)} cm
          </div>
          <div className="scale-town-dimension-label absolute -right-10 top-1/2 -translate-y-1/2 rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-teal-700 shadow">
            {formatNumber(item.heightCm)} cm
          </div>
          <button
            aria-label={`Resize ${definition.label}`}
            className="scale-town-resize-handle absolute -bottom-2 -right-2 h-5 w-5 rounded-full border-2 border-white bg-slate-950 shadow"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => onResizePointerDown(event, item.id)}
            type="button"
          />
        </>
      ) : null}
    </div>
  )
}

function BlueprintCanvas({
  canvasRef,
  items,
  onCanvasClick,
  onMovePointerDown,
  onResizePointerDown,
  onSelect,
  scale,
  selectedId,
}) {
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded border border-sky-200 bg-sky-50 shadow-inner"
      onClick={onCanvasClick}
      ref={canvasRef}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'linear-gradient(#bae6fd 1px, transparent 1px), linear-gradient(90deg, #bae6fd 1px, transparent 1px)',
          backgroundSize: '9.6% 15.7%',
        }}
      />
      <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black uppercase text-sky-700 shadow-sm">
        Blueprint grid: 10 cm x 6 cm
      </div>
      <div className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
        {scale.label}
      </div>

      {items.map((item) => (
        <TownObject
          item={item}
          key={item.id}
          onPointerDown={onMovePointerDown}
          onResizePointerDown={onResizePointerDown}
          onSelect={onSelect}
          scale={scale}
          selected={item.id === selectedId}
        />
      ))}

    </div>
  )
}

function EquationStrip({ item, scale, missionComplete }) {
  if (missionComplete) {
    return (
      <div className="scale-town-equation-refresh flex h-[56px] items-center justify-center rounded border border-sky-200 bg-sky-50 px-3 text-center shadow-sm">
        <div className="text-lg font-black text-sky-700">Town plan complete. Every required object is proportional.</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex h-[56px] items-center justify-center rounded border border-sky-200 bg-sky-50 px-3 text-center text-[13px] font-black text-slate-500 shadow-sm">
        Drag a town object onto the blueprint, then resize it to match the real-world target.
      </div>
    )
  }

  const definition = getObjectDefinition(item)
  const real = realDimensions(item, scale)
  const primaryCm =
    definition.type === 'road' && definition.orientation === 'vertical' ? item.heightCm : item.widthCm
  const primaryMeters =
    definition.type === 'road' && definition.orientation === 'vertical' ? real.height : real.width
  const dimensionLabel = definition.type === 'road' ? 'length' : 'width'

  return (
    <div
      className="scale-town-equation-refresh grid h-[56px] grid-cols-[1fr_160px] gap-2 rounded border border-sky-200 bg-sky-50 p-1.5 shadow-sm"
      key={`${item.id}-${formatNumber(primaryCm)}-${scale.id}`}
    >
      <div className="flex items-center justify-center gap-3 rounded border border-sky-100 bg-white px-3">
        <span className="text-[11px] font-black uppercase text-slate-500">{definition.label} {dimensionLabel}</span>
        <span className="text-base font-black text-teal-700 tabular-nums">{formatNumber(primaryCm)} cm</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-base font-black text-amber-700">x</span>
        <span className="text-base font-black text-amber-700 tabular-nums">{scale.metersPerCm} m per cm</span>
        <span className="text-lg font-black text-slate-400">=</span>
        <span className="text-xl font-black text-sky-700 tabular-nums">{formatNumber(primaryMeters)} m</span>
      </div>
      <div className="flex flex-col justify-center rounded border border-sky-100 bg-white px-3">
        <div className="text-[10px] font-black uppercase text-slate-400">Target</div>
        <div className="text-[13px] font-black text-slate-800">
          {definition.type === 'road'
            ? `${definition.orientation === 'vertical' ? definition.targetRealHeightM : definition.targetRealWidthM} m long`
            : `${definition.targetRealWidthM} x ${definition.targetRealHeightM} m`}
        </div>
      </div>
    </div>
  )
}

export default function ScaleDrawingsMaps() {
  const [activeScaleId, setActiveScaleId] = useState(scaleOptions[0].id)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [feedback, setFeedback] = useState('Drag the school, park, and road onto the blueprint.')
  const [ghost, setGhost] = useState(null)
  const canvasRef = useRef(null)
  const actionRef = useRef(null)

  const activeScale = scaleOptions.find((scale) => scale.id === activeScaleId) ?? scaleOptions[0]
  const selectedItem = items.find((item) => item.id === selectedId) ?? null
  const completeRequiredIds = new Set(
    items
      .filter((item) => requiredObjectIds.includes(item.definitionId) && isObjectComplete(item, activeScale))
      .map((item) => item.definitionId)
  )
  const completeCount = completeRequiredIds.size
  const missionComplete = completeCount === requiredObjectIds.length

  const updateGhostFromPointer = (event, definition) => {
    const size = definition.type === 'road' ? { width: 70, height: 20 } : { width: 62, height: 44 }
    setGhost({
      color: definition.color,
      heightPx: size.height,
      widthPx: size.width,
      xPx: event.clientX,
      yPx: event.clientY,
    })
  }

  const handlePalettePointerDown = (event, definitionId) => {
    const definition = definitionById.get(definitionId)
    event.currentTarget.setPointerCapture(event.pointerId)
    actionRef.current = { mode: 'palette', definitionId, pointerId: event.pointerId }
    updateGhostFromPointer(event, definition)
    setFeedback(`Drag ${definition.label} onto the blueprint.`)
  }

  const handlePalettePointerMove = (event) => {
    if (actionRef.current?.mode !== 'palette') return
    const definition = definitionById.get(actionRef.current.definitionId)
    updateGhostFromPointer(event, definition)
  }

  const handlePalettePointerUp = (event) => {
    if (actionRef.current?.mode !== 'palette') return

    const definition = definitionById.get(actionRef.current.definitionId)
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const droppedInside =
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom

    if (droppedInside) {
      const point = getPlanPoint(event, canvas)
      const nextObject = createPlacedObject(definition, point, activeScale)
      setItems((current) => [...current, nextObject])
      setSelectedId(nextObject.id)
      setFeedback(`${definition.label} added. Drag the resize handle until the real size matches the target.`)
    } else {
      setFeedback('Drop the object inside the blueprint town grid.')
    }

    setGhost(null)
    actionRef.current = null
  }

  const handleMovePointerDown = (event, itemId) => {
    if (event.target.closest('button')) return

    const item = items.find((candidate) => candidate.id === itemId)
    if (!item) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(itemId)
    actionRef.current = {
      itemId,
      mode: 'move',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: item.xCm,
      startY: item.yCm,
    }
  }

  const handleResizePointerDown = (event, itemId) => {
    const item = items.find((candidate) => candidate.id === itemId)
    if (!item) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(itemId)
    actionRef.current = {
      itemId,
      mode: 'resize',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startHeight: item.heightCm,
      startWidth: item.widthCm,
      startX: item.xCm,
      startY: item.yCm,
    }
  }

  const handleCanvasPointerMove = (event) => {
    const action = actionRef.current
    if (!action || action.mode === 'palette') return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dxCm = ((event.clientX - action.startClientX) / rect.width) * plan.widthCm
    const dyCm = ((event.clientY - action.startClientY) / rect.height) * plan.heightCm

    setItems((current) =>
      current.map((item) => {
        if (item.id !== action.itemId) return item
        const definition = getObjectDefinition(item)

        if (action.mode === 'move') {
          return clampObjectToPlan({
            ...item,
            xCm: action.startX + dxCm,
            yCm: action.startY + dyCm,
          })
        }

        let nextWidth = action.startWidth
        let nextHeight = action.startHeight

        if (definition.type === 'road') {
          if (definition.orientation === 'vertical') {
            nextHeight = clamp(action.startHeight + dyCm, 0.45, plan.heightCm - action.startY)
          } else {
            nextWidth = clamp(action.startWidth + dxCm, 0.7, plan.widthCm - action.startX)
          }
        } else {
          const aspect = definition.targetRealWidthM / definition.targetRealHeightM
          nextWidth = clamp(action.startWidth + dxCm, 0.7, plan.widthCm - action.startX)
          nextHeight = nextWidth / aspect
          if (action.startY + nextHeight > plan.heightCm) {
            nextHeight = plan.heightCm - action.startY
            nextWidth = nextHeight * aspect
          }
        }

        return {
          ...item,
          heightCm: Math.max(0.35, nextHeight),
          widthCm: Math.max(0.35, nextWidth),
        }
      })
    )
  }

  const handleCanvasPointerUp = (event) => {
    const action = actionRef.current
    if (!action || action.mode === 'palette') return

    if (action.pointerId === event.pointerId) {
      actionRef.current = null
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id !== action.itemId) return item
        const definition = getObjectDefinition(item)
        if (!isObjectComplete(item, activeScale)) return item

        const target = targetDrawingSize(definition, activeScale)
        setFeedback(`${definition.label} is proportional to the target size.`)

        if (definition.type === 'road') {
          return clampObjectToPlan({
            ...item,
            heightCm: definition.orientation === 'vertical' ? target.heightCm : item.heightCm,
            widthCm: definition.orientation === 'vertical' ? item.widthCm : target.widthCm,
          })
        }

        return clampObjectToPlan({
          ...item,
          heightCm: target.heightCm,
          widthCm: target.widthCm,
        })
      })
    )
  }

  const resetTown = () => {
    setActiveScaleId(scaleOptions[0].id)
    setItems([])
    setSelectedId(null)
    setGhost(null)
    actionRef.current = null
    setFeedback('Town cleared. Drag the school, park, and road onto the blueprint.')
  }

  const handleScaleChange = (scaleId) => {
    setActiveScaleId(scaleId)
    setFeedback('Scale changed. Drawing sizes stayed the same, but the real-world sizes recalculated.')
  }

  const handleRootPointerMove = (event) => {
    if (actionRef.current?.mode === 'palette') {
      handlePalettePointerMove(event)
      return
    }

    handleCanvasPointerMove(event)
  }

  const handleRootPointerUp = (event) => {
    if (actionRef.current?.mode === 'palette') {
      handlePalettePointerUp(event)
      return
    }

    handleCanvasPointerUp(event)
  }

  return (
    <div
      className="box-border flex h-[500px] flex-col overflow-hidden bg-slate-50 px-3 py-1.5 text-slate-800"
      onPointerMove={handleRootPointerMove}
      onPointerUp={handleRootPointerUp}
    >
      <div className="mb-1 flex shrink-0 items-start justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">Scale Drawings & Maps</h2>
          <p className="text-[11px] font-semibold text-slate-500">
            Become a city planner. Resize the miniature town so every object stays proportional.
          </p>
        </div>
        <button
          className="h-9 rounded bg-slate-950 px-4 text-[12px] font-black text-white shadow-sm"
          onClick={resetTown}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[218px_1fr] gap-2 overflow-hidden">
        <aside
          className="min-h-0 space-y-1 overflow-hidden"
        >
          <MissionCard completeCount={completeCount} totalRequired={requiredObjectIds.length} />

          <div className="rounded border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="mb-1 text-[10px] font-black uppercase text-slate-500">Choose scale</div>
            <div className="grid grid-cols-1 gap-1">
              {scaleOptions.map((scale) => (
                <ScaleButton
                  active={scale.id === activeScaleId}
                  key={scale.id}
                  onClick={() => handleScaleChange(scale.id)}
                  scale={scale}
                />
              ))}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="mb-1 text-[10px] font-black uppercase text-slate-500">Object palette</div>
            <div className="grid grid-cols-2 gap-1">
              {objectDefinitions.map((definition) => (
                <PaletteItem
                  definition={definition}
                  key={definition.id}
                  onPointerDown={handlePalettePointerDown}
                />
              ))}
            </div>
          </div>

          <SelectedReadout item={selectedItem} scale={activeScale} />
        </aside>

        <main className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <BlueprintCanvas
            canvasRef={canvasRef}
            items={items}
            onCanvasClick={() => setSelectedId(null)}
            onMovePointerDown={handleMovePointerDown}
            onResizePointerDown={handleResizePointerDown}
            onSelect={setSelectedId}
            scale={activeScale}
            selectedId={selectedId}
          />
          <div className="rounded border border-sky-200 bg-sky-50 p-1.5 text-[11px] font-bold leading-3 text-sky-950 shadow-sm">
            <span className="font-black uppercase text-sky-700">Planner note: </span>
            {feedback}
          </div>
          <EquationStrip item={selectedItem} missionComplete={missionComplete} scale={activeScale} />
        </main>
      </div>

      {ghost ? (
        <div
          className="pointer-events-none fixed z-50 rounded border-2 border-dashed bg-white/80 shadow-lg"
          style={{
            borderColor: ghost.color,
            height: `${ghost.heightPx}px`,
            left: `${ghost.xPx}px`,
            top: `${ghost.yPx}px`,
            transform: 'translate(-50%, -50%)',
            width: `${ghost.widthPx}px`,
          }}
        />
      ) : null}
    </div>
  )
}
