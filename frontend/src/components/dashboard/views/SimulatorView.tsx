"use client";

import { useState } from "react";
import TradingViewSimulator from "../TradingViewSimulator";
import InteractivePatternSim from "../InteractivePatternSim";

type TradeRecord = {
  id: string;
  pnl: number;
  isWin: boolean;
  time: string;
};

type SimulatorViewProps = {
  trades: TradeRecord[];
  onTradeExecuted: (pnl: number, isWin: boolean) => void;
};

export default function SimulatorView({ trades, onTradeExecuted }: SimulatorViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"tradingview" | "patterns">("tradingview");

  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winCount = trades.filter((t) => t.isWin).length;
  const winRate = trades.length > 0 ? Math.round((winCount / trades.length) * 100) : null;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ─── SIMULATOR SUB-NAVIGATION & BALANCE HEADER ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveSubTab("tradingview")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "tradingview"
                ? "bg-white text-blue-700 shadow-xs border border-blue-100 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>TradingView Chart Replay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("patterns")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "patterns"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
              <rect x="9" y="9" width="6" height="6" />
            </svg>
            <span>Pattern Visualizer Sandbox</span>
          </button>
        </div>

        {/* Paper Capital & Session Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-sans text-[11px]">Paper Balance:</span>
            <span className="font-bold text-slate-800">
              ₹{(1000000 + totalPnL).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-sans text-[11px]">Session P&L:</span>
            <span className={`font-bold ${totalPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totalPnL >= 0 ? `+₹${totalPnL.toLocaleString()}` : `-₹${Math.abs(totalPnL).toLocaleString()}`}
            </span>
          </div>

          {winRate !== null && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-sans text-[11px]">Win Rate:</span>
              <span className="font-bold text-blue-600">{winRate}%</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── TECHNICAL COMMENTARY STRIP ─── */}
      <section className="bg-slate-900 text-slate-200 rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <div>
            <span className="font-bold text-white">Market Physics Coach:</span>{" "}
            <span className="text-slate-300">
              {activeSubTab === "tradingview"
                ? "Look for volume spikes at key 20 EMA pullbacks. Use the Step Replay controls to practice bar-by-bar decision making."
                : "Toggle between Bullish and Bearish formations to see how institutional wicks reject key price levels."}
            </span>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-700 px-2 py-0.5 rounded shrink-0 hidden sm:inline">
          Live Engine
        </span>
      </section>

      {/* ─── EMBEDDED ENGINE CONTAINER ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {activeSubTab === "tradingview" ? (
          <TradingViewSimulator onTradeExecuted={onTradeExecuted} />
        ) : (
          <InteractivePatternSim />
        )}
      </div>
    </div>
  );
}
