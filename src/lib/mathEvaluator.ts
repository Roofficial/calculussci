/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AngleMode, VariableState, StatDataPoint } from '../types';

// Helper for factorials
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Convert angle to Radians
export function toRadians(val: number, mode: AngleMode): number {
  switch (mode) {
    case 'DEG':
      return (val * Math.PI) / 180;
    case 'GRAD':
      return (val * Math.PI) / 200;
    case 'RAD':
    default:
      return val;
  }
}

// Convert from Radians to the specified angle unit
export function fromRadians(rad: number, mode: AngleMode): number {
  switch (mode) {
    case 'DEG':
      return (rad * 180) / Math.PI;
    case 'GRAD':
      return (rad * 200) / Math.PI;
    case 'RAD':
    default:
      return rad;
  }
}

// Great Common Divisor (GCD)
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

// Least Common Multiple (LCM)
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

// Permutation nPr
export function nPr(n: number, r: number): number {
  if (n < 0 || r < 0 || n < r || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  return factorial(n) / factorial(n - r);
}

// Combination nCr
export function nCr(n: number, r: number): number {
  if (n < 0 || r < 0 || n < r || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

// Converts a decimal to fraction using simple continued fractions
export function toFraction(value: number, tolerance = 1.0e-9): { numerator: number; denominator: number } | null {
  if (isNaN(value) || !isFinite(value)) return null;
  // If integer
  if (Number.isInteger(value)) {
    return { numerator: value, denominator: 1 };
  }

  // Handle negatives
  const sign = value < 0 ? -1 : 1;
  const absVal = Math.abs(value);

  // If extremely small or ridiculously huge
  if (absVal < 1e-6 || absVal > 1e6) return null;

  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = absVal;
  do {
    const a = Math.floor(b);
    const aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    const aux2 = k1;
    k1 = a * k1 + k2;
    k2 = aux2;
    b = 1 / (b - a);
  } while (Math.abs(absVal - h1 / k1) > absVal * tolerance);

  // Limit Max logical denominator in calculators to maintain readability (e.g. 10000)
  if (k1 > 5000) return null;

  return { numerator: sign * h1, denominator: k1 };
}

/**
 * Tokenizes and evaluates an expression.
 * Rather than a raw vulnerable 'eval', we parse and compile calculations safely.
 */
export function evaluateExpression(
  expression: string,
  angleMode: AngleMode,
  vars: VariableState,
  ans: number
): number {
  // Pre-process expression string
  let exp = expression;

  // Replace multiplication and division visual characters
  exp = exp.replace(/×/g, '*');
  exp = exp.replace(/÷/g, '/');

  // Replace Constants
  exp = exp.replace(/π/g, `${Math.PI}`);
  exp = exp.replace(/Ans/g, `${ans}`);
  exp = exp.replace(/\be\b/g, `${Math.E}`);

  // Replace variable references with boundary check
  Object.entries(vars).forEach(([key, val]) => {
    const rx = new RegExp(`\\b${key}\\b`, 'g');
    exp = exp.replace(rx, `${val}`);
  });

  // Resolve percentage (e.g. "50%" -> "50*0.01")
  exp = exp.replace(/(\d+(\.\d+)?)%/g, '($1 * 0.01)');

  // Simple cleanings
  exp = exp.trim();
  if (!exp) return 0;

  try {
    // Custom safe evaluator using tokenized parsing
    return parseAndEval(exp, angleMode);
  } catch (err) {
    console.error('Expression evaluation failed:', err);
    return NaN;
  }
}

/**
 * Safe Recursive Parser to evaluate mathematical functions without eval()
 */
function parseAndEval(str: string, angleMode: AngleMode): number {
  // Remove spaces
  let s = str.replace(/\s+/g, '');

  // Parentheses matching & nested resolution
  // We scan and solve matching brackets from inner to outer
  let match;
  // Regex to match functions: functions(expr)
  // Let's list formulas: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, ln, log, logBase, sqrt, cbrt, abs
  const funcRegex = /(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|ln|log|sqrt|cbrt|abs)\(([^()]+)\)/i;
  
  // Custom multi-parameter function matcher like log_a(base, x) or nCr(n, r)
  const binaryFuncRegex = /(logBase|nCr|nPr|gcd|lcm|RanInt)\(([^()]+),([^()]+)\)/i;

  let limit = 0;
  while (limit < 100) {
    if (binaryFuncRegex.test(s)) {
      s = s.replace(binaryFuncRegex, (_, func, arg1Str, arg2Str) => {
        const arg1 = parseAndEval(arg1Str, angleMode);
        const arg2 = parseAndEval(arg2Str, angleMode);
        switch (func.toLowerCase()) {
          case 'logbase':
            return `${Math.log(arg2) / Math.log(arg1)}`;
          case 'ncr':
            return `${nCr(arg1, arg2)}`;
          case 'npr':
            return `${nPr(arg1, arg2)}`;
          case 'gcd':
            return `${gcd(arg1, arg2)}`;
          case 'lcm':
            return `${lcm(arg1, arg2)}`;
          case 'ranint':
            return `${Math.floor(Math.random() * (arg2 - arg1 + 1)) + arg1}`;
          default:
            return '0';
        }
      });
      limit++;
      continue;
    }

    if (funcRegex.test(s)) {
      s = s.replace(funcRegex, (_, func, inside) => {
        const val = parseAndEval(inside, angleMode);
        switch (func.toLowerCase()) {
          case 'sin':
            return `${Math.sin(toRadians(val, angleMode))}`;
          case 'cos':
            return `${Math.cos(toRadians(val, angleMode))}`;
          case 'tan': {
            // Check for illegal tangents (e.g. tan 90 deg)
            const rad = toRadians(val, angleMode);
            if (Math.abs(Math.cos(rad)) < 1e-12) return 'NaN';
            return `${Math.tan(rad)}`;
          }
          case 'asin':
            return `${fromRadians(Math.asin(val), angleMode)}`;
          case 'acos':
            return `${fromRadians(Math.acos(val), angleMode)}`;
          case 'atan':
            return `${fromRadians(Math.atan(val), angleMode)}`;
          case 'sinh':
            return `${Math.sinh(val)}`;
          case 'cosh':
            return `${Math.cosh(val)}`;
          case 'tanh':
            return `${Math.tanh(val)}`;
          case 'asinh':
            return `${Math.asinh(val)}`;
          case 'acosh':
            return `${Math.acosh(val)}`;
          case 'atanh':
            return `${Math.atanh(val)}`;
          case 'ln':
            return `${Math.log(val)}`;
          case 'log':
            return `${Math.log10(val)}`;
          case 'sqrt':
            return `${Math.sqrt(val)}`;
          case 'cbrt':
            return `${Math.cbrt(val)}`;
          case 'abs':
            return `${Math.abs(val)}`;
          default:
            return '0';
        }
      });
      limit++;
      continue;
    }

    // Resolve simple parentheses like (3 + 5)
    const parenRegex = /\(([^()]+)\)/;
    if (parenRegex.test(s)) {
      s = s.replace(parenRegex, (_, inside) => {
        return `${parseAndEval(inside, angleMode)}`;
      });
      limit++;
      continue;
    }

    break;
  }

  // Resolve factorials: e.g. "5!" -> 120
  s = s.replace(/(\d+)!/g, (_, nStr) => {
    return `${factorial(parseInt(nStr, 10))}`;
  });

  // Safe Math evaluation for basic operators following hierarchy: ^ (power) -> *, / -> +, -
  return solveSimpleAlgebra(s);
}

function solveSimpleAlgebra(s: string): number {
  // First, parse exponential notation (e.g., 2.3e-4 or 5e+10) before handling operations
  // We can temporarily mask scientific notation or process.
  
  // Resolve powers like 2^3 or 5² or 5³
  s = s.replace(/(-?\d+(\.\d+)?(e[+-]?\d+)?)²/g, '($1^2)');
  s = s.replace(/(-?\d+(\.\d+)?(e[+-]?\d+)?)³/g, '($1^3)');

  // Parse custom binary power expressions X^Y
  let sPower = s;
  const powerRegex = /(-?\d+(\.\d+)?(e[+-]?\d+)?)\^(-?\d+(\.\d+)?(e[+-]?\d+)?)/;
  let powerLimit = 0;
  while (powerRegex.test(sPower) && powerLimit < 20) {
    sPower = sPower.replace(powerRegex, (_, base, __, ___, exponent) => {
      const b = parseFloat(base);
      const e = parseFloat(exponent);
      return `${Math.pow(b, e)}`;
    });
    powerLimit++;
  }
  s = sPower;

  // Simple manual tokenizer for +, -, *, /
  // We tokenize the string into numbers and operators, handling unary minuses correctly.
  const tokens: (string | number)[] = [];
  let currentNum = '';

  for (let i = 0; i < s.length; i++) {
    const char = s[i];

    // Check for unary minus/plus
    // Unary if at beginning of expression, or preceded by an operator (+, -, *, /)
    if ((char === '-' || char === '+') && (currentNum === '' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string'))) {
      currentNum += char;
      continue;
    }

    if ('+-*/'.includes(char)) {
      if (currentNum !== '') {
        tokens.push(parseFloat(currentNum));
        currentNum = '';
      }
      tokens.push(char);
    } else {
      currentNum += char;
    }
  }

  if (currentNum !== '') {
    tokens.push(parseFloat(currentNum));
  }

  // Evaluate multiplications and divisions left-to-right
  let i = 0;
  while (i < tokens.length) {
    const op = tokens[i];
    if (op === '*' || op === '/') {
      const prevNum = tokens[i - 1] as number;
      const nextNum = tokens[i + 1] as number;
      let res = 0;
      if (op === '*') {
        res = prevNum * nextNum;
      } else {
        if (nextNum === 0) return NaN; // Division by zero!
        res = prevNum / nextNum;
      }
      // Replace these 3 elements with the result
      tokens.splice(i - 1, 3, res);
      i--; // Offset adjusting
    } else {
      i++;
    }
  }

  // Evaluate additions and subtractions left-to-right
  i = 0;
  while (i < tokens.length) {
    const op = tokens[i];
    if (op === '+' || op === '-') {
      const prevNum = tokens[i - 1] as number;
      const nextNum = tokens[i + 1] as number;
      let res = 0;
      if (op === '+') {
        res = prevNum + nextNum;
      } else {
        res = prevNum - nextNum;
      }
      tokens.splice(i - 1, 3, res);
      i--;
    } else {
      i++;
    }
  }

  return tokens[0] as number;
}

/**
 * --- STATISTICS CALCULATORS ---
 */

// Interface for regression parameters: y = A + BX
export interface RegressionResult {
  a: number; // constant
  b: number; // slope
  r: number; // correlation coefficient
  meanX: number;
  meanY: number;
  stdDevX: number;
  stdDevY: number;
}

export function calculateSingleVarStats(data: StatDataPoint[]): {
  n: number;
  sumX: number;
  sumX2: number;
  mean: number;
  stdDevSample: number; // s
  stdDevPop: number; // σ
  variancePop: number;
} | null {
  const validPoints = data.filter((p) => !isNaN(p.x));
  const n = validPoints.length;
  if (n === 0) return null;

  const sumX = validPoints.reduce((sum, p) => sum + p.x, 0);
  const sumX2 = validPoints.reduce((sum, p) => sum + p.x * p.x, 0);
  const mean = sumX / n;

  // Variance & Standard deviations
  const sumSqDiff = validPoints.reduce((sum, p) => sum + Math.pow(p.x - mean, 2), 0);
  const variancePop = sumSqDiff / n;
  const stdDevPop = Math.sqrt(variancePop);
  const stdDevSample = n > 1 ? Math.sqrt(sumSqDiff / (n - 1)) : 0;

  return {
    n,
    sumX,
    sumX2,
    mean,
    stdDevSample,
    stdDevPop,
    variancePop,
  };
}

export function calculateBiVarStats(data: StatDataPoint[]): RegressionResult | null {
  const validPoints = data.filter((p) => !isNaN(p.x) && p.y !== undefined && !isNaN(p.y));
  const n = validPoints.length;
  if (n < 2) return null;

  const sumX = validPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = validPoints.reduce((sum, p) => sum + (p.y || 0), 0);
  const sumX2 = validPoints.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = validPoints.reduce((sum, p) => sum + (p.y || 0) * (p.y || 0), 0);
  const sumXY = validPoints.reduce((sum, p) => sum + p.x * (p.y || 0), 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  // Covariances & standard deviations
  const dx = validPoints.map((p) => p.x - meanX);
  const dy = validPoints.map((p) => (p.y || 0) - meanY);

  const sumDx2 = dx.reduce((sum, v) => sum + v * v, 0);
  const sumDy2 = dy.reduce((sum, v) => sum + v * v, 0);
  const sumDxDy = dx.reduce((sum, v, idx) => sum + v * dy[idx], 0);

  if (sumDx2 === 0) return null; // Parallel/Vertical line points (infinite slope)

  const b = sumDxDy / sumDx2; // Slope
  const a = meanY - b * meanX; // Intercept (Constant)

  const stdDevX = Math.sqrt(sumDx2 / (n - 1));
  const stdDevY = Math.sqrt(sumDy2 / (n - 1));

  let r = 0;
  if (sumDx2 > 0 && sumDy2 > 0) {
    r = sumDxDy / Math.sqrt(sumDx2 * sumDy2);
  }

  return {
    a,
    b,
    r,
    meanX,
    meanY,
    stdDevX,
    stdDevY,
  };
}

/**
 * --- EQUATION SOLVERS ---
 */

// Solve 2x2 linear system:
// a1*x + b1*y = c1
// a2*x + b2*y = c2
export function solve2VarLinear(coef: number[]): string[] {
  // Coef looks like: [a1, b1, c1, a2, b2, c2]
  const [a1, b1, c1, a2, b2, c2] = coef;
  const D = a1 * b2 - b1 * a2;
  if (D === 0) {
    return ['No Unique Sol'];
  }
  const x = (c1 * b2 - b1 * c2) / D;
  const y = (a1 * c2 - c1 * a2) / D;
  return [`x = ${x.toFixed(6)}`, `y = ${y.toFixed(6)}`].map((s) => s.replace(/\.?0+$/, ''));
}

// Solve 3x3 linear system
export function solve3VarLinear(coef: number[]): string[] {
  // Coef: [a1,b1,c1,d1, a2,b2,c2,d2, a3,b3,c3,d3]
  const [a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3] = coef;
  const D =
    a1 * (b2 * c3 - c2 * b3) -
    b1 * (a2 * c3 - c2 * a3) +
    c1 * (a2 * b3 - b2 * a3);

  if (Math.abs(D) < 1e-12) {
    return ['No Unique Sol'];
  }

  const Dx =
    d1 * (b2 * c3 - c2 * b3) -
    b1 * (d2 * c3 - c2 * d3) +
    c1 * (d2 * b3 - b2 * d3);

  const Dy =
    a1 * (d2 * c3 - c2 * d3) -
    d1 * (a2 * c3 - c2 * a3) +
    c1 * (a2 * d3 - d2 * a3);

  const Dz =
    a1 * (b2 * d3 - d2 * b3) -
    b1 * (a2 * d3 - d2 * a3) +
    d1 * (a2 * b3 - b2 * a3);

  const x = Dx / D;
  const y = Dy / D;
  const z = Dz / D;

  return [
    `x = ${x.toFixed(6)}`,
    `y = ${y.toFixed(6)}`,
    `z = ${z.toFixed(6)}`,
  ].map((s) => s.replace(/\.?0+$/, ''));
}

// Solve quadratic equation: a*x^2 + b*x + c = 0
export function solveQuadratic(coef: number[]): string[] {
  // Coef: [a, b, c]
  const [a, b, c] = coef;
  if (a === 0) {
    if (b === 0) return ['No Solution'];
    return [`x = ${(-c / b).toFixed(6)}`].map((s) => s.replace(/\.?0+$/, ''));
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant > 0) {
    const r1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const r2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return [
      `x1 = ${r1.toFixed(6)}`,
      `x2 = ${r2.toFixed(6)}`,
    ].map((s) => s.replace(/\.?0+$/, ''));
  } else if (discriminant === 0) {
    const r = -b / (2 * a);
    return [`x = ${r.toFixed(6)}`].map((s) => s.replace(/\.?0+$/, ''));
  } else {
    // Complex roots
    const real = -b / (2 * a);
    const imag = Math.sqrt(-discriminant) / (2 * a);
    return [
      `x1 = ${real.toFixed(6)} + ${imag.toFixed(6)}i`,
      `x2 = ${real.toFixed(6)} - ${imag.toFixed(6)}i`,
    ];
  }
}

// Solve cubic equation: a*x^3 + b*x^2 + c*x + d = 0 (using Cardano's method)
export function solveCubic(coef: number[]): string[] {
  // Coef: [a, b, c, d]
  const [a, b, c, d] = coef;
  if (a === 0) {
    return solveQuadratic([b, c, d]);
  }

  // Normalize: x^3 + A*x^2 + B*x + C = 0
  const A = b / a;
  const B = c / a;
  const C = d / a;

  // Substitution of x = y - A/3 to eliminate quadratic term: y^3 + p*y + q = 0
  const p = B - (A * A) / 3;
  const q = C - (A * B) / 3 + (2 * A * A * A) / 27;

  const discriminant = (q * q) / 4 + (p * p * p) / 27;

  if (discriminant > 0) {
    // One real root, two complex roots
    const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
    const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
    const y1 = u + v;
    const x1 = y1 - A / 3;

    const realPart = -(u + v) / 2 - A / 3;
    const imagPart = (Math.sqrt(3) / 2) * (u - v);

    return [
      `x1 = ${x1.toFixed(6)}`,
      `x2 = ${realPart.toFixed(6)} + ${imagPart.toFixed(6)}i`,
      `x3 = ${realPart.toFixed(6)} - ${imagPart.toFixed(6)}i`,
    ];
  } else if (discriminant === 0) {
    // Real roots, at least two are equal
    if (p === 0 && q === 0) {
      const x = -A / 3;
      return [`x = ${x.toFixed(6)} (triple)`];
    }
    const u = Math.cbrt(-q / 2);
    const x1 = 2 * u - A / 3;
    const x2 = -u - A / 3;
    return [
      `x1 = ${x1.toFixed(6)}`,
      `x2 = ${x2.toFixed(6)} (double)`,
    ].map((s) => s.replace(/\.?0+$/, ''));
  } else {
    // Three unequal real roots (Trigonometric method/Casus Irreducibilis)
    const r = Math.sqrt(-(p * p * p) / 27);
    const phi = Math.acos(-q / (2 * r));
    const factor = 2 * Math.sqrt(-p / 3);

    const x1 = factor * Math.cos(phi / 3) - A / 3;
    const x2 = factor * Math.cos((phi + 2 * Math.PI) / 3) - A / 3;
    const x3 = factor * Math.cos((phi + 4 * Math.PI) / 3) - A / 3;

    return [
      `x1 = ${x1.toFixed(6)}`,
      `x2 = ${x2.toFixed(6)}`,
      `x3 = ${x3.toFixed(6)}`,
    ].map((s) => s.replace(/\.?0+$/, ''));
  }
}
