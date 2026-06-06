/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, BarChart2, TrendingUp, Settings2, Table, HelpCircle } from 'lucide-react';
import { StatDataPoint, StatSubMode } from '../types';
import { calculateSingleVarStats, calculateBiVarStats } from '../lib/mathEvaluator';

interface StatsDashboardProps {
  subMode: StatSubMode;
  data: StatDataPoint[];
  onChangeData: (data: StatDataPoint[]) => void;
  onSetSubMode: (subMode: StatSubMode) => void;
}

export default function StatsDashboard({
  subMode,
  data,
  onChangeData,
  onSetSubMode,
}: StatsDashboardProps) {
  const [newX, setNewX] = useState<string>('');
  const [newY, setNewY] = useState<string>('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Single-variable stats
  const singleVarStats = useMemo(() => {
    return calculateSingleVarStats(data);
  }, [data]);

  // Two-variable regression stats
  const biVarStats = useMemo(() => {
    return calculateBiVarStats(data);
  }, [data]);

  // Append new row item
  const handleAddRow = (e?: FormEvent) => {
    e?.preventDefault();
    setErrorLocal(null);

    const xVal = parseFloat(newX);
    if (isNaN(xVal)) {
      setErrorLocal('X value must be a valid number');
      return;
    }

    const yVal = parseFloat(newY);
    if (subMode === 'A+BX' && isNaN(yVal)) {
      setErrorLocal('Y value is required for two-variable regression');
      return;
    }

    const newRow: StatDataPoint = {
      index: data.length + 1,
      x: xVal,
      y: subMode === 'A+BX' ? yVal : undefined,
    };

    onChangeData([...data, newRow]);
    setNewX('');
    setNewY('');
  };

  // Remove coordinate row
  const handleDeleteRow = (index: number) => {
    const updated = data.filter((_, idx) => idx !== index).map((row, idx) => ({
      ...row,
      index: idx + 1,
    }));
    onChangeData(updated);
  };

  // Generate mock coordinate seed to help user playwith stats easily
  const handleSeedMockData = () => {
    if (subMode === '1-VAR') {
      onChangeData([
        { index: 1, x: 10 },
        { index: 2, x: 12 },
        { index: 3, x: 15 },
        { index: 4, x: 14 },
        { index: 5, x: 18 },
      ]);
    } else {
      onChangeData([
        { index: 1, x: 2, y: 5 },
        { index: 2, x: 4, y: 7 },
        { index: 3, x: 5, y: 11 },
        { index: 4, x: 7, y: 14 },
        { index: 5, x: 9, y: 19 },
      ]);
    }
  };

  // Plot variables definition
  const plotBounds = useMemo(() => {
    if (data.length === 0) return { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y ?? 0);

    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 5) * 1.15;
    const minY = subMode === 'A+BX' ? Math.min(...ys, 0) : 0;
    const maxY = subMode === 'A+BX' ? Math.max(...ys, 5) * 1.15 : 10;

    return { minX, maxX, minY, maxY };
  }, [data, subMode]);

  return (
    <div id="stats-dashboard" className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-5 text-white h-full w-full backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
      {/* Tab Sub-Header Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-sm tracking-wide uppercase text-white/90">Statistical Solver</h3>
        </div>

        <div className="flex gap-2">
          <button
            id="btn-stat-1var"
            onClick={() => onSetSubMode('1-VAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              subMode === '1-VAR'
                ? 'bg-white/10 text-white border-white/20 shadow-md'
                : 'bg-white/3 text-white/55 border-transparent hover:text-white/80 hover:bg-white/5'
            }`}
          >
            1-VAR (Stats)
          </button>
          <button
            id="btn-stat-reg"
            onClick={() => onSetSubMode('A+BX')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              subMode === 'A+BX'
                ? 'bg-white/10 text-white border-white/20 shadow-md'
                : 'bg-white/3 text-white/55 border-transparent hover:text-white/80 hover:bg-white/5'
            }`}
          >
            A+BX (Regression)
          </button>
        </div>
      </div>

      {subMode === null ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
          <Settings2 className="w-12 h-12 text-white/20 mb-3 animate-spin" />
          <p className="text-sm font-medium text-white/70">Select a statistical submode to evaluate datasets</p>
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={() => onSetSubMode('1-VAR')}
              className="px-4 py-2 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold rounded-xl border border-blue-500/20 transition-all cursor-pointer"
            >
              1-VAR Calculations
            </button>
            <button
              onClick={() => onSetSubMode('A+BX')}
              className="px-4 py-2 bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              Linear Regression
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto">
          {/* Col 1: Spreadsheet Inputs (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-blue-400" /> Datagrid Editor
              </span>
              {data.length === 0 && (
                <button
                  onClick={handleSeedMockData}
                  className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/10 px-2.5 py-1 rounded-lg bg-blue-950/20 shadow-sm transition-all cursor-pointer"
                >
                  Load Sample Data
                </button>
              )}
            </div>

            {/* Matrix Form Entries */}
            <form onSubmit={handleAddRow} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 border border-white/10 p-4 rounded-2xl bg-white/3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">X coordinate</label>
                <input
                  type="number"
                  step="any"
                  value={newX}
                  onChange={(e) => setNewX(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400 font-mono focus:bg-white/10 transition-all"
                  placeholder="e.g. 5"
                />
              </div>

              {subMode === 'A+BX' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Y coordinate</label>
                  <input
                    type="number"
                    step="any"
                    value={newY}
                    onChange={(e) => setNewY(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400 font-mono focus:bg-white/10 transition-all"
                    placeholder="e.g. 11"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full sm:col-span-2 lg:col-span-1 mt-2 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Coordinates
              </button>

              {errorLocal && <span className="text-[10px] text-rose-400 mt-1 sm:col-span-2 lg:col-span-1">{errorLocal}</span>}
            </form>

            {/* Coordinates table List */}
            <div className="flex-1 max-h-[160px] lg:max-h-none overflow-y-auto border border-white/10 rounded-xl bg-black/20">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 border-b border-white/10 sticky top-0">
                  <tr>
                    <th className="p-2.5 text-white/40 font-semibold w-12 text-center">Row</th>
                    <th className="p-2.5 text-white/80 font-semibold text-center">X value</th>
                    {subMode === 'A+BX' && <th className="p-2.5 text-white/80 font-semibold text-center">Y value</th>}
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={subMode === 'A+BX' ? 4 : 3} className="p-4 text-center text-white/30 text-[11px] italic">
                        Table is empty. Add points above.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-center text-white/30">{row.index}</td>
                        <td className="p-2 text-center text-white/95">{row.x}</td>
                        {subMode === 'A+BX' && <td className="p-2 text-center text-white/95">{row.y}</td>}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Col 2: Analytics Stats Panel (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Numerical Summaries
            </span>

            {subMode === '1-VAR' ? (
              singleVarStats ? (
                <div className="grid grid-cols-2 gap-3 bg-black/20 p-4 rounded-2xl border border-white/15 font-mono text-xs">
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[10px] text-white/40 uppercase">n (Sample Size)</span>
                    <span className="text-white font-semibold text-sm">{singleVarStats.n}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[10px] text-white/40 uppercase">x̄ (Mean)</span>
                    <span className="text-emerald-400 font-bold text-sm">{singleVarStats.mean.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[10px] text-white/40 uppercase">Σx (Sum of X)</span>
                    <span className="text-white/90 text-sm">{singleVarStats.sumX.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[10px] text-white/40 uppercase">Σx² (Sum of X²)</span>
                    <span className="text-white/90 text-sm">{singleVarStats.sumX2.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[10px] text-white/40 uppercase">σx (Pop Std Dev)</span>
                    <span className="text-blue-300 text-sm">{singleVarStats.stdDevPop.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[10px] text-white/40 uppercase">sx (Sample Std Dev)</span>
                    <span className="text-blue-300 text-sm">{singleVarStats.stdDevSample.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[10px] text-white/40 uppercase">σ²x (Pop Variance)</span>
                    <span className="text-white/90 text-sm">{singleVarStats.variancePop.toFixed(4)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-white/10 text-center text-[11px] text-[#E0E0E6]/50 bg-white/3">
                  Insert values in table to construct statistical summaries.
                </div>
              )
            ) : (
              // Two-variable linear model y = a + bx
              biVarStats ? (
                <div className="grid grid-cols-2 gap-3 bg-black/20 p-4 rounded-2xl border border-white/15 font-mono text-xs">
                  <div className="col-span-2 text-[11px] bg-black/40 px-3 py-2 rounded-xl border border-white/10 mb-1">
                    <span className="text-white/40 text-[10px] block uppercase font-sans tracking-wide">Regression equation:</span>
                    <span className="text-blue-300 font-bold font-mono text-sm">
                      y = {biVarStats.a.toFixed(3)} + {biVarStats.b.toFixed(3)}x
                    </span>
                  </div>

                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[9.5px] text-white/40">A (Y-Intercept)</span>
                    <span className="text-emerald-400 font-semibold text-sm">{biVarStats.a.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[9.5px] text-white/40">B (Slope)</span>
                    <span className="text-emerald-400 font-semibold text-sm">{biVarStats.b.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[9.5px] text-white/40">r (Correlation coeff)</span>
                    <span className="text-orange-300 font-semibold text-sm">{biVarStats.r.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[9.5px] text-white/40">r² (Coeff of Det.)</span>
                    <span className="text-orange-200 font-semibold text-sm">{Math.pow(biVarStats.r, 2).toFixed(4)}</span>
                  </div>

                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[9.5px] text-white/40">Mean X & Y</span>
                    <span className="text-white/80">x̄ = {biVarStats.meanX.toFixed(2)}, ȳ = {biVarStats.meanY.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col border-b border-white/5 pb-2 col-span-2">
                    <span className="text-[9.5px] text-white/40">Sample Std Dev sx & sy</span>
                    <span className="text-white/80">sx = {biVarStats.stdDevX.toFixed(3)}, sy = {biVarStats.stdDevY.toFixed(3)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-white/10 text-center text-[11px] text-white/55 bg-white/3">
                  Insert at least 2 coordinate rows to calculate regressions summaries.
                </div>
              )
            )}
          </div>

          {/* Col 3: Elegant SVG Graphics Render (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-h-[200px]">
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Interactive Plot
            </span>

            {/* Custom SVG Coordinate Scatter & Regression line */}
            <div className="flex-1 bg-black/30 p-4 rounded-2xl border border-white/10 min-h-[170px] relative flex items-center justify-center">
              {data.length === 0 ? (
                <span className="text-[10px] text-white/30 font-medium font-sans">No graphical data to render.</span>
              ) : (
                <svg className="w-full h-full min-h-[150px] overflow-visible" viewBox="0 0 100 100">
                  {/* Axis grids */}
                  <line x1="10" y1="90" x2="95" y2="90" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
                  <line x1="10" y1="10" x2="10" y2="90" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" strokeDasharray="1" />

                  {/* Draw Scatter Points */}
                  {data.map((row, idx) => {
                    const normX =
                      plotBounds.maxX - plotBounds.minX === 0
                        ? 50
                        : 10 + ((row.x - plotBounds.minX) / (plotBounds.maxX - plotBounds.minX)) * 80;

                    const yrY = row.y ?? idx * 2;
                    const normY =
                      plotBounds.maxY - plotBounds.minY === 0
                        ? 50
                        : 90 - ((yrY - plotBounds.minY) / (plotBounds.maxY - plotBounds.minY)) * 80;

                    return (
                      <g key={idx}>
                        <motion.circle
                          cx={normX}
                          cy={normY}
                          r="2.5"
                          fill={subMode === 'A+BX' ? '#60a5fa' : '#c084fc'}
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth="0.5"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        />
                        <text x={normX} y={normY - 4.5} fontSize="3" fill="rgba(255,255,255,0.5)" textAnchor="middle" fontFamily="monospace">
                          ({row.x}{subMode === 'A+BX' ? `, ${row.y}` : ''})
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Regression Trend Line */}
                  {subMode === 'A+BX' && biVarStats && (
                    (() => {
                      // Calculate the start coordinate (minX) and end coordinate (maxX)
                      const x1Val = plotBounds.minX;
                      const x2Val = plotBounds.maxX * 0.95;

                      const y1Val = biVarStats.a + biVarStats.b * x1Val;
                      const y2Val = biVarStats.a + biVarStats.b * x2Val;

                      // Map mathematically to standard SVG coordinates boundaries
                      const svgX1 = 10;
                      const svgX2 = 10 + ((x2Val - plotBounds.minX) / (plotBounds.maxX - plotBounds.minX)) * 80;

                      const svgY1 = 90 - ((y1Val - plotBounds.minY) / (plotBounds.maxY - plotBounds.minY)) * 80;
                      const svgY2 = 90 - ((y2Val - plotBounds.minY) / (plotBounds.maxY - plotBounds.minY)) * 80;

                      return (
                        <motion.line
                          x1={svgX1}
                          y1={svgY1}
                          x2={svgX2}
                          y2={svgY2}
                          stroke="#ef4444"
                          strokeWidth="1"
                          strokeDasharray="2"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                      );
                    })()
                  )}
                </svg>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
