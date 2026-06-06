import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Trash2, Maximize2, RotateCcw, Settings, Info, RefreshCw } from 'lucide-react';
import Plotly from 'plotly.js-dist-min';

interface FunctionTrace {
  id: string;
  equation: string;
  color: string;
  visible: boolean;
}

interface GraphPlotterProps {
  initialExpression?: string;
}

export default function GraphPlotter({ initialExpression = '' }: GraphPlotterProps) {
  const [traces, setTraces] = useState<FunctionTrace[]>([
    { id: '1', equation: 'sin(x)', color: '#3b82f6', visible: true },
    { id: '2', equation: 'x^2 - 2*x', color: '#10b981', visible: true }
  ]);
  const [newEqInput, setNewEqInput] = useState<string>('');
  const [xMin, setXMin] = useState<number>(-10);
  const [xMax, setXMax] = useState<number>(10);
  const [yMin, setYMin] = useState<number>(-10);
  const [yMax, setYMax] = useState<number>(10);
  const [resolution, setResolution] = useState<number>(300); // number of points
  const [plotMode, setPlotMode] = useState<'cartesian' | 'polar' | 'parametric'>('cartesian');
  const [parametricX, setParametricX] = useState<string>('cos(t) * 3');
  const [parametricY, setParametricY] = useState<string>('sin(t) * 2');
  const [tMin, setTMin] = useState<number>(0);
  const [tMax, setTMax] = useState<number>(2 * Math.PI);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plotContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial calculator screen expression if provided
  useEffect(() => {
    if (initialExpression && initialExpression.trim()) {
      // Check if it already exists or add it
      const sanitized = sanitizeCalculatorExpression(initialExpression);
      if (sanitized) {
        setTraces(prev => {
          // Check if this equation already exists
          const exists = prev.some(t => t.equation === sanitized);
          if (exists) return prev;
          return [
            ...prev,
            { id: Date.now().toString(), equation: sanitized, color: '#f59e0b', visible: true }
          ];
        });
      }
    }
  }, [initialExpression]);

  // Clean raw calculator keystrokes into graphable math variables (e.g., replaces standard trig/exp with variables)
  const sanitizeCalculatorExpression = (raw: string): string => {
    let clean = raw.toLowerCase()
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/−/g, '-');
    return clean;
  };

  // Helper safe compiler of raw user formulas to Javascript calculations
  const compileMathFunction = (expr: string): ((v: number) => number) | null => {
    try {
      // 1. Convert algebra multiplication (e.g. 2x -> 2*x, 4sin -> 4*sin, (x+1)(x-2) -> (x+1)*(x-2))
      let jsExpr = expr.toLowerCase();
      
      // Replace generic visual power symbols
      jsExpr = jsExpr.replace(/\^/g, '**');

      // Expand Implicit Multiplication like: 2x -> 2*x, x sin -> x*sin, 3(x) -> 3*(x)
      jsExpr = jsExpr.replace(/(\d+)([a-df-z(])/g, '$1*$2'); // number followed by letter or bracket
      jsExpr = jsExpr.replace(/([x\)])([a-df-z0-9\(])/g, '$1*$2'); // variable 'x' or close bracket followed by another symbol

      // Map standard mathematical function keywords
      const mathReplacements: { [key: string]: string } = {
        'sin': 'Math.sin',
        'cos': 'Math.cos',
        'tan': 'Math.tan',
        'sqrt': 'Math.sqrt',
        'exp': 'Math.exp',
        'abs': 'Math.abs',
        'pi': 'Math.PI',
        'ln': 'Math.log',
        'log': 'Math.log10',
        'e': 'Math.E',
      };

      // Replace math words but avoid replacing keys inside longer terms recursively
      Object.keys(mathReplacements).forEach(key => {
        // Match standard prefix words not prefixed by dot or letters
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        jsExpr = jsExpr.replace(regex, mathReplacements[key]);
      });

      // Avoid dangerous operations or eval vectors
      if (/[a-zA-Z_]/.test(jsExpr.replace(/Math\.[a-zA-Z0-9]+/g, '').replace(/\bpx\b/g, '').replace(/\bx\b/g, '').replace(/\bt\b/g, ''))) {
        throw new Error("Invalid function format. Please only use standard variables (x or t) and operators.");
      }

      // Generate executable calculation standard closure
      const variableName = plotMode === 'parametric' ? 't' : 'x';
      const compiledFn = new Function(variableName, `
        try {
          with (Math) {
            return ${jsExpr};
          }
        } catch(e) {
          return NaN;
        }
      `) as (v: number) => number;

      // Test evaluation to verify it works without throwing
      const testVal = compiledFn(1);
      if (isNaN(testVal) && jsExpr.includes('sqrt')) {
        // Accept negative sqrts returning NaN occasionally, otherwise ok
      }

      return compiledFn;
    } catch (err: any) {
      console.warn("Compilation math parsing err:", err);
      return null;
    }
  };

  // Generate X, Y plot datasets utilizing standard math evaluation samples
  const drawPlot = () => {
    if (!plotContainerRef.current) return;
    setErrorMessage(null);

    try {
      const data: Plotly.Data[] = [];

      if (plotMode === 'cartesian') {
        const step = (xMax - xMin) / resolution;
        
        traces.forEach(trace => {
          if (!trace.visible) return;

          const evalFn = compileMathFunction(trace.equation);
          if (!evalFn) {
            setErrorMessage(`Failed to parse equation: "${trace.equation}"`);
            return;
          }

          const xVals: number[] = [];
          const yVals: number[] = [];

          for (let i = 0; i <= resolution; i++) {
            const curX = xMin + i * step;
            const curY = evalFn(curX);
            if (!isNaN(curY) && isFinite(curY)) {
              xVals.push(curX);
              yVals.push(curY);
            } else {
              // Add null points to handle discontinuous steps (e.g. standard tan graphs)
              xVals.push(curX);
              yVals.push(null as any);
            }
          }

          data.push({
            x: xVals,
            y: yVals,
            type: 'scatter',
            mode: 'lines',
            name: `y = ${trace.equation}`,
            line: {
              color: trace.color,
              width: 2.5
            },
            hoverinfo: 'x+y'
          });
        });
      } else if (plotMode === 'polar') {
        // Polar plots mapping theta and radius
        const step = (2 * Math.PI) / resolution;
        
        traces.forEach(trace => {
          if (!trace.visible) return;

          // Compile assuming input variable is 'x' as theta
          const evalFn = compileMathFunction(trace.equation);
          if (!evalFn) {
            setErrorMessage(`Failed to parse polar equation: "${trace.equation}"`);
            return;
          }

          const rVals: number[] = [];
          const thetaVals: number[] = [];

          for (let i = 0; i <= resolution; i++) {
            const theta = i * step;
            const r = evalFn(theta); // theta in radians
            if (!isNaN(r) && isFinite(r)) {
              rVals.push(r);
              thetaVals.push((theta * 180) / Math.PI); // Plotly polar polar plots accept angles in degrees
            }
          }

          data.push({
            r: rVals,
            theta: thetaVals,
            type: 'scatterpolar',
            mode: 'lines',
            name: `r = ${trace.equation}`,
            line: {
              color: trace.color,
              width: 2.5
            }
          });
        });
      } else if (plotMode === 'parametric') {
        // Parametric equations parsing component t
        const step = (tMax - tMin) / resolution;
        const evalXFn = compileMathFunction(parametricX);
        const evalYFn = compileMathFunction(parametricY);

        if (!evalXFn || !evalYFn) {
          setErrorMessage("Failed to compile parametric formulas. Please check variable syntax using 't'.");
          return;
        }

        const xVals: number[] = [];
        const yVals: number[] = [];

        for (let i = 0; i <= resolution; i++) {
          const t = tMin + i * step;
          const x = evalXFn(t);
          const y = evalYFn(t);
          if (!isNaN(x) && isFinite(x) && !isNaN(y) && isFinite(y)) {
            xVals.push(x);
            yVals.push(y);
          }
        }

        data.push({
          x: xVals,
          y: yVals,
          type: 'scatter',
          mode: 'lines',
          name: 'Parametric Arc',
          line: {
            color: '#ec4899',
            width: 2.5
          }
        });
      }

      // Styled custom high-contrast dark layout matching overall workspace theme
      const layout: Partial<Plotly.Layout> = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          family: 'JetBrains Mono, Courier New, monospace',
          color: 'rgba(255, 255, 255, 0.7)',
          size: 10
        },
        margin: { t: 25, r: 15, l: 30, b: 35 },
        showlegend: true,
        legend: {
          x: 0.05,
          y: 0.95,
          font: { color: '#ffffff', size: 9 },
          bgcolor: 'rgba(10, 11, 16, 0.75)',
          bordercolor: 'rgba(255, 255, 255, 0.1)',
          borderwidth: 1
        },
        hovermode: 'closest',
        dragmode: 'pan',
        xaxis: plotMode === 'polar' ? undefined : {
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          zerolinecolor: 'rgba(255, 255, 255, 0.25)',
          zerolinewidth: 1.5,
          range: [xMin, xMax],
          autorange: false,
          fixedrange: false
        },
        yaxis: plotMode === 'polar' ? undefined : {
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          zerolinecolor: 'rgba(255, 255, 255, 0.25)',
          zerolinewidth: 1.5,
          range: [yMin, yMax],
          autorange: false,
          fixedrange: false
        },
        polar: plotMode !== 'polar' ? undefined : {
          bgcolor: 'rgba(0,0,0,0)',
          radialaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.08)',
            linecolor: 'rgba(255, 255, 255, 0.2)'
          },
          angularaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.08)',
            linecolor: 'rgba(255, 255, 255, 0.2)'
          }
        }
      };

      const config: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d']
      };

      // Direct plotting trigger
      Plotly.newPlot(plotContainerRef.current, data, layout, config);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred during plotting rendering processes.");
    }
  };

  // Re-draw whenever variables or data modes update
  useEffect(() => {
    drawPlot();
  }, [traces, plotMode, xMin, xMax, yMin, yMax, parametricX, parametricY, tMin, tMax, resolution]);

  // Handle addition of a new trace equation
  const handleAddTrace = () => {
    if (!newEqInput.trim()) return;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const nextColor = colors[traces.length % colors.length];

    setTraces(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        equation: newEqInput,
        color: nextColor,
        visible: true
      }
    ]);
    setNewEqInput('');
  };

  // Delete a trace from stack index
  const handleDeleteTrace = (id: string) => {
    setTraces(prev => prev.filter(t => t.id !== id));
  };

  // Toggle visible on Plotly trace lines
  const toggleVisibility = (id: string) => {
    setTraces(prev => prev.map(t => t.id === id ? { ...t, visible: !t.visible } : t));
  };

  // Quick reset parameters to standard default triggers
  const resetToCartesianDefault = () => {
    setXMin(-10);
    setXMax(10);
    setYMin(-10);
    setYMax(10);
    setPlotMode('cartesian');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-white/90 animate-fade-in">
      
      {/* Mode selectors & presets list */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/30 p-3 rounded-2xl border border-white/5 select-none">
        
        {/* Plot formulation controls */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => setPlotMode('cartesian')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              plotMode === 'cartesian'
                ? 'bg-blue-500 text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Cartesian 2D
          </button>
          <button
            onClick={() => setPlotMode('polar')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              plotMode === 'polar'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Polar coordinates (r)
          </button>
          <button
            onClick={() => setPlotMode('parametric')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              plotMode === 'parametric'
                ? 'bg-pink-500 text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Parametric (t)
          </button>
        </div>

        {/* Global actions buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetToCartesianDefault}
            className="p-1.5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-white/70"
            title="Reset Cartesian View boundaries"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={drawPlot}
            className="p-1.5 rounded-xl border border-white/5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold cursor-pointer transition-all text-[11px] flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Redraw
          </button>
        </div>
      </div>

      {/* Main Plot rendering sandbox container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black/45 border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-end">
        
        {/* Error notification display overlays */}
        {errorMessage && (
          <div className="absolute top-3 left-3 right-3 z-10 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Plotly target node */}
        <div ref={plotContainerRef} className="w-full h-full absolute inset-0" />
        
        {/* Quick coordinate scale tags readout inside viewport margins */}
        <div className="absolute bottom-1 right-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-mono text-white/40 pointer-events-none select-none">
          Plotly.js Interactive Grid
        </div>
      </div>

      {/* Grid controllers inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/20 p-3.5 rounded-2xl border border-white/5">
        <div>
          <label className="text-[10px] text-white/40 font-mono block mb-1">X Bound Min</label>
          <input
            type="number"
            value={xMin}
            onChange={e => setXMin(parseFloat(e.target.value) || -10)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white/80 focus:border-blue-500/50 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-mono block mb-1">X Bound Max</label>
          <input
            type="number"
            value={xMax}
            onChange={e => setXMax(parseFloat(e.target.value) || 10)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white/80 focus:border-blue-500/50 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-mono block mb-1">Y Bound Min</label>
          <input
            type="number"
            value={yMin}
            onChange={e => setYMin(parseFloat(e.target.value) || -10)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white/80 focus:border-blue-500/50 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-mono block mb-1">Y Bound Max</label>
          <input
            type="number"
            value={yMax}
            onChange={e => setYMax(parseFloat(e.target.value) || 10)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white/80 focus:border-blue-500/50 outline-none"
          />
        </div>
      </div>

      {/* Function stack list control panels */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1 font-mono">
          {plotMode === 'parametric' ? 'Parametric Definition' : 'Active Functions Stack'}
        </h4>

        {plotMode !== 'parametric' ? (
          <div className="space-y-2">
            
            {/* Multi-function items render lists */}
            {traces.map((trace) => (
              <div
                key={trace.id}
                className="flex items-center justify-between gap-3 bg-white/3 border border-white/5 rounded-2xl p-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => toggleVisibility(trace.id)}
                    className="w-4 h-4 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: trace.color,
                      backgroundColor: trace.visible ? trace.color : 'transparent'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-white/30 uppercase font-mono block leading-none">f(x) Trace</span>
                    <input
                      type="text"
                      value={trace.equation}
                      onChange={e => {
                        const val = e.target.value;
                        setTraces(prev => prev.map(t => t.id === trace.id ? { ...t, equation: val } : t));
                      }}
                      className="w-full bg-transparent border-none text-xs text-white font-mono focus:outline-none p-0 mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={trace.color}
                    onChange={e => {
                      const col = e.target.value;
                      setTraces(prev => prev.map(t => t.id === trace.id ? { ...t, color: col } : t));
                    }}
                    className="w-6 h-6 rounded-lg overflow-hidden border-2 border-white/10 bg-transparent block p-0 cursor-pointer"
                  />
                  <button
                    onClick={() => handleDeleteTrace(trace.id)}
                    className="p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Input field to add a new function trace */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newEqInput}
                onChange={e => setNewEqInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTrace()}
                placeholder="Add math expression (e.g., 3*cos(2*x), x^3 - x)..."
                className="flex-1 bg-black/35 border border-white/10 hover:border-white/25 focus:border-blue-500/40 outline-none rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-white/30 transition-all"
              />
              <button
                onClick={handleAddTrace}
                disabled={!newEqInput.trim()}
                className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 border border-blue-400 disabled:opacity-50 rounded-xl flex items-center justify-center gap-1.5 text-xs text-white font-semibold cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

          </div>
        ) : (
          /* Parametric controls mode */
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-white/35 font-mono block mb-1">X(t) Formula</label>
                <input
                  type="text"
                  value={parametricX}
                  onChange={e => setParametricX(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white hover:border-white/20 focus:border-pink-500/40 outline-none"
                  placeholder="e.g. cos(t) * 3"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/35 font-mono block mb-1">Y(t) Formula</label>
                <input
                  type="text"
                  value={parametricY}
                  onChange={e => setParametricY(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white hover:border-white/20 focus:border-pink-500/40 outline-none"
                  placeholder="e.g. sin(t) * 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div>
                <label className="text-[10px] text-white/35 font-mono block mb-1">t Start (rad)</label>
                <input
                  type="number"
                  value={tMin}
                  onChange={e => setTMin(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:border-pink-500/40 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/35 font-mono block mb-1">t Stop (rad)</label>
                <input
                  type="number"
                  value={tMax}
                  onChange={e => setTMax(parseFloat(e.target.value) || 2*Math.PI)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:border-pink-500/40 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic calculation steps support info list */}
        <div className="bg-white/3 p-3.5 rounded-2xl border border-white/5 text-[10px] text-white/40 leading-relaxed font-sans flex items-start gap-2 select-none">
          <Info className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0 mt-0.5" />
          <div>
            Plotly grids support fully interactive zoom, scroll, hover trace coordinates readout, and pan axes dynamically with cursor clicks. Formulas support standard functions: `sin()`, `cos()`, `tan()`, `sqrt()`, `abs()`, `exp()`, `ln()`, `log()`, powers `^`, and variables `x` or `t`.
          </div>
        </div>

      </div>

    </div>
  );
}
