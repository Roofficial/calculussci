/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Cloud, CloudOff, ArrowUpDown, ChevronRight } from 'lucide-react';
import { AngleMode, CalculatorMode, StatSubMode, EqnSubMode } from '../types';

interface CalculatorScreenProps {
  expression: string;
  cursorIndex: number;
  result: string;
  angleMode: AngleMode;
  mode: CalculatorMode;
  statSubMode: StatSubMode;
  eqnSubMode: EqnSubMode;
  shiftActive: boolean;
  alphaActive: boolean;
  memoryHasValue: boolean;
  driveConnected: boolean;
  username: string | null;
  fractionFormat: boolean; // toggle between standard fraction (3/2) and S<=>D decimal (1.5)
  fractionData: { numerator: number; denominator: number } | null;
  activeHistoryCount: number;
  currentHistoryIndex: number;
  errorMsg?: string | null;
}

export default function CalculatorScreen({
  expression,
  cursorIndex,
  result,
  angleMode,
  mode,
  statSubMode,
  eqnSubMode,
  shiftActive,
  alphaActive,
  memoryHasValue,
  driveConnected,
  username,
  fractionFormat,
  fractionData,
  activeHistoryCount,
  currentHistoryIndex,
  errorMsg,
}: CalculatorScreenProps) {
  // Format expression for displaying like standard math characters
  // Replace symbols for a beautiful math-grade appearance:
  const formatDisplayExpr = (expr: string) => {
    let formatted = expr;
    formatted = formatted.replace(/\*/g, '×');
    formatted = formatted.replace(/\//g, '÷');
    formatted = formatted.replace(/sqrt/g, '√');
    formatted = formatted.replace(/cbrt/g, '³√');
    formatted = formatted.replace(/asin/g, 'sin⁻¹');
    formatted = formatted.replace(/acos/g, 'cos⁻¹');
    formatted = formatted.replace(/atan/g, 'tan⁻¹');
    formatted = formatted.replace(/asinh/g, 'sinh⁻¹');
    formatted = formatted.replace(/acosh/g, 'cosh⁻¹');
    formatted = formatted.replace(/atanh/g, 'tanh⁻¹');
    formatted = formatted.replace(/logBase/g, 'log_base');
    return formatted;
  };

  // Re-format expression with cursor block inserted
  const displayExprWithCursor = () => {
    const formatted = formatDisplayExpr(expression);
    // Find the right string cursor offset adjusted for formatted lengths is complex,
    // so we can represent a modern cursor tracker using a highlighted symbol.
    // For visual simulation, we insert a subtle cursor block element
    if (cursorIndex < 0 || cursorIndex > expression.length) {
      return formatted;
    }

    const before = expression.substring(0, cursorIndex);
    const after = expression.substring(cursorIndex);

    return (
      <span id="screen-input-block" className="relative font-mono leading-relaxed select-text">
        {formatDisplayExpr(before)}
        <span className="relative inline-block w-[2px] h-[1.125rem] -top-[1px] bg-emerald-400 animate-pulse mx-[1px]" />
        {formatDisplayExpr(after)}
      </span>
    );
  };

  return (
    <div
      id="calculator-screen"
      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      className="w-full bg-white/5 backdrop-blur-3xl text-white p-6 rounded-[28px] border border-white/10 shadow-[inner_0_2px_12px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.3)] flex flex-col justify-between overflow-hidden relative"
    >
      {/* Background Grid Accent for Dot-Matrix Lcd Feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none" />

      {/* 1. Header Row (Status Indicators) */}
      <div id="lcd-status-bar" className="flex items-center justify-between text-[10px] font-mono select-none tracking-widest text-white/40 border-b border-white/10 pb-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          {/* Shift Label */}
          <span
            id="lbl-shift-ind"
            className={`px-1 rounded-sm text-[8px] font-bold transition-all duration-150 ${
              shiftActive ? 'bg-orange-400 text-black shadow font-black scale-105' : 'opacity-20'
            }`}
          >
            S
          </span>
          {/* Alpha Label */}
          <span
            id="lbl-alpha-ind"
            className={`px-1 rounded-sm text-[8px] font-bold transition-all duration-150 ${
              alphaActive ? 'bg-blue-400 text-black shadow font-black scale-105' : 'opacity-20'
            }`}
          >
            A
          </span>
          {/* Memory Flag */}
          <span
            id="lbl-memory-ind"
            className={`transition-all text-[9px] ${memoryHasValue ? 'text-blue-300 font-semibold' : 'opacity-20'}`}
          >
            M
          </span>
          {/* Angle Mode */}
          <mark
            id="lbl-angle-mode"
            className={`bg-transparent text-[9.5px] ${
              angleMode === 'DEG'
                ? 'text-blue-300 font-bold'
                : angleMode === 'RAD'
                ? 'text-purple-300 font-bold'
                : 'text-amber-300 font-bold'
            }`}
          >
            {angleMode}
          </mark>
          {/* Calc Main Mode */}
          <span id="lbl-calc-mode" className="text-[9px] text-[#E0E0E6]/80 font-bold bg-white/5 border border-white/10 px-1 py-0.5 rounded-sm">
            {mode}
            {mode === 'STAT' && statSubMode ? `:${statSubMode}` : ''}
            {mode === 'EQN' && eqnSubMode ? `:${eqnSubMode.split('-')[0]}` : ''}
          </span>
        </div>

        {/* Right Indicators: Cloud Storage, Active Index, etc. */}
        <div className="flex items-center gap-2.5">
          {activeHistoryCount > 0 && (
            <div className="flex items-center gap-1.5 text-[9px] text-blue-400">
              <ArrowUpDown className="w-2.5 h-2.5 animate-bounce" />
              <span>{currentHistoryIndex >= 0 ? `${currentHistoryIndex + 1}/${activeHistoryCount}` : `[Ans]`}</span>
            </div>
          )}

          {driveConnected ? (
            <div title={`Synced with Drive: ${username || 'Connected'}`} className="flex items-center gap-1 text-blue-400">
              <Cloud className="w-3.5 h-3.5 fill-blue-500/20" />
              <span className="text-[8px] tracking-normal truncate max-w-[60px] hidden sm:inline text-blue-300">{username}</span>
            </div>
          ) : (
            <div title="Offline mode (Cloud Sync disabled)" className="text-white/20" id="lbl-cloud-off">
              <CloudOff className="w-3.5 h-3.5 opacity-30" />
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Work Area (Expressive Equations / Lists Mode) */}
      <div id="lcd-main-body" className="flex-1 flex flex-col justify-center min-h-[50px] z-10 relative">
        {errorMsg ? (
          <span id="screen-calc-error" className="text-rose-400 font-mono text-sm leading-relaxed transition-all duration-300 pl-1 border-l-2 border-rose-500">
            {errorMsg}
          </span>
        ) : (
          <div className="space-y-1">
            {/* Input expression formula */}
            <div className="text-xl font-mono text-white/50 break-all select-text pb-1">
              {displayExprWithCursor()}
            </div>
          </div>
        )}
      </div>

      {/* 3. Output/Result Row */}
      <div id="lcd-results-row" className="flex items-baseline justify-between mt-3.5 border-t border-white/10 pt-3 z-10 select-text">
        <div className="text-[10px] text-white/40 font-mono">
          {fractionFormat && fractionData && (
            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[9px]">
              S⇔D Active
            </span>
          )}
        </div>

        <div className="flex flex-col items-end select-text">
          {/* Fraction Representation if toggle active and valid */}
          {fractionFormat && fractionData && Math.abs(fractionData.denominator) > 1 ? (
            <motion.div
              id="fraction-visual"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center font-mono text-base border-white/10 px-2 border-r border-l"
            >
              <span className="border-b border-white/25 min-w-[20px] text-center px-1.5 leading-none pb-[1.5px]">
                {fractionData.numerator}
              </span>
              <span className="min-w-[20px] text-center px-1.5 leading-none pt-[1.5px] text-[13px] text-blue-400 font-semibold">
                {fractionData.denominator}
              </span>
            </motion.div>
          ) : (
            <motion.span
              id="decimal-visual"
              key={result}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-3xl sm:text-4xl font-mono text-white font-bold select-text tracking-tight flex items-center gap-2"
            >
              <span className="text-blue-500 text-xl select-none font-sans font-medium">=</span>
              {result || '0'}
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
