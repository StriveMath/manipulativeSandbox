/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { FractionResult } from '../types';

interface PercentGridCardProps {
  value: number;
  compact?: boolean;
  wholeAmount?: number;
}

export function PercentGridCard({ value, compact = false, wholeAmount }: PercentGridCardProps) {
  const roundedPercent = Math.round(value);
  const calculated = (value / 100) * (wholeAmount !== undefined ? wholeAmount : 100);
  const formattedCalc = calculated % 1 === 0 ? calculated.toFixed(0) : calculated.toFixed(1);

  return (
    <div className={`bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between overflow-hidden relative transition-all ${compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2.5'}`}>
      <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
        {/* Card Header Info */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Percent Form
          </span>
          {!compact && (
            <span className="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">
              Base 100 Ratio
            </span>
          )}
        </div>

        {/* Dynamic Big Label */}
        <div className={`text-center select-all ${compact ? 'py-0.5' : 'py-0.5'}`}>
          <span className={`font-black text-indigo-600 ${compact ? 'text-3xl' : 'text-4xl'}`}>
            {value.toFixed(value % 1 === 0 ? 0 : 1)}%
          </span>
        </div>

        {/* Grid Model 10x10 */}
        <div className={`flex justify-center select-none ${compact ? 'py-0.5' : 'py-0.5'}`}>
          <div className={`grid grid-cols-10 grid-rows-10 bg-slate-50 border border-slate-200 rounded-lg shadow-inner ${compact ? 'gap-[1.5px] p-1' : 'gap-0.5 p-1'}`}>
            {Array.from({ length: 100 }).map((_, index) => {
              const isFilled = index < roundedPercent;
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0.82 }}
                  animate={{ 
                  scale: 1, 
                    backgroundColor: isFilled ? '#6366f1' : '#e2e8f0' 
                  }}
                  transition={{ duration: 0.1 }}
                  className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-sm`}
                />
              );
            })}
          </div>
        </div>


      </div>

      <div className="border-t border-slate-100/80 text-center mt-2.5 pt-2 flex flex-col items-center gap-1">
        <div className="flex items-center flex-wrap justify-center gap-2 font-mono font-bold text-xs md:text-sm text-indigo-700 bg-indigo-50/70 px-3 py-1.5 rounded-xl shadow-sm">
          <span>{value.toFixed(value % 1 === 0 ? 0 : 1)}%</span>
          <span className="text-indigo-400 font-sans font-medium text-xs">of</span>
          <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          <span className="text-indigo-500 font-sans font-medium">=</span>
          <div className="inline-flex items-center gap-1">
            <div className="flex flex-col items-center leading-none text-[10px] md:text-xs">
              <span>{value.toFixed(value % 1 === 0 ? 0 : 1)}</span>
              <span className="w-5 md:w-6 bg-indigo-300 h-[1.5px] my-0.5" />
              <span>100</span>
            </div>
            <span className="text-indigo-500 font-sans font-medium">×</span>
            <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          </div>
          <span className="text-indigo-500 font-sans font-medium">=</span>
          <span className="text-sm md:text-base font-black px-1.5 py-0.5 bg-indigo-100/70 rounded-md text-indigo-900">
            {wholeAmount !== undefined ? formattedCalc : roundedPercent}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DecimalBlocksCardProps {
  value: number;
  compact?: boolean;
  wholeAmount?: number;
}

export function DecimalBlocksCard({ value, compact = false, wholeAmount }: DecimalBlocksCardProps) {
  // e.g. for 75% -> 0.75 -> 7 tenths and 5 hundredths
  const roundedPercent = Math.min(100, Math.max(0, Math.round(value)));
  const tenths = Math.floor(roundedPercent / 10);
  const hundredths = roundedPercent % 10;
  const decimalVal = roundedPercent / 100;
  const calculated = (value / 100) * (wholeAmount !== undefined ? wholeAmount : 100);
  const formattedCalc = calculated % 1 === 0 ? calculated.toFixed(0) : calculated.toFixed(1);

  return (
    <div className={`bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between overflow-hidden relative transition-all ${compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2.5'}`}>
      <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
        {/* Card Header Info */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest">
            Decimal Form
          </span>
          {!compact && (
            <span className="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">
              Place Value
            </span>
          )}
        </div>

        {/* Dynamic Big Label */}
        <div className={`text-center font-mono font-bold select-all ${compact ? 'py-0.5' : 'py-0.5'}`}>
          <span className={`text-slate-400 ${compact ? 'text-2xl' : 'text-4xl'}`}>0.</span>
          <span className={`text-emerald-600 font-black ${compact ? 'text-3xl' : 'text-4xl'}`}>{tenths}</span>
          <span className={`text-teal-500 font-black ${compact ? 'text-3xl' : 'text-4xl'}`}>{hundredths}</span>
        </div>

        {/* Base 10 Stacking Block Model Visuals */}
        <div className={`flex justify-center items-center gap-5 select-none ${compact ? 'py-0.5 h-[80px]' : 'py-1 h-[110px]'}`}>
          {/* Tenths Stack (each block is 0.1, total 10 slices) */}
          <div className="flex flex-col items-center justify-between h-full">
            <span className="text-[10px] text-slate-400 font-display font-bold">
              {compact ? '0.1' : 'Tenths (0.1)'}
            </span>
            <div className={`bg-slate-100 border border-slate-200 rounded flex flex-col justify-end gap-[1.5px] shadow-inner ${compact ? 'w-6 h-12 p-0.5' : 'w-10 h-24 p-1'}`}>
              {Array.from({ length: 10 }).map((_, i) => {
                const blockIdx = i; // stack from bottom
                const isFilled = blockIdx < tenths;
                return (
                  <motion.div
                    key={i}
                    animate={{
                      backgroundColor: isFilled ? '#0ea5e9' : '#e2e8f0',
                      scale: isFilled ? 1 : 0.95
                    }}
                    transition={{ duration: 0.12 }}
                    className={`${compact ? 'h-0.5' : 'h-1.5'} w-full rounded-sm`}
                  />
                );
              })}
            </div>
          </div>

          {/* Hundredths Stack (each block is 0.01) */}
          <div className="flex flex-col items-center justify-between h-full">
            <span className="text-[10px] text-slate-400 font-display font-bold">
              {compact ? '0.01' : 'Hundredths (0.01)'}
            </span>
            <div className={`bg-slate-100 border border-slate-200 rounded flex flex-col justify-end gap-[1.5px] shadow-inner ${compact ? 'w-5 h-12 p-0.5' : 'w-8 h-24 p-1'}`}>
              {Array.from({ length: 10 }).map((_, i) => {
                const blockIdx = i;
                const isFilled = blockIdx < hundredths;
                return (
                  <motion.div
                    key={i}
                    animate={{
                      backgroundColor: isFilled ? '#14b8a6' : '#e2e8f0',
                      scale: isFilled ? 1 : 0.95
                    }}
                    transition={{ duration: 0.12 }}
                    className={`${compact ? 'h-0.5' : 'h-1.5'} w-full rounded-sm`}
                  />
                );
              })}
            </div>
          </div>
        </div>


      </div>

      <div className="border-t border-slate-100/80 text-center mt-2.5 pt-2 flex flex-col items-center gap-1">
        <div className="flex items-center flex-wrap justify-center gap-2 font-mono font-bold text-xs md:text-sm text-sky-700 bg-sky-50/70 px-3 py-1.5 rounded-xl shadow-sm">
          <span>{(value / 100).toFixed(value % 1 === 0 ? 2 : 3)}</span>
          <span className="text-sky-400 font-sans font-medium text-xs">of</span>
          <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          <span className="text-sky-500 font-sans font-medium">=</span>
          <div className="inline-flex items-center gap-1">
            <div className="flex flex-col items-center leading-none text-[10px] md:text-xs">
              <span>{roundedPercent}</span>
              <span className="w-5 md:w-6 bg-sky-300 h-[1.5px] my-0.5" />
              <span>100</span>
            </div>
            <span className="text-sky-500 font-sans font-medium">×</span>
            <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          </div>
          <span className="text-sky-500 font-sans font-medium">=</span>
          <span className="text-sm md:text-base font-black px-1.5 py-0.5 bg-sky-100/70 rounded-md text-sky-950">
            {wholeAmount !== undefined ? formattedCalc : roundedPercent}
          </span>
        </div>
      </div>
    </div>
  );
}
interface FractionShapeCardProps {
  fraction: FractionResult;
  compact?: boolean;
  wholeAmount?: number;
}

export function FractionShapeCard({ fraction, compact = false, wholeAmount }: FractionShapeCardProps) {
  const { numerator, denominator, originalNumerator, originalDenominator } = fraction;
  const calculated = (numerator / denominator) * (wholeAmount !== undefined ? wholeAmount : 100);
  const formattedCalc = calculated % 1 === 0 ? calculated.toFixed(0) : calculated.toFixed(1);

  // Helper to calculate SVG Pie arcs
  function getPieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const rad1 = ((startAngle - 90) * Math.PI) / 180;
    const rad2 = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(rad1);
    const y1 = cy + r * Math.sin(rad1);
    const x2 = cx + r * Math.cos(rad2);
    const y2 = cy + r * Math.sin(rad2);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  // Draw customized vector slices
  const renderSlices = () => {
    if (denominator === 1) {
      return (
        <circle
          cx="50"
          cy="50"
          r="45"
          className={numerator === 1 ? 'fill-amber-500 stroke-amber-700' : 'fill-slate-100 stroke-slate-300'}
          strokeWidth="2"
        />
      );
    }

    const paths = [];
    const step = 360 / denominator;
    
    for (let i = 0; i < denominator; i++) {
       const startAngle = i * step;
       const endAngle = (i + 1) * step;
       const isFilled = i < numerator;

       paths.push(
         <motion.path
           key={i}
           initial={{ opacity: 0.8 }}
           animate={{ opacity: 1 }}
           d={getPieSlicePath(50, 50, 45, startAngle, endAngle)}
           className={isFilled ? 'fill-amber-500 stroke-amber-700' : 'fill-slate-100 stroke-slate-300'}
           strokeWidth="1.5"
         />
       );
    }
    return paths;
  };

  return (
    <div className={`bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between overflow-hidden relative transition-all ${compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2.5'}`}>
      <div className={compact ? 'space-y-1' : 'space-y-2.5'}>
        {/* Card Header Info */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            Fraction Form
          </span>
          {!compact && (
            <span className="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">
              Simplified Parts
            </span>
          )}
        </div>

        {/* Dynamic Big Equation Formula */}
        <div className={`flex items-center justify-center gap-2.5 font-mono font-bold select-all ${compact ? 'h-[44px]' : 'h-[50px]'}`}>
          {/* Base Fraction: Original e.g. 75/100 */}
          <div className="flex flex-col items-center">
            <span className={`text-slate-400 ${compact ? 'text-sm' : 'text-base'}`}>{originalNumerator}</span>
            <span className={`w-6 bg-slate-300 ${compact ? 'h-[1px]' : 'h-[1.5px]'}`} />
            <span className={`text-slate-400 ${compact ? 'text-sm' : 'text-base'}`}>{originalDenominator}</span>
          </div>
          
          <span className="text-slate-400 text-[10.5px] font-sans">simplify ➜</span>
          
          {/* Simplified Equivalent e.g. 3/4 */}
          <div className="flex flex-col items-center text-amber-700">
            <span className={`font-black ${compact ? 'text-lg' : 'text-xl'}`}>{numerator}</span>
            <span className={`w-8 bg-amber-600 rounded-full ${compact ? 'h-0.5' : 'h-1'}`} />
            <span className={`font-black ${compact ? 'text-lg' : 'text-xl'}`}>{denominator}</span>
          </div>
        </div>

        {/* Shape Partition Visualization */}
        <div className={`flex justify-center items-center select-none ${compact ? 'py-1 h-[70px]' : 'py-1 h-[110px]'}`}>
          <div className={`drop-shadow-md ${compact ? 'w-14 h-14' : 'w-24 h-24'}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Common base circle for standard background shadow/grid */}
              <circle cx="50" cy="50" r="45" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              {renderSlices()}
            </svg>
          </div>
        </div>


      </div>

      <div className="border-t border-slate-100/80 text-center mt-2.5 pt-2 flex flex-col items-center gap-1">
        <div className="flex items-center flex-wrap justify-center gap-2 font-mono font-bold text-xs md:text-sm text-amber-700 bg-amber-50/70 px-3 py-1.5 rounded-xl shadow-sm">
          <div className="inline-flex items-center gap-1">
            <div className="flex flex-col items-center leading-none text-[10px] md:text-xs">
              <span>{numerator}</span>
              <span className="w-4 md:w-5 bg-amber-300 h-[1.5px] my-0.5" />
              <span>{denominator}</span>
            </div>
          </div>
          <span className="text-amber-400 font-sans font-medium text-xs">of</span>
          <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          <span className="text-amber-500 font-sans font-medium">=</span>
          <div className="inline-flex items-center gap-1">
            <div className="flex flex-col items-center leading-none text-[10px] md:text-xs">
              <span>{numerator}</span>
              <span className="w-4 md:w-5 bg-amber-300 h-[1.5px] my-0.5" />
              <span>{denominator}</span>
            </div>
            <span className="text-amber-500 font-sans font-medium">×</span>
            <span>{wholeAmount !== undefined ? wholeAmount : 100}</span>
          </div>
          <span className="text-amber-500 font-sans font-medium">=</span>
          <span className="text-sm md:text-base font-black px-1.5 py-0.5 bg-amber-100/70 rounded-md text-amber-950">
            {formattedCalc}
          </span>
        </div>
      </div>
    </div>
  );
}
