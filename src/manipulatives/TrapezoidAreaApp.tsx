import React, { useRef, useState } from 'react'

type CheckboxProps = {
  label: string
  checked: boolean
  onChange: () => void
  color: string
}

function Checkbox({ label, checked, onChange, color }: CheckboxProps) {
  return (
    <label className="group flex cursor-pointer select-none items-center space-x-1.5">
      <button
        type="button"
        aria-pressed={checked}
        onClick={onChange}
        className="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors group-hover:border-gray-400"
        style={{
          backgroundColor: checked ? color : 'white',
          borderColor: checked ? color : '#d1d5db',
        }}
      >
        {checked && (
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </label>
  )
}

const canvasW = 800
const canvasH = 430
const scale = 25

export default function TrapezoidAreaApp() {
  const [aX, setAX] = useState(100)
  const [aY, setAY] = useState(250)
  const [bX, setBX] = useState(100 + 10 * scale)
  const [dX, setDX] = useState(150)
  const [cY, setCY] = useState(250 - 6 * scale)
  const [cX, setCX] = useState(150 + 6 * scale)
  const [dragNode, setDragNode] = useState<string | null>(null)
  const [showBase1, setShowBase1] = useState(true)
  const [showBase2, setShowBase2] = useState(true)
  const [showHeight, setShowHeight] = useState(true)
  const [showArea, setShowArea] = useState(true)
  const [animProgress, setAnimProgress] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const base1Pixels = bX - aX
  const base2Pixels = cX - dX
  const heightPixels = aY - cY
  const b1 = base1Pixels / scale
  const b2 = base2Pixels / scale
  const h = heightPixels / scale
  const area = 0.5 * (b1 + b2) * h
  const formatNum = (num: number) => Number.parseFloat(num.toFixed(1))
  const midRightX = (bX + cX) / 2
  const midRightY = (aY + cY) / 2

  const handleToggle = (field: 'base1' | 'base2' | 'height' | 'area') => {
    if (field === 'base1') {
      const next = !showBase1
      setShowBase1(next)
      if (!next) {
        setShowBase2(true)
        setShowHeight(true)
        setShowArea(true)
      }
    } else if (field === 'base2') {
      const next = !showBase2
      setShowBase2(next)
      if (!next) {
        setShowBase1(true)
        setShowHeight(true)
        setShowArea(true)
      }
    } else if (field === 'height') {
      const next = !showHeight
      setShowHeight(next)
      if (!next) {
        setShowBase1(true)
        setShowBase2(true)
        setShowArea(true)
      }
    } else {
      const next = !showArea
      setShowArea(next)
      if (!next) {
        setShowBase1(true)
        setShowBase2(true)
        setShowHeight(true)
      }
    }
  }

  const handlePointerDown = (event: React.PointerEvent<SVGGElement>, node: string) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragNode(node)
    if (animProgress > 0) setAnimProgress(0)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragNode || !svgRef.current) return

    const point = svgRef.current.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const screenCtm = svgRef.current.getScreenCTM()
    if (!screenCtm) return
    const cursorPoint = point.matrixTransform(screenCtm.inverse())
    const snap = scale / 2
    let newX = Math.round(cursorPoint.x / snap) * snap
    let newY = Math.round(cursorPoint.y / snap) * snap

    if (dragNode === 'A') {
      newX = Math.max(20, Math.min(newX, bX - snap))
      newY = Math.max(cY + snap, Math.min(newY, canvasH - 140))
      setAX(newX)
      setAY(newY)
    } else if (dragNode === 'B') {
      newX = Math.max(aX + snap, Math.min(newX, canvasW - 20))
      newY = Math.max(cY + snap, Math.min(newY, canvasH - 140))
      setBX(newX)
      setAY(newY)
    } else if (dragNode === 'C') {
      newX = Math.max(dX + snap, Math.min(newX, canvasW - 20))
      newY = Math.max(20, Math.min(newY, aY - snap))
      setCY(newY)
      setCX(newX)
    } else if (dragNode === 'D') {
      newX = Math.max(20, Math.min(newX, cX - snap))
      newY = Math.max(20, Math.min(newY, aY - snap))
      setCY(newY)
      setDX(newX)
    }
  }

  const gridLines = []
  for (let i = 0; i <= canvasW; i += scale) {
    gridLines.push(<line key={`v${i}`} x1={i} y1={0} x2={i} y2={canvasH} stroke="#f1f5f9" strokeWidth="1" />)
  }
  for (let i = 0; i <= canvasH; i += scale) {
    gridLines.push(<line key={`h${i}`} x1={0} y1={i} x2={canvasW} y2={i} stroke="#f1f5f9" strokeWidth="1" />)
  }

  return (
    <div className="relative flex h-[500px] w-[800px] shrink-0 select-none flex-col overflow-hidden rounded-xl border border-gray-200 bg-white font-sans text-gray-900 shadow-lg">
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="m-0 text-xl font-bold tracking-tight text-slate-800">Trapezoid Area</h1>

        <div className="flex items-center space-x-4">
          <Checkbox label="Base 1" checked={showBase1} color="#3b82f6" onChange={() => handleToggle('base1')} />
          <Checkbox label="Base 2" checked={showBase2} color="#f97316" onChange={() => handleToggle('base2')} />
          <Checkbox label="Height" checked={showHeight} color="#a855f7" onChange={() => handleToggle('height')} />
          <Checkbox label="Area" checked={showArea} color="#10b981" onChange={() => handleToggle('area')} />

          <div className="ml-1 flex items-center space-x-2 border-l border-gray-300 pl-4">
            <span className="text-sm font-semibold text-gray-600">Parallelogram Proof:</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(animProgress * 100)}
              onChange={(event) => setAnimProgress(Number.parseInt(event.target.value, 10) / 100)}
              className="w-24 cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      </header>

      <main className="relative flex-1 cursor-crosshair overflow-hidden bg-white">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragNode(null)}
          onPointerLeave={() => setDragNode(null)}
          className="overflow-visible"
        >
          <g className="pointer-events-none">{gridLines}</g>

          {dX < aX && <line x1={dX} y1={aY} x2={aX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}
          {dX > bX && <line x1={bX} y1={aY} x2={dX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}

          {animProgress > 0 && (
            <polygon
              points={`${aX},${aY} ${bX},${aY} ${cX},${cY} ${dX},${cY}`}
              fill="rgba(249, 115, 22, 0.15)"
              stroke="#f97316"
              strokeWidth="2"
              strokeDasharray="6,6"
              transform={`rotate(${animProgress * 180}, ${midRightX}, ${midRightY})`}
              className="pointer-events-none"
            />
          )}

          <polygon
            points={`${aX},${aY} ${bX},${aY} ${cX},${cY} ${dX},${cY}`}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10b981"
            strokeWidth="2"
            className="pointer-events-none"
          />

          <line x1={aX} y1={aY} x2={bX} y2={aY} stroke="#3b82f6" strokeWidth="3" className="pointer-events-none" />
          <line x1={dX} y1={cY} x2={cX} y2={cY} stroke="#f97316" strokeWidth="3" className="pointer-events-none" />
          <line x1={dX} y1={cY} x2={dX} y2={aY} stroke="#a855f7" strokeDasharray="5,5" strokeWidth="2" className="pointer-events-none" />

          {h > 0 && (
            <polyline
              points={`${dX},${aY - 12} ${dX + (dX <= aX || dX <= bX ? 12 : -12)},${aY - 12} ${dX + (dX <= aX || dX <= bX ? 12 : -12)},${aY}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              className="pointer-events-none"
            />
          )}

          {[
            { key: 'A', x: aX, y: aY, stroke: '#3b82f6', fill: '#2563eb', textX: aX - 18, textY: aY + 4, textColor: '#1e3a8a' },
            { key: 'B', x: bX, y: aY, stroke: '#3b82f6', fill: '#2563eb', textX: bX + 10, textY: aY + 4, textColor: '#1e3a8a' },
            { key: 'C', x: cX, y: cY, stroke: '#f97316', fill: '#ea580c', textX: cX + 10, textY: cY - 3, textColor: '#9a3412' },
            { key: 'D', x: dX, y: cY, stroke: '#f97316', fill: '#ea580c', textX: dX - 18, textY: cY - 3, textColor: '#9a3412' },
          ].map((point) => (
            <g key={point.key} className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => handlePointerDown(event, point.key)}>
              <circle cx={point.x} cy={point.y} r={24} fill="transparent" />
              <circle cx={point.x} cy={point.y} r={12} fill="rgba(255,255,255,0.2)" stroke={point.stroke} strokeWidth="2" />
              <polygon
                points={`${point.x},${point.y - 4} ${point.x + 4},${point.y} ${point.x},${point.y + 4} ${point.x - 4},${point.y}`}
                fill={point.fill}
                className="pointer-events-none"
              />
              <text x={point.textX} y={point.textY} fill={point.textColor} fontSize="12" fontWeight="bold" className="pointer-events-none">
                {point.key}
              </text>
            </g>
          ))}

          {animProgress > 0 && (
            <foreignObject x="0" y={aY + 45} width={canvasW} height="120" className="pointer-events-none">
              <div className="flex h-full w-full flex-col items-center justify-center border-t-2 border-orange-200 bg-orange-50/80 text-xl font-bold text-gray-900">
                <p className="mb-1 text-orange-700">Two identical trapezoids form a parallelogram.</p>
                <p className="text-lg">
                  Parallelogram Base = <span className="text-blue-700">b1</span> + <span className="text-orange-700">b2</span> ={' '}
                  <span className="text-blue-700">{formatNum(b1)}</span> + <span className="text-orange-700">{formatNum(b2)}</span> ={' '}
                  <span className="text-gray-900">{formatNum(b1 + b2)}</span>
                </p>
              </div>
            </foreignObject>
          )}

          {animProgress === 0 && (
            <>
              {showBase1 && (
                <g className="pointer-events-none">
                  <rect x={(aX + bX) / 2 - 35} y={aY + 12} width={70} height={24} fill="rgba(255,255,255,0.8)" rx={4} />
                  <text x={(aX + bX) / 2} y={aY + 29} fill="#1d4ed8" textAnchor="middle" className="text-sm font-bold">
                    b1 = {formatNum(b1)}
                  </text>
                </g>
              )}

              {showBase2 && (
                <g className="pointer-events-none">
                  <rect x={(dX + cX) / 2 - 35} y={cY - 35} width={70} height={24} fill="rgba(255,255,255,0.8)" rx={4} />
                  <text x={(dX + cX) / 2} y={cY - 18} fill="#c2410c" textAnchor="middle" className="text-sm font-bold">
                    b2 = {formatNum(b2)}
                  </text>
                </g>
              )}

              {showHeight && (
                <g className="pointer-events-none">
                  <rect x={dX + 8} y={(cY + aY) / 2 - 12} width={70} height={24} fill="rgba(255,255,255,0.8)" rx={4} />
                  <text x={dX + 12} y={(cY + aY) / 2 + 5} fill="#a855f7" textAnchor="start" className="text-sm font-bold">
                    h = {formatNum(h)}
                  </text>
                </g>
              )}

              <foreignObject x="0" y={aY + 45} width={canvasW} height="120" className="pointer-events-none">
                <div className="flex h-full w-full items-start justify-center pt-4 text-xl font-extrabold text-gray-900">
                  {!showBase1 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-700">b1</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">
                          2 x <span className="text-emerald-700">A</span>
                        </span>
                        <span className="pt-1 text-purple-700">h</span>
                      </div>
                      <span>-</span>
                      <span className="text-orange-700">b2</span>
                      <span>=</span>
                      <span className="text-3xl text-blue-700">{formatNum(b1)}</span>
                    </div>
                  )}

                  {!showBase2 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-700">b2</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">
                          2 x <span className="text-emerald-700">A</span>
                        </span>
                        <span className="pt-1 text-purple-700">h</span>
                      </div>
                      <span>-</span>
                      <span className="text-blue-700">b1</span>
                      <span>=</span>
                      <span className="text-3xl text-orange-700">{formatNum(b2)}</span>
                    </div>
                  )}

                  {!showHeight && (
                    <div className="flex items-center space-x-3">
                      <span className="text-purple-700">h</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">
                          2 x <span className="text-emerald-700">A</span>
                        </span>
                        <span className="pt-1">
                          (<span className="text-blue-700">b1</span> + <span className="text-orange-700">b2</span>)
                        </span>
                      </div>
                      <span>=</span>
                      <span className="text-3xl text-purple-700">{formatNum(h)}</span>
                    </div>
                  )}

                  {showBase1 && showBase2 && showHeight && (
                    <div className="flex items-center space-x-3">
                      <span className="text-emerald-700">Area</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-1 pb-1">1</span>
                        <span className="pt-1">2</span>
                      </div>
                      <span>x</span>
                      <span>
                        (<span className="text-blue-700">b1</span> + <span className="text-orange-700">b2</span>)
                      </span>
                      <span>x</span>
                      <span className="text-purple-700">h</span>
                      <span>=</span>
                      <span>
                        (<span className="text-blue-700">{formatNum(b1)}</span> + <span className="text-orange-700">{formatNum(b2)}</span>)
                      </span>
                      <span>x</span>
                      <span className="text-purple-700">{formatNum(h)}</span>
                      <span>=</span>
                      <span className="text-3xl text-emerald-700">{showArea ? formatNum(area) : '?'}</span>
                    </div>
                  )}
                </div>
              </foreignObject>
            </>
          )}
        </svg>
      </main>
    </div>
  )
}
