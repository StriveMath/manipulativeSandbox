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

export default function App() {
  const CANVAS_W = 800;
  const CANVAS_H = 440;
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

  // Animation Slider State (0 to 1)
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
  const isObtuseLeft = cX < aX;

  // Midpoints for Rectangle folding animation (Acute/Right Triangles)
  const midLeftX = (aX + cX) / 2;
  const midLeftY = (aY + cY) / 2;
  const midRightX = (bX + cX) / 2;
  const midRightY = (aY + cY) / 2;

  // Dimensions for Subtraction Proof (Obtuse Triangles)
  const bigBasePixels = isObtuseRight ? cX - aX : bX - cX;
  const smallBasePixels = isObtuseRight ? cX - bX : aX - cX;
  const bigBase = bigBasePixels / SCALE;
  const smallBase = smallBasePixels / SCALE;
  const bigArea = 0.5 * bigBase * height;
  const smallArea = 0.5 * smallBase * height;

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
      // Increased the bottom margin constraint (CANVAS_H - 170) to prevent the base label from being pushed under the banner
      newY = Math.max(cY + snap, Math.min(newY, CANVAS_H - 170));
      setAX(newX);
      setAY(newY);
    } else if (dragNode === 'B') {
      newX = Math.max(aX + snap, Math.min(newX, CANVAS_W - 20));
      setBX(newX);
    } else if (dragNode === 'C') {
      newX = Math.max(20, Math.min(newX, CANVAS_W - 20));
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
    // Full screen centering wrapper
    <div className="min-h-screen w-full bg-[#eef2f6] flex items-center justify-center p-4">

      {/* Fixed 800x500 Module */}
      <div className="w-[800px] h-[500px] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col font-sans select-none overflow-hidden relative">

        {/* Header and Controls */}
        <div className="h-[60px] bg-[#f8fafc] px-6 border-b border-[#e2e8f0] flex justify-between items-center z-10 shrink-0">
          <h1 className="text-[#0f172a] text-xl font-bold tracking-tight m-0">Triangle Area</h1>

          <div className="flex space-x-6 items-center">
            <div onClick={() => handleToggle('base')}>
              <Checkbox label="Base" checked={showBase} color="#3b82f6" />
            </div>
            <div onClick={() => handleToggle('height')}>
              <Checkbox label="Height" checked={showHeight} color="#f97316" />
            </div>
            <div onClick={() => handleToggle('area')}>
              <Checkbox label="Area" checked={showArea} color="#10b981" />
            </div>

            {/* Dynamic Proof Animation Slider */}
            <div className="flex items-center space-x-2 ml-4 border-l border-gray-300 pl-6">
              <span className="text-sm font-semibold text-gray-700">Visual Proof:</span>
              <input
                type="range"
                min="0" max="100"
                value={Math.round(animProgress * 100)}
                onChange={(e) => setAnimProgress(parseFloat(e.target.value) / 100)}
                onInput={(e) => setAnimProgress(parseFloat(e.target.value) / 100)}
                className="w-24 cursor-pointer accent-orange-500"
              />
            </div>
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
            {/* Grid */}
            <g className="pointer-events-none">{gridLines}</g>

            {/* Base Line Extension (if C is outside bounds) */}
            {cX < aX && <line x1={cX} y1={aY} x2={aX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}
            {cX > bX && <line x1={bX} y1={aY} x2={cX} y2={aY} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2" />}

            {/* --- VISUAL PROOF LOGIC --- */}

            {/* 1. Rectangle Proof (For Acute/Right Triangles) */}
            {animProgress > 0 && isCWithinBase && (
              <>
                <rect
                  x={aX} y={cY} width={basePixels} height={heightPixels}
                  fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4,4"
                  opacity={animProgress} className="pointer-events-none transition-none"
                />
                {cX > aX && (
                  <polygon
                    points={`${aX},${aY} ${cX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.15)"
                    stroke="#f97316" strokeWidth="1.5"
                    transform={`rotate(${180 * animProgress}, ${midLeftX}, ${midLeftY})`}
                    className="pointer-events-none transition-none"
                  />
                )}
                {cX < bX && (
                  <polygon
                    points={`${bX},${aY} ${cX},${aY} ${cX},${cY}`}
                    fill="rgba(249, 115, 22, 0.15)"
                    stroke="#f97316" strokeWidth="1.5"
                    transform={`rotate(${-180 * animProgress}, ${midRightX}, ${midRightY})`}
                    className="pointer-events-none transition-none"
                  />
                )}
              </>
            )}

            {/* 2. Subtraction Proof (For Obtuse Triangles) */}
            {animProgress > 0 && !isCWithinBase && (
              <>
                {/* Big bounding right triangle (Dashed Blue) */}
                <polygon
                  points={isObtuseRight ? `${aX},${aY} ${cX},${aY} ${cX},${cY}` : `${bX},${aY} ${cX},${aY} ${cX},${cY}`}
                  fill="rgba(59, 130, 246, 0.05)"
                  stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4"
                  opacity={animProgress}
                  className="pointer-events-none transition-none"
                />
                {/* Small empty triangle that gets subtracted (Animated Red) */}
                <polygon
                  points={isObtuseRight ? `${bX},${aY} ${cX},${aY} ${cX},${cY}` : `${aX},${aY} ${cX},${aY} ${cX},${cY}`}
                  fill="rgba(239, 68, 68, 0.25)"
                  stroke="#ef4444" strokeWidth="1.5"
                  transform={`translate(0, ${animProgress * 50})`}
                  opacity={1 - (animProgress * 0.7)}
                  className="pointer-events-none transition-none"
                />
              </>
            )}

            {/* Main Original Triangle */}
            <polygon
              points={`${aX},${aY} ${bX},${aY} ${cX},${cY}`}
              fill="rgba(16, 185, 129, 0.15)"
              stroke="#10b981"
              strokeWidth="2"
              className="pointer-events-none"
            />

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

            {/* Small Base Dimension for Subtraction Proof */}
            {animProgress > 0 && !isCWithinBase && (
              <g className="pointer-events-none" opacity={animProgress}>
                <line
                  x1={isObtuseRight ? bX : cX} y1={aY + 25}
                  x2={isObtuseRight ? cX : aX} y2={aY + 25}
                  stroke="#ef4444" strokeDasharray="5,5" strokeWidth="2"
                />
                <line x1={isObtuseRight ? bX : cX} y1={aY + 18} x2={isObtuseRight ? bX : cX} y2={aY + 32} stroke="#ef4444" strokeWidth="2" />
                <line x1={isObtuseRight ? cX : aX} y1={aY + 18} x2={isObtuseRight ? cX : aX} y2={aY + 32} stroke="#ef4444" strokeWidth="2" />
                <rect x={(isObtuseRight ? (bX + cX)/2 : (aX + cX)/2) - 25} y={aY + 35} width={50} height={24} fill="rgba(255,255,255,0.85)" rx={4}/>
                <text x={isObtuseRight ? (bX + cX)/2 : (aX + cX)/2} y={aY + 52} fill="#ef4444" textAnchor="middle" className="font-bold text-sm">
                  {formatNum(smallBase)}
                </text>
              </g>
            )}

            {/* Height Label positioned on the line */}
            {showHeight && (() => {
              const labelX = cX + 8;
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

            {/* Standard Area Formula (Hidden during animation to make room for proof banners) */}
            {animProgress === 0 && (
              <foreignObject x="0" y={aY + 70} width={CANVAS_W} height="100" className="pointer-events-none">
                <div className="w-full h-full flex justify-center items-start font-extrabold text-xl md:text-2xl text-gray-900">

                  {!showBase && (
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-700">b</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">2 &times; <span className="text-emerald-700">A</span></span>
                        <span className="text-orange-700 pt-1">h</span>
                      </div>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">2 &times; <span className="text-emerald-700">{formatNum(area)}</span></span>
                        <span className="text-orange-700 pt-1">{formatNum(height)}</span>
                      </div>
                      <span>=</span>
                      <span className="text-blue-700 text-3xl">{formatNum(base)}</span>
                    </div>
                  )}

                  {!showHeight && (
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-700">h</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">2 &times; <span className="text-emerald-700">A</span></span>
                        <span className="text-blue-700 pt-1">b</span>
                      </div>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-2 pb-1">2 &times; <span className="text-emerald-700">{formatNum(area)}</span></span>
                        <span className="text-blue-700 pt-1">{formatNum(base)}</span>
                      </div>
                      <span>=</span>
                      <span className="text-orange-700 text-3xl">{formatNum(height)}</span>
                    </div>
                  )}

                  {(showBase && showHeight) && (
                    <div className="flex items-center space-x-3">
                      <span className="text-emerald-700">Area</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-1 pb-1">1</span>
                        <span className="pt-1">2</span>
                      </div>
                      <span>&times;</span>
                      <span className="text-blue-700">b</span>
                      <span>&times;</span>
                      <span className="text-orange-700">h</span>
                      <span>=</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="border-b-[2.5px] border-gray-900 px-1 pb-1">1</span>
                        <span className="pt-1">2</span>
                      </div>
                      <span>&times;</span>
                      <span className="text-blue-700">{formatNum(base)}</span>
                      <span>&times;</span>
                      <span className="text-orange-700">{formatNum(height)}</span>
                      <span>=</span>
                      <span className="text-emerald-700 text-3xl">{showArea ? formatNum(area) : '?'}</span>
                    </div>
                  )}

                </div>
              </foreignObject>
            )}
          </svg>

          {/* Dynamic Proof Banners */}
          {animProgress > 0 && (
            <div className={`absolute bottom-0 left-0 w-full ${isCWithinBase ? 'h-[90px]' : 'h-[105px]'} bg-[#fff7ed] border-t-2 border-[#fed7aa] flex flex-col items-center justify-center pointer-events-none z-20 shadow-inner`}>

               {isCWithinBase ? (
                 <>
                   <div className="text-[#d97706] font-bold text-[17px] mb-1">
                     The triangle is exactly half of its bounding rectangle!
                   </div>
                   <div className="text-gray-900 font-extrabold text-[17px]">
                     Rectangle Area = <span className="text-blue-700">b</span> &times; <span className="text-orange-700">h</span> = <span className="text-blue-700">{formatNum(base)}</span> &times; <span className="text-orange-700">{formatNum(height)}</span> = {formatNum(base * height)}
                   </div>
                   <div className="text-gray-900 font-extrabold text-[15px] mt-0.5 opacity-80">
                     Triangle Area = <span className="text-emerald-700">{formatNum(area)}</span> (Rectangle Area &divide; 2)
                   </div>
                 </>
               ) : (
                 <>
                   <div className="text-[#d97706] font-bold text-[17px] mb-1">
                     Subtraction Proof (Obtuse Triangles)
                   </div>
                   <div className="text-gray-900 font-extrabold text-[16px] mb-1">
                     <span className="text-blue-600">Large Triangle</span> &minus; <span className="text-red-500">Small Triangle</span> = <span className="text-emerald-600">Main Area</span>
                   </div>
                   <div className="flex items-center space-x-2 text-gray-900 font-extrabold text-[15px]">
                     <span className="text-blue-600">&frac12; &times; ({formatNum(bigBase)} &times; {formatNum(height)})</span>
                     <span>&minus;</span>
                     <span className="text-red-500">&frac12; &times; ({formatNum(smallBase)} &times; {formatNum(height)})</span>
                     <span>=</span>
                     <span>{formatNum(bigArea)} &minus; {formatNum(smallArea)}</span>
                     <span>=</span>
                     <span className="text-emerald-600 text-xl">{formatNum(area)}</span>
                   </div>
                 </>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
