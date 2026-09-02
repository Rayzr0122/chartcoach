"use client";

import { useState } from "react";

type PatternScenario = {
  id: string;
  asset: string;
  timeframe: string;
  title: string;
  description: string;
  correctPattern: string;
  options: string[];
  aiAnalysis: string;
  riskReward: string;
  institutionalTip: string;
};

const SCENARIOS: PatternScenario[] = [
  {
    id: "sc-1",
    asset: "NIFTY 50 • 15M",
    timeframe: "15-Minute Intraday",
    title: "Key Support Liquidity Sweep & Hammer Reversal",
    description: "Price aggressively pushed below the previous day's low, took out sell-stop liquidity, and printed a massive lower shadow with high volume absorption.",
    correctPattern: "Bullish Liquidity Sweep (Spring)",
    options: ["Bullish Liquidity Sweep (Spring)", "Bearish Breakout", "Double Top Reversal", "Head & Shoulders"],
    aiAnalysis: "Correct! The long lower wick at support indicates market maker absorption of retail stop-losses. This is a classic Smart Money Spring entry with high probability.",
    riskReward: "1 : 3.4 R:R",
    institutionalTip: "Place Stop Loss 5 points below the sweep wick low. Target the opposing Fair Value Gap at 24,850.",
  },
  {
    id: "sc-2",
    asset: "BANKNIFTY • 5M",
    timeframe: "5-Minute Scalp",
    title: "Order Block Mitigation & Fair Value Gap Re-test",
    description: "Strong displacement candle left a 40-point imbalance (FVG). Price is now retracing gently on declining volume into the institutional unmitigated order block.",
    correctPattern: "Bullish FVG & Order Block Entry",
    options: ["Bullish FVG & Order Block Entry", "Bearish Continuation", "Falling Wedge Breakdown", "Exhaustion Gap"],
    aiAnalysis: "Excellent! The gentle pull-back into the 5M Fair Value Gap represents smart money mitigation before the next leg of expansion.",
    riskReward: "1 : 4.1 R:R",
    institutionalTip: "Wait for a 1-minute Change of Character (CHoCH) inside the FVG zone to enter with minimum slippage.",
  },
  {
    id: "sc-3",
    asset: "BTC/USDT • 1H",
    timeframe: "1-Hour Macro",
    title: "Change of Character (CHoCH) at Supply Zone",
    description: "After a 3-day rally, price created a lower low breaking internal market structure with heavy sell volume at the weekly resistance block.",
    correctPattern: "Bearish CHoCH (Structure Shift)",
    options: ["Bearish CHoCH (Structure Shift)", "Ascending Triangle", "Bull Flag Continuation", "Cup and Handle"],
    aiAnalysis: "Spot on! The structural shift confirms seller dominance. Institutional algorithms are distributing inventory at premium pricing.",
    riskReward: "1 : 2.8 R:R",
    institutionalTip: "Target discount liquidity pools at the 0.618 Fibonacci retracement level.",
  },
];

export default function InteractivePatternSim() {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [score, setScore] = useState({ correct: 2, total: 2 });

  const scenario = SCENARIOS[activeScenarioIdx];

  function handleSelect(option: string) {
    if (isEvaluated) return;
    setSelectedOption(option);
  }

  function handleEvaluate() {
    if (!selectedOption) return;
    setIsEvaluated(true);
    if (selectedOption === scenario.correctPattern) {
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
    } else {
      setScore((s) => ({ ...s, total: s.total + 1 }));
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setIsEvaluated(false);
    setActiveScenarioIdx((prev) => (prev + 1) % SCENARIOS.length);
  }

  const isCorrect = selectedOption === scenario.correctPattern;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live AI Simulator Sandbox
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">Institutional Pattern Recognition Test</h3>
        </div>

        {/* Win-Rate Pill */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-1.5 text-right shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sim Win-Rate</span>
            <span className="text-sm font-extrabold text-blue-600">
              {Math.round((score.correct / Math.max(score.total, 1)) * 100)}% ({score.correct}/{score.total})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Interactive Simulated Candlestick Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-between gap-6 bg-slate-950 text-white relative">
          {/* Chart Header Pill */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{scenario.asset}</span>
              <span className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                {scenario.timeframe}
              </span>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time Simulation</span>
            </div>
          </div>

          {/* SVG Candlestick Graphic */}
          <div className="w-full h-56 flex items-center justify-center my-2 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-10 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-b border-r border-white/20" />
              ))}
            </div>

            <svg className="w-full h-full" viewBox="0 0 450 180" fill="none">
              {/* Dynamic Candle Series */}
              {/* Candle 1 (Red) */}
              <line x1="30" y1="40" x2="30" y2="130" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="24" y="55" width="12" height="60" fill="#ef4444" rx="1" />

              {/* Candle 2 (Red) */}
              <line x1="70" y1="80" x2="70" y2="150" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="64" y="90" width="12" height="45" fill="#ef4444" rx="1" />

              {/* Candle 3 (Red) */}
              <line x1="110" y1="100" x2="110" y2="160" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="104" y="110" width="12" height="40" fill="#ef4444" rx="1" />

              {/* Support Liquidity Line */}
              <line x1="10" y1="150" x2="440" y2="150" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
              <text x="15" y="144" fill="#38bdf8" fontSize="9" fontWeight="bold" opacity="0.8">KEY LIQUIDITY LEVEL</text>

              {/* Candle 4 (Sweep Wick - Hammer) */}
              <line x1="150" y1="105" x2="150" y2="175" stroke="#10b981" strokeWidth="2" />
              <rect x="144" y="110" width="12" height="15" fill="#10b981" rx="1" />

              {/* Candle 5 (Strong Green Engulfing) */}
              <line x1="190" y1="70" x2="190" y2="140" stroke="#10b981" strokeWidth="1.5" />
              <rect x="184" y="80" width="12" height="50" fill="#10b981" rx="1" />

              {/* Candle 6 (Green Expansion) */}
              <line x1="230" y1="50" x2="230" y2="110" stroke="#10b981" strokeWidth="1.5" />
              <rect x="224" y="55" width="12" height="45" fill="#10b981" rx="1" />

              {/* Candle 7 (Green Breakout) */}
              <line x1="270" y1="30" x2="270" y2="90" stroke="#10b981" strokeWidth="1.5" />
              <rect x="264" y="35" width="12" height="40" fill="#10b981" rx="1" />

              {/* Candle 8 (Resting inside FVG) */}
              <line x1="310" y1="20" x2="310" y2="70" stroke="#10b981" strokeWidth="1.5" />
              <rect x="304" y="25" width="12" height="30" fill="#10b981" rx="1" />

              {/* FVG Highlight Box */}
              <rect x="210" y="50" width="120" height="45" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
              <text x="215" y="44" fill="#06b6d4" fontSize="8" fontWeight="bold">FAIR VALUE GAP (FVG)</text>
            </svg>
          </div>

          {/* Setup Scenario Context */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-200">{scenario.title}</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{scenario.description}</p>
          </div>
        </div>

        {/* Right: Decision Panel & AI Critique (5 Cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-5 bg-white">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Scenario Question
            </span>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              What institutional market structure setup is forming on this chart?
            </h4>

            {/* Options List */}
            <div className="space-y-2 mt-4">
              {scenario.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                let optionStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";

                if (isEvaluated) {
                  if (option === scenario.correctPattern) {
                    optionStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                  } else if (isSelected && !isCorrect) {
                    optionStyle = "bg-rose-50 border-rose-300 text-rose-900 font-semibold";
                  }
                } else if (isSelected) {
                  optionStyle = "bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs";
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {isEvaluated && option === scenario.correctPattern && (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {isEvaluated && isSelected && !isCorrect && (
                      <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Feedback Box (Visible after evaluation) */}
          {isEvaluated && (
            <div className={`p-4 rounded-2xl border text-xs animate-fadeIn ${isCorrect ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"}`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>AI Coach Analysis • {scenario.riskReward}</span>
              </div>
              <p className="text-[11px] leading-relaxed mt-1">{scenario.aiAnalysis}</p>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] font-semibold text-emerald-800">
                <span>Tip: </span>
                <span className="font-normal">{scenario.institutionalTip}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isEvaluated ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleEvaluate}
              className="chartcoach-btn-primary !py-3 font-semibold text-xs"
            >
              Submit Diagnosis to AI Coach
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="chartcoach-btn-primary !py-3 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            >
              <span>Next Simulation Scenario</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
