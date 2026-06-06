/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalculatorKey {
  id: string;
  primary: string;
  shift?: string;
  alpha?: string;
  type: 'digit' | 'operator' | 'scientific' | 'action' | 'memory' | 'nav';
  value: string;
}

interface CalculatorKeypadProps {
  onKeyPress: (value: string, type: string) => void;
  shiftActive: boolean;
  alphaActive: boolean;
}

export default function CalculatorKeypad({ onKeyPress, shiftActive, alphaActive }: CalculatorKeypadProps) {
  // Navigation trigger helper
  const triggerNav = (direction: string) => {
    onKeyPress(direction, 'nav');
  };

  // Middle/Upper scientific functions
  const sciKeys: CalculatorKey[] = [
    { id: 'k-frac', primary: 'a/b', shift: 'd/c', type: 'scientific', value: '/' },
    { id: 'k-sqrt', primary: '√', shift: '³√', type: 'scientific', value: 'sqrt' },
    { id: 'k-sqr', primary: 'x²', shift: 'x³', type: 'scientific', value: '^2' },
    { id: 'k-pow', primary: 'x^y', shift: 'x√y', type: 'scientific', value: '^' },
    { id: 'k-logbase', primary: 'log_a', shift: 'logBase', type: 'scientific', value: 'logBase(' },
    { id: 'k-log', primary: 'log', shift: '10^x', type: 'scientific', value: 'log(' },
    { id: 'k-ln', primary: 'ln', shift: 'e^x', type: 'scientific', value: 'ln(' },
    { id: 'k-neg', primary: '(-)', shift: 'RanInt', alpha: 'A', type: 'scientific', value: 'neg' },
    { id: 'k-fact', primary: 'x!', shift: '%', alpha: 'B', type: 'scientific', value: '!' },
    { id: 'k-hyp', primary: 'hyp', shift: 'asinh', alpha: 'C', type: 'scientific', value: 'hyp' },
    { id: 'k-sin', primary: 'sin', shift: 'sin⁻¹', alpha: 'D', type: 'scientific', value: 'sin(' },
    { id: 'k-cos', primary: 'cos', shift: 'cos⁻¹', alpha: 'E', type: 'scientific', value: 'cos(' },
    { id: 'k-tan', primary: 'tan', shift: 'tan⁻¹', alpha: 'F', type: 'scientific', value: 'tan(' },
    { id: 'k-rcl', primary: 'RCL', shift: 'STO', type: 'memory', value: 'RCL' },
    { id: 'k-eng', primary: 'ENG', shift: '←ENG', type: 'scientific', value: 'ENG' },
    { id: 'k-parenl', primary: '(', shift: 'nPr', alpha: 'X', type: 'scientific', value: '(' },
    { id: 'k-parenr', primary: ')', shift: 'nCr', alpha: 'Y', type: 'scientific', value: ')' },
    { id: 'k-sd', primary: 'S⇔D', shift: 'a b/c', type: 'action', value: 'SD' },
    { id: 'k-mplus', primary: 'M+', shift: 'M-', alpha: 'M', type: 'memory', value: 'M+' },
  ];

  // Bottom numeric & basic operators
  const baseKeys: CalculatorKey[] = [
    { id: 'k-7', primary: '7', alpha: 'Const', type: 'digit', value: '7' },
    { id: 'k-8', primary: '8', shift: 'Conv', type: 'digit', value: '8' },
    { id: 'k-9', primary: '9', shift: 'Reset', type: 'digit', value: '9' },
    { id: 'k-del', primary: 'DEL', shift: 'INS', type: 'action', value: 'DEL' },
    { id: 'k-ac', primary: 'AC', shift: 'OFF', type: 'action', value: 'AC' },

    { id: 'k-4', primary: '4', type: 'digit', value: '4' },
    { id: 'k-5', primary: '5', type: 'digit', value: '5' },
    { id: 'k-6', primary: '6', type: 'digit', value: '6' },
    { id: 'k-mul', primary: '×', shift: 'GCD', type: 'operator', value: '×' },
    { id: 'k-div', primary: '÷', shift: 'LCM', type: 'operator', value: '÷' },

    { id: 'k-1', primary: '1', shift: 'Stat', type: 'digit', value: '1' },
    { id: 'k-2', primary: '2', shift: 'Dist', type: 'digit', value: '2' },
    { id: 'k-3', primary: '3', shift: 'Table', type: 'digit', value: '3' },
    { id: 'k-add', primary: '+', shift: 'Pol', type: 'operator', value: '+' },
    { id: 'k-sub', primary: '-', shift: 'Rec', type: 'operator', value: '-' },

    { id: 'k-0', primary: '0', type: 'digit', value: '0' },
    { id: 'k-dot', primary: '.', shift: 'Ran#', type: 'digit', value: '.' },
    { id: 'k-exp', primary: '×10^x', shift: 'e', type: 'scientific', value: 'exp' },
    { id: 'k-ans', primary: 'Ans', shift: 'DRG', type: 'action', value: 'Ans' },
    { id: 'k-eq', primary: '=', shift: '≈', type: 'action', value: '=' },
  ];

  return (
    <div id="calculator-keypad" className="flex flex-col gap-5 select-none text-white/90">
      {/* 1. TOP UTILITY BAR (Shift, Alpha, D-Pad, Mode, On) */}
      <div id="keypad-utility-deck" className="grid grid-cols-3 items-center gap-3">
        <div className="flex flex-col gap-2.5">
          {/* Shift Button */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-orange-400 h-3 select-none uppercase tracking-widest opacity-80">Shift</span>
            <motion.button
              id="btn-shift"
              whileTap={{ scale: 0.92, y: 1 }}
              onClick={() => onKeyPress('Shift', 'action')}
              className={`w-14 h-8 rounded-xl font-bold text-[10px] tracking-wider transition-all flex items-center justify-center border ${
                shiftActive
                  ? 'bg-orange-500 text-[#0A0B10] border-orange-450 shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 border-white/10 text-orange-400/90 hover:bg-white/10'
              }`}
            >
              SHIFT
            </motion.button>
          </div>

          {/* Alpha Button */}
          <div className="flex flex-col items-center mt-1">
            <span className="text-[9px] font-bold text-blue-400 h-3 select-none uppercase tracking-widest opacity-80">Alpha</span>
            <motion.button
              id="btn-alpha"
              whileTap={{ scale: 0.92, y: 1 }}
              onClick={() => onKeyPress('Alpha', 'action')}
              className={`w-14 h-8 rounded-xl font-bold text-[10px] tracking-wider transition-all flex items-center justify-center border ${
                alphaActive
                  ? 'bg-blue-500 text-white border-blue-450 shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 border-white/10 text-blue-400/90 hover:bg-white/10'
              }`}
            >
              ALPHA
            </motion.button>
          </div>
        </div>

        {/* Circular Directional Pad (D-Pad) */}
        <div className="flex justify-center select-none" id="directional-dpad">
          <div className="relative w-24 h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex items-center justify-center">
            {/* Compass Inner circle */}
            <div className="absolute w-12 h-12 bg-white/10 rounded-full border border-white/5 shadow-inner flex items-center justify-center p-1 pointer-events-none">
              <span className="text-[7px] text-white/30 font-mono tracking-widest leading-none">REPLAY</span>
            </div>

            {/* UP Button */}
            <button
              id="dpad-up"
              onClick={() => triggerNav('UP')}
              className="absolute top-1 left-7 right-7 h-6 flex items-center justify-center text-white/40 hover:text-blue-400 active:scale-95 transition-colors focus:outline-none"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* DOWN Button */}
            <button
              id="dpad-down"
              onClick={() => triggerNav('DOWN')}
              className="absolute bottom-1 left-7 right-7 h-6 flex items-center justify-center text-white/40 hover:text-blue-400 active:scale-95 transition-colors focus:outline-none"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* LEFT Button */}
            <button
              id="dpad-left"
              onClick={() => triggerNav('LEFT')}
              className="absolute left-1 top-7 bottom-7 w-6 flex items-center justify-center text-white/40 hover:text-blue-400 active:scale-95 transition-colors focus:outline-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* RIGHT Button */}
            <button
              id="dpad-right"
              onClick={() => triggerNav('RIGHT')}
              className="absolute right-1 top-7 bottom-7 w-6 flex items-center justify-center text-white/40 hover:text-blue-400 active:scale-95 transition-colors focus:outline-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode / Set Up & ON Buttons */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold text-white/40 h-3 uppercase select-none tracking-widest">Setup</span>
            <motion.button
              id="btn-mode"
              whileTap={{ scale: 0.92 }}
              onClick={() => onKeyPress('MODE', 'action')}
              className="px-3 h-8 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] text-white rounded-xl font-bold shadow flex items-center justify-center"
            >
              MODE
            </motion.button>
          </div>

          <div className="flex flex-col items-center mt-1">
            <span className="text-[8px] opacity-0 h-3">-</span>
            <motion.button
              id="btn-on"
              whileTap={{ scale: 0.92 }}
              onClick={() => onKeyPress('ON', 'action')}
              className="px-3.5 h-8 bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-300 hover:bg-blue-500/30 rounded-xl font-bold shadow flex items-center justify-center"
            >
              ON
            </motion.button>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SCIENTIFIC KEYS (3 rows, dark glass keys) */}
      <div id="keypad-scientific-grid" className="grid grid-cols-5 gap-y-3.5 gap-x-2.5 border-t border-b border-white/10 py-5 my-1">
        {sciKeys.map((key) => {
          // Determine key display modifiers
          const holdsVariable = key.alpha === 'A' || key.alpha === 'B' || key.alpha === 'C' || key.alpha === 'D' || key.alpha === 'E' || key.alpha === 'F' || key.alpha === 'X' || key.alpha === 'Y' || key.alpha === 'M';

          return (
            <div key={key.id} className="flex flex-col items-center relative select-none group">
              {/* Secondary labels helper */}
              <div className="flex justify-between w-full max-w-[42px] px-[2px] h-3 select-none mb-1">
                <span className={`text-[8px] font-bold text-orange-400 truncate leading-none ${shiftActive ? 'scale-110 font-black' : 'opacity-60'}`}>
                  {key.shift || ''}
                </span>
                <span className={`text-[8px] font-bold text-blue-400 truncate leading-none ${alphaActive && holdsVariable ? 'scale-110 font-black' : 'opacity-60'}`}>
                  {key.alpha || ''}
                </span>
              </div>

              {/* Functional button */}
              <motion.button
                id={key.id}
                whileTap={{ scale: 0.93, y: 1 }}
                onClick={() => onKeyPress(key.value, key.type)}
                className="w-12 h-8 bg-white/5 border border-white/10 text-[11px] font-medium text-white/90 hover:bg-white/10 rounded-xl shadow-inner transition-all flex items-center justify-center p-0 select-none font-mono"
              >
                {key.primary}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* 3. BOTTOM CLASSIC KEYS (Digits and Basic Algebra operators) */}
      <div id="keypad-classic-grid" className="grid grid-cols-5 gap-y-3.5 gap-x-2.5">
        {baseKeys.map((key) => {
          const isCleanDigit = key.type === 'digit';
          const isCleanOperator = key.type === 'operator';
          const isCommand = key.value === 'DEL' || key.value === 'AC';
          const isResult = key.value === '=';

          // Tailor specific buttons color style of frosted theme mockup:
          let buttonClass = 'bg-white/10 border-white/10 text-white hover:bg-white/15 text-xl font-semibold';
          if (isCommand) {
            buttonClass = 'bg-red-500/20 border-red-500/45 text-red-300 hover:bg-red-500/30 font-bold';
          } else if (isCleanOperator || key.value === 'Ans') {
            buttonClass = 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10 font-medium text-lg';
          } else if (isResult) {
            buttonClass = 'bg-emerald-500/25 border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/35 font-bold text-xl shadow-[0_0_20px_rgba(16,185,129,0.15)]';
          } else if (!isCleanDigit) {
            buttonClass = 'bg-white/5 border-white/10 text-white hover:bg-white/10';
          }

          return (
            <div key={key.id} className="flex flex-col items-center relative select-none">
              {/* Secondary Shift sub labels on classic keypad */}
              <div className="h-3 flex items-center justify-center select-none mb-1">
                <span className="text-[8px] font-bold text-orange-400 leading-none opacity-60">
                  {key.shift || ''}
                </span>
              </div>

              <motion.button
                id={key.id}
                whileTap={{ scale: 0.94, y: 1.5 }}
                onClick={() => onKeyPress(key.value, key.type)}
                className={`w-12 h-10 border rounded-xl shadow-inner transition-all flex items-center justify-center text-sm tracking-wider select-none ${buttonClass}`}
              >
                {key.primary}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
