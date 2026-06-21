/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator,
  Volume2, 
  VolumeX
} from 'lucide-react';
import { motion } from 'motion/react';

import { PartitionType } from './types';
import { getFraction, snapValue, soundEffects } from './utils';

import LiquidBar from './components/LiquidBar';
import { PercentGridCard, DecimalBlocksCard, FractionShapeCard } from './components/EquivalenceCards';

export default function App() {
  const [value, setValue] = useState<number>(60.0); // Start at 60%
  const [partition, setPartition] = useState<PartitionType>('free');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [wholeAmount, setWholeAmount] = useState<number>(100); // Start at 100 (standard base value)

  // Synchronize audio availability state
  useEffect(() => {
    soundEffects.enabled = soundEnabled;
  }, [soundEnabled]);

  // Handle snapping whenever value or partition snap-mode adjustments occur
  const triggerValueChange = (newRawVal: number, playTicks: boolean = true) => {
    const snapped = snapValue(newRawVal, partition);
    setValue(snapped);
    
    if (playTicks) {
      if (snapped === 0 || snapped === 100 || snapped === 50 || snapped === 25 || snapped === 75) {
        soundEffects.playSuccess();
      } else {
        soundEffects.playClick();
      }
    }
  };

  const handleSliderDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderVal = parseFloat(e.target.value);
    triggerValueChange(sliderVal, true);
  };

  const handlePartitionChange = (mode: PartitionType) => {
    setPartition(mode);
    soundEffects.playSwitch();
    // Resnap current value to newly chosen grid boundary
    const snapped = snapValue(value, mode);
    setValue(snapped);
  };

  const activeFraction = getFraction(value);

  // Preset button options for visual partition counts
  const partitionBtns: { label: string; mode: PartitionType }[] = [
    { label: 'Free Play', mode: 'free' },
    { label: '1/2', mode: '2' },
    { label: '1/3', mode: '3' },
    { label: '1/4', mode: '4' },
    { label: '1/5', mode: '5' },
    { label: '1/8', mode: '8' },
    { label: '1/10', mode: '10' },
  ];

  // For step-by-step calculations
  const calculatedVal = (value / 100) * wholeAmount;
  const isFloat = calculatedVal % 1 !== 0;
  const formattedCalc = calculatedVal.toFixed(isFloat ? (calculatedVal % 0.1 === 0 ? 1 : 2) : 0);

  return (
    <div className="min-h-screen bg-[#050918] text-slate-800 font-sans overflow-hidden selection:bg-blue-200 select-none">
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-[254px_minmax(0,1fr)] bg-[linear-gradient(rgba(72,94,140,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(72,94,140,0.12)_1px,transparent_1px)] bg-[size:48px_48px]">
        <aside className="hidden md:flex bg-[#111827]/95 border-r border-slate-700/70 text-white p-5 flex-col">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
              Sandbox Environment
            </p>
            <div className="flex items-center gap-2 text-base font-black">
              <Calculator className="w-4 h-4 text-amber-300" />
              <span>Math Manipulatives</span>
            </div>
          </div>

          <div className="h-px bg-slate-700/80 my-6" />

          <nav className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-200">
              Active Tools
            </p>
            <button className="w-full rounded-lg bg-indigo-600 px-3.5 py-3 text-left text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30">
              Percent Decimal Fraction
            </button>
            <button className="w-full rounded-lg px-3.5 py-3 text-left text-sm font-semibold text-slate-400">
              Factor Tree
            </button>
            <button className="w-full rounded-lg px-3.5 py-3 text-left text-sm font-semibold text-slate-400">
              Two Factor Trees
            </button>
          </nav>

          <div className="mt-auto rounded-xl bg-[#0b1224] border border-slate-800 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
              Instructions
            </p>
            <p className="mt-3 text-xs leading-5 text-blue-200/80">
              Select any model from the list. The sandbox guarantees fluid sizing and real-time state preservation inside the workspace canvas.
            </p>
          </div>
        </aside>

        <main className="min-w-0 h-screen px-4 py-4 md:px-10 lg:px-16 flex flex-col items-center overflow-hidden">
          <div className="rounded-full bg-indigo-950/90 border border-indigo-500/30 px-4 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300">
            Active Workspace
          </div>
          <h1 className="mt-2 text-center text-2xl font-black text-white drop-shadow">
            Percent Decimal Fraction Manipulative
          </h1>

          <section className="mt-4 w-full max-w-[900px] h-[min(600px,calc(100vh-120px))] min-h-[560px] rounded-[18px] border border-slate-300/90 bg-slate-100 p-4 shadow-2xl shadow-black/40 overflow-hidden">
      
      {/* Main Adaptive Workspace Center Container */}
      <div className="w-full h-full bg-slate-50 border border-slate-200/80 rounded-[14px] shadow-sm overflow-hidden flex flex-col p-3 justify-between relative gap-1.5">
        
        {/* TOP LEVEL TOOLBAR ROW */}
        <header className="relative bg-white border border-slate-200/80 px-4 py-2 lg:py-1.5 rounded-2xl shadow-sm flex items-center justify-between gap-4 overflow-hidden select-none shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-display font-black text-slate-950 tracking-tight">
              Conversion between Percents, Fractions and Decimals
            </h1>
          </div>

          {/* Quick Settings Selection */}
          <div className="flex items-center gap-2 relative z-10">
            {/* Toggle Audio Sound effects */}
            <button
              id="soundButton"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}
              title={soundEnabled ? "Mute sounds" : "Enable sound effects"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* UNIFIED SANDBOX SYSTEM CONTROLS (LIQUID BAR, GRID SNAP, & TARGET WHOLE) */}
        <section className="bg-white border border-slate-200/80 p-2 lg:p-2.5 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-4 items-center shrink-0 select-none">
          {/* Column 1: Liquid Fill Volume tank */}
          <div className="w-full lg:w-[35%] space-y-1 text-left">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Interactive Fluid Volume Unit
            </span>
            <LiquidBar 
              value={value} 
              partition={partition} 
              onTickClick={(clickPct) => triggerValueChange(clickPct, true)}
              compact={true}
            />
            {/* Range Slider Knob */}
            <div className="relative py-1">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-slate-200 rounded-full" />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={value}
                onChange={handleSliderDrag}
                className="w-full relative z-10 appearance-none bg-transparent cursor-grab active:cursor-grabbing focus:outline-none h-4
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
          </div>

          {/* Column 2: Grid Snap subdivisions */}
          <div className="w-full lg:w-[42%] space-y-1.5 text-left lg:border-l lg:border-slate-100 lg:pl-4">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Grid Snap Locking (Part-Whole Divisions)
            </span>
            <div className="flex flex-wrap gap-1">
              {partitionBtns.map((btn) => (
                <button
                  key={btn.mode}
                  onClick={() => handlePartitionChange(btn.mode)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    partition === btn.mode
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Reference Target Whole Configurator */}
          <div className="w-full lg:w-[23%] space-y-1.5 text-left lg:border-l lg:border-slate-100 lg:pl-4">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Target Whole
              </span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                <span className="text-[9px] text-slate-400 font-bold font-mono">Qty:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="2000" 
                  value={wholeAmount}
                  onChange={(e) => {
                    const val = Math.min(2000, Math.max(1, parseInt(e.target.value) || 1));
                    setWholeAmount(val);
                  }}
                  className="w-10 bg-transparent text-right font-mono font-bold text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none rounded"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {[100, 200, 300, 500].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setWholeAmount(preset);
                    soundEffects.playSuccess();
                  }}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-lg border transition-all ${
                    wholeAmount === preset
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* WORKSPACE VIEW AREA */}
        <div className="flex-1 min-h-0 lg:overflow-hidden select-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 h-full">
            {/* Percent Card */}
            <PercentGridCard value={value} compact={true} wholeAmount={wholeAmount} />

            {/* Decimal Card */}
            <DecimalBlocksCard value={value} compact={true} wholeAmount={wholeAmount} />

            {/* Fraction Card */}
            <FractionShapeCard fraction={activeFraction} compact={true} wholeAmount={wholeAmount} />
          </div>
        </div>

      </div>
          </section>

          <p className="mt-4 text-[11px] font-mono text-blue-200/70">
            Viewport Resolution: 800 x 500 px (Device Responsive)
          </p>
        </main>
      </div>
    </div>
  );
}
