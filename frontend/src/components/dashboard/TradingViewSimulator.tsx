"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";

// ─── Chronological Simulated Market Data ───
const NIFTY_DATA = [
  { time: "2024-05-01", open: 24520.0, high: 24580.0, low: 24490.0, close: 24560.0 },
  { time: "2024-05-02", open: 24560.0, high: 24610.0, low: 24530.0, close: 24590.0 },
  { time: "2024-05-03", open: 24590.0, high: 24640.0, low: 24550.0, close: 24570.0 },
  { time: "2024-05-06", open: 24570.0, high: 24590.0, low: 24460.0, close: 24480.0 }, // Liquidity Sweep of previous lows
  { time: "2024-05-07", open: 24480.0, high: 24590.0, low: 24450.0, close: 24575.0 }, // Hammer Reversal Wick
  { time: "2024-05-08", open: 24575.0, high: 24690.0, low: 24560.0, close: 24670.0 }, // Strong Bullish Displacement
  { time: "2024-05-09", open: 24670.0, high: 24740.0, low: 24650.0, close: 24725.0 }, // FVG Imbalance
  { time: "2024-05-10", open: 24725.0, high: 24760.0, low: 24700.0, close: 24745.0 },
  { time: "2024-05-13", open: 24745.0, high: 24750.0, low: 24680.0, close: 24695.0 }, // Pullback into FVG support
  { time: "2024-05-14", open: 24695.0, high: 24780.0, low: 24690.0, close: 24770.0 }, // Rebound expansion
  { time: "2024-05-15", open: 24770.0, high: 24840.0, low: 24750.0, close: 24825.0 }, // Break of Structure (BOS)
  { time: "2024-05-16", open: 24825.0, high: 24890.0, low: 24810.0, close: 24870.0 }, // Institutional Target
];

const BANKNIFTY_DATA = [
  { time: "2024-05-01", open: 50800.0, high: 51050.0, low: 50720.0, close: 50980.0 },
  { time: "2024-05-02", open: 50980.0, high: 51200.0, low: 50900.0, close: 51150.0 },
  { time: "2024-05-03", open: 51150.0, high: 51250.0, low: 50850.0, close: 50920.0 },
  { time: "2024-05-06", open: 50920.0, high: 50990.0, low: 50600.0, close: 50680.0 },
  { time: "2024-05-07", open: 50680.0, high: 51100.0, low: 50550.0, close: 51050.0 },
  { time: "2024-05-08", open: 51050.0, high: 51480.0, low: 50980.0, close: 51420.0 },
  { time: "2024-05-09", open: 51420.0, high: 51650.0, low: 51350.0, close: 51580.0 },
  { time: "2024-05-10", open: 51580.0, high: 51720.0, low: 51480.0, close: 51650.0 },
  { time: "2024-05-13", open: 51650.0, high: 51680.0, low: 51420.0, close: 51490.0 },
  { time: "2024-05-14", open: 51490.0, high: 51850.0, low: 51450.0, close: 51790.0 },
  { time: "2024-05-15", open: 51790.0, high: 52100.0, low: 51720.0, close: 52040.0 },
];

const BTC_DATA = [
  { time: "2024-05-01", open: 61800.0, high: 62400.0, low: 61500.0, close: 62200.0 },
  { time: "2024-05-02", open: 62200.0, high: 62850.0, low: 62050.0, close: 62700.0 },
  { time: "2024-05-03", open: 62700.0, high: 62900.0, low: 62100.0, close: 62300.0 },
  { time: "2024-05-04", open: 62300.0, high: 62500.0, low: 61200.0, close: 61400.0 },
  { time: "2024-05-05", open: 61400.0, high: 62600.0, low: 61100.0, close: 62450.0 },
  { time: "2024-05-06", open: 62450.0, high: 63800.0, low: 62300.0, close: 63650.0 },
  { time: "2024-05-07", open: 63650.0, high: 64500.0, low: 63400.0, close: 64200.0 },
  { time: "2024-05-08", open: 64200.0, high: 64800.0, low: 63900.0, close: 64600.0 },
];

type TradingViewSimulatorProps = {
  onTradeExecuted?: (pnl: number, isWin: boolean) => void;
};

export default function TradingViewSimulator({ onTradeExecuted }: TradingViewSimulatorProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<"NIFTY" | "BANKNIFTY" | "BTC">("NIFTY");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"5m" | "15m" | "1H" | "1D">("15m");
  const [showEMA, setShowEMA] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(NIFTY_DATA.length);
  const [position, setPosition] = useState<"LONG" | "SHORT" | null>(null);
  const [simulatedPnL, setSimulatedPnL] = useState<number>(0);
  const [aiFeedback, setAiFeedback] = useState<string>(
    "Setup Identified: Bullish Liquidity Sweep at 24,450 key support. Institutional displacement created a 45-point Fair Value Gap (FVG). High probability long setup."
  );

  const activeDataset = selectedAsset === "NIFTY" ? NIFTY_DATA : selectedAsset === "BANKNIFTY" ? BANKNIFTY_DATA : BTC_DATA;

  // 1. Create Chart Canvas ONCE on Mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#080c14" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "Inter, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.35)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(30, 41, 59, 0.35)", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(56, 189, 248, 0.5)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(56, 189, 248, 0.5)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
      },
    });

    // Add Candlestick Series (Lightweight Charts v5)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // Add EMA Line Series
    const emaSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false,
      title: "EMA 20",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    emaSeriesRef.current = emaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      emaSeriesRef.current = null;
    };
  }, []);

  // 2. Update Series Data smoothly on asset/time/filter change
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    const currentSlices = activeDataset.slice(0, replayStep);
    candleSeriesRef.current.setData(currentSlices);

    if (emaSeriesRef.current) {
      if (showEMA) {
        const emaPoints = currentSlices.map((c, i) => ({
          time: c.time,
          value: c.close * (1 - (currentSlices.length - i) * 0.0008),
        }));
        emaSeriesRef.current.setData(emaPoints);
      } else {
        emaSeriesRef.current.setData([]);
      }
    }

    chartRef.current.timeScale().fitContent();
  }, [selectedAsset, showEMA, replayStep, activeDataset]);

  // Replay Bar-by-Bar Interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isReplaying) {
      timer = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= activeDataset.length) {
            setIsReplaying(false);
            return activeDataset.length;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isReplaying, activeDataset.length]);

  const handleOrder = useCallback(
    (type: "LONG" | "SHORT") => {
      setPosition(type);
      if (type === "LONG") {
        const pnl = 4250;
        setSimulatedPnL(pnl);
        setAiFeedback(
          "Long Trade Executed at FVG Re-test (24,695). Confluence: Liquidity sweep of support + high-volume displacement. Target: 24,870 (+175 pts | 1:3.6 Risk-to-Reward). Stop Loss: 24,560."
        );
        if (onTradeExecuted) onTradeExecuted(pnl, true);
      } else {
        const pnl = -1400;
        setSimulatedPnL(pnl);
        setAiFeedback(
          "Short Trade Warning: Counter-trend entry against strong institutional expansion. High risk of getting stopped out by buy-side liquidity."
        );
        if (onTradeExecuted) onTradeExecuted(pnl, false);
      }
    },
    [onTradeExecuted]
  );

  function handleReset() {
    setReplayStep(5);
    setIsReplaying(false);
    setPosition(null);
    setSimulatedPnL(0);
    setAiFeedback("Chart reset to initial setup. Click Replay Sim or execute a simulated trade.");
  }

  function handleStepForward() {
    setReplayStep((prev) => Math.min(prev + 1, activeDataset.length));
  }

  const currentPrice =
    selectedAsset === "BTC"
      ? "$64,600.00"
      : selectedAsset === "BANKNIFTY"
      ? "52,040.00"
      : "24,870.00";

  return (
    <div className="bg-[#080c14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-slate-200">
      {/* ─── Top Studio Toolbar ─── */}
      <div className="flex flex-wrap items-center justify-between p-4 px-6 border-b border-slate-800/80 bg-slate-900/70 gap-4">
        {/* Left: Asset Selection & Timeframes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {(["NIFTY", "BANKNIFTY", "BTC"] as const).map((asset) => (
              <button
                key={asset}
                type="button"
                onClick={() => {
                  setSelectedAsset(asset);
                  setReplayStep(
                    asset === "NIFTY" ? NIFTY_DATA.length : asset === "BANKNIFTY" ? BANKNIFTY_DATA.length : BTC_DATA.length
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedAsset === asset
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                {asset === "NIFTY" ? "NIFTY 50" : asset === "BANKNIFTY" ? "BANK NIFTY" : "BTC/USDT"}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/40 text-xs">
            {(["5m", "15m", "1H", "1D"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedTimeframe === tf ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Current Live Price */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-sm font-extrabold font-mono text-white">{currentPrice}</span>
            <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              +1.42%
            </span>
          </div>
        </div>

        {/* Right: Technical Overlays & Bar Replay Simulation */}
        <div className="flex items-center gap-2.5">
          {/* EMA 20 Toggle */}
          <button
            type="button"
            onClick={() => setShowEMA(!showEMA)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showEMA
                ? "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                : "bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            EMA 20
          </button>

          {/* FVG Toggle */}
          <button
            type="button"
            onClick={() => setShowFVG(!showFVG)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showFVG
                ? "bg-purple-950/60 border-purple-800 text-purple-300"
                : "bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            Smart Money (FVG)
          </button>

          {/* Bar Replay Engine */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsReplaying(!isReplaying)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {isReplaying ? (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Replay Sim</span>
                </>
              )}
            </button>

            {/* Step Forward 1 Bar */}
            <button
              type="button"
              onClick={handleStepForward}
              disabled={replayStep >= activeDataset.length}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              title="Step Forward 1 Candle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Simulation"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TradingView Canvas ─── */}
      <div className="relative w-full">
        {/* ChartCoach Subtle Official Watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0">
          <img
            src="/assets/chartcoach logo final trimmed.png"
            alt="ChartCoach Watermark"
            className="w-72 sm:w-96 max-w-[65%] opacity-[0.06] filter brightness-200 pointer-events-none select-none"
          />
        </div>

        <div ref={chartContainerRef} className="w-full relative z-10" style={{ height: "400px" }} />

        {/* FVG Box Annotation Overlay */}
        {showFVG && selectedAsset === "NIFTY" && (
          <div className="absolute top-[32%] left-[45%] pointer-events-none z-10 bg-cyan-500/10 border border-cyan-400/60 border-dashed rounded-lg px-3 py-1.5 text-[10px] font-mono text-cyan-300 backdrop-blur-2xs shadow-lg">
            Institutional Fair Value Gap (24,725 - 24,670)
          </div>
        )}
      </div>

      {/* ─── Simulated Execution & AI Feedback Studio ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-slate-800 bg-slate-900/80 p-5 gap-6 items-center">
        {/* Left: Interactive Order Panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Simulated Execution Panel
            </span>
            {position && (
              <span
                className={`font-mono font-bold text-xs ${
                  simulatedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                P&L: {simulatedPnL >= 0 ? `+₹${simulatedPnL}` : `-₹${Math.abs(simulatedPnL)}`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOrder("LONG")}
              className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                position === "LONG"
                  ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                  : "bg-emerald-600/90 hover:bg-emerald-500 text-white hover:shadow-emerald-500/20"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span>BUY (LONG)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOrder("SHORT")}
              className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                position === "SHORT"
                  ? "bg-rose-500 text-white ring-2 ring-rose-300"
                  : "bg-rose-600/90 hover:bg-rose-500 text-white hover:shadow-rose-500/20"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>SELL (SHORT)</span>
            </button>
          </div>
        </div>

        {/* Right: AI Coach Intelligence Feedback */}
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>

          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-400 mb-1">
              <span>Chart Coach AI Intelligence</span>
              <span className="text-[10px] text-slate-500 font-mono">• Institutional Logic</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-normal">{aiFeedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
