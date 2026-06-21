/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PartitionType = 'free' | '2' | '3' | '4' | '5' | '8' | '10';

export interface Milestone {
  decimal: number;
  numerator: number;
  denominator: number;
  label: string;
  percentStr: string;
  color: string;
}

export interface FractionResult {
  numerator: number;
  denominator: number;
  originalNumerator: number;
  originalDenominator: number;
  isMilestone: boolean;
  milestone?: Milestone;
}
