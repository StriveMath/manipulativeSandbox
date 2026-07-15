import React, { useRef, useState } from 'react'

type CheckboxProps = {
  label: string
  checked: boolean
  onChange: () => void
  color: string
}

function Checkbox({ label, checked, onChange, color }: CheckboxProps) {
  return (
    <label className="group flex cursor-pointer select-none items-center space-x-2">
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
const canvasH = 440
const scale = 25

export default function TriangleAreaApp() {
  const [aX, setAX] = useState(150)
  const [aY, setAY] = useState(300)
  const [bX, setBX] = useState(150 + 8 * scale)
  const [cX, setCX] = useState(150 + 3 * scale)
  const [cY, setCY] = useState(300 - 6 * scale)
  const [dragNode, setDragNode] = useState<string | null>(null)
  const [showBase, setShowBase] = useState(true)
  const [showHeight, setShowHeight] = useState(true)
  const [showArea, setShowArea] = useState(true)
  const [animProgress, setAnimProgress] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const basePixels = bX - aX
  const heightPixels = aY - cY
  const base = basePixels / scale
  const height = heightPixels / scale
  const area = 0.5 * base * height
  const dirX = cX < (aX + bX) / 2 ? 1 : -1
  const midLeftX = (aX + cX) / 2
  const midLeftY = (aY + cY) / 2
  const midRightX = (bX + cX) / 2
  const midRightY = (aY + cY) / 2
  const isCWithinBase = cX >= aX && cX <= bX
  const formatNum = (num: number) => Number.parseFloat(num.toFixed(1))

  const handleToggle = (field: 'base' | 'height' | 'area') => {
    if (field === 'base') {
      const next = !showBase
      setShowBase(next)
      if (!next) {
        setShowHeight(true)
        setShowArea(true)
      }
    } else if (field === 'height') {
      const next = !showHeight
      setShowHeight(next)
      if (!next) {
        setShowBase(true)
        setShowArea(true)
      }
    } else {
      const next = !showArea
      setShowArea(next)
      if (!next) {
        setShowBase(true)
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
      setBX(newX)
    } else if (dragNode === 'C') {
      newX = Math.max(20, Math.min(newX, canvasW - 20))
      newY = Math.max(20, Math.min(newY, aY - snap))
      setCY(newY)
      setCX(newX)
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
    <div className="relative flex h-[500px] w-[800px] select-none flex-col overflow-hidden rounded-xl border border-gray-200 bg-white font-sans shadow-xl">
      <header className="z-10 flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6">
        <h1 className="m-0 text-xl font-bold tracking-tight text-slate-900">Triangle Area</h1>

        <div className="flex items-center space-x-5">
          <Checkbox label="Base" checked={showBase} color="#3b82f6" onChange={() => handleToggle('base')} />
          <Checkbox label="Height" checked={showHeight} color="#f97316" onChange={() => handleToggle('height')} />
          <Checkbox label="Area" checked={showArea} color="#10b981" onChange={() => handleToggle('area')} />

          <div className="ml-2 flex items-center space-x-2 border-l border-gray-300 pl-5">
            <span className="text-sm font-semibold text-gray-700">Rectangle Proof:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(animProgress * 100)}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value) / 100
                setAnimProgress(value)
                if (value > 0 && !isCWithinBase) setCX(Math.max(aX, Math.min(bX, cX)))
              }}
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
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragNode(null)}
          onPointerLeave={() => setDragNode(null)}
        >
          <g className="pointer-events-none">{gridLines}</g>

          {animProgress > 0 && isCWithinBase && (
            <rect
              x={aX}
              y={cY}
              width={basePixels}
              height={heightPixels}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity={animProgress}
              className="pointer-events-none"
            />
          )}

          {cX < aX && <line x1={cX} y1={aY} x2={aX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}
          {cX > bX && <line x1={bX} y1={aY} x2={cX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}

          <polygon
            points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10b981"
            strokeWidth="2"
            className="pointer-events-none"
          />

          {animProgress > 0 && isCWithinBase && (
            <>
              <polygon
                points={`${aX},${aY} ${cX},${aY} ${cX},${cY}`}
                fill="rgba(249, 115, 22, 0.15)"
                stroke="#f97316"
                strokeWidth="1.5"
                transform={`rotate(${180 * animProgress}, ${midLeftX}, ${midLeftY})`}
                className="pointer-events-none"
              />
              <polygon
                points={`${bX},${aY} ${cX},${aY} ${cX},${cY}`}
                fill="rgba(249, 115, 22, 0.15)"
                stroke="#f97316"
                strokeWidth="1.5"
                transform={`rotate(${-180 * animProgress}, ${midRightX}, ${midRightY})`}
                className="pointer-events-none"
              />
            </>
          )}

          <line x1={aX} y1={aY} x2={bX} y2={aY} stroke="#3b82f6" strokeWidth="3" className="pointer-events-none" />
          <line x1={cX} y1={cY} x2={cX} y2={aY} stroke="#f97316" strokeDasharray="5,5" strokeWidth="2" className="pointer-events-none" />

          {height > 0 && (
            <polyline
              points={`${cX},${aY - 12} ${cX + dirX * 12},${aY - 12} ${cX + dirX * 12},${aY}`}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              className="pointer-events-none"
            />
          )}

          <g className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => handlePointerDown(event, 'A')}>
            <circle cx={aX} cy={aY} r={14} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
            <polygon points={`${aX},${aY - 5} ${aX + 5},${aY} ${aX},${aY + 5} ${aX - 5},${aY}`} fill="#2563eb" className="pointer-events-none" />
            <text x={aX - 18} y={aY + 4} fill="#1e3a8a" fontSize="13" fontWeight="bold" className="pointer-events-none">
              A
            </text>
          </g>

          <g className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => handlePointerDown(event, 'B')}>
            <circle cx={bX} cy={aY} r={14} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
            <polygon points={`${bX},${aY - 5} ${bX + 5},${aY} ${bX},${aY + 5} ${bX - 5},${aY}`} fill="#2563eb" className="pointer-events-none" />
            <text x={bX + 12} y={aY + 4} fill="#1e3a8a" fontSize="13" fontWeight="bold" className="pointer-events-none">
              B
            </text>
          </g>

          <g className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => handlePointerDown(event, 'C')}>
            <circle cx={cX} cy={cY} r={14} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
            <polygon points={`${cX},${cY - 5} ${cX + 5},${cY} ${cX},${cY + 5} ${cX - 5},${cY}`} fill="#059669" className="pointer-events-none" />
            <text x={cX + 12} y={cY - 3} fill="#065f46" fontSize="13" fontWeight="bold" className="pointer-events-none">
              C
            </text>
          </g>

          {animProgress === 0 && (
            <>
              {showBase && (
                <g className="pointer-events-none">
                  <line x1={aX} y1={aY + 25} x2={bX} y2={aY + 25} stroke="#3b82f6" strokeDasharray="5,5" strokeWidth="2" />
                  <line x1={aX} y1={aY + 18} x2={aX} y2={aY + 32} stroke="#3b82f6" strokeWidth="2" />
                  <line x1={bX} y1={aY + 18} x2={bX} y2={aY + 32} stroke="#3b82f6" strokeWidth="2" />
                  <rect x={(aX + bX) / 2 - 35} y={aY + 35} width={70} height={24} fill="rgba(255,255,255,0.85)" rx={4} />
                  <text x={(aX + bX) / 2} y={aY + 52} fill="#1d4ed8" textAnchor="middle" className="text-sm font-bold">
                    b = {formatNum(base)}
                  </text>
                </g>
              )}

              {showHeight && (
                <g className="pointer-events-none">
                  <rect x={cX + 8} y={(cY + aY) / 2 - 12} width={70} height={24} fill="rgba(255,255,255,0.85)" rx={4} />
                  <text x={cX + 12} y={(cY + aY) / 2 + 5} fill="#c2410c" textAnchor="start" className="text-sm font-bold">
                    h = {formatNum(height)}
                  </text>
                </g>
              )}

              <foreignObject x="0" y={aY + 70} width={canvasW} height="100" className="pointer-events-none">
                <div className="flex h-full w-full items-start justify-center text-xl font-extrabold text-gray-900">
                  {!showBase && (
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-700">b</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">
                          2 x <span className="text-emerald-700">A</span>
                        </span>
                        <span className="pt-1 text-orange-700">h</span>
                      </div>
                      <span>=</span>
                      <span className="text-3xl text-blue-700">{formatNum(base)}</span>
                    </div>
                  )}

                  {!showHeight && (
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-700">h</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">
                          2 x <span className="text-emerald-700">A</span>
                        </span>
                        <span className="pt-1 text-blue-700">b</span>
                      </div>
                      <span>=</span>
                      <span className="text-3xl text-orange-700">{formatNum(height)}</span>
                    </div>
                  )}

                  {showBase && showHeight && (
                    <div className="flex items-center space-x-3">
                      <span className="text-emerald-700">Area</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-1 pb-1">1</span>
                        <span className="pt-1">2</span>
                      </div>
                      <span>x</span>
                      <span className="text-blue-700">b</span>
                      <span>x</span>
                      <span className="text-orange-700">h</span>
                      <span>=</span>
                      <span className="text-blue-700">{formatNum(base)}</span>
                      <span>x</span>
                      <span className="text-orange-700">{formatNum(height)}</span>
                      <span>=</span>
                      <span className="text-3xl text-emerald-700">{showArea ? formatNum(area) : '?'}</span>
                    </div>
                  )}
                </div>
              </foreignObject>
            </>
          )}
        </svg>

        {animProgress > 0 && (
          <div className="pointer-events-none absolute bottom-0 left-0 z-20 flex h-[90px] w-full flex-col items-center justify-center border-t-2 border-orange-200 bg-orange-50 shadow-inner">
            <div className="mb-1 text-[17px] font-bold text-orange-600">The triangle is exactly half of its bounding rectangle.</div>
            <div className="text-[17px] font-extrabold text-gray-900">
              Rectangle Area = <span className="text-blue-700">b</span> x <span className="text-orange-700">h</span> ={' '}
              <span className="text-blue-700">{formatNum(base)}</span> x <span className="text-orange-700">{formatNum(height)}</span> ={' '}
              {formatNum(base * height)}
            </div>
            <div className="mt-0.5 text-[15px] font-extrabold text-gray-900 opacity-80">
              Triangle Area = <span className="text-emerald-700">{formatNum(area)}</span> (Rectangle Area / 2)
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
