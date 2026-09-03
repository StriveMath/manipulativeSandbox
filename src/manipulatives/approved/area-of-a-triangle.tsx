import React, { useState, useRef } from 'react';

// Reusable Checkbox Component for clean UI
const Checkbox = ({ label, checked, onChange, color }) => (
  <label className="flex items-center space-x-2 cursor-pointer select-none group">
    <div
      className={`w-5 h-5 flex items-center justify-center rounded transition-colors border-2 group-hover:border-gray-400`}
      style={{
        backgroundColor: checked ? color : 'white',
        borderColor: checked ? color : '#d1d5db'
      }}
    >
      {checked && (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className="text-gray-700 text-sm font-semibold">{label}</span>
  </label>
);

const Fraction = ({ numerator, denominator }) => (
  <span className="inline-flex flex-col items-center align-middle leading-none">
    <span className="w-full border-b-2 border-gray-900 px-0.5 pb-1 text-center">{numerator}</span>
    <span className="pt-1">{denominator}</span>
  </span>
);

export default function App() {
  const CANVAS_W = 800;
  const CANVAS_H = 388;
  const VISUAL_W = 560;
  const SCALE = 25;

  // Adjusted initial Y positions to be slightly higher so labels don't get covered by the banner
  const [aX, setAX] = useState(150);
  const [aY, setAY] = useState(250);
  const [bX, setBX] = useState(150 + 8 * SCALE);
  const [cX, setCX] = useState(150 + 3 * SCALE);
  const [cY, setCY] = useState(250 - 6 * SCALE);

  const [dragNode, setDragNode] = useState(null);

  // Toggles acting as "Solve For" switches
  const [showBase, setShowBase] = useState(true);
  const [showHeight, setShowHeight] = useState(true);
  const [showArea, setShowArea] = useState(true);

  const [animProgress, setAnimProgress] = useState(0);

  const svgRef = useRef(null);

  // Derived Values
  const basePixels = bX - aX;
  const heightPixels = aY - cY;

  const base = basePixels / SCALE;
  const height = heightPixels / SCALE;
  const area = 0.5 * base * height;
  const formatNum = (num) => parseFloat(num.toFixed(2));

  // Determine direction for right angle marker
  const dirX = cX < (aX + bX) / 2 ? 1 : -1;

  // Geometric logic for Proof Types
  const isCWithinBase = cX >= aX && cX <= bX;
  const isObtuseRight = cX > bX;

  // Midpoints for Rectangle folding animation (Acute/Right Triangles)
  const midLeftX = (aX + cX) / 2;
  const midLeftY = (aY + cY) / 2;
  const midRightX = (bX + cX) / 2;
  const midRightY = (aY + cY) / 2;

  const flipProgress = Math.min(animProgress / 0.45, 1);
  const cutProgress = Math.min(Math.max((animProgress - 0.45) / 0.13, 0), 1);
  const separationProgress = Math.min(Math.max((animProgress - 0.58) / 0.1, 0), 1);
  const slideProgress = Math.min(Math.max((animProgress - 0.68) / 0.32, 0), 1);
  const obtusePivotX = isObtuseRight ? midLeftX : midRightX;
  const obtusePivotY = isObtuseRight ? midLeftY : midRightY;
  const cutX = isObtuseRight ? bX : aX;
  const cutGap = 14 * separationProgress;
  const sliceShiftX = isObtuseRight
    ? cutGap - (basePixels + cutGap) * slideProgress
    : -cutGap + (basePixels + cutGap) * slideProgress;

  // Toggle Logic - Enforces only one "unknown" at a time
  const handleToggle = (field) => {
    if (field === 'base') {
      const next = !showBase;
      setShowBase(next);
      if (!next) { setShowHeight(true); setShowArea(true); }
    } else if (field === 'height') {
      const next = !showHeight;
      setShowHeight(next);
      if (!next) { setShowBase(true); setShowArea(true); }
    } else if (field === 'area') {
      const next = !showArea;
      setShowArea(next);
      if (!next) { setShowBase(true); setShowHeight(true); }
    }
  };

  const handlePointerDown = (e, node) => {
    e.target.setPointerCapture(e.pointerId);
    setDragNode(node);
    if (animProgress > 0) setAnimProgress(0);
  };

  const handlePointerMove = (e) => {
    if (!dragNode) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    const snap = SCALE / 2; // Snap to 0.5 to easily get whole and decimal numbers
    let newX = Math.round(cursorPt.x / snap) * snap;
    let newY = Math.round(cursorPt.y / snap) * snap;

    if (dragNode === 'A') {
      newX = Math.max(20, Math.min(newX, bX - snap));
      newY = Math.max(cY + snap, Math.min(newY, CANVAS_H - 70));
      setAX(newX);
      setAY(newY);
    } else if (dragNode === 'B') {
      newX = Math.max(aX + snap, Math.min(newX, VISUAL_W - 20));
      setBX(newX);
    } else if (dragNode === 'C') {
      newX = Math.max(20, Math.min(newX, VISUAL_W - 20));
      newY = Math.max(20, Math.min(newY, aY - snap));
      setCY(newY);
      setCX(newX);
    }
  };

  const handlePointerUp = () => setDragNode(null);

  // Generate grid lines
  const gridLines = [];
  for (let i = 0; i <= CANVAS_W; i += SCALE) {
    gridLines.push(<line key={`v${i}`} x1={i} y1={0} x2={i} y2={CANVAS_H} stroke="#f1f5f9" strokeWidth="1" />);
  }
  for (let i = 0; i <= CANVAS_H; i += SCALE) {
    gridLines.push(<line key={`h${i}`} x1={0} y1={i} x2={CANVAS_W} y2={i} stroke="#f1f5f9" strokeWidth="1" />);
  }

  return (
    <div className="relative flex h-[500px] w-[800px] select-none flex-col overflow-hidden rounded-xl border border-gray-200 bg-white font-sans shadow-xl">

        {/* Header and Controls */}
        <div className="z-10 flex h-[60px] shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6">
          <h1 className="text-[#0f172a] text-xl font-bold tracking-tight m-0">Triangle Area</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Visual proof</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(animProgress * 100)}
              onChange={(e) => setAnimProgress(parseFloat(e.target.value) / 100)}
              onInput={(e) => setAnimProgress(parseFloat(e.target.value) / 100)}
              className="w-[420px] cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Interactive Canvas Area */}
        <div className="flex-1 w-full bg-white relative cursor-crosshair overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <clipPath id="obtuse-stationary" clipPathUnits="userSpaceOnUse">
                <rect
                  x={isObtuseRight ? -CANVAS_W : aX}
                  y="0"
                  width={isObtuseRight ? CANVAS_W + bX : CANVAS_W - aX}
                  height={CANVAS_H}
                />
              </clipPath>
              <clipPath id="obtuse-moving" clipPathUnits="userSpaceOnUse">
                <rect
                  x={isObtuseRight ? bX : 0}
                  y="0"
                  width={isObtuseRight ? CANVAS_W - bX : aX}
                  height={CANVAS_H}
                />
              </clipPath>
            </defs>

            {/* Grid */}
            <g className="pointer-events-none">{gridLines}</g>
            <rect x={VISUAL_W} y="0" width={CANVAS_W - VISUAL_W} height={CANVAS_H} fill="#f8fafc" />
            <line x1={VISUAL_W} y1="0" x2={VISUAL_W} y2={CANVAS_H} stroke="#e2e8f0" strokeWidth="2" />

            {/* Base Line Extension (if C is outside bounds) */}
            {cX < aX && <line x1={cX} y1={aY} x2={aX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}
            {cX > bX && <line x1={bX} y1={aY} x2={cX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}

            {animProgress > 0 && isCWithinBase && (
              <>
                <rect
                  x={aX} y={cY} width={basePixels} height={heightPixels}
                  fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4,4"
                  opacity={animProgress}
                  className="pointer-events-none"
                />
                {cX > aX && (
                  <polygon
                    points={`${aX},${aY} ${cX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.15)"
                    stroke="#f97316" strokeWidth="1.5"
                    transform={`rotate(${180 * animProgress}, ${midLeftX}, ${midLeftY})`}
                    className="pointer-events-none"
                  />
                )}
                {cX < bX && (
                  <polygon
                    points={`${bX},${aY} ${cX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.15)"
                    stroke="#f97316" strokeWidth="1.5"
                    transform={`rotate(${-180 * animProgress}, ${midRightX}, ${midRightY})`}
                    className="pointer-events-none"
                  />
                )}
              </>
            )}

            {animProgress > 0 && !isCWithinBase && (
              <>
                <g clipPath="url(#obtuse-stationary)">
                  <polygon
                    points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
                    fill="rgba(16, 185, 129, 0.15)"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="pointer-events-none"
                  />
                  <polygon
                    points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.18)"
                    stroke="#f97316"
                    strokeWidth="2"
                    transform={`rotate(${isObtuseRight ? 180 * flipProgress : -180 * flipProgress}, ${obtusePivotX}, ${obtusePivotY})`}
                    className="pointer-events-none"
                  />
                </g>
                <g clipPath="url(#obtuse-moving)" transform={`translate(${sliceShiftX}, 0)`}>
                  <polygon
                    points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
                    fill="rgba(16, 185, 129, 0.15)"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="pointer-events-none"
                  />
                  <polygon
                    points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.18)"
                    stroke="#f97316"
                    strokeWidth="2"
                    transform={`rotate(${isObtuseRight ? 180 * flipProgress : -180 * flipProgress}, ${obtusePivotX}, ${obtusePivotY})`}
                    className="pointer-events-none"
                  />
                </g>
                <line
                  x1={cutX}
                  y1={cY}
                  x2={cutX}
                  y2={cY + (aY - cY) * cutProgress}
                  stroke="#475569"
                  strokeWidth="2"
                  opacity={cutProgress}
                  className="pointer-events-none"
                />
                <line
                  x1={cutX}
                  y1={cY}
                  x2={cutX}
                  y2={cY + (aY - cY) * cutProgress}
                  stroke="#475569"
                  strokeWidth="2"
                  opacity={cutProgress}
                  transform={`translate(${sliceShiftX}, 0)`}
                  className="pointer-events-none"
                />
              </>
            )}

            {(animProgress === 0 || isCWithinBase) && (
              <polygon
                points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
                fill="rgba(16, 185, 129, 0.15)"
                stroke="#10b981"
                strokeWidth="2"
                className="pointer-events-none"
              />
            )}

            {/* Bold Base Line */}
            <line x1={aX} y1={aY} x2={bX} y2={aY} stroke="#3b82f6" strokeWidth="3" className="pointer-events-none" />

            {/* Dashed Height Line from C to Base (Orange) */}
            <line x1={cX} y1={cY} x2={cX} y2={aY} stroke="#f97316" strokeDasharray="5,5" strokeWidth="2" className="pointer-events-none" />

            {/* Right Angle Marker */}
            {height > 0 && (
              <polyline
                points={`${cX},${aY - 12} ${cX + dirX * 12},${aY - 12} ${cX + dirX * 12},${aY}`}
                fill="none" stroke="#f97316" strokeWidth="2" className="pointer-events-none"
              />
            )}

            {/* Point A (Draggable) */}
            <g className="cursor-grab active:cursor-grabbing" onPointerDown={(e) => handlePointerDown(e, 'A')}>
              <circle cx={aX} cy={aY} r={14} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" className="hover:fill-[rgba(59,130,246,0.3)] transition-colors"/>
              <polygon points={`${aX},${aY-5} ${aX+5},${aY} ${aX},${aY+5} ${aX-5},${aY}`} fill="#2563eb" className="pointer-events-none" />
              <text x={aX - 18} y={aY + 4} fill="#1e3a8a" fontSize="13" fontWeight="bold" className="pointer-events-none">A</text>
            </g>

            {/* Point B (Draggable) */}
            <g className="cursor-grab active:cursor-grabbing" onPointerDown={(e) => handlePointerDown(e, 'B')}>
              <circle cx={bX} cy={aY} r={14} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" className="hover:fill-[rgba(59,130,246,0.3)] transition-colors"/>
              <polygon points={`${bX},${aY-5} ${bX+5},${aY} ${bX},${aY+5} ${bX-5},${aY}`} fill="#2563eb" className="pointer-events-none" />
              <text x={bX + 12} y={aY + 4} fill="#1e3a8a" fontSize="13" fontWeight="bold" className="pointer-events-none">B</text>
            </g>

            {/* Point C (Draggable) */}
            <g className="cursor-grab active:cursor-grabbing" onPointerDown={(e) => handlePointerDown(e, 'C')}>
              <circle cx={cX} cy={cY} r={14} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" className="hover:fill-[rgba(16,185,129,0.3)] transition-colors"/>
              <polygon points={`${cX},${cY-5} ${cX+5},${cY} ${cX},${cY+5} ${cX-5},${cY}`} fill="#059669" className="pointer-events-none" />
              <text x={cX + 12} y={cY - 3} fill="#065f46" fontSize="13" fontWeight="bold" className="pointer-events-none">C</text>
            </g>

            {/* Dimension Lines & Labels (Kept visible during animation) */}

            {/* Base Dimension with T-caps */}
            {showBase && (
              <g className="pointer-events-none">
                <line x1={aX} y1={aY + 25} x2={bX} y2={aY + 25} stroke="#3b82f6" strokeDasharray="5,5" strokeWidth="2" />
                <line x1={aX} y1={aY + 18} x2={aX} y2={aY + 32} stroke="#3b82f6" strokeWidth="2" />
                <line x1={bX} y1={aY + 18} x2={bX} y2={aY + 32} stroke="#3b82f6" strokeWidth="2" />
                <rect x={(aX + bX)/2 - 35} y={aY + 35} width={70} height={24} fill="rgba(255,255,255,0.85)" rx={4}/>
                <text x={(aX + bX) / 2} y={aY + 52} fill="#1d4ed8" textAnchor="middle" className="font-bold text-sm">
                  b = {showBase ? formatNum(base) : '?'}
                </text>
              </g>
            )}

            {/* Height Label positioned on the line */}
            {showHeight && (() => {
              const labelX = Math.min(cX + 8, VISUAL_W - 78);
              const labelY = (cY + aY)/2 - 12;
              return (
                <g className="pointer-events-none">
                  <rect x={labelX} y={labelY} width={70} height={24} fill="rgba(255,255,255,0.85)" rx={4}/>
                  <text x={labelX + 4} y={labelY + 17} fill="#c2410c" textAnchor="start" className="font-bold text-sm">
                    h = {showHeight ? formatNum(height) : '?'}
                  </text>
                </g>
              );
            })()}

            {animProgress > 0 && isCWithinBase && showHeight && (() => {
              const labelX = Math.min(bX + 8, VISUAL_W - 78);
              const labelY = (cY + aY)/2 - 12;
              return (
                <g className="pointer-events-none">
                  <rect x={labelX} y={labelY} width={70} height={24} fill="rgba(255,255,255,0.85)" rx={4}/>
                  <text x={labelX + 4} y={labelY + 17} fill="#c2410c" textAnchor="start" className="font-bold text-sm">
                    h = {formatNum(height)}
                  </text>
                </g>
              );
            })()}

            <foreignObject x="570" y="24" width="220" height="340" className="pointer-events-none">
                <div className="flex h-full w-full flex-col items-center justify-center font-extrabold text-[20px] text-gray-900">

                  {!showBase && (
                    <div className="flex w-full flex-col items-center gap-4">
                      <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700/60">Base</span>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <Fraction numerator={<>2 &times; <span className="text-emerald-700">A</span></>} denominator={<span className="text-orange-700">h</span>} />
                      </div>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <Fraction numerator={<>2 &times; <span className="text-emerald-700">{formatNum(area)}</span></>} denominator={<span className="text-orange-700">{formatNum(height)}</span>} />
                      </div>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <span className="text-blue-700 text-xl">{formatNum(base)}</span>
                      </div>
                    </div>
                  )}

                  {!showHeight && (
                    <div className="flex w-full flex-col items-center gap-4">
                      <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700/60">Height</span>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <Fraction numerator={<>2 &times; <span className="text-emerald-700">A</span></>} denominator={<span className="text-blue-700">b</span>} />
                      </div>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <Fraction numerator={<>2 &times; <span className="text-emerald-700">{formatNum(area)}</span></>} denominator={<span className="text-blue-700">{formatNum(base)}</span>} />
                      </div>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <span className="text-orange-700 text-xl">{formatNum(height)}</span>
                      </div>
                    </div>
                  )}

                  {(showBase && showHeight) && (
                    <div className="flex w-full flex-col items-center gap-4">
                      <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/60">Area</span>
                      <div className="grid grid-cols-[18px_28px_18px_42px_18px_42px] items-center justify-center gap-x-1">
                        <span>=</span>
                        <Fraction numerator="1" denominator="2" />
                        <span>&times;</span>
                        <span className="text-center text-blue-700">b</span>
                        <span>&times;</span>
                        <span className="text-center text-orange-700">h</span>
                      </div>
                      <div className="grid grid-cols-[18px_28px_18px_42px_18px_42px] items-center justify-center gap-x-1">
                        <span>=</span>
                        <Fraction numerator="1" denominator="2" />
                        <span>&times;</span>
                        <span className="text-center text-blue-700">{formatNum(base)}</span>
                        <span>&times;</span>
                        <span className="text-center text-orange-700">{formatNum(height)}</span>
                      </div>
                      <div className="grid grid-cols-[18px_auto] items-center gap-x-2">
                        <span>=</span>
                        <span className="text-emerald-700 text-xl">{showArea ? formatNum(area) : '?'}</span>
                      </div>
                    </div>
                  )}

                </div>
              </foreignObject>

          </svg>

        </div>

        <div className="flex h-[52px] shrink-0 items-center justify-center gap-12 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <div onClick={() => handleToggle('base')}>
            <Checkbox label="Base" checked={showBase} color="#3b82f6" />
          </div>
          <div onClick={() => handleToggle('height')}>
            <Checkbox label="Height" checked={showHeight} color="#f97316" />
          </div>
          <div onClick={() => handleToggle('area')}>
            <Checkbox label="Area" checked={showArea} color="#10b981" />
          </div>
        </div>
      </div>
  );
}
