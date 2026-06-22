/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { RatioTheme } from "./types";
import Visualizer from "./components/Visualizer";
import SvgArrows from "./components/SvgArrows";
import {
  Sparkles,
  RotateCcw,
  Trash2,
  PlusCircle,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  HelpCircle,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import "./ratio-table-playground.css";

interface RatioRow {
  id: string;
  multiplier: number;
  userTop: string;
  userBottom: string;
}

export default function App() {
  // --------------------------------------------------
  // CORE STATE
  // --------------------------------------------------
  // Customizable base quantities for A and B
  const [baseTop, setBaseTop] = useState<number>(2);
  const [baseBottom, setBaseBottom] = useState<number>(3);

  // Dynamic set of equivalent ratio rows
  const [rows, setRows] = useState<RatioRow[]>([
    { id: "row-1", multiplier: 2, userTop: "", userBottom: "" },
    { id: "row-2", multiplier: 3, userTop: "", userBottom: "" },
  ]);

  // Track currently active row index to show SvgArrows linking lines
  const [focusedIndex, setFocusedIndex] = useState<number | null>(1);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Sidebar toggle state - visual can be opened only if requested
  const [showVisualModel, setShowVisualModel] = useState<boolean>(false);

  // Tracks if the student has started typing (to hide reference arrows)
  const [hasTyped, setHasTyped] = useState<boolean>(false);

  // Active theme helper representing the simple "A" and "B" blocks
  const activeTheme: RatioTheme = {
    id: "custom",
    name: "A & B Sandbox",
    icon: "Sliders",
    topLabel: "A",
    bottomLabel: "B",
    topUnit: "Block A",
    bottomUnit: "Block B",
    topColor: "bg-indigo-500",
    bottomColor: "bg-emerald-500",
    topTextClass: "text-indigo-600 font-bold",
    bottomTextClass: "text-emerald-600 font-bold",
    defaultTop: baseTop,
    defaultBottom: baseBottom,
    description: "Equivalent ratio table maintaining constant scale factors."
  };

  // Convert current table state to columns array suitable for SvgArrows component
  const columnsForArrows = [
    {
      id: "col-0",
      multiplier: 1,
      topValue: baseTop,
      bottomValue: baseBottom
    },
    ...rows.map((row) => ({
      id: row.id,
      multiplier: row.multiplier,
      topValue: baseTop * row.multiplier,
      bottomValue: baseBottom * row.multiplier
    }))
  ];

  // Handle adding a new row
  const handleAddRow = () => {
    const currentMultipliers = rows.map(r => r.multiplier);
    const maxMult = currentMultipliers.length > 0 ? Math.max(...currentMultipliers) : 1;
    const nextMult = maxMult + 1;

    const newRow: RatioRow = {
      id: `row-${Date.now()}`,
      multiplier: nextMult <= 15 ? nextMult : Math.floor(Math.random() * 8) + 2,
      userTop: "",
      userBottom: ""
    };

    setRows([...rows, newRow]);
    
    // Auto-focus on newly created row to immediately paint connecting arrow loops
    setFocusedIndex(rows.length + 1);
  };

  // Handle removing a row
  const handleRemoveRow = (id: string, indexInList: number) => {
    setRows(rows.filter(row => row.id !== id));
    // Set focused index to base row as fall-back
    setFocusedIndex(0);
  };

  // Update a row's multiplier
  const handleUpdateMultiplier = (id: string, newMult: number, indexInList: number) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, multiplier: newMult };
      }
      return row;
    }));
    setFocusedIndex(indexInList);
  };

  // Update user text-inputs
  const handleInputChange = (id: string, field: "userTop" | "userBottom", val: string, indexInList: number) => {
    setHasTyped(true);
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: val };
      }
      return row;
    }));
    setFocusedIndex(indexInList);
  };

  // Reset parameters
  const handleReset = () => {
    setBaseTop(2);
    setBaseBottom(3);
    setRows([
      { id: "row-1", multiplier: 2, userTop: "", userBottom: "" },
      { id: "row-2", multiplier: 3, userTop: "", userBottom: "" },
    ]);
    setFocusedIndex(1);
    setHasTyped(false);
  };

  // Pre-fill answers helper for interactive tutoring hint
  const handleSolveRow = (id: string, indexInList: number) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return {
          ...row,
          userTop: String(baseTop * row.multiplier),
          userBottom: String(baseBottom * row.multiplier)
        };
      }
      return row;
    }));
    setFocusedIndex(indexInList);
  };

  // Determine current active multiplier for Visualizer model side-panel
  const activeSelectedRowMultiplier = focusedIndex === 0 || focusedIndex === null
    ? 1
    : (rows[focusedIndex - 1]?.multiplier || 1);

  return (
    <div className="ratio-table-playground bg-slate-100 w-[800px] h-[500px] font-sans flex items-center justify-center p-2" id="applet-viewport">
      
      {/* 800x500 Fixed aspect container replicating sketch environment */}
      <div className="w-[800px] h-[500px] bg-white border border-slate-300 rounded-2xl shadow-xl p-4 flex flex-col justify-between relative overflow-hidden select-none">
        
        {/* TOP NAVBAR HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 shrink-0">
          <div className="flex items-center gap-1.5 animate-fade-in">
            <span className="p-1 text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-lg shrink-0">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-black text-sm text-slate-800 tracking-tight leading-none animate-fade-in">
                Ratio - Tables
              </h1>
            </div>
          </div>

          {/* Interactive Top Actions panel */}
          <div className="flex items-center gap-1.5 leading-none">
            {/* Visualizer modal/sidebar toggle */}
            <button
              onClick={() => setShowVisualModel(!showVisualModel)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                showVisualModel
                  ? "bg-slate-700 text-white border-slate-700 hover:bg-slate-800"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
              title="Toggle interactive blocks visualizer panel on right"
            >
              {showVisualModel ? (
                <>
                  <EyeOff className="w-3 h-3 text-white" />
                  <span>Hide Visual Model</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Show Visual Model</span>
                </>
              )}
            </button>

            {/* Clear table setup */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-250 rounded-lg text-[9.5px] font-extrabold transition-colors cursor-pointer"
              title="Reset ratios"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA (Splits nicely if Visualizer is toggled) */}
        <div className="flex-1 min-h-0 flex gap-4 items-stretch relative overflow-hidden my-1">
          
          {/* THE TABLE SECTION (Occupies whole space or 60% if visual model is opened) */}
          <div className={`flex flex-col justify-between transition-all duration-300 relative overflow-visible h-full ${
            showVisualModel ? "w-7/12" : "w-full"
          }`}>
            
            {/* SVG Arc Connectors linking side coordinate inputs */}
            <AnimatePresence>
              {!hasTyped && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 z-10 pointer-events-none overflow-visible"
                >
                  <SvgArrows
                    columns={columnsForArrows}
                    activeColId={hoveredRowId}
                    selectedColIndex={focusedIndex}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* THE PRISTINE WHITEBOARD RATIO TABLE */}
            <div className="bg-white border-2 border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between flex-1 relative z-20">
              <table className="w-full border-collapse">
                
                {/* Table Header row */}
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-350 text-slate-550 font-extrabold text-[10.5px] divide-x divide-slate-300">
                    <th className="py-2 text-center w-[25%] bg-slate-50">scale</th>
                    <th className="py-2 text-center w-[30%] bg-indigo-50/20 text-indigo-805">A</th>
                    <th className="py-2 text-center w-[30%] bg-emerald-50/20 text-emerald-805">B</th>
                    <th className="py-2 text-center w-[15%]">action</th>
                  </tr>
                </thead>

                {/* Table Body rows */}
                <tbody className="divide-y divide-slate-200">
                  
                  {/* FIRST ROW (Base customizable ratio) */}
                  <tr 
                    onClick={() => setFocusedIndex(0)}
                    className={`divide-x divide-slate-200 transition-colors h-[48px] ${
                      focusedIndex === 0 ? "bg-indigo-50/20" : "bg-slate-50/30"
                    }`}
                  >
                    {/* Scale block for base always 1x */}
                    <td className="text-center font-mono font-bold text-[9.5px] text-orange-600 bg-orange-50/30">
                      base (1×)
                    </td>

                    {/* Base input A */}
                    <td>
                      <div className="flex justify-center items-center h-full px-1 py-1">
                        <div 
                          id="cell-top-0" 
                          className="flex items-center bg-white border border-slate-300 rounded p-0.5 shadow-2xs gap-0.5 select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setBaseTop(Math.max(1, baseTop - 1));
                              setFocusedIndex(0);
                            }}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 rounded font-black text-[9.5px] cursor-pointer flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-xs text-slate-800 w-5 text-center">
                            {baseTop}
                          </span>
                          <button
                            onClick={() => {
                              setBaseTop(Math.min(10, baseTop + 1));
                              setFocusedIndex(0);
                            }}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 rounded font-black text-[9.5px] cursor-pointer flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Base input B */}
                    <td>
                      <div className="flex justify-center items-center h-full px-1 py-1">
                        <div 
                          id="cell-bottom-0" 
                          className="flex items-center bg-white border border-slate-300 rounded p-0.5 shadow-2xs gap-0.5 select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setBaseBottom(Math.max(1, baseBottom - 1));
                              setFocusedIndex(0);
                            }}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 rounded font-black text-[9.5px] cursor-pointer flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-xs text-slate-800 w-5 text-center">
                            {baseBottom}
                          </span>
                          <button
                            onClick={() => {
                              setBaseBottom(Math.min(12, baseBottom + 1));
                              setFocusedIndex(0);
                            }}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 rounded font-black text-[9.5px] cursor-pointer flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Helper placeholder instruction */}
                    <td className="text-center">
                      <span className="text-[8px] font-extrabold text-slate-400 bg-slate-100 px-1 py-0.5 rounded tracking-tight">
                        Start Ratio
                      </span>
                    </td>
                  </tr>

                  {/* DYNAMIC SCALED EQUIVALENT MATCH ROWS */}
                  {rows.map((row, idx) => {
                    const arrowIndex = idx + 1;
                    const isSelected = focusedIndex === arrowIndex;

                    const correctA = baseTop * row.multiplier;
                    const correctB = baseBottom * row.multiplier;

                    const valA = parseInt(row.userTop.trim());
                    const valB = parseInt(row.userBottom.trim());

                    const isACorrect = !isNaN(valA) && valA === correctA;
                    const isBCorrect = !isNaN(valB) && valB === correctB;

                    return (
                      <tr
                        key={row.id}
                        onMouseEnter={() => setHoveredRowId(row.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        onClick={() => setFocusedIndex(arrowIndex)}
                        className={`divide-x divide-slate-200 transition-colors h-[48px] ${
                          isSelected 
                            ? "bg-slate-100/50 font-bold" 
                            : "hover:bg-slate-50/30"
                        }`}
                      >
                        {/* Selector/dropdown scale multipliers */}
                        <td className="text-center font-semibold text-[10px]">
                          <div className="inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={row.multiplier}
                              onChange={(e) => {
                                handleUpdateMultiplier(row.id, parseInt(e.target.value), arrowIndex);
                              }}
                              className="bg-slate-50 border border-slate-300 rounded font-black text-[10px] text-indigo-750 px-1 py-0.5 outline-none cursor-pointer focus:border-indigo-500 focus:bg-white"
                            >
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((multOption) => (
                                <option key={multOption} value={multOption}>
                                  {multOption}x
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Quantity A input guesser */}
                        <td className="relative px-2">
                          <div className="flex justify-center items-center h-full" id={`cell-top-${arrowIndex}`}>
                            <div className="relative w-full max-w-[90px] flex items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.userTop}
                                onChange={(e) => handleInputChange(row.id, "userTop", e.target.value, arrowIndex)}
                                placeholder="?"
                                onFocus={() => setFocusedIndex(arrowIndex)}
                                className={`w-full text-center font-mono font-bold text-xs py-1 px-1 rounded-lg border outline-none transition-all ${
                                  isACorrect
                                    ? "bg-emerald-50 border-emerald-450 text-emerald-800 shadow-3xs"
                                    : row.userTop.trim() !== ""
                                    ? "bg-[#fffbeb] border-[#f59e0b] text-[#b45309]"
                                    : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-150"
                                }`}
                              />
                              {isACorrect && (
                                <Check className="absolute right-1 text-emerald-500 w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity B input guesser */}
                        <td className="relative px-2">
                          <div className="flex justify-center items-center h-full" id={`cell-bottom-${arrowIndex}`}>
                            <div className="relative w-full max-w-[90px] flex items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.userBottom}
                                onChange={(e) => handleInputChange(row.id, "userBottom", e.target.value, arrowIndex)}
                                placeholder="?"
                                onFocus={() => setFocusedIndex(arrowIndex)}
                                className={`w-full text-center font-mono font-bold text-xs py-1 px-1 rounded-lg border outline-none transition-all ${
                                  isBCorrect
                                    ? "bg-emerald-50 border-emerald-450 text-emerald-800 shadow-3xs"
                                    : row.userBottom.trim() !== ""
                                    ? "bg-[#fffbeb] border-[#f59e0b] text-[#b45309]"
                                    : "bg-white border-slate-300 text-slate-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-150"
                                }`}
                              />
                              {isBCorrect && (
                                <Check className="absolute right-1 text-emerald-500 w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Interactive row actions */}
                        <td className="text-center px-1">
                          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSolveRow(row.id, arrowIndex)}
                              className="px-1 py-0.5 text-[8.5px] font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                              title="Autocomplete values"
                            >
                              Solve
                            </button>
                            <button
                              onClick={() => handleRemoveRow(row.id, arrowIndex)}
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty state Row */}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[10px] text-slate-400 italic">
                        Empty table! Click "Add Row" below to practice equivalences.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* TABLE BASE CONTROL FOOTER */}
              <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between pointer-events-auto mt-auto leading-none shrink-0">
                <div />

                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] rounded-lg shadow-sm transition-colors cursor-pointer border border-indigo-550"
                  id="add-row-btn"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

            </div>
          </div>

          {/* DYNAMIC OPEN-ON-DEMAND RIGHT VISUALIZER PANEL */}
          <AnimatePresence>
            {showVisualModel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "38%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="bg-white border-2 border-slate-350 rounded-xl overflow-hidden shadow-md flex flex-col h-full shrink-0 relative"
              >
                {/* Visualizer header block overlay */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-250 flex items-center justify-between shrink-0 leading-none">
                  <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    Ratio Model
                  </span>
                  <button
                    onClick={() => setShowVisualModel(false)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Close preview panel"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <Visualizer
                    theme={activeTheme}
                    multiplier={activeSelectedRowMultiplier}
                    topValue={baseTop * activeSelectedRowMultiplier}
                    bottomValue={baseBottom * activeSelectedRowMultiplier}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* BOTTOM BRAND/EDUCATIONAL FOOTER (Perfect fit, zero overflow) */}
        <footer className="border-t border-slate-200 pt-1.5 mt-1.5 shrink-0 flex items-center justify-between text-[9px] text-slate-400 font-bold leading-none animate-fade-in">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
            Enter equivalent ratios.
          </span>
        </footer>

      </div>

    </div>
  );
}
