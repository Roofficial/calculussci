/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  X,
  History,
  TrendingUp,
  Cloud,
  ChevronRight,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  Brain,
  GraduationCap,
  LineChart,
  LayoutDashboard
} from 'lucide-react';
import {
  AngleMode,
  CalculatorMode,
  StatSubMode,
  EqnSubMode,
  HistoryItem,
  VariableState,
  StatDataPoint,
  EqnState
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  loadHistoryFromDrive,
  saveHistoryToDrive
} from './lib/firebase';
import {
  evaluateExpression,
  toFraction,
  solve2VarLinear,
  solve3VarLinear,
  solveQuadratic,
  solveCubic
} from './lib/mathEvaluator';
import CalculatorScreen from './components/CalculatorScreen';
import CalculatorKeypad from './components/CalculatorKeypad';
import HistorySidebar from './components/HistorySidebar';
import StatsDashboard from './components/StatsDashboard';
import GraphPlotter from './components/GraphPlotter';

export default function App() {
  // Core Calculator States
  const [expression, setExpression] = useState<string>('');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [ans, setAns] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keyboard Toggles
  const [shiftActive, setShiftActive] = useState<boolean>(false);
  const [alphaActive, setAlphaActive] = useState<boolean>(false);
  const [stoMode, setStoMode] = useState<boolean>(false); // store variable mode
  const [rclMode, setRclMode] = useState<boolean>(false); // recall variable mode

  // Angle and Math Configs
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [mode, setMode] = useState<CalculatorMode>('COMP');
  
  // Custom Variables (A, B, C, D, E, F, X, Y, M)
  const [vars, setVars] = useState<VariableState>({
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0
  });

  // History & Drive sync lists
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('casio_991_local_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

  // Google Sync settings
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveUser, setDriveUser] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSyncingHistory, setIsSyncingHistory] = useState<boolean>(false);

  // S<=>D state representation
  const [fractionFormat, setFractionFormat] = useState<boolean>(false);
  const [fractionData, setFractionData] = useState<{ numerator: number; denominator: number } | null>(null);

  // STAT mode States
  const [statSubMode, setStatSubMode] = useState<StatSubMode>('1-VAR');
  const [statData, setStatData] = useState<StatDataPoint[]>([]);

  // EQN mode States
  const [eqnSubMode, setEqnSubMode] = useState<EqnSubMode>(null);
  const [eqnCoefs, setEqnCoefs] = useState<number[]>([]);
  const [eqnActiveInputIdx, setEqnActiveInputIdx] = useState<number>(0);
  const [eqnResults, setEqnResults] = useState<string[]>([]);
  const [eqnStep, setEqnStep] = useState<'INPUT' | 'RESULT'>('INPUT');

  // UI Drawer states
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [modeMenuOpen, setModeMenuOpen] = useState<boolean>(false);
  const [storeStatusMsg, setStoreStatusMsg] = useState<string | null>(null);

  // AI Math Tutor states
  const [rightActiveTab, setRightActiveTab] = useState<'DASHBOARD' | 'TUTOR' | 'PLOTTER' | 'STAT' | 'REGISTERS' | 'CHEATSHEET'>('DASHBOARD');

  // Automatically sync STAT modes with STAT tab
  useEffect(() => {
    if (mode === 'STAT' && rightActiveTab !== 'STAT') {
      setRightActiveTab('STAT');
    }
  }, [mode]);
  const [tutorInput, setTutorInput] = useState<string>('');
  const [tutorLoading, setTutorLoading] = useState<boolean>(false);
  const [tutorMessages, setTutorMessages] = useState<Array<{ id: string; role: 'user' | 'tutor'; text: string; timestamp: number }>>([
    {
      id: 'welcome-msg',
      role: 'tutor',
      text: "👋 Welcome to **Calculus Sci AI Assist**! I am your companion tutor designed specifically for calculus, algebra, derivatives, integrations, matrix equation systems, and statistical solutions.\n\nType any math query here, or click **🤖 Explain Expression Steps** to import whatever is currently styled on the calculator keypad so I can show you the work! Let's solve some math.",
      timestamp: Date.now()
    }
  ]);

  const handleSendTutorMessage = async (customText?: string) => {
    const textToSend = customText || tutorInput;
    if (!textToSend.trim()) return;

    // Add user message to state
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: textToSend,
      timestamp: Date.now()
    };
    
    setTutorMessages(prev => [...prev, userMsg]);
    if (!customText) setTutorInput('');
    setTutorLoading(true);

    try {
      const chatHistory = tutorMessages.map(m => ({ role: m.role, text: m.text }));
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history: chatHistory })
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        setTutorMessages(prev => [...prev, {
          id: `tutor-${Date.now()}`,
          role: 'tutor' as const,
          text: data.reply,
          timestamp: Date.now()
        }]);
      } else {
        setTutorMessages(prev => [...prev, {
          id: `tutor-err-${Date.now()}`,
          role: 'tutor' as const,
          text: data.error || "I was unable to load that mathematical calculation. Please make sure search API services are fully active.",
          timestamp: Date.now()
        }]);
      }
    } catch (err: any) {
      setTutorMessages(prev => [...prev, {
        id: `tutor-err-${Date.now()}`,
        role: 'tutor' as const,
        text: `Unable to establish backend server contact: ${err.message || 'Unknown network error'}.`,
        timestamp: Date.now()
      }]);
    } finally {
      setTutorLoading(false);
    }
  };

  // Watch local histories changes and sync to cached localStorage fallback
  useEffect(() => {
    localStorage.setItem('casio_991_local_history', JSON.stringify(history));
  }, [history]);

  // Firebase auth sync callbacks on load
  useEffect(() => {
    initAuth(
      async (user, token) => {
        setDriveConnected(true);
        setDriveUser(user.displayName || user.email);
        setAuthToken(token);
        // Sync database logs
        syncDriveLog(token);
      },
      () => {
        setDriveConnected(false);
        setDriveUser(null);
        setAuthToken(null);
      }
    );
  }, []);

  // Sync / Download logs in Google Drive
  const syncDriveLog = async (token: string) => {
    setIsSyncingHistory(true);
    try {
      const driveList = await loadHistoryFromDrive(token);
      if (driveList) {
        // Merge drive items and local items seamlessly, keeping newest computed lines, resolved by timestamp
        setHistory((prev) => {
          const map = new Map<string, HistoryItem>();
          prev.forEach((item) => map.set(item.id, item));
          driveList.forEach((item) => {
            const existing = map.get(item.id);
            if (!existing || item.timestamp > existing.timestamp) {
              map.set(item.id, item);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          // Save combined state back to Drive
          saveHistoryToDrive(token, merged);
          return merged;
        });
      }
    } catch {
      console.warn('Google sync check failed');
    } finally {
      setIsSyncingHistory(false);
    }
  };

  // Google authentication actions triggers
  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveConnected(true);
        setDriveUser(result.user.displayName || result.user.email);
        setAuthToken(result.accessToken);
        syncDriveLog(result.accessToken);
      }
    } catch (err) {
      console.error('Sign in trigger error:', err);
    }
  };

  const handleGoogleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to disconnect Google Drive? Your local history will still remain intact.');
    if (!confirmLogout) return;
    await logout();
    setDriveConnected(false);
    setDriveUser(null);
    setAuthToken(null);
  };

  // Safe insertion utility
  const insertText = (text: string) => {
    const before = expression.substring(0, cursorIndex);
    const after = expression.substring(cursorIndex);
    setExpression(before + text + after);
    setCursorIndex(cursorIndex + text.length);
  };

  // Keypad keystroke controller
  const handleKeyPress = (value: string, type: string) => {
    setErrorMsg(null);
    setStoreStatusMsg(null);

    // --- 1. Mode selection triggers ---
    if (value === 'MODE') {
      setModeMenuOpen(true);
      return;
    }

    // --- 2. Action states modifier locks (Shift, Alpha, STO, RCL) ---
    if (value === 'Shift') {
      setShiftActive(!shiftActive);
      setAlphaActive(false);
      return;
    }

    if (value === 'Alpha') {
      setAlphaActive(!alphaActive);
      setShiftActive(false);
      return;
    }

    // ON button behavior resets core screen states
    if (value === 'ON') {
      setExpression('');
      setCursorIndex(0);
      setResult('');
      setShiftActive(false);
      setAlphaActive(false);
      setStoMode(false);
      setRclMode(false);
      setErrorMsg(null);
      return;
    }

    // AC all clear clearing
    if (value === 'AC') {
      setExpression('');
      setCursorIndex(0);
      setResult('');
      setErrorMsg(null);
      setStoMode(false);
      setRclMode(false);
      setFractionData(null);
      setFractionFormat(false);
      return;
    }

    // DEL character backspace deletion
    if (value === 'DEL') {
      if (cursorIndex > 0) {
        const charCountToDelete = 1;
        // Check for specific multi-character deletions is optional, standard single-character serves cleanly.
        const before = expression.substring(0, cursorIndex - charCountToDelete);
        const after = expression.substring(cursorIndex);
        setExpression(before + after);
        setCursorIndex(cursorIndex - charCountToDelete);
      }
      return;
    }

    // STO variable store command
    if (value === 'RCL' && shiftActive) {
      setStoMode(true);
      setRclMode(false);
      setShiftActive(false);
      setStoreStatusMsg('Select Variable register to STORE (A-F, X, Y, M)');
      return;
    }

    // RCL variable recall command
    if (value === 'RCL' && !shiftActive) {
      setRclMode(true);
      setStoMode(false);
      setStoreStatusMsg('Select Variable register to RECALL (A-F, X, Y, M)');
      return;
    }

    // Navigation inputs Replays
    if (type === 'nav') {
      if (value === 'LEFT') {
        if (cursorIndex > 0) setCursorIndex(cursorIndex - 1);
      } else if (value === 'RIGHT') {
        if (cursorIndex < expression.length) setCursorIndex(cursorIndex + 1);
      } else if (value === 'UP') {
        // Navigate back in history log list (older items)
        if (history.length > 0) {
          const nextIdx = currentHistoryIndex + 1;
          if (nextIdx < history.length) {
            const hItem = history[nextIdx];
            setExpression(hItem.expression);
            setResult(hItem.result);
            setCursorIndex(hItem.expression.length);
            setCurrentHistoryIndex(nextIdx);
            
            // Reconstruct fraction indicators
            const numVal = parseFloat(hItem.result);
            if (!isNaN(numVal)) {
              const fract = toFraction(numVal);
              setFractionData(fract);
            }
          }
        }
      } else if (value === 'DOWN') {
        // Navigate forward in history (newer items)
        if (currentHistoryIndex > 0) {
          const nextIdx = currentHistoryIndex - 1;
          const hItem = history[nextIdx];
          setExpression(hItem.expression);
          setResult(hItem.result);
          setCursorIndex(hItem.expression.length);
          setCurrentHistoryIndex(nextIdx);

          const numVal = parseFloat(hItem.result);
          if (!isNaN(numVal)) {
            const fract = toFraction(numVal);
            setFractionData(fract);
          }
        } else if (currentHistoryIndex === 0) {
          // Reset to fresh input line
          setExpression('');
          setResult('');
          setCursorIndex(0);
          setCurrentHistoryIndex(-1);
          setFractionData(null);
        }
      }
      return;
    }

    // S⇔D fraction / decimal display converter
    if (value === 'SD') {
      if (result) {
        setFractionFormat(!fractionFormat);
      }
      return;
    }

    // M+ Memory accumulation addition register
    if (value === 'M+') {
      setShiftActive(false);
      setAlphaActive(false);
      const valToApply = parseFloat(result || '0');
      if (isNaN(valToApply)) {
        setErrorMsg('Value conversion error');
        return;
      }

      setVars((prev) => {
        const originalM = prev.M;
        const offset = shiftActive ? -valToApply : valToApply;
        const newM = originalM + offset;
        setStoreStatusMsg(`M ${shiftActive ? '-' : '+'} value applied. Register M = ${newM}`);
        return { ...prev, M: newM };
      });
      return;
    }

    // --- 3. EQN mode sub-grid coordinate inputs ---
    if (mode === 'EQN' && eqnSubMode) {
      if (value === '=') {
        // Save coefficient and shift to next
        const currentInpVal = parseFloat(expression) || 0;
        const updatedCoefs = [...eqnCoefs];
        updatedCoefs[eqnActiveInputIdx] = currentInpVal;
        setEqnCoefs(updatedCoefs);

        const totalNeeded = eqnSubMode === '2-VAR-LINEAR' ? 6 : eqnSubMode === '3-VAR-LINEAR' ? 12 : eqnSubMode === 'QUADRATIC' ? 3 : 4;

        if (eqnActiveInputIdx < totalNeeded - 1) {
          setEqnActiveInputIdx(eqnActiveInputIdx + 1);
          setExpression('');
        } else {
          // All coefficients populated! Run equation solvers!
          let answers: string[] = [];
          if (eqnSubMode === '2-VAR-LINEAR') {
            answers = solve2VarLinear(updatedCoefs);
          } else if (eqnSubMode === '3-VAR-LINEAR') {
            answers = solve3VarLinear(updatedCoefs);
          } else if (eqnSubMode === 'QUADRATIC') {
            answers = solveQuadratic(updatedCoefs);
          } else if (eqnSubMode === 'CUBIC') {
            answers = solveCubic(updatedCoefs);
          }

          setEqnResults(answers);
          setEqnStep('RESULT');
          setResult(answers.join(' | '));
        }
      } else if ('0123456789.-'.includes(value)) {
        insertText(value);
      }
      return;
    }

    // --- 4. Variable Store/Recall bindings ---
    const registerNames = ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'M'];
    const pressedRegister = registerNames.find((r) => {
      // Find matching keys based on typical Alpha assignment
      if (r === 'A' && value === 'neg') return true;
      if (r === 'B' && value === '!') return true;
      if (r === 'C' && value === 'hyp') return true;
      if (r === 'D' && value === 'sin(') return true;
      if (r === 'E' && value === 'cos(') return true;
      if (r === 'F' && value === 'tan(') return true;
      if (r === 'X' && value === '(') return true;
      if (r === 'Y' && value === ')') return true;
      if (r === 'M' && value === 'M+') return true;
      return false;
    });

    if (pressedRegister) {
      if (stoMode) {
        const valToStore = parseFloat(result || '0');
        if (isNaN(valToStore)) {
          setErrorMsg('No numerical result to store');
        } else {
          setVars((prev) => ({ ...prev, [pressedRegister]: valToStore }));
          setStoreStatusMsg(`Successfully stored ${valToStore} in register ${pressedRegister}`);
        }
        setStoMode(false);
        return;
      }

      if (rclMode) {
        const recalledVal = vars[pressedRegister as keyof VariableState];
        insertText(`${recalledVal}`);
        setRclMode(false);
        setStoreStatusMsg(`Recalled ${pressedRegister} = ${recalledVal}`);
        return;
      }
    }

    // --- 5. Custom execution evaluate action === ---
    if (value === '=') {
      if (!expression.trim()) return;

      try {
        const parsedOutput = evaluateExpression(expression, angleMode, vars, ans);

        if (isNaN(parsedOutput) || !isFinite(parsedOutput)) {
          setErrorMsg('Math Error');
          setResult('');
        } else {
          // Success! Display results
          // Cap floating points to maximum neat digits representation
          const cleanOutput = Math.abs(parsedOutput) < 1e-12 ? '0' : parseFloat(parsedOutput.toFixed(10)).toString();

          setResult(cleanOutput);
          setAns(parsedOutput);
          setCurrentHistoryIndex(-1); // reset replay pointer

          // Try getting fraction representations for screen output S⇔D
          const fract = toFraction(parsedOutput);
          setFractionData(fract);
          setFractionFormat(false); // Default standard decimal output

          // Create and save History Item
          const newItem: HistoryItem = {
            id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            expression: expression,
            displayExpression: expression,
            result: cleanOutput,
            timestamp: Date.now(),
            angleMode: angleMode,
          };

          const updatedHistory = [newItem, ...history];
          setHistory(updatedHistory);

          // Force background auto sync upload file to Google Drive if authorized
          if (authToken) {
            saveHistoryToDrive(authToken, updatedHistory);
          }
        }
      } catch (err) {
        setErrorMsg('Syntax Error');
        setResult('');
      }

      setShiftActive(false);
      setAlphaActive(false);
      return;
    }

    // --- 6. Formatted inputs compiler bindings ---
    let textToInsert = value;

    // Check custom mappings if shift or alpha are active
    if (shiftActive) {
      setShiftActive(false); // consume shift lock
      if (value === 'sin(') textToInsert = 'asin(';
      else if (value === 'cos(') textToInsert = 'acos(';
      else if (value === 'tan(') textToInsert = 'atan(';
      else if (value === 'hyp') textToInsert = 'asinh(';
      else if (value === '^2') textToInsert = '^3';
      else if (value === '^') textToInsert = '^(1/'; // root representation
      else if (value === 'ln(') textToInsert = 'e^(';
      else if (value === 'log(') textToInsert = '10^(';
      else if (value === 'sqrt') textToInsert = 'cbrt(';
      else if (value === '/') textToInsert = '÷';
      else if (value === '!') textToInsert = '%';
      else if (value === '.') textToInsert = 'Ran#';
      else if (value === 'neg') textToInsert = 'RanInt(';
      else if (value === '(') textToInsert = 'nPr(';
      else if (value === ')') textToInsert = 'nCr(';
      else if (value === 'exp') textToInsert = 'e';
      else if (value === 'Ans') {
        // DRG angle unit mode conversions shift active toggle
        if (angleMode === 'DEG') setAngleMode('RAD');
        else if (angleMode === 'RAD') setAngleMode('GRAD');
        else setAngleMode('DEG');
        return;
      }
    } else if (alphaActive) {
      setAlphaActive(false); // consume alpha lock
      if (pressedRegister) {
        textToInsert = pressedRegister;
      }
    } else {
      // Normal map helpers
      if (value === 'exp') textToInsert = '×10^(';
    }

    // Special functional character corrections
    if (textToInsert === 'neg') textToInsert = '-';

    insertText(textToInsert);
  };

  // Switch Calculator physical modes (COMP vs STAT vs EQN)
  const handleSelectMode = (newMode: CalculatorMode) => {
    setMode(newMode);
    setModeMenuOpen(false);

    // Initial resets
    setExpression('');
    setCursorIndex(0);
    setResult('');
    setFractionData(null);
    setErrorMsg(null);

    if (newMode === 'EQN') {
      setEqnSubMode('QUADRATIC');
      setEqnCoefs([0, 0, 0]);
      setEqnActiveInputIdx(0);
      setEqnResults([]);
      setEqnStep('INPUT');
    }
  };

  const handleSelectEqnSubmode = (sub: EqnSubMode) => {
    setEqnSubMode(sub);
    const size = sub === '2-VAR-LINEAR' ? 6 : sub === '3-VAR-LINEAR' ? 12 : sub === 'QUADRATIC' ? 3 : 4;
    setEqnCoefs(new Array(size).fill(0));
    setEqnActiveInputIdx(0);
    setEqnResults([]);
    setEqnStep('INPUT');
    setExpression('');
    setResult('');
  };

  // Flush full histories with UX confirmation
  const handleClearAllHistory = () => {
    const confirmClear = window.confirm('Clear all calculation logs? This action is permanent and deletes copies stored on Google Drive if connected.');
    if (!confirmClear) return;
    setHistory([]);
    if (authToken) {
      saveHistoryToDrive(authToken, []);
    }
  };

  // Delete single file history computation
  const handleDeleteOneHistory = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    if (authToken) {
      saveHistoryToDrive(authToken, updated);
    }
  };

  // Re-bind older computation results
  const handleLoadHistoryToScreen = (item: HistoryItem) => {
    setExpression(item.expression);
    setResult(item.result);
    setCursorIndex(item.expression.length);
    setAngleMode(item.angleMode);
    setSidebarOpen(false); // close sidebar drawers on mobile

    const numVal = parseFloat(item.result);
    if (!isNaN(numVal)) {
      const fract = toFraction(numVal);
      setFractionData(fract);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-[#E0E0E6] font-sans flex flex-col antialiased select-none relative overflow-x-hidden">
      {/* Background ambient radial glows */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]" />
      </div>

      {/* Upper Navigation Header Bar */}
      <header className="sticky top-0 bg-black/40 backdrop-blur-3xl border-b border-white/10 z-40 px-6 py-4 flex items-center justify-between shadow-lg animate-fade-in">
        <div className="flex items-center gap-3 select-none">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 text-blue-400 rounded-xl">
            <Calculator className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none tracking-wide text-white flex items-center gap-2">
              Calculus Sci <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase font-black tracking-normal">v991 AI</span>
            </h1>
            <p className="text-[10px] text-white/40 font-mono mt-1">Intelligent Scientific & AI Tutoring Workspace</p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2">
          {driveConnected ? (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/15 rounded-full text-xs text-white/85 font-mono select-none">
              <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse fill-blue-500/10" />
              <span>Synced: {driveUser}</span>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-300 rounded-full text-xs font-semibold focus:outline-none transition-all active:scale-95 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          )}

          {/* Sidebar trigger */}
          <button
            id="btn-toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold rounded-xl border border-white/10 shadow-md focus:outline-none transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Calculation History</span>
            {history.length > 0 && (
              <span className="bg-blue-500 text-white font-extrabold px-1.5 py-0.2 rounded-full text-[9px] min-w-[16px] text-center">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-60px)] z-10 relative">
        {/* LEFT COLUMN: Physical Calculator Console Panel (lg:col-span-6) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
          {/* Main Casio-Feeling 3D Frame Deck */}
          <div
            id="casio-physical-shell"
            className="w-full max-w-[400px] bg-white/5 border border-white/10 backdrop-blur-3xl rounded-3xl px-5 py-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] relative select-none border-t border-l border-white/20"
          >
            {/* Outer brand lines logos */}
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2 select-none">
              <span className="text-white/80 font-black font-sans tracking-widest text-sm">CALCULUS</span>
              <div className="text-right">
                <span className="text-[10px] text-white/90 font-bold tracking-tight block">SCI SERIES</span>
                <span className="text-[8px] text-blue-400 font-bold block">INTELLIGENT AI TUTOR</span>
              </div>
            </div>

            {/* Simulated Solar Panel Accent */}
            <div className="absolute top-7 right-20 w-16 h-4 bg-amber-950/40 rounded border border-white/10 flex gap-0.5 overflow-hidden shadow-inner select-none pointer-events-none opacity-50">
              <div className="flex-1 bg-amber-900/10 border-r border-white/5" />
              <div className="flex-1 bg-amber-900/10 border-r border-white/5" />
              <div className="flex-1 bg-amber-900/10" />
            </div>

            {/* Notification/Message log above LCD screen */}
            {storeStatusMsg && (
              <motion.div
                id="keypad-notification"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 bg-blue-500/10 px-2.5 py-1.5 rounded-xl text-[10px] text-blue-300 border border-blue-500/20 font-mono text-center flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                <span className="truncate font-semibold">{storeStatusMsg}</span>
              </motion.div>
            )}

            {/* LCD Screen container */}
            <CalculatorScreen
              expression={expression}
              cursorIndex={cursorIndex}
              result={result}
              angleMode={angleMode}
              mode={mode}
              statSubMode={statSubMode}
              eqnSubMode={eqnSubMode}
              shiftActive={shiftActive}
              alphaActive={alphaActive}
              memoryHasValue={vars.M !== 0}
              driveConnected={driveConnected}
              username={driveUser}
              fractionFormat={fractionFormat}
              fractionData={fractionData}
              activeHistoryCount={history.length}
              currentHistoryIndex={currentHistoryIndex}
              errorMsg={errorMsg}
            />

            {/* EQN Coef Spreadsheet Form inside Frame */}
            {mode === 'EQN' && eqnSubMode && eqnStep === 'INPUT' && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-xs text-white/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-[10px] text-white/40 tracking-wider">Matrix entry {eqnSubMode.split('-')[0]}</span>
                  <button
                    onClick={() => setEqnStep('RESULT')}
                    className="text-[10px] text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    View results
                  </button>
                </div>
                <div className="text-[10px] text-white/50 mb-1.5">
                  Set coefficient and press '=':
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {eqnCoefs.map((coef, idx) => (
                    <button
                      key={idx}
                      id={`btn-coef-box-${idx}`}
                      onClick={() => setEqnActiveInputIdx(idx)}
                      className={`py-1.5 rounded-xl text-center border font-mono cursor-pointer transition-all ${
                        eqnActiveInputIdx === idx
                          ? 'bg-blue-500/20 text-blue-300 border-blue-400 font-bold'
                          : 'bg-white/3 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {String.fromCharCode(97 + (idx % 4)) /* a,b,c,d */}
                      {eqnSubMode === '2-VAR-LINEAR' ? Math.floor(idx / 3) + 1 : eqnSubMode === '3-VAR-LINEAR' ? Math.floor(idx / 4) + 1 : ''}:{' '}
                      <span className="font-extrabold text-white block mt-0.5">{coef}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'EQN' && eqnStep === 'RESULT' && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-xs text-white/80">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                  <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">EQN Results list</span>
                  <button
                    onClick={() => setEqnStep('INPUT')}
                    className="text-[10px] text-white/40 hover:text-white/80 hover:underline cursor-pointer"
                  >
                    ← Edit coefs
                  </button>
                </div>
                <div className="space-y-1.5">
                  {eqnResults.map((r, idx) => (
                    <div key={idx} className="flex justify-between w-full border-b border-white/5 py-1.5 last:border-none last:pb-0">
                      <span className="text-white/40 font-bold border-r border-white/10 pr-2">{idx + 1}:</span>
                      <span className="text-emerald-400 font-extrabold font-mono text-[14px]">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EQN Mode config controls inside frame */}
            {mode === 'EQN' && (
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                {(['2-VAR-LINEAR', '3-VAR-LINEAR', 'QUADRATIC', 'CUBIC'] as EqnSubMode[]).map((sub) => (
                  <button
                    key={sub}
                    id={`btn-eqn-sub-${sub}`}
                    onClick={() => handleSelectEqnSubmode(sub)}
                    className={`py-1.5 text-[9px] rounded-xl font-bold transition-all border font-mono tracking-wide cursor-pointer uppercase ${
                      eqnSubMode === sub
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-white/3 text-white/50 border-white/5 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {sub?.replace('-', ' ')}
                  </button>
                ))}
              </div>
            )}

            {/* Keypad deck */}
            <div className="mt-6">
              <CalculatorKeypad
                onKeyPress={handleKeyPress}
                shiftActive={shiftActive}
                alphaActive={alphaActive}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: History Sync and Statistical Boards (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-1">
          {/* Unified Multi-Pane Workspace Panel */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-4 min-h-[480px] animate-fade-in w-full">
            
            {/* Tab Selector Links */}
            <div className="flex border-b border-white/10 pb-2 gap-2 select-none overflow-x-auto scrollbar-none">
              <button
                onClick={() => {
                  setRightActiveTab('DASHBOARD');
                  setMode('COMP');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'DASHBOARD'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                Workspace Dashboard
              </button>
              <button
                onClick={() => {
                  setRightActiveTab('TUTOR');
                  setMode('COMP');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'TUTOR'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                AI Calculus Tutor
              </button>
              <button
                onClick={() => {
                  setRightActiveTab('PLOTTER');
                  setMode('COMP');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'PLOTTER'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <LineChart className="w-3.5 h-3.5 text-pink-400" />
                Graph Plotter
              </button>
              <button
                onClick={() => {
                  setRightActiveTab('STAT');
                  setMode('STAT');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'STAT'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                Statistical Solver
              </button>
              <button
                onClick={() => setRightActiveTab('REGISTERS')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'REGISTERS'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                Variable Registers
              </button>
              <button
                onClick={() => setRightActiveTab('CHEATSHEET')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightActiveTab === 'CHEATSHEET'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Sci Quick Tips
              </button>
            </div>

            {/* TAB 0: PORTAL PRIMARY DASHBOARD */}
            {rightActiveTab === 'DASHBOARD' && (
              <div className="flex-1 flex flex-col gap-5 animate-fade-in text-white/90">
                
                {/* Dashboard Welcome Header */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-purple-900/20 border border-white/10 rounded-2xl p-5 shadow-2xl">
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-blue-500/10 blur-[40px] pointer-events-none" />
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black tracking-wider uppercase font-mono text-white flex items-center gap-2">
                        Calculus Science Center <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text text-[10px] font-black">ACTIVE ENGINE v9.0</span>
                      </h4>
                      <p className="text-xs text-white/70 leading-relaxed font-sans max-w-xl">
                        Select an active engine mode below to interact with your calculations, view real-time formulas visualization steps, or study integration examples and statistical regression data side-by-side with your physical calculator.
                      </p>
                    </div>
                  </div>
                </div>

                {/* High Fidelity Bento Feature Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Bento Box 1: AI Calculus Tutor */}
                  <div
                    onClick={() => {
                      setMode('COMP');
                      setRightActiveTab('TUTOR');
                    }}
                    className="group p-5 bg-gradient-to-br from-emerald-950/20 to-zinc-950/40 hover:from-emerald-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-emerald-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(16,185,129,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        AI ACTIVE
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors font-mono">
                        AI Calculus Tutor
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Describe or sync expressions to ask for limits, derivative proofs, step-by-step integrations and guides.
                      </p>
                    </div>
                  </div>

                  {/* Bento Box 2: Graph Plotter */}
                  <div
                    onClick={() => {
                      setMode('COMP');
                      setRightActiveTab('PLOTTER');
                    }}
                    className="group p-5 bg-gradient-to-br from-pink-950/20 to-zinc-950/40 hover:from-pink-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-pink-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(236,72,153,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 group-hover:scale-110 transition-transform">
                        <LineChart className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-pink-400/80 bg-pink-500/10 border border-pink-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        PLOTTER
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors font-mono">
                        Interactive Plotter
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Build plots for math formulas instantly with Plotly.js. Run Cartesian 2D, Polar angles, and Parametric arcs.
                      </p>
                    </div>
                  </div>

                  {/* Bento Box 3: Statistical Solver */}
                  <div
                    onClick={() => {
                      setMode('STAT');
                      setRightActiveTab('STAT');
                    }}
                    className="group p-5 bg-gradient-to-br from-purple-950/20 to-zinc-950/40 hover:from-purple-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-purple-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(168,85,247,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-purple-400/80 bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        SPREADSHEET
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors font-mono">
                        Statistical Solver
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Input data point spreadsheets. Display dispersion indices, single variable averages, or two-variable regression charts.
                      </p>
                    </div>
                  </div>

                  {/* Bento Box 4: Equation & Matrix Systems */}
                  <div
                    onClick={() => {
                      setMode('EQN');
                      setRightActiveTab('CHEATSHEET');
                    }}
                    className="group p-5 bg-gradient-to-br from-amber-950/20 to-zinc-950/40 hover:from-amber-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-amber-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(245,158,11,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                        <RotateCcw className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        POLYNOMIAL
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors font-mono">
                        Equation Matrix Solver
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Solve math equations in simultaneous models (2 or 3 unknown variables), plus quadratic roots and cubic polynomials.
                      </p>
                    </div>
                  </div>

                  {/* Bento Box 5: Variable Registers */}
                  <div
                    onClick={() => {
                      setRightActiveTab('REGISTERS');
                    }}
                    className="group p-5 bg-gradient-to-br from-blue-950/20 to-zinc-950/40 hover:from-blue-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-blue-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(59,130,246,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform font-bold">
                        <Brain className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-blue-400/80 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        REGISTERS
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors font-mono">
                        Variable Registers
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Track, adjust, and debug calculator storage variables (values in memory blocks A, B, C, D, E, F, M, X, Y).
                      </p>
                    </div>
                  </div>

                  {/* Bento Box 6: Quick Tips & Cheatsheet */}
                  <div
                    onClick={() => {
                      setRightActiveTab('CHEATSHEET');
                    }}
                    className="group p-5 bg-gradient-to-br from-slate-950/20 to-zinc-950/40 hover:from-slate-950/30 hover:to-zinc-900/40 border border-white/5 hover:border-slate-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(148,163,184,0.08)] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                  >
                    <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-slate-500/5 rounded-full blur-xl group-hover:bg-slate-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400/80 bg-slate-500/10 border border-slate-500/25 px-2 py-0.5 rounded-full leading-none font-bold">
                        GUIDELINES
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-slate-300 transition-colors font-mono">
                        Guidelines & Quick Tips
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5 font-sans">
                        Review standard mathematical syntax operators, trigonometric brackets guidelines, power indices formulas, and shortcuts.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB_STATISTICAL: STAT SOLVER SHEET */}
            {rightActiveTab === 'STAT' && (
              <div className="flex-1 min-h-[380px] animate-fade-in w-full">
                <StatsDashboard
                  subMode={statSubMode}
                  data={statData}
                  onChangeData={setStatData}
                  onSetSubMode={setStatSubMode}
                />
              </div>
            )}

            {/* TAB 1: AI MATH TUTOR INTERACTION PANELS */}
            {rightActiveTab === 'TUTOR' && (
              <div className="flex-1 flex flex-col justify-between h-full min-h-[380px] animate-fade-in">
                  
                  {/* Scrolling Chat Logs Thread */}
                  <div className="flex-1 max-h-[300px] overflow-y-auto space-y-3 pr-1 mb-4 border border-white/5 bg-black/20 rounded-2xl p-3.5">
                    {tutorMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          msg.role === 'user' ? 'ml-auto items-end ' : 'mr-auto items-start'
                        }`}
                      >
                        <span className="text-[9px] text-white/30 font-mono mb-1 leading-none uppercase">
                          {msg.role === 'user' ? 'You' : 'Calculus Bot'}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-blue-600/25 border border-blue-500/20 text-blue-100 rounded-tr-none'
                              : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none font-sans'
                          }`}
                        >
                          {msg.role === 'tutor' ? renderFormattedMessage(msg.text) : msg.text}
                        </div>
                      </div>
                    ))}
                    
                    {/* Pulsing loading brain bubble indicator */}
                    {tutorLoading && (
                      <div className="mr-auto items-start flex flex-col max-w-[85%] animate-pulse">
                        <span className="text-[9px] text-white/30 font-mono mb-1 uppercase">Calculus Bot</span>
                        <div className="bg-white/5 border border-white/10 text-blue-300 p-3.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-400 animate-spin" />
                          <span>Solving & writing mathematical steps...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Calculator Sync Assist and Suggested Prompts */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 select-none">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Quick Sync Actions:</span>
                      <button
                        onClick={() => {
                          if (!expression) {
                            alert("Type an expression on the scientific calculator on the left first!");
                            return;
                          }
                          handleSendTutorMessage(`Explain how to solve or evaluate step-by-step: "${expression}"`);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 font-medium cursor-pointer transition-all flex items-center gap-1"
                      >
                        🤖 Explain Expression: {expression || '(empty)'}
                      </button>
                      <button
                        onClick={() => {
                          if (!result) {
                            alert("Calculate an answer first (press '=') to explain the result!");
                            return;
                          }
                          handleSendTutorMessage(`Explain how the calculation steps resulted in the answer: "${result}". Express its mathematical context.`);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium cursor-pointer transition-all flex items-center gap-1"
                      >
                        📖 Analyze Result: {result || '(empty)'}
                      </button>
                    </div>

                    {/* Pre-suggested mathematical study chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleSendTutorMessage("Explain the derivative power rule and give me a step-by-step example problem.")}
                        className="text-[9px] px-2 py-0.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
                      >
                        ⚡ Derivative Rule
                      </button>
                      <button
                        onClick={() => handleSendTutorMessage("How do I evaluate the integration of 1 / (x^2 + 1) dx? Show me the integration steps.")}
                        className="text-[9px] px-2 py-0.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
                      >
                        📐 Integration Example
                      </button>
                      <button
                        onClick={() => handleSendTutorMessage("Show me how to solve a system of simultaneous linear equations step-by-step.")}
                        className="text-[9px] px-2 py-0.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
                      >
                        🧮 Linear Equations Steps
                      </button>
                      <button
                        onClick={() => handleSendTutorMessage("What is L'Hopital's rule, and what indeterminate forms does it resolve?")}
                        className="text-[9px] px-2 py-0.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
                      >
                        🏔️ L'Hopital Limits
                      </button>
                    </div>

                    {/* Standard Text Chat input submissions field */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tutorInput}
                        onChange={(e) => setTutorInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendTutorMessage()}
                        disabled={tutorLoading}
                        placeholder={tutorLoading ? "Thinking..." : "Ask your calculus scientific tutor anything..."}
                        className="flex-1 bg-black/30 border border-white/10 hover:border-white/20 focus:border-blue-500/50 outline-none rounded-xl px-3.5 py-2 text-xs font-sans text-white placeholder-white/40 disabled:opacity-50 transition-all"
                      />
                      <button
                        onClick={() => handleSendTutorMessage()}
                        disabled={tutorLoading || !tutorInput.trim()}
                        className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 border border-blue-400 text-white disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/10"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* GRAPH PLOTTER TAB WORKSPACE */}
              {rightActiveTab === 'PLOTTER' && (
                <div className="flex-1 animate-fade-in min-h-[380px]">
                  <GraphPlotter initialExpression={expression} />
                </div>
              )}

              {/* TAB 2: REGISTER VARIABLES MANAGEMENT CORES */}
              {rightActiveTab === 'REGISTERS' && (
                <div className="space-y-3.5 select-none animate-fade-in min-h-[380px]">
                  <p className="text-[11px] text-white/50 mb-2 leading-relaxed font-sans">
                    Variable memory saves values in standard comp mode. To save: type a calculation, then press <strong className="text-amber-400">SHIFT + RCL</strong>, then select your desired variable registry key on the calculator.
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {Object.entries(vars).map(([key, val]) => (
                      <div key={key} className="bg-black/20 p-2.5 rounded-2xl border border-white/5 text-center font-mono hover:border-blue-500/20 transition-all hover:scale-[1.02]">
                        <span className="text-[9px] text-white/40 font-bold block mb-1">Store key {key}</span>
                        <span className="text-blue-400 font-black font-mono truncate block text-xs">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SCIENTIFIC WORKSPACE CHEAT SHEET MANUAL */}
              {rightActiveTab === 'CHEATSHEET' && (
                <div className="space-y-4 leading-normal text-white/60 select-none animate-fade-in min-h-[380px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[11px] font-mono border-t border-white/10 pt-3">
                    <div><span className="text-blue-400 font-bold">MODE key</span>: Toggle active CPU Core processor (COMP, STAT, EQN).</div>
                    <div><span className="text-amber-400 font-bold">SHIFT key</span>: Initiates golden alternate keypad keys.</div>
                    <div><span className="text-rose-400 font-bold font-semibold">ALPHA key</span>: Inserts register memory variables (A-F, X, Y).</div>
                    <div><span className="text-emerald-400 font-bold">S⇔D key</span>: Conversions of decimals to exact rational fractions.</div>
                    <div><span className="text-blue-300 font-bold">STO mode</span>: SHIFT + RCL stores calculations to register variables.</div>
                    <div><span className="text-blue-300 font-bold">RCL mode</span>: Recalls stored numbers from register.</div>
                  </div>
                  <div className="border-t border-white/5 pt-3.5 text-[10px] text-white/40 leading-relaxed font-sans">
                    * Interactive statistics coordinates scatter maps are loaded when selecting the <strong className="text-purple-400">STAT Workspace Launcher</strong> welcome card or changing MODE to STAT system-wide.
                  </div>
                </div>
              )}

            </div>

        </div>
      </main>

      {/* Slide-over Overlays Panel Drawer drawer elements for History logs (Adaptive) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop cover filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Slide-in sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-sm h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col"
            >
              <HistorySidebar
                history={history}
                onSelect={handleLoadHistoryToScreen}
                onDeleteOne={handleDeleteOneHistory}
                onClearAll={handleClearAllHistory}
                driveConnected={driveConnected}
                username={driveUser}
                onSignInWithGoogle={handleGoogleLogin}
                onSignOut={handleGoogleLogout}
                isSyncing={isSyncingHistory}
                onForceSync={() => authToken && syncDriveLog(authToken)}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* System MODE Settings dialog popup modals */}
      <AnimatePresence>
        {modeMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setModeMenuOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative bg-black/80 border border-white/10 p-6 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] max-w-xs w-full text-center space-y-4 backdrop-blur-3xl"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 select-none">Select System processor</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  id="btn-mode-comp"
                  onClick={() => handleSelectMode('COMP')}
                  className={`py-2.5 w-full text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    mode === 'COMP'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold shadow'
                      : 'bg-white/3 border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  [1] COMP (Standard computation)
                </button>
                <button
                  id="btn-mode-stat"
                  onClick={() => handleSelectMode('STAT')}
                  className={`py-2.5 w-full text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    mode === 'STAT'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 font-bold shadow'
                      : 'bg-white/3 border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  [2] STAT (Statistics calculations)
                </button>
                <button
                  id="btn-mode-eqn"
                  onClick={() => handleSelectMode('EQN')}
                  className={`py-2.5 w-full text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    mode === 'EQN'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold shadow'
                      : 'bg-white/3 border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  [3] EQN (Equation matrix solvers)
                </button>
              </div>

              <button
                onClick={() => setModeMenuOpen(false)}
                className="text-[11px] text-white/30 hover:text-rose-400 select-none border-t border-white/5 pt-3 block w-full text-center transition-colors cursor-pointer"
              >
                Close dialog
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple custom Markdown parser & formatter for Calculus Sci AI Tutor
function renderFormattedMessage(text: string) {
  if (!text) return null;
  const paragraphs = text.split('\n');
  return (
    <div className="space-y-2">
      {paragraphs.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        
        if (trimmed.startsWith('###')) {
          return (
            <h5 key={idx} className="text-xs font-semibold uppercase tracking-wider text-blue-300 mt-4 border-l-2 border-blue-500 pl-2">
              {trimmed.substring(3).trim()}
            </h5>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h4 key={idx} className="text-sm font-extrabold text-white mt-5 border-l-4 border-blue-500 pl-2">
              {trimmed.substring(2).trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h3 key={idx} className="text-base font-black text-white mt-6 border-b border-white/10 pb-1">
              {trimmed.substring(1).trim()}
            </h3>
          );
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.substring(2).trim();
          return (
            <div key={idx} className="flex gap-2 text-white/80 pl-2.5">
              <span className="text-blue-400 font-bold text-[14px] leading-tight">•</span>
              <span className="text-xs leading-relaxed">{formatInlineMarkdown(content)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('1. ') || trimmed.match(/^\d+\.\s/)) {
          const content = trimmed.replace(/^\d+\.\s/, '').trim();
          const numMatch = trimmed.match(/^(\d+)\.\s/);
          const num = numMatch ? numMatch[1] : '1';
          return (
            <div key={idx} className="flex gap-2 text-white/80 pl-2.5">
              <span className="text-blue-400 font-mono font-bold text-xs">{num}.</span>
              <span className="text-xs leading-relaxed">{formatInlineMarkdown(content)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
          return (
            <pre key={idx} className="bg-black/40 border border-white/5 p-3 rounded-xl text-[10px] font-mono text-emerald-300 overflow-x-auto my-2.5 max-w-full">
              {trimmed.replace(/`/g, '')}
            </pre>
          );
        }
        return (
          <p key={idx} className="text-white/85 text-xs leading-relaxed">
            {formatInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(line: string) {
  const regex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="text-white font-extrabold text-[12px]">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  
  const resultParts: any[] = [];
  const sourceList = parts.length > 0 ? parts : [line];
  
  sourceList.forEach((part, partIdx) => {
    if (typeof part !== 'string') {
      resultParts.push(part);
      return;
    }
    const codeRegex = /`(.*?)`/g;
    let codeLastIdx = 0;
    let codeMatch;
    while ((codeMatch = codeRegex.exec(part)) !== null) {
      if (codeMatch.index > codeLastIdx) {
        resultParts.push(<span key={`text-${partIdx}-${codeLastIdx}`}>{part.slice(codeLastIdx, codeMatch.index)}</span>);
      }
      resultParts.push(
        <code key={`code-${partIdx}-${codeMatch.index}`} className="bg-blue-500/10 px-1.5 py-0.5 rounded-md font-mono text-[11px] text-blue-300 border border-blue-500/10">
          {codeMatch[1]}
        </code>
      );
      codeLastIdx = codeRegex.lastIndex;
    }
    if (codeLastIdx < part.length) {
      resultParts.push(<span key={`text-end-${partIdx}`}>{part.slice(codeLastIdx)}</span>);
    }
  });

  return resultParts.length > 0 ? resultParts : line;
}
