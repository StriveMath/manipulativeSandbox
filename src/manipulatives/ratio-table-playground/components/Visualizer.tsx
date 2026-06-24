/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RatioTheme } from "../types";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface VisualizerProps {
  theme: RatioTheme;
  multiplier: number;
  topValue: number;
  bottomValue: number;
}

export default function Visualizer({ theme, multiplier, topValue, bottomValue }: VisualizerProps) {
  // Quantities for each individual batch
  const baseTop = theme.defaultTop || 2;
  const baseBottom = theme.defaultBottom || 3;

  const batches = Array.from({ length: multiplier }, (_, i) => i);
  const baseTops = Array.from({ length: baseTop }, (_, i) => i);
  const baseBottoms = Array.from({ length: baseBottom }, (_, i) => i);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-300 p-3 flex flex-col h-full overflow-hidden" id="visualizer-container">
      {/* Visualizer header */}
      <div className="mb-2 shrink-0">
        <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-505" />
          Ratio Visual Model
        </h3>
        <p className="text-[10px] text-slate-400 font-bold">
          Showing <span className="font-extrabold text-indigo-650">{multiplier} ×</span> the base ratio ({baseTop} : {baseBottom})
        </p>
      </div>

      {/* Main interactive diagram workspace */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
        {batches.map((batchIdx) => (
          <motion.div
            key={batchIdx}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: batchIdx * 0.04 }}
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-2 flex flex-col gap-1.5 relative"
          >
            {/* Batch Label */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                Batch #{batchIdx + 1}
              </span>
              <span className="font-mono text-[8.5px] text-indigo-500 font-bold">
                1 unit group
              </span>
            </div>

            {/* A Items Row inside packet */}
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-bold text-indigo-600 font-mono w-10">
                A ({baseTop})
              </span>
              <div className="flex flex-wrap gap-1 flex-1 justify-end">
                {baseTops.map((idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.1 }}
                    className="w-5 h-5 rounded bg-indigo-600 border border-indigo-750 flex items-center justify-center text-white text-[9px] font-black shadow-xs shrink-0 select-none"
                  >
                    A
                  </motion.div>
                ))}
              </div>
            </div>

            {/* B Items Row inside packet */}
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-bold text-emerald-600 font-mono w-10">
                B ({baseBottom})
              </span>
              <div className="flex flex-wrap gap-1 flex-1 justify-end">
                {baseBottoms.map((idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.1 }}
                    className="w-5 h-5 rounded-full bg-emerald-600 border border-emerald-750 flex items-center justify-center text-white text-[9px] font-black shadow-xs shrink-0 select-none"
                  >
                    B
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Aggregate summary dashboard at bottom */}
      <div className="mt-2 pt-2 border-t border-slate-300 bg-white p-2 rounded-lg border border-slate-205 shrink-0 leading-none">
        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">
          Total Quantities
        </span>
        
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-xs bg-indigo-600"></span>
            <span className="text-[10px] text-slate-500 font-bold">Total A:</span>
          </div>
          <span className="text-xs font-black text-indigo-650 font-mono">
            {baseTop} × {multiplier} = <span className="bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">{topValue}</span>
          </span>
        </div>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span className="text-[10px] text-slate-500 font-bold">Total B:</span>
          </div>
          <span className="text-xs font-black text-emerald-650 font-mono">
            {baseBottom} × {multiplier} = <span className="bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">{bottomValue}</span>
          </span>
        </div>

        <div className="bg-slate-50 font-mono p-1 rounded border border-slate-200 mt-2 text-center text-[9px] text-slate-500 font-bold">
          Ratio remains perfectly {baseTop}:{baseBottom}
        </div>
      </div>
    </div>
  );
}
