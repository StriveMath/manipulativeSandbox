/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { PartitionType } from '../types';

interface LiquidBarProps {
  value: number;
  partition: PartitionType;
  onTickClick?: (val: number) => void;
  compact?: boolean;
}

export default function LiquidBar({ value, partition, onTickClick, compact = false }: LiquidBarProps) {
  const denominator = partition === 'free' ? 100 : parseInt(partition, 10);
  const segmentSize = 100 / denominator;

  // Generate grid points for divisions
  const dividers = [];
  if (partition !== 'free') {
    for (let i = 1; i < denominator; i++) {
      dividers.push(i * segmentSize);
    }
  }

  // Draw indicators under the tank (0/4, 1/4, 2/4...)
  const labelPositions = [];
  if (partition !== 'free') {
    for (let i = 0; i <= denominator; i++) {
      labelPositions.push({
        label: `${i}/${denominator}`,
        percent: i * segmentSize,
      });
    }
  } else {
    labelPositions.push({ label: '0/100', percent: 0 });
    labelPositions.push({ label: '100/100', percent: 100 });
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-3'}>
      <div className="relative">
        {/* Outer fluid tank frame */}
        <div 
          className={`w-full bg-slate-100/80 rounded-2xl overflow-hidden border-4 border-white shadow-inner relative select-none cursor-pointer ${compact ? 'h-11 lg:h-11' : 'h-24'}`}
          onClick={(e) => {
            if (!onTickClick) return;
            const rect = e.currentTarget.getBoundingClientRect();
            // Calculate relative offset
            const clickX = e.clientX - rect.left;
            const percent = (clickX / rect.width) * 100;
            // Align with active snap if necessary
            onTickClick(percent);
          }}
        >
          {/* Glass reflection gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-slate-200/40 pointer-events-none" />

          {/* Wave or fluid filling area */}
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${value}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-sky-400 shadow-md overflow-hidden z-10"
          >
            {/* Animated particles to represent liquid sparkle */}
            <div className="absolute inset-0 opacity-15 overflow-hidden">
              <span className="absolute w-8 h-8 rounded-full bg-white top-2 left-6 animate-pulse" />
              <span className="absolute w-6 h-6 rounded-full bg-white bottom-3 left-1/4 animate-bounce" />
              <span className="absolute w-12 h-12 rounded-full bg-white top-4 left-1/2 opacity-50" />
              <span className="absolute w-4 h-4 rounded-full bg-white bottom-4 right-12 animate-pulse" />
            </div>
            
            {/* Glass horizontal reflection glare */}
            <div className="absolute top-0 inset-x-0 h-4 bg-white/20 pointer-events-none" />
          </motion.div>

          {/* Dotted Vertical Segment Divider Marks */}
          <div className="absolute inset-0 flex justify-between pointer-events-none z-20">
            {dividers.map((pos) => (
              <div
                key={pos}
                className="w-[1.5px] border-r border-dashed border-white/40 absolute h-full"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>

          {/* Centered High Vision Level Volume Indicator Badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 select-none">
            <span className="bg-slate-900/80 border border-white/20 text-white font-display font-black text-[10.5px] px-2.5 py-0.5 rounded-full shadow-lg backdrop-blur-[1.5px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Volume Filled: {value.toFixed(value % 1 === 0 ? 0 : 1)}%</span>
            </span>
          </div>

           {/* Humble descriptive labels embedded inside the tank corners */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-[10px] text-white/50 font-extrabold select-none pointer-events-none z-35 drop-shadow-sm uppercase tracking-wider">
            {compact ? '0%' : 'Empty'}
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-[10px] text-slate-400 font-extrabold select-none pointer-events-none z-35 uppercase tracking-wider">
            {compact ? '100%' : 'Full'}
          </div>
        </div>
      </div>

      {/* Segment Labels showing corresponding fractions */}
      <div className={`relative mt-1 flex justify-between px-0.5 text-slate-500 font-bold font-mono ${compact ? 'h-4 text-[10px]' : 'h-6 text-xs'}`}>
        {labelPositions.map((pos, idx) => (
          <span
            key={idx}
            className="absolute select-none text-slate-500"
            style={{ 
              left: `${pos.percent}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {pos.label}
          </span>
        ))}
      </div>
    </div>
  );
}
