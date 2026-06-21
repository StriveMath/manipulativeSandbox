import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';

const getCookieSizeClass = (count: number) => {
  if (count <= 3) return 'text-xl';
  if (count <= 6) return 'text-lg';
  if (count <= 10) return 'text-base';
  if (count <= 18) return 'text-xs';
  if (count <= 30) return 'text-[9px] leading-3';
  return 'text-[7.5px] leading-2';
};

export default function RatiosUnitRate() {
  // 1. Core Mathematical State
  const [totalAmt, setTotalAmt] = useState<number>(20);
  const [groups, setGroups] = useState<number>(4);
  const [group1Count, setGroup1Count] = useState<number>(0);
  
  // Checking/Evaluation state
  const [applied, setApplied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Audio synths for sound feedback
  const playTone = (freq: number, duration: number) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // safe fallback
    }
  };

  // Reset check whenever inputs change
  useEffect(() => {
    setApplied(false);
  }, [totalAmt, groups, group1Count]);

  const handleAddCookie = () => {
    if (group1Count < 50) { // safe limit to fit cookies or stack compact for large rates up to 100 total capacity
      setGroup1Count(prev => prev + 1);
      playTone(523.25, 0.1); // C5 accent chirp
    }
  };

  const handleRemoveCookie = () => {
    if (group1Count > 0) {
      setGroup1Count(prev => prev - 1);
      playTone(392.00, 0.1); // G4 pop
    }
  };

  const handleApplyToAll = () => {
    if (group1Count === 0) {
      playTone(220, 0.3); // Alert tone
      return;
    }
    setApplied(true);
    const totalFilled = group1Count * groups;
    if (totalFilled === totalAmt) {
      // Golden major chord of success!
      setTimeout(() => playTone(523.25, 0.15), 0);
      setTimeout(() => playTone(659.25, 0.15), 80);
      setTimeout(() => playTone(783.99, 0.25), 160);
    } else {
      playTone(293.66, 0.2); // Disappointment pop
    }
  };

  const handleReset = () => {
    setGroup1Count(0);
    setApplied(false);
    playTone(329.63, 0.15); // E-flat pop
  };

  // Drag and Drop support
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", "single-cookie");
  };

  const handleDropToGroup1 = (e: React.DragEvent) => {
    e.preventDefault();
    handleAddCookie();
  };

  // Dynamically calculate grid columns/rows to optimize the visual presentation of jars
  const getGridLayout = () => {
    if (groups === 2) return 'grid-cols-2 grid-rows-1';
    if (groups === 3) return 'grid-cols-3 grid-rows-1';
    if (groups === 4) return 'grid-cols-4 grid-rows-1';
    if (groups === 5) return 'grid-cols-5 grid-rows-1';
    if (groups === 6) return 'grid-cols-6 grid-rows-1';
    if (groups === 7 || groups === 8) return 'grid-cols-4 grid-rows-2';
    if (groups === 9) return 'grid-cols-5 grid-rows-2';
    return 'grid-cols-4 grid-rows-3'; 
  };

  const totalFilledCount = group1Count * groups;

  return (
    <div className="w-[800px] h-[500px] bg-[#fafafc] text-[#334155] font-sans flex flex-col justify-between p-4 select-none overflow-hidden relative">
      
      {/* Sound toggle floating button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playTone(soundEnabled ? 350 : 550, 0.1);
          }}
          className={`p-1.5 rounded-full border transition-all cursor-pointer ${
            soundEnabled 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:text-emerald-800 shadow-3xs' 
              : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}
          title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
        >
          {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
        </button>
      </div>

      {/* Title Header Bar */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-1 shrink-0">
        <h1 className="text-sm font-extrabold tracking-tight text-[#4f46e5] flex items-center gap-1.5">
          🫙 Ratios and Unit Rates 🍪
        </h1>
        <div className="text-[9px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full mr-8">
          Interactive Rate Divider
        </div>
      </div>

      {/* Configuration & Ratio Equation Panel Row */}
      <div className="flex items-stretch justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shrink-0 shadow-3xs w-full">
        
        {/* Left Side: Question block */}
        <div className="flex-1 bg-indigo-50/45 border border-indigo-150 rounded-lg p-2 flex flex-col justify-center text-left">
          <span className="text-[8px] font-bold tracking-wider uppercase text-indigo-700 block mb-0.5">
            Problem Statement
          </span>
          <p className="text-[10px] text-slate-800 leading-relaxed font-bold">
            There are <span className="text-amber-800 font-extrabold">{totalAmt} cookies</span> in <span className="text-indigo-850 font-extrabold">{groups} {groups === 1 ? 'jar' : 'jars'}</span>, how many are in one jar? Drag cookies to jar 1 and divide them equally to find.
          </p>
        </div>

        {/* Middle: Sliders stacked one below the other */}
        <div className="w-[185px] shrink-0 flex flex-col justify-center gap-1 border-l border-r border-slate-200 px-3">
          {/* Slider 1: Total Cookies */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-amber-900 text-[9px] font-extrabold uppercase tracking-wider">Total Cookies</span>
              <span className="bg-amber-100 text-amber-950 border border-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded font-black shadow-3xs min-w-[26px] text-center">
                {totalAmt}
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="100"
              value={totalAmt}
              onChange={(e) => setTotalAmt(Number(e.target.value))}
              className="w-full h-1 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600 transition-colors"
            />
          </div>

          {/* Slider 2: Jars */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-indigo-900 text-[9px] font-extrabold uppercase tracking-wider">Jars</span>
              <span className="bg-indigo-100 text-indigo-950 border border-indigo-300 font-mono text-[10px] px-1.5 py-0.2 rounded font-black shadow-3xs min-w-[26px] text-center">
                {groups}
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              value={groups}
              onChange={(e) => setGroups(Number(e.target.value))}
              className="w-full h-1 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-700 transition-colors"
            />
          </div>
        </div>

        {/* Right Side: Dynamic Ratio Equation Card */}
        <div className="w-[245px] shrink-0 bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-around shadow-4xs">
          
          {/* Left Side: Ratio and Division */}
          <div className="flex flex-col items-center">
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ratio</div>
            <div className="text-xs font-black text-indigo-800 font-mono tracking-wide px-1.5 py-0.5 bg-amber-50/80 rounded-md border border-amber-200 leading-none">
              ({totalAmt} : {groups})
            </div>
            <div className="text-[9px] font-black text-slate-700 font-mono mt-0.5 bg-slate-100 px-1.5 py-0.5 border border-slate-205 rounded leading-none">
              {totalAmt} ÷ {groups}
            </div>
          </div>

          {/* Big styled Equal Sign */}
          <div className="flex flex-col items-center justify-center px-0.5">
            <span className="text-base font-black text-indigo-500 select-none leading-none">=</span>
            <span className="text-[6.5px] font-black uppercase text-indigo-400 tracking-wider">Equivalent</span>
          </div>

          {/* Right Side: Unit Rate Ratio ?:1 */}
          <div className="flex flex-col items-center">
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Unit Rate</div>
            <div className="text-xs font-black text-emerald-700 font-mono tracking-wide px-1.5 py-0.5 bg-emerald-50/80 rounded-md border border-emerald-200 leading-none">
              ({group1Count > 0 ? group1Count : "?"} : 1)
            </div>
            <div className="text-[9px] font-black text-slate-700 font-mono mt-0.5 bg-slate-100 px-1.5 py-0.5 border border-slate-205 rounded leading-none">
              {group1Count > 0 ? group1Count : "?"} ÷ 1
            </div>
          </div>

        </div>

      </div>

      {/* Main Square Container split into jar blocks */}
      <div className="flex-1 flex items-center justify-center min-h-0 my-1 relative">
        
        {/* Soft pastel canvas board */}
        <div className="w-full h-full max-h-[265px] border border-slate-300 rounded-2xl bg-white shadow-3xs relative overflow-hidden flex">
          
          <div className={`w-full h-full grid ${getGridLayout()}`}>
            {Array.from({ length: groups }).map((_, colIdx) => {
              const isGroup1 = colIdx === 0;
              const currentTokens = isGroup1 ? group1Count : (applied ? group1Count : 0);
 
              // Gray out classes logic
              const jarBorderClass = isGroup1 
                ? 'border border-amber-400 bg-amber-50/30 shadow-3xs' 
                : (applied 
                    ? 'border border-emerald-400 bg-emerald-50/35 shadow-3xs' 
                    : 'border border-slate-200 bg-slate-50 border-dashed text-slate-400 opacity-75'
                  );
 
              const jarLidClass = isGroup1 
                ? 'bg-amber-400' 
                : (applied 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-350'
                  );
 
              const labelClass = isGroup1 
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-black' 
                : (applied 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black' 
                    : 'bg-slate-105 text-slate-600 border-slate-200'
                  );
 
              const textCountClass = isGroup1 
                ? 'text-amber-800' 
                : (applied 
                    ? 'text-emerald-805' 
                    : 'text-slate-500 font-semibold'
                  );

              return (
                <div
                  key={`section-group-${colIdx}`}
                  onDragOver={(e) => {
                    if (isGroup1) e.preventDefault();
                  }}
                  onDrop={isGroup1 ? handleDropToGroup1 : undefined}
                  onClick={isGroup1 ? handleAddCookie : undefined}
                  className={`border border-[#e2e8f0] p-1 flex flex-col justify-center items-center relative transition-all duration-300 ${
                    isGroup1 
                      ? 'bg-amber-50/20 cursor-pointer hover:bg-amber-100/30' 
                      : (applied ? 'bg-[#fafafc]/35' : 'bg-slate-50/[0.02]')
                  }`}
                >
                  {/* BEAUTIFUL VIRTUAL COOKIE JAR DESIGN */}
                  <div className={`w-[96%] h-[96%] max-h-[210px] max-w-[105px] rounded-t-xl rounded-b-2xl border-2 relative flex flex-col justify-between p-1.5 shadow-3xs transition-all ${jarBorderClass}`}>
                    
                    {/* Jar Lid */}
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1/2 h-2.5 rounded-t-sm ${jarLidClass}`} />
                    
                    {/* JAR LABEL */}
                    <div className="text-center select-none shrink-0 m-0">
                      <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.2 rounded border ${labelClass}`}>
                        jar {colIdx + 1}
                      </span>
                    </div>

                    {/* Cookie Items inside Jar */}
                    <div className="flex-1 relative flex flex-wrap items-center justify-center content-center gap-1 overflow-hidden min-h-0 select-none py-1">
                      <AnimatePresence>
                        {Array.from({ length: currentTokens }).map((_, tokenIdx) => (
                          <motion.span
                            key={`col-${colIdx}-token-${tokenIdx}`}
                            initial={isGroup1 && !applied ? { scale: 0, y: -10 } : { scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 220, damping: 15 }}
                            onClick={(e) => {
                              if (isGroup1) {
                                e.stopPropagation();
                                handleRemoveCookie();
                              }
                            }}
                            className={`${getCookieSizeClass(currentTokens)} select-none shrink-0 cursor-pointer hover:scale-125 transition-transform`}
                            title={isGroup1 ? "Click to remove cookie" : ""}
                          >
                            🍪
                          </motion.span>
                        ))}
                      </AnimatePresence>

                      {/* Ghost preview suggestion */}
                      {!applied && !isGroup1 && group1Count > 0 && (
                        <div className="absolute inset-0 flex flex-wrap items-center justify-center content-center gap-1 opacity-10 pointer-events-none p-0.5 overflow-hidden select-none">
                          {Array.from({ length: group1Count }).map((_, index) => (
                            <span 
                              key={`ghost-slot-${index}`} 
                              className={`${getCookieSizeClass(group1Count)} shrink-0 grayscale opacity-75`}
                            >
                              🍪
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Empty Jar Info Text */}
                      {currentTokens === 0 && (!group1Count || isGroup1) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-30">
                          <span className={`text-[7px] font-black uppercase tracking-wider ${isGroup1 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {isGroup1 ? 'tap jar' : 'locked'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer badge count */}
                    <div className={`text-center text-[8px] font-mono font-black select-none shrink-0 ${textCountClass}`}>
                      {currentTokens} {currentTokens === 1 ? 'cookie' : 'cookies'}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* EVALUATION OUTCOMES BANNER */}
          {applied && (
            <div className="absolute inset-x-0 bottom-2.5 mx-auto w-10/12 max-w-xs bg-white border border-indigo-200 p-2 rounded-xl flex items-center justify-between gap-2 shadow-md z-30 select-text">
              <div className="flex items-center gap-2 min-w-0">
                {totalFilledCount === totalAmt ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Sparkles size={12} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-black text-emerald-900 leading-none">Perfect division! 🎉</h4>
                      <p className="text-[8.5px] text-slate-700 mt-0.5 truncate font-bold">
                        {group1Count} per jar divided {totalAmt} cookies!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                      <AlertCircle size={12} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-black text-rose-900 leading-none">
                        {totalFilledCount < totalAmt ? 'Underfilled!' : 'Overflow!'}
                      </h4>
                      <p className="text-[8.5px] text-slate-800 font-bold leading-none mt-0.5">
                        Got {totalFilledCount}, target is {totalAmt}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => setApplied(false)}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-black uppercase rounded-md cursor-pointer transition-colors shadow-2xs"
                >
                  Adjust
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Area: Cookie Jar Supply Box */}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-2 shrink-0 select-none">
        
        {/* Token supply pool long box */}
        <div 
          className="flex-1 min-h-[45px] border border-dashed border-indigo-200 rounded-xl bg-slate-50 p-1.5 flex items-center justify-center gap-2 relative shadow-4xs"
        >
          <span className="absolute -top-1.5 left-3 bg-[#fafafc] px-1.5 text-[7.5px] font-black text-indigo-700 uppercase tracking-widest leading-none">
            Cookie Supply Drawer
          </span>

          {/* Draggable Supply Cookies */}
          <div className="flex items-center justify-center gap-3 text-2xl leading-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <span 
                key={`supply-cookie-${i}`} 
                draggable="true"
                onDragStart={handleDragStart}
                onClick={handleAddCookie}
                className="cursor-pointer transition-transform duration-200 hover:scale-125 active:scale-95 inline-block hover:rotate-6 bg-amber-50/10 hover:bg-amber-100/10 p-0.5 rounded-full"
                title="Drag cookie or click to load Jar 1!"
              >
                🍪
              </span>
            ))}
          </div>
          
          <span className="text-[8px] font-extrabold text-indigo-700 uppercase ml-1 select-none tracking-tight">
            (Drag single cookie or click drawer)
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Apply to All */}
          <button
            onClick={handleApplyToAll}
            disabled={group1Count === 0 || applied}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 select-none text-white font-black text-[10px] uppercase tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            Apply To All
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-2.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors font-black text-[10px] uppercase tracking-wide flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
            title="Reset everything"
          >
            <RotateCcw size={10} strokeWidth={3} />
            Reset
          </button>
        </div>

      </div>

    </div>
  );
}
