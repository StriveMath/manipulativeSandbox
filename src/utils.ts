/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Milestone, FractionResult, PartitionType } from './types';

export const MILESTONES: Milestone[] = [
  { decimal: 0.0, numerator: 0, denominator: 1, label: 'Zero', percentStr: '0%', color: 'bg-rose-500' },
  { decimal: 0.1, numerator: 1, denominator: 10, label: 'One Tenth', percentStr: '10%', color: 'bg-amber-500' },
  { decimal: 0.125, numerator: 1, denominator: 8, label: 'One Eighth', percentStr: '12.5%', color: 'bg-orange-500' },
  { decimal: 0.2, numerator: 1, denominator: 5, label: 'One Fifth', percentStr: '20%', color: 'bg-yellow-500' },
  { decimal: 0.25, numerator: 1, denominator: 4, label: 'One Quarter', percentStr: '25%', color: 'bg-lime-500' },
  { decimal: 0.3, numerator: 3, denominator: 10, label: 'Three Tenths', percentStr: '30%', color: 'bg-emerald-500' },
  { decimal: 0.333333, numerator: 1, denominator: 3, label: 'One Third', percentStr: '33.3%', color: 'bg-teal-500' },
  { decimal: 0.375, numerator: 3, denominator: 8, label: 'Three Eighths', percentStr: '37.5%', color: 'bg-cyan-500' },
  { decimal: 0.4, numerator: 2, denominator: 5, label: 'Two Fifths', percentStr: '40%', color: 'bg-sky-500' },
  { decimal: 0.5, numerator: 1, denominator: 2, label: 'One Half', percentStr: '50%', color: 'bg-blue-500' },
  { decimal: 0.6, numerator: 3, denominator: 5, label: 'Three Fifths', percentStr: '60%', color: 'bg-indigo-500' },
  { decimal: 0.625, numerator: 5, denominator: 8, label: 'Five Eighths', percentStr: '62.5%', color: 'bg-violet-500' },
  { decimal: 0.666667, numerator: 2, denominator: 3, label: 'Two Thirds', percentStr: '66.7%', color: 'bg-purple-500' },
  { decimal: 0.7, numerator: 7, denominator: 10, label: 'Seven Tenths', percentStr: '70%', color: 'bg-fuchsia-500' },
  { decimal: 0.75, numerator: 3, denominator: 4, label: 'Three Quarters', percentStr: '75%', color: 'bg-pink-500' },
  { decimal: 0.8, numerator: 4, denominator: 5, label: 'Four Fifths', percentStr: '80%', color: 'bg-rose-600' },
  { decimal: 0.875, numerator: 7, denominator: 8, label: 'Seven Eighths', percentStr: '87.5%', color: 'bg-orange-600' },
  { decimal: 0.9, numerator: 9, denominator: 10, label: 'Nine Tenths', percentStr: '90%', color: 'bg-emerald-600' },
  { decimal: 1.0, numerator: 1, denominator: 1, label: 'One Whole', percentStr: '100%', color: 'bg-teal-600' }
];

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function getFraction(percent: number): FractionResult {
  const decimal = percent / 100;
  
  // Check if we are extremely close to one of our special milestones
  const activeMilestone = MILESTONES.find(m => Math.abs(decimal - m.decimal) < 0.0051);

  if (activeMilestone) {
    return {
      numerator: activeMilestone.numerator,
      denominator: activeMilestone.denominator,
      originalNumerator: Math.round(percent),
      originalDenominator: 100,
      isMilestone: true,
      milestone: activeMilestone
    };
  }

  // Fallback to standard integer simplification of round percent
  const roundedPercent = Math.round(percent);
  const commonDiv = gcd(roundedPercent, 100);
  
  return {
    numerator: roundedPercent / commonDiv,
    denominator: 100 / commonDiv,
    originalNumerator: roundedPercent,
    originalDenominator: 100,
    isMilestone: false
  };
}

export function snapValue(value: number, partition: PartitionType): number {
  if (partition === 'free') {
    return Math.round(value); 
  }

  const denominator = parseInt(partition, 10);
  const fractionSize = 100 / denominator;
  const closestMultiplier = Math.round(value / fractionSize);
  
  // Snap exactly to that multiple fraction
  return Number((closestMultiplier * fractionSize).toFixed(4));
}

export class SoundPlayer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy load on first play
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        // Audio support not available
      }
    }
  }

  playTone(freq: number, duration: number = 0.12, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignore errors
    }
  }

  playSuccess() {
    this.playTone(523.25, 0.1, 'sine'); // C5
    setTimeout(() => {
      this.playTone(659.25, 0.15, 'sine'); // E5
    }, 100);
  }

  playClick() {
    this.playTone(700, 0.04, 'triangle');
  }

  playSwitch() {
    this.playTone(400, 0.08, 'triangle');
    setTimeout(() => {
      this.playTone(600, 0.08, 'triangle');
    }, 40);
  }
}

export const soundEffects = new SoundPlayer();

export function generateStandaloneHTML(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Math Equivalence Sandbox Manipulative</title>
  
  <!-- Tailwind CSS Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            display: ['Fredoka', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  
  <style>
    /* Styling for glass overlays & Custom Slider */
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 4px 12px rgba(148, 163, 184, 0.08);
    }
    
    .wave-bg {
      background-image: radial-gradient(circle at 100% 150%, #e2e8f0 24%, #f1f5f9 24%, #f1f5f9 28%, #e2e8f0 28%, #e2e8f0 36%, #f1f5f9 36%, #f1f5f9 40%, transparent 40%, transparent),
                        radial-gradient(circle at 0% 150%, #e2e8f0 24%, #f1f5f9 24%, #f1f5f9 28%, #e2e8f0 28%, #e2e8f0 36%, #f1f5f9 36%, #f1f5f9 40%, transparent 40%, transparent);
      background-size: 20px 20px;
    }

    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background: transparent;
    }

    input[type=range]:focus {
      outline: none;
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 12px;
      cursor: pointer;
      background: #e2e8f0;
      border-radius: 6px;
    }

    input[type=range]::-webkit-slider-thumb {
      height: 28px;
      width: 28px;
      border-radius: 50%;
      background: #2563eb;
      cursor: pointer;
      -webkit-appearance: none;
      margin-top: -8px;
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.4);
      transition: transform 0.1s ease, background-color 0.1s ease;
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
      background: #1d4ed8;
    }

    input[type=range]::-webkit-slider-thumb:active {
      transform: scale(1.25);
      background: #1e40af;
    }
  </style>
</head>
<body class="bg-indigo-50/50 text-slate-800 font-sans min-h-screen wave-bg py-6 px-4">
  <div class="max-w-5xl mx-auto space-y-6">
    
    <!-- Top Friendly Header Bar -->
    <header class="text-center md:flex md:justify-between md:items-center glass-card p-6 rounded-2xl relative overflow-hidden">
      <!-- Water Drops Graphics in background -->
      <div class="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full pointer-events-none"></div>
      <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full pointer-events-none"></div>
      
      <div class="text-left select-none relative z-10">
        <div class="flex items-center gap-2 mb-1">
          <span class="bg-blue-600 text-white text-xs font-bold font-display px-2.5 py-1 rounded-full uppercase tracking-wider">Grade 6 Sandbox</span>
        </div>
        <h1 class="text-3xl font-display font-bold text-blue-900 tracking-tight flex items-center gap-2">
          Math Equivalence Playground
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Conceptually discover how percents, fractions, and decimals represent the exact same quantity.
        </p>
      </div>

      <!-- Quick Audio Controls -->
      <div class="mt-4 md:mt-0 flex gap-2 justify-center relative z-10">
        <button id="soundToggle" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white/90 text-sm font-medium hover:bg-slate-50 transition-colors text-slate-600">
          <span id="soundIcon">🔊</span>
          Sound On
        </button>
      </div>
    </header>

    <!-- Main Visual Stage: The Quantity Tank & Slider Controls -->
    <main class="grid grid-cols-1 gap-6">
      
      <!-- Fluid Tank Card -->
      <section class="glass-card p-6 md:p-8 rounded-2xl space-y-6 relative">
        <h2 class="text-lg font-display font-semibold text-slate-700 flex justify-between items-center">
          <span>Physical Space Filled: <span id="visualPercent" class="text-blue-600 font-mono">50%</span></span>
          <span id="activeMilestoneBadge" class="hidden text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200"></span>
        </h2>
        
        <!-- The Horizontal Fluid Container -->
        <div class="relative">
          <div class="h-28 w-full bg-slate-100 rounded-2xl border-4 border-slate-300 overflow-hidden relative shadow-inner">
            <!-- Fluid Volume Filled -->
            <div id="fluidFill" class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 transition-all duration-150 relative overflow-hidden" style="width: 50%;">
              <!-- Light sparkle bubble lines inside the fluid -->
              <div class="absolute inset-0 opacity-15 overflow-hidden">
                <div class="absolute w-8 h-8 rounded-full bg-white top-2 left-6 animate-pulse"></div>
                <div class="absolute w-6 h-6 rounded-full bg-white bottom-3 left-1/4 animate-bounce"></div>
                <div class="absolute w-12 h-12 rounded-full bg-white top-4 left-1/2 opacity-50"></div>
                <div class="absolute w-4 h-4 rounded-full bg-white bottom-4 right-12 animate-pulse"></div>
              </div>
            </div>
            
            <!-- Horizontal Glass Highlight Overlay -->
            <div class="absolute top-0 inset-l-0 h-4 bg-white/20 pointer-events-none"></div>

            <!-- Dynamic Partition Divider Dotted Lines -->
            <div id="partitionDividers" class="absolute inset-0 flex justify-between pointer-events-none">
              <!-- Dividers added dynamically by JS -->
            </div>

            <!-- Empty Grid Marks when 0% -->
            <div class="absolute left-3 top-1/2 -translate-y-1/2 font-display text-xs text-slate-400 font-semibold select-none">0% Filled</div>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 font-display text-xs text-slate-400 font-semibold select-none">100% Full</div>
          </div>
          
          <!-- Fraction Markings beneath the container -->
          <div id="partitionLabels" class="relative mt-2 h-6 flex justify-between px-0.5 text-xs text-slate-500 font-bold font-mono">
            <!-- Dynamically populated fraction labels -->
          </div>
        </div>

        <!-- Touch-Friendly Slider Controller -->
        <div class="space-y-4 pt-2">
          <div class="flex items-center justify-between text-xs text-slate-500 font-semibold font-display">
            <span>Drag the handle:</span>
            <div class="flex items-center gap-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
              <span>Smooth sandbox exploration</span>
            </div>
          </div>

          <div class="relative py-2">
            <!-- Tactile markings behind the slider -->
            <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded pointer-events-none"></div>
            <input type="range" id="mainSlider" min="0" max="100" step="1" value="50" class="relative z-10">
          </div>
          
          <!-- Key Snapping Presets / Divisions Selector -->
          <div class="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-3">
            <span class="block text-xs font-bold text-slate-500 font-display uppercase tracking-wider">Partition Grid Divisions (Snapping Mode)</span>
            <div class="flex flex-wrap gap-2" id="partitionSelector">
              <button data-mode="free" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border-2 border-blue-600 bg-blue-600 text-white shadow-sm transition-all duration-150">
                Free Mode
              </button>
              <button data-mode="2" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Halves (1/2)
              </button>
              <button data-mode="3" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Thirds (1/3)
              </button>
              <button data-mode="4" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Fourths (1/4)
              </button>
              <button data-mode="5" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Fifths (1/5)
              </button>
              <button data-mode="8" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Eighths (1/8)
              </button>
              <button data-mode="10" class="btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150">
                Tenths (1/10)
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Three Equal Cards underneath the fluid tank representing the exact representation forms -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- CARD 1: PERCENT SANDBOX -->
        <div class="glass-card p-6 rounded-2xl flex flex-col justify-between border-t-4 border-t-indigo-500">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-600 font-display uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">Percent Form</span>
              <span class="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">Base 100</span>
            </div>

            <div class="text-center py-2 select-all">
              <span id="txtPercentNumber" class="text-5xl font-mono font-bold text-indigo-950">50</span>
              <span class="text-4xl text-indigo-600 font-bold">%</span>
            </div>

            <!-- Graphic 1: A 10x10 Grid representation of 100 blocks -->
            <div class="flex justify-center py-2">
              <div class="grid grid-cols-10 grid-rows-10 gap-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-inner" id="grid100">
                <!-- 100 tiny dot squares added dynamically by JS -->
              </div>
            </div>

            <p class="text-xs text-center text-slate-500 font-medium">
              A ratio that compares a number to <span class="font-bold underline text-indigo-600">100</span>.
            </p>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 font-bold font-mono">
            <span id="txtPercentCaption">50 out of 100 equal parts</span>
          </div>
        </div>

        <!-- CARD 2: DECIMAL SANDBOX -->
        <div class="glass-card p-6 rounded-2xl flex flex-col justify-between border-t-4 border-t-sky-500">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-600 font-display uppercase tracking-widest bg-sky-50 px-2.5 py-1 rounded-md">Decimal Form</span>
              <span class="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">Place Value</span>
            </div>

            <!-- Decimal display with distinct color colors for tenths and hundredths place value -->
            <div class="text-center py-2 font-mono text-5xl font-bold select-all">
              <span class="text-slate-400">0.</span><span id="decimalTenths" class="text-sky-600">5</span><span id="decimalHundredths" class="text-teal-500">0</span>
            </div>

            <!-- Graphic 2: Base 10 visual blocks column representing ones, tenths, and hundredths -->
            <div class="flex justify-center items-center gap-4 py-2" style="height: 140px;">
              <!-- Tenths bar (10 blocks vertical) -->
              <div class="flex flex-col items-center gap-1">
                <span class="text-[10px] text-slate-400 font-display font-semibold">Tenths (0.1)</span>
                <div class="w-8 h-24 bg-slate-100 border border-slate-200 rounded p-0.5 flex flex-col justify-end gap-0.5 shadow-inner" id="tenthsColumn">
                  <!-- 10 layered segment visual blocks (tenths) -->
                </div>
              </div>
              
              <!-- Hundredths bar (10 smaller blocks vertical representing hundredths) -->
              <div class="flex flex-col items-center gap-1">
                <span class="text-[10px] text-slate-400 font-display font-semibold">Hundredths (0.01)</span>
                <div class="w-6 h-24 bg-slate-100 border border-slate-200 rounded p-0.5 flex flex-col justify-end gap-0.5 shadow-inner" id="hundredthsColumn">
                  <!-- 10 smaller layered segment visual blocks (hundredths) -->
                </div>
              </div>
            </div>

            <p class="text-xs text-center text-slate-500 font-medium">
              Based on columns of <span class="font-bold underline text-sky-600">tenths</span> and <span class="font-semibold underline text-teal-600">hundredths</span>.
            </p>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 font-bold font-mono">
            <span id="txtDecimalPlaceValueLabel">0 ones + 5 tenths + 0 hundredths</span>
          </div>
        </div>

        <!-- CARD 3: FRACTION SANDBOX -->
        <div class="glass-card p-6 rounded-2xl flex flex-col justify-between border-t-4 border-t-emerald-500">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-600 font-display uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-md">Fraction Form</span>
              <span class="text-[10px] text-slate-400 font-bold font-display uppercase tracking-wider">Parts of a Whole</span>
            </div>

            <!-- Mathematical Equation for fractions fraction simplification -->
            <div class="flex items-center justify-center gap-2 font-mono font-bold select-all" style="height: 60px;">
              <!-- 50/100 -->
              <div class="flex flex-col items-center">
                <span id="fracOrigNum" class="text-slate-400 text-xl">50</span>
                <span class="w-8 h-0.5 bg-slate-300"></span>
                <span id="fracOrigDen" class="text-slate-400 text-xl">100</span>
              </div>
              <span class="text-slate-400 text-xs font-sans">simplify ➜</span>
              <!-- Simplified -->
              <div class="flex flex-col items-center text-2xl text-emerald-700">
                <span id="fracSimpNum">1</span>
                <span class="w-10 h-1 bg-emerald-600"></span>
                <span id="fracSimpDen">2</span>
              </div>
            </div>

            <!-- Graphic 3: Segmented shape pie segment based exactly on the simplified denominator -->
            <div class="flex justify-center items-center py-2" id="fractionPieContainer" style="height: 120px;">
              <!-- SVG Pie segment created dynamically -->
            </div>

            <p class="text-xs text-center text-slate-500 font-medium">
              Shows <span class="font-bold underline text-emerald-600">numerator</span> (selected parts) divided by <span class="font-bold underline text-emerald-700">denominator</span> (total parts).
            </p>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 font-bold font-mono">
            <span id="txtFractionCaption">1 out of 2 equal parts</span>
          </div>
        </div>

      </section>

      <!-- Three Parallel Number Lines / Shared Ruler -->
      <section class="glass-card p-6 md:p-8 rounded-2xl space-y-6">
        <div>
          <h3 class="text-lg font-display font-semibold text-slate-700">Triple Linked Rulers</h3>
          <p class="text-sm text-slate-500 mt-1">
            Observe how the pointer markers line up perfectly at the same position across all three rulers simultaneously.
          </p>
        </div>

        <!-- Ruler Tracks Container -->
        <div class="bg-indigo-50/20 p-4 border border-indigo-100/40 rounded-xl relative space-y-8 select-none">
          
          <!-- Slider Indicator Cursor line going through the three tracks -->
          <div id="rulerCursor" class="absolute top-0 bottom-0 w-[3px] bg-indigo-500/80 pointer-events-none transition-all duration-150 z-20" style="left: 50%;">
            <!-- Neon Cyan Ping Knob top & bottom -->
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-full shadow"></div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-full shadow"></div>
          </div>

          <!-- RULER 1: PERCENT LINES -->
          <div class="space-y-1 relative" id="rulerPctTrack">
            <div class="flex items-center justify-between text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1.5">
              <span>1. Percent Scale</span>
              <span id="tagPctRuler" class="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">50%</span>
            </div>
            <!-- Ruler visual track with ticks -->
            <div class="h-10 bg-white border border-slate-200 rounded-lg relative px-2 cursor-pointer shadow-sm hover:border-indigo-200 transition-colors">
              <div class="absolute inset-x-2 inset-y-0 flex justify-between pr-[1px]">
                <!-- Dials will populate by JS from 0% - 100% -->
              </div>
            </div>
          </div>

          <!-- RULER 2: DECIMAL LINES -->
          <div class="space-y-1 relative" id="rulerDecTrack">
            <div class="flex items-center justify-between text-xs font-bold text-sky-700 uppercase tracking-widest mb-1.5">
              <span>2. Decimal Scale</span>
              <span id="tagDecRuler" class="font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded">0.50</span>
            </div>
            <!-- Ruler visual track with ticks -->
            <div class="h-10 bg-white border border-slate-200 rounded-lg relative px-2 cursor-pointer shadow-sm hover:border-sky-200 transition-colors">
              <div class="absolute inset-x-2 inset-y-0 flex justify-between pr-[1px]">
                <!-- Dials will populate by JS from 0.0 to 1.0 -->
              </div>
            </div>
          </div>

          <!-- RULER 3: FRACTION LINES -->
          <div class="space-y-1 relative" id="rulerFracTrack">
            <div class="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1.5">
              <span>3. Fraction Scale</span>
              <span id="tagFracRuler" class="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">1/2</span>
            </div>
            <!-- Ruler visual track with custom snapping milestone ticks -->
            <div class="h-10 bg-white border border-slate-200 rounded-lg relative px-2 cursor-pointer shadow-sm hover:border-emerald-200 transition-colors">
              <div class="absolute inset-x-2 inset-y-0 flex justify-between pr-[1px]">
                <!-- Ticks populated dynamically by JS for halves, quarters, tenths -->
              </div>
            </div>
          </div>

        </div>
        
        <p class="text-xs text-sky-600 font-semibold flex items-center gap-1">
          💡 <span>Click anywhere inside the three white ruler tracks to snap the value directly to that point!</span>
        </p>
      </section>

      <!-- Grade 6 Milestone Explanations / Snap Quick Guides -->
      <section class="glass-card p-6 md:p-8 rounded-2xl">
        <h3 class="text-xl font-display font-semibold text-blue-950 mb-4">Grade 6 Equivalence Milestones</h3>
        <p class="text-sm text-slate-500 mb-4">
          Click any landmark below to explore standard fractions and notice how the percents and decimals sync instantly.
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" id="milestonesButtonGrid">
          <!-- Populated by JS -->
        </div>
      </section>
    </main>

    <!-- Footer Sandbox Info -->
    <footer class="text-center text-xs text-slate-400 py-4 font-medium flex justify-between items-center px-4">
      <span>Grade 6 Conceptual Equivalence Sandbox Manipulative</span>
      <span>No Worksheets • Powered by Inquiry</span>
    </footer>
  </div>

  <!-- Sound Synthesis & Manipulative Application Controller Javascript Logic -->
  <script>
    // Constants definitions
    const MILESTONES = [
      { decimal: 0.0, numerator: 0, denominator: 1, label: 'Zero', percentStr: '0%', color: 'blue' },
      { decimal: 0.1, numerator: 1, denominator: 10, label: 'One Tenth', percentStr: '10%', color: 'indigo' },
      { decimal: 0.125, numerator: 1, denominator: 8, label: 'One Eighth', percentStr: '12.5%', color: 'violet' },
      { decimal: 0.2, numerator: 1, denominator: 5, label: 'One Fifth', percentStr: '20%', color: 'purple' },
      { decimal: 0.25, numerator: 1, denominator: 4, label: 'One Quarter', percentStr: '25%', color: 'fuchsia' },
      { decimal: 0.3, numerator: 3, denominator: 10, label: 'Three Tenths', percentStr: '30%', color: 'pink' },
      { decimal: 0.333333, numerator: 1, denominator: 3, label: 'One Third', percentStr: '33.3%', color: 'rose' },
      { decimal: 0.375, numerator: 3, denominator: 8, label: 'Three Eighths', percentStr: '37.5%', color: 'amber' },
      { decimal: 0.4, numerator: 2, denominator: 5, label: 'Two Fifths', percentStr: '40%', color: 'orange' },
      { decimal: 0.5, numerator: 1, denominator: 2, label: 'One Half', percentStr: '50%', color: 'cyan' },
      { decimal: 0.6, numerator: 3, denominator: 5, label: 'Three Fifths', percentStr: '60%', color: 'sky' },
      { decimal: 0.625, numerator: 5, denominator: 8, label: 'Five Eighths', percentStr: '62.5%', color: 'blue' },
      { decimal: 0.666667, numerator: 2, denominator: 3, label: 'Two Thirds', percentStr: '66.7%', color: 'indigo' },
      { decimal: 0.7, numerator: 7, denominator: 10, label: 'Seven Tenths', percentStr: '70%', color: 'violet' },
      { decimal: 0.75, numerator: 3, denominator: 4, label: 'Three Quarters', percentStr: '75%', color: 'fuchsia' },
      { decimal: 0.8, numerator: 4, denominator: 5, label: 'Four Fifths', percentStr: '80%', color: 'purple' },
      { decimal: 0.875, numerator: 7, denominator: 8, label: 'Seven Eighths', percentStr: '87.5%', color: 'pink' },
      { decimal: 0.9, numerator: 9, denominator: 10, label: 'Nine Tenths', percentStr: '90%', color: 'emerald' },
      { decimal: 1.0, numerator: 1, denominator: 1, label: 'One Whole', percentStr: '100%', color: 'teal' }
    ];

    // App Sandbox State
    let value = 50.0;
    let partitionMode = 'free'; // 'free' | '2' | '3' | '4' | '5' | '8' | '10'
    let soundEnabled = true;

    // Web Audio Sound Engine
    let audioCtx = null;
    function playTone(freq, duration = 0.12, type = 'sine') {
      if (!soundEnabled) return;
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function playSuccess() {
      playTone(523.25, 0.1, 'sine');
      setTimeout(() => playTone(659.25, 0.15, 'sine'), 100);
    }

    function playClick() {
      playTone(700, 0.04, 'triangle');
    }

    function playSwitch() {
      playTone(400, 0.08, 'triangle');
      setTimeout(() => playTone(600, 0.08, 'triangle'), 40);
    }

    // Fraction Helper (GCD)
    function gcd(a, b) {
      a = Math.abs(Math.round(a));
      b = Math.abs(Math.round(b));
      while (b) {
        let t = b;
        b = a % b;
        a = t;
      }
      return a;
    }

    function getFractionDetails(percent) {
      const dec = percent / 100;
      const milestone = MILESTONES.find(m => Math.abs(dec - m.decimal) < 0.0051);
      
      if (milestone) {
        return {
          num: milestone.numerator,
          den: milestone.denominator,
          isMilestone: true,
          label: milestone.label,
          milestone: milestone
        };
      }
      
      const roundedPct = Math.round(percent);
      const div = gcd(roundedPct, 100);
      return {
        num: roundedPct / div,
        den: 100 / div,
        isMilestone: false,
        label: ''
      };
    }

    function snapValue(val, partition) {
      if (partition === 'free') return Math.round(val);
      const den = parseInt(partition, 10);
      const segment = 100 / den;
      const index = Math.round(val / segment);
      return Number((index * segment).toFixed(4));
    }

    // DOM Elements Cache
    const elSlider = document.getElementById('mainSlider');
    const elFluidFill = document.getElementById('fluidFill');
    const elVisualPercent = document.getElementById('visualPercent');
    const elActiveMilestoneBadge = document.getElementById('activeMilestoneBadge');
    
    const elTxtPercentNumber = document.getElementById('txtPercentNumber');
    const elTxtPercentCaption = document.getElementById('txtPercentCaption');
    
    const elDecimalTenths = document.getElementById('decimalTenths');
    const elDecimalHundredths = document.getElementById('decimalHundredths');
    const elTxtDecimalPlaceValueLabel = document.getElementById('txtDecimalPlaceValueLabel');
    
    const elFracOrigNum = document.getElementById('fracOrigNum');
    const elFracOrigDen = document.getElementById('fracOrigDen');
    const elFracSimpNum = document.getElementById('fracSimpNum');
    const elFracSimpDen = document.getElementById('fracSimpDen');
    const elTxtFractionCaption = document.getElementById('txtFractionCaption');
    
    const elFractionPieContainer = document.getElementById('fractionPieContainer');
    const elGrid100 = document.getElementById('grid100');
    const elTenthsColumn = document.getElementById('tenthsColumn');
    const elHundredthsColumn = document.getElementById('hundredthsColumn');
    
    const elRulerCursor = document.getElementById('rulerCursor');
    const elTagPctRuler = document.getElementById('tagPctRuler');
    const elTagDecRuler = document.getElementById('tagDecRuler');
    const elTagFracRuler = document.getElementById('tagFracRuler');

    const elPartitionSelector = document.getElementById('partitionSelector');
    const elPartitionDividers = document.getElementById('partitionDividers');
    const elPartitionLabels = document.getElementById('partitionLabels');
    
    const elMilestonesButtonGrid = document.getElementById('milestonesButtonGrid');
    const elSoundToggle = document.getElementById('soundToggle');
    const elSoundIcon = document.getElementById('soundIcon');

    // UI Initializers & Render Functions
    function init100Grid() {
      elGrid100.innerHTML = '';
      for (let i = 0; i < 100; i++) {
        const dot = document.createElement('div');
        dot.className = 'w-3 h-3 rounded-sm bg-slate-200 transition-all duration-150';
        elGrid100.appendChild(dot);
      }
    }

    function initDecimalColumns() {
      elTenthsColumn.innerHTML = '';
      for (let i = 9; i >= 0; i--) {
        const blk = document.createElement('div');
        blk.className = 'h-1.5 w-full bg-slate-200 rounded-sm transition-all duration-150';
        elTenthsColumn.appendChild(blk);
      }

      elHundredthsColumn.innerHTML = '';
      for (let i = 9; i >= 0; i--) {
        const blk = document.createElement('div');
        blk.className = 'h-1.5 w-full bg-slate-200 rounded-sm transition-all duration-150';
        elHundredthsColumn.appendChild(blk);
      }
    }

    function initRulers() {
      // 1. PCT Ruler ticking dials
      const pctTrack = document.querySelector('#rulerPctTrack > div');
      pctTrack.querySelector('div').innerHTML = '';
      for (let i = 0; i <= 10; i++) {
        const val = i * 10;
        const tick = document.createElement('div');
        tick.className = 'flex flex-col items-center justify-between h-full py-1 text-[10px] text-slate-400 font-mono relative z-10';
        tick.innerHTML = \`<div class="w-0.5 h-2 bg-slate-300"></div><div>\${val}%</div>\`;
        pctTrack.querySelector('div').appendChild(tick);
      }

      // 2. DEC Ruler ticking dials
      const decTrack = document.querySelector('#rulerDecTrack > div');
      decTrack.querySelector('div').innerHTML = '';
      for (let i = 0; i <= 10; i++) {
        const val = (i / 10).toFixed(1);
        const tick = document.createElement('div');
        tick.className = 'flex flex-col items-center justify-between h-full py-1 text-[10px] text-slate-400 font-mono relative z-10';
        tick.innerHTML = \`<div class="w-0.5 h-2 bg-slate-300"></div><div>\${val}</div>\`;
        decTrack.querySelector('div').appendChild(tick);
      }

      // 3. FRAC Ruler ticking dials
      const fracTrack = document.querySelector('#rulerFracTrack > div');
      const fracList = [
        { d: 0.0, l: '0' },
        { d: 0.25, l: '1/4' },
        { d: 0.333333, l: '1/3' },
        { d: 0.5, l: '1/2' },
        { d: 0.666667, l: '2/3' },
        { d: 0.75, l: '3/4' },
        { d: 1.0, l: '1' }
      ];
      fracTrack.querySelector('div').innerHTML = '';
      fracList.forEach(item => {
        const tick = document.createElement('div');
        tick.className = 'flex flex-col items-center justify-between h-full py-1 text-[10px] text-slate-400 font-mono relative z-10';
        tick.style.position = 'absolute';
        tick.style.left = \`calc(\${item.d * 100}% - 14px)\`;
        tick.style.width = '28px';
        tick.innerHTML = \`<div class="w-0.5 h-2 bg-slate-300 mx-auto"></div><div class="text-center">\${item.l}</div>\`;
        fracTrack.querySelector('div').appendChild(tick);
      });
    }

    function initMilestones() {
      elMilestonesButtonGrid.innerHTML = '';
      MILESTONES.forEach(m => {
        // Skip extremes or show helpful ones
        if (m.denominator > 10 && m.numerator !== 1) return; // filter smaller fraction
        const btn = document.createElement('button');
        btn.className = 'p-2 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20 text-left transition-all hover:scale-[1.02] active:scale-[0.98]';
        btn.innerHTML = \`
          <div class="text-xs font-bold text-blue-900 font-display truncate opacity-70">\${m.label}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="font-mono text-sm font-bold text-blue-600">\${m.percentStr}</span>
            <span class="text-[10px] text-slate-400 font-mono">≈ \${m.numerator}/\${m.denominator}</span>
          </div>
        \`;
        btn.addEventListener('click', () => {
          let targetVal = m.decimal * 100;
          updateValue(targetVal);
          playSuccess();
        });
        elMilestonesButtonGrid.appendChild(btn);
      });
    }

    // MAIN RENDER UPDATE FUNCTION
    function updateValue(newVal) {
      // Boundaries
      value = Math.max(0, Math.min(100, newVal));
      
      // Snapped or smooth depending on selector
      value = snapValue(value, partitionMode);
      
      const decimal = value / 100;
      const frac = getFractionDetails(value);
      
      // Sync Slider
      elSlider.value = value;
      
      // Fill Fluid
      elFluidFill.style.width = \`\${value}%\`;
      
      // Update Text Displays
      elVisualPercent.innerText = \`\${value.toFixed(value % 1 === 0 ? 0 : 1)}%\`;
      
      if (frac.isMilestone) {
        elActiveMilestoneBadge.innerText = \`🎉 Snapped Milestone: \${frac.label} (\${frac.num}/\${frac.den})\`;
        elActiveMilestoneBadge.classList.remove('hidden');
      } else {
        elActiveMilestoneBadge.classList.add('hidden');
      }

      // Card 1 (Percent Grid Update)
      elTxtPercentNumber.innerText = \`\${value.toFixed(value % 1 === 0 ? 0 : 1)}\`;
      elTxtPercentCaption.innerText = \`\${value.toFixed(value % 1 === 0 ? 0 : 1)} parts out of 100 equal parts\`;
      
      const gridCells = elGrid100.children;
      const filledCount = Math.round(value);
      for (let i = 0; i < 100; i++) {
        if (i < filledCount) {
          gridCells[i].className = 'w-3 h-3 rounded-sm bg-indigo-500 shadow-sm shadow-indigo-600/20';
        } else {
          gridCells[i].className = 'w-3 h-3 rounded-sm bg-slate-200';
        }
      }

      // Card 2 (Decimal Column Base 10 Update)
      const tenthsPart = Math.floor(value / 10);
      const hundredthsPart = Math.round(value % 10);
      
      elDecimalTenths.innerText = tenthsPart;
      elDecimalHundredths.innerText = hundredthsPart;
      elTxtDecimalPlaceValueLabel.innerText = \`0 ones + \${tenthsPart} tenths + \${hundredthsPart} hundredths\`;

      const tenthsCells = elTenthsColumn.children;
      for (let i = 0; i < 10; i++) {
        // Render 0-9 bottom-to-top because layered flex
        const cellIndex = 9 - i;
        if (i < tenthsPart) {
          tenthsCells[cellIndex].className = 'h-1.5 w-full bg-sky-500 shadow-sm';
        } else {
          tenthsCells[cellIndex].className = 'h-1.5 w-full bg-slate-200';
        }
      }

      const hundredthsCells = elHundredthsColumn.children;
      for (let i = 0; i < 10; i++) {
        const cellIndex = 9 - i;
        if (i < hundredthsPart) {
          hundredthsCells[cellIndex].className = 'h-1.5 w-full bg-teal-400 shadow-sm';
        } else {
          hundredthsCells[cellIndex].className = 'h-1.5 w-full bg-slate-200';
        }
      }

      // Card 3 (Fraction SVG Circle Update)
      elFracOrigNum.innerText = Math.round(value);
      elFracOrigDen.innerText = 100;
      elFracSimpNum.innerText = frac.num;
      elFracSimpDen.innerText = frac.den;
      elTxtFractionCaption.innerText = \`\${frac.num} out of \${frac.den} equal parts\`;

      renderSVGCircle(frac.num, frac.den);

      // Ruler Indicator line travel
      elRulerCursor.style.left = \`\${value}%\`;
      
      elTagPctRuler.innerText = \`\${value.toFixed(value % 1 === 0 ? 0 : 1)}%\`;
      elTagDecRuler.innerText = decimal.toFixed(2);
      elTagFracRuler.innerText = \`\${frac.num}/\${frac.den}\`;
    }

    function renderSVGCircle(num, den) {
      elFractionPieContainer.innerHTML = '';
      if (den === 0) return;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('class', 'w-24 h-24 drop-shadow-md select-none');

      // Draw background circle shadows
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', '50');
      bg.setAttribute('cy', '50');
      bg.setAttribute('r', '45');
      bg.setAttribute('fill', '#f1f5f9');
      bg.setAttribute('stroke', '#cbd5e1');
      bg.setAttribute('stroke-width', '1.5');
      svg.appendChild(bg);

      const radius = 45;
      const cx = 50;
      const cy = 50;

      if (den === 1) {
        if (num === 1) {
          bg.setAttribute('fill', '#10b981');
          bg.setAttribute('stroke', '#047857');
        }
      } else {
        // Draw slices
        for (let i = 0; i < den; i++) {
          const angle1 = (i / den) * 360 - 90;
          const angle2 = ((i + 1) / den) * 360 - 90;

          const rad1 = (angle1 * Math.PI) / 180;
          const rad2 = (angle2 * Math.PI) / 180;

          const x1 = cx + radius * Math.cos(rad1);
          const y1 = cy + radius * Math.sin(rad1);
          const x2 = cx + radius * Math.cos(rad2);
          const y2 = cy + radius * Math.sin(rad2);

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const largeArc = 0;
          
          const dString = \`M \${cx} \${cy} L \${x1} \${y1} A \${radius} \${radius} 0 \${largeArc} 1 \${x2} \${y2} Z\`;
          path.setAttribute('d', dString);
          
          if (i < num) {
            path.setAttribute('fill', '#10b981');
            path.setAttribute('stroke', '#047857');
            path.setAttribute('stroke-width', '1.5');
          } else {
            path.setAttribute('fill', '#f1f5f9');
            path.setAttribute('stroke', '#cbd5e1');
            path.setAttribute('stroke-width', '1');
          }
          svg.appendChild(path);
        }
      }

      elFractionPieContainer.appendChild(svg);
    }

    function updatePartitionDividers() {
      elPartitionDividers.innerHTML = '';
      elPartitionLabels.innerHTML = '';
      
      if (partitionMode === 'free') {
        const lLeft = document.createElement('span');
        lLeft.innerText = '0/100';
        const lRight = document.createElement('span');
        lRight.innerText = '100/100';
        elPartitionLabels.appendChild(lLeft);
        elPartitionLabels.appendChild(document.createElement('span'));
        elPartitionLabels.appendChild(lRight);
        return;
      }

      const count = parseInt(partitionMode, 10);
      const segmentPercent = 100 / count;

      for (let i = 1; i < count; i++) {
        const line = document.createElement('div');
        line.className = 'w-0.5 border-r border-dashed border-slate-400 absolute h-full';
        line.style.left = \`\${i * segmentPercent}%\`;
        elPartitionDividers.appendChild(line);
      }

      // Labels
      for (let i = 0; i <= count; i++) {
        const lbl = document.createElement('span');
        lbl.className = 'absolute text-[10px] font-bold font-mono -translate-x-1/2';
        lbl.style.left = \`\${i * segmentPercent}%\`;
        lbl.innerText = \`\${i}/\${count}\`;
        elPartitionLabels.appendChild(lbl);
      }
    }

    // Interactive event actions
    elSlider.addEventListener('input', (e) => {
      const prevVal = value;
      const sliderVal = parseFloat(e.target.value);
      updateValue(sliderVal);
      
      // Play a direct light click sound on value jumps
      if (Math.round(prevVal) !== Math.round(value)) {
        playClick();
      }
    });

    elPartitionSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      // Swap active classes
      document.querySelectorAll('.btn-partition').forEach(b => {
        b.className = 'btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-150';
      });
      btn.className = 'btn-partition px-3 py-1.5 rounded-lg text-sm font-semibold border-2 border-blue-600 bg-blue-600 text-white shadow-sm transition-all duration-150';
      
      partitionMode = btn.getAttribute('data-mode');
      
      // Re-trigger snap
      updateValue(value);
      updatePartitionDividers();
      playSwitch();
    });

    // Tap on ruler tracks to move indicator
    const handleRulerClick = (e, elementTrack) => {
      const rect = elementTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left - 8; // align margins padding
      const fractionPercent = clickX / (rect.width - 16);
      const targetPercent = Math.max(0, Math.min(100, fractionPercent * 100));
      updateValue(targetPercent);
      playSuccess();
    };

    document.getElementById('rulerPctTrack').addEventListener('click', (e) => handleRulerClick(e, document.getElementById('rulerPctTrack').children[1]));
    document.getElementById('rulerDecTrack').addEventListener('click', (e) => handleRulerClick(e, document.getElementById('rulerDecTrack').children[1]));
    document.getElementById('rulerFracTrack').addEventListener('click', (e) => handleRulerClick(e, document.getElementById('rulerFracTrack').children[1]));

    // Audio Switch Toggle
    elSoundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        elSoundIcon.innerText = '🔊';
        elSoundToggle.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white/90 text-sm font-medium hover:bg-slate-50 transition-colors text-slate-600';
        playTone(500, 0.1);
      } else {
        elSoundIcon.innerText = '🔇';
        elSoundToggle.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-sm font-medium transition-colors';
      }
    });

    // Start App Sandbox Init
    init100Grid();
    initDecimalColumns();
    initRulers();
    initMilestones();
    updatePartitionDividers();
    updateValue(50.0);

  </script>
</body>
</html>`;
}
