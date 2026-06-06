/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { History, Trash2, Cloud, ArrowDownToLine, RefreshCw, X, LogIn, LogOut } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDeleteOne: (id: string) => void;
  onClearAll: () => void;
  driveConnected: boolean;
  username: string | null;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  onForceSync: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function HistorySidebar({
  history,
  onSelect,
  onDeleteOne,
  onClearAll,
  driveConnected,
  username,
  onSignInWithGoogle,
  onSignOut,
  isSyncing,
  onForceSync,
  isOpen = true,
  onClose,
}: HistorySidebarProps) {
  // Safe helper to format time
  const formatTime = (ts: number): string => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      id="history-manager-panel"
      className="flex flex-col h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full"
    >
      {/* Drawer Title Header */}
      <div id="history-header" className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-xs tracking-wider uppercase text-white/90">History Log</h2>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 bg-white/5 hover:bg-white/10 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              id="btn-close-history"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cloud Drive Sync Section */}
      <div id="google-drive-sync-section" className="p-4 bg-white/3 border-b border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className={`w-4 h-4 ${driveConnected ? 'text-blue-400 animate-pulse' : 'text-white/40'}`} />
            <span className="text-xs font-semibold text-white/80">Google Drive Backup</span>
          </div>

          {driveConnected ? (
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
              Synced
            </span>
          ) : (
            <span className="bg-white/5 text-white/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
              Disconnected
            </span>
          )}
        </div>

        {/* User login or Sync details */}
        {driveConnected ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-white/65">
              <span className="truncate max-w-[150px] font-medium" id="lbl-sync-username">
                User: {username || 'Synced Account'}
              </span>
              <button
                onClick={onSignOut}
                id="btn-sync-signout"
                className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1 hover:underline focus:outline-none cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Disconnect
              </button>
            </div>

            <button
              onClick={onForceSync}
              disabled={isSyncing}
              id="btn-force-sync"
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 disabled:opacity-40 rounded-xl text-xs font-semibold border border-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              {isSyncing ? 'Syncing with Drive...' : 'Force Sync Now'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-white/55 leading-normal">
              Connect your account to securely sync and backup calculation histories to your Google Drive.
            </p>
            <button
              onClick={onSignInWithGoogle}
              id="btn-sync-signin"
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow hover:shadow-blue-500/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Main calculation items list */}
      <div id="history-items-list" className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30">
              <History className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs">No equations recorded yet</p>
              <p className="text-[10px] opacity-70 mt-0.5">Evaluate an expression to record.</p>
            </div>
          ) : (
            history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all flex flex-col justify-between cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <div className="flex items-center justify-between text-[10px] text-white/40 font-mono mb-2">
                  <span className="text-blue-400 font-semibold uppercase">{item.angleMode} Mode</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>

                {/* Mathematical inputs */}
                <div
                  className="text-white/90 font-mono text-sm break-all font-medium pr-6 hover:text-blue-300 transition-colors line-clamp-2"
                  title="Click to load formula into screen"
                >
                  {item.expression}
                </div>

                {/* Visual mathematical results */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 font-mono text-right">
                  <span className="text-[10px] text-white/40 select-none flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                    <ArrowDownToLine className="w-3 h-3 text-white/20 group-hover:text-blue-400 transition-colors" />
                    Load
                  </span>
                  <span className="text-emerald-400 font-bold font-mono text-base leading-none">
                    = {item.result}
                  </span>
                </div>

                {/* Single Trash deletion icon */}
                <button
                  id={`btn-del-item-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOne(item.id);
                  }}
                  className="absolute right-2 top-2 p-1 bg-transparent hover:bg-white/15 text-white/30 hover:text-rose-400 rounded-lg transition-all focus:outline-none cursor-pointer"
                  title="Delete calculation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Lower deck toolbar for calculations */}
      {history.length > 0 && (
        <div id="history-footer-deck" className="p-3.5 bg-white/3 border-t border-white/10">
          <button
            id="btn-clear-all"
            onClick={onClearAll}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white/5 border border-white/10 hover:bg-rose-950/20 hover:border-rose-900/40 hover:text-rose-400 text-white/70 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
}
