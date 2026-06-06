/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AngleMode = 'DEG' | 'RAD' | 'GRAD';

export type CalculatorMode = 'COMP' | 'STAT' | 'EQN';

export type StatSubMode = '1-VAR' | 'A+BX' | null;

export interface HistoryItem {
  id: string;
  expression: string; // The mathematical formula representing keys pressed (e.g. sin(30) + log(10))
  displayExpression: string; // Formatted for visual layout
  result: string; // Evaluated output (as string)
  timestamp: number;
  angleMode: AngleMode;
}

export interface VariableState {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  X: number;
  Y: number;
  M: number;
}

export type KeyType =
  | 'digit'       // 0-9, decimal point
  | 'operator'    // +, -, *, /
  | 'scientific'  // sin, cos, ln, power, etc.
  | 'action'      // =, AC, DEL, Shift, Alpha, Mode
  | 'memory'      // M+, Sto, Rcl
  | 'navigation'; // Arrow keys (Left, Right, Up, Down)

export interface CalculatorKey {
  id: string;
  primaryLabel: string;   // Main label on key (white/gray)
  shiftLabel?: string;    // Gold label above key (active when shift is true)
  alphaLabel?: string;    // Red label above key (active when alpha is true)
  type: KeyType;
  value: string;          // Inner code or action value
}

// Statistical data entry
export interface StatDataPoint {
  index: number;
  x: number;
  y?: number; // Optional for multi-variable stats (A+BX)
}

// Equation mode configs
export type EqnSubMode = '2-VAR-LINEAR' | '3-VAR-LINEAR' | 'QUADRATIC' | 'CUBIC' | null;

export interface EqnState {
  subMode: EqnSubMode;
  coefficients: number[]; // Flat array of floats
  step: 'INPUT' | 'RESULT';
  results?: string[]; // Solved x, y, z or x1, x2, x3
}
