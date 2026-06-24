/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { RatioColumn } from "../types";

interface SvgArrowsProps {
  columns: RatioColumn[];
  activeColId: string | null;
  selectedColIndex: number | null;
}

interface ArchPath {
  colIndex: number;
  multiplier: number;
  topPath: string;
  bottomPath: string;
  topMidpoint: { x: number; y: number };
  bottomMidpoint: { x: number; y: number };
  color: string;
}

export default function SvgArrows({ columns, activeColId, selectedColIndex }: SvgArrowsProps) {
  const [paths, setPaths] = useState<ArchPath[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // We should recalculate paths on resize, columns count change, or selected index change
  useEffect(() => {
    const calculatePaths = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      const newPaths: ArchPath[] = [];

      // Base Column top & bottom elements must exist
      const baseTopEl = document.getElementById("cell-top-0");
      const baseBottomEl = document.getElementById("cell-bottom-0");

      if (!baseTopEl || !baseBottomEl) return;

      const baseTopRect = baseTopEl.getBoundingClientRect();
      const baseBottomRect = baseBottomEl.getBoundingClientRect();

      columns.forEach((col, index) => {
        // Skip base column (index 0) or unpopulated empty columns
        if (index === 0 || col.multiplier === null) return;

        // Populate curve only if it is the currently selected or active column to avoid excessive visual clutter
        const isSelected = selectedColIndex === index;
        const isActiveHover = activeColId === col.id;
        if (!isSelected && !isActiveHover) return;

        const targetTopEl = document.getElementById(`cell-top-${index}`);
        const targetBottomEl = document.getElementById(`cell-bottom-${index}`);

        if (!targetTopEl || !targetBottomEl) return;

        const targetTopRect = targetTopEl.getBoundingClientRect();
        const targetBottomRect = targetBottomEl.getBoundingClientRect();

        // Calculate positions relative to container
        const x1_top = baseTopRect.left - containerRect.left;
        const y1_top = (baseTopRect.top + baseTopRect.bottom) / 2 - containerRect.top;

        const x2_top = targetTopRect.left - containerRect.left;
        const y2_top = (targetTopRect.top + targetTopRect.bottom) / 2 - containerRect.top;

        const x1_bot = baseBottomRect.right - containerRect.left;
        const y1_bot = (baseBottomRect.top + baseBottomRect.bottom) / 2 - containerRect.top;

        const x2_bot = targetBottomRect.right - containerRect.left;
        const y2_bot = (targetBottomRect.top + targetBottomRect.bottom) / 2 - containerRect.top;

        // Design modern arches
        // Arches scale wider to the left (top numerator values) and right (bottom denominator values) if target index is larger
        const archWidthTop = Math.min(65, 20 + index * 9);
        const archWidthBot = Math.min(65, 20 + index * 9);

        // Control points for quadratic bezier curves:
        // Midpoint coordinates (top moves left, bottom moves right)
        const midX_top = Math.min(x1_top, x2_top) - archWidthTop;
        const midY_top = (y1_top + y2_top) / 2;

        const midX_bot = Math.max(x1_bot, x2_bot) + archWidthBot;
        const midY_bot = (y1_bot + y2_bot) / 2;

        const topPath = `M ${x1_top} ${y1_top} Q ${midX_top} ${midY_top} ${x2_top} ${y2_top}`;
        const bottomPath = `M ${x1_bot} ${y1_bot} Q ${midX_bot} ${midY_bot} ${x2_bot} ${y2_bot}`;

        // Dynamic colored link highlights
        const colorPalette = ["#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f59e0b"];
        const color = colorPalette[index % colorPalette.length];

        newPaths.push({
          colIndex: index,
          multiplier: col.multiplier,
          topPath,
          bottomPath,
          topMidpoint: { x: midX_top, y: midY_top },
          bottomMidpoint: { x: midX_bot, y: midY_bot },
          color,
        });
      });

      setPaths(newPaths);
    };

    // Calculate immediately and also after transitions completed
    calculatePaths();
    const t = setTimeout(calculatePaths, 150);

    window.addEventListener("resize", calculatePaths);
    return () => {
      window.removeEventListener("resize", calculatePaths);
      clearTimeout(t);
    };
  }, [columns, activeColId, selectedColIndex]);

  // Render SVG absolute overlay full size
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      id="svg-arrows-overlay"
    >
      <svg className="w-full h-full overflow-visible">
        <defs>
          {/* Create markers for beautiful arrow heads */}
          {paths.map((p) => (
            <React.Fragment key={`defs-${p.colIndex}`}>
              <marker
                id={`arrow-top-${p.colIndex}`}
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill={p.color} />
              </marker>
              <marker
                id={`arrow-bot-${p.colIndex}`}
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill={p.color} />
              </marker>
            </React.Fragment>
          ))}
        </defs>

        {paths.map((p) => (
          <g key={`arch-${p.colIndex}`}>
            {/* Top scale linking path */}
            <path
              d={p.topPath}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-[dash_15s_linear_infinite]"
              markerEnd={`url(#arrow-top-${p.colIndex})`}
            />

            {/* Bottom scale linking path */}
            <path
              d={p.bottomPath}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-[dash_15s_linear_infinite]"
              markerEnd={`url(#arrow-bot-${p.colIndex})`}
            />
          </g>
        ))}
      </svg>

      {/* Floating badges displaying the scale value factors */}
      {paths.map((p) => {
        // Offset badges so they rest perfectly in the apex of the Bezier arcs
        return (
          <React.Fragment key={`badges-${p.colIndex}`}>
            {/* Top Factor Badge */}
            <div
              className="absolute pointer-events-auto select-none font-bold text-xs px-2 py-0.5 rounded-full shadow-md text-white border text-center font-mono transform -translate-x-1/2 -translate-y-1/2 transition-opacity"
              style={{
                left: `${p.topMidpoint.x}px`,
                top: `${p.topMidpoint.y + 6}px`,
                backgroundColor: p.color,
                borderColor: "white",
              }}
              title={`Top multiplied by ${p.multiplier}`}
            >
              × {p.multiplier}
            </div>

            {/* Bottom Factor Badge */}
            <div
              className="absolute pointer-events-auto select-none font-bold text-xs px-2 py-0.5 rounded-full shadow-md text-white border text-center font-mono transform -translate-x-1/2 -translate-y-1/2 transition-opacity"
              style={{
                left: `${p.bottomMidpoint.x}px`,
                top: `${p.bottomMidpoint.y - 6}px`,
                backgroundColor: p.color,
                borderColor: "white",
              }}
              title={`Bottom multiplied by ${p.multiplier}`}
            >
              × {p.multiplier}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
