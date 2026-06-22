/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RatioTheme {
  id: string;
  name: string;
  icon: string;
  topLabel: string;
  bottomLabel: string;
  topUnit: string;
  bottomUnit: string;
  topColor: string; // Tailwind bg/accent color
  bottomColor: string; // Tailwind bg/accent color
  topTextClass: string;
  bottomTextClass: string;
  defaultTop: number;
  defaultBottom: number;
  description: string;
}

export interface RatioColumn {
  id: string;
  multiplier: number | null; // null if empty slot
  topValue: number | null;
  bottomValue: number | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  themeId: string;
  targetMultiplier: number;
  questionText: string;
  validationKey: "top" | "bottom" | "multiplier";
  validationValue: number;
  hint: string;
}
