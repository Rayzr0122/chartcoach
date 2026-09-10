"use client";

import React, { Component, ErrorInfo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import { TradingViewBar, LiveTick } from "@/lib/api";
import { BarChart2, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

export type ChartType = "area" | "candle";

interface MarketOverviewChartProps {
  symbol: string;
  timeframe: string;
  bars: TradingViewBar[];
  isPositive: boolean;
  isLoading?: boolean;
  liveTick?: LiveTick | null;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  hideViewToggle?: boolean;
}

// ─── Google-Grade Client-Side Bar Sanitizer & Invariant Guard ───────────────

function sanitizeBars(bars: TradingViewBar[]): TradingViewBar[] {
  if (!bars || !Array.isArray(bars) || bars.length === 0) return [];

  // 1. Filter out invalid / NaN / null bars
  const clean: TradingViewBar[] = [];
  for (const b of bars) {
    if (!b || b.time === undefined || b.time === null) continue;
    const c = Number(b.close);
    const o = Number(b.open ?? c);
    const h = Number(b.high ?? Math.max(o, c));
    const l = Number(b.low ?? Math.min(o, c));

    if (isNaN(c) || isNaN(o) || isNaN(h) || isNaN(l) || c <= 0) continue;

    clean.push({
      time: b.time,
      open: Number(o.toFixed(2)),
      high: Number(Math.max(h, o, c).toFixed(2)),
      low: Number(Math.min(l, o, c).toFixed(2)),
      close: Number(c.toFixed(2)),
      value: Number(c.toFixed(2)),
      volume: b.volume ? Number(b.volume) : undefined,
    });
  }

  if (clean.length === 0) return [];

  // 2. Sort strictly ascending by time
  clean.sort((a, b) => {
    const tA = typeof a.time === "number" ? a.time : new Date(a.time).getTime() / 1000;
    const tB = typeof b.time === "number" ? b.time : new Date(b.time).getTime() / 1000;
    return tA - tB;
  });

  // 3. Deduplicate by timestamp (Lightweight Charts throws if duplicate times exist)
  const deduped: TradingViewBar[] = [];
  const seenTimes = new Set<string | number>();

  for (const b of clean) {
    if (seenTimes.has(b.time)) {
      // Replace with latest occurrence
      deduped[deduped.length - 1] = b;
    } else {
      seenTimes.add(b.time);
      deduped.push(b);
    }
  }

  return deduped;
}

// ─── React Error Boundary for Canvas / WebGL Context Protection ─────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackSymbol: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg?: string;
}

class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Chart rendering caught in Error Boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, errorMsg: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-800">Chart Visualization Suspended</h4>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Browser canvas context temporarily unavailable. Live market quotes remain active.
          </p>
          <button
            type="button"
            onClick={this.resetError}
            className="mt-3 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Restore Chart</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Primary Chart Component ────────────────────────────────────────────────

function MarketOverviewChartInner({
  symbol,
  timeframe,
  bars,
  isPositive,
  isLoading = false,
  liveTick,
  chartType: controlledChartType,
  onChartTypeChange,
  hideViewToggle = false,
}: MarketOverviewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const activeSeriesTypeRef = useRef<ChartType | null>(null);

  const [internalChartType, setInternalChartType] = useState<ChartType>("area");
  const chartType = controlledChartType ?? internalChartType;

  const handleTypeChange = (type: ChartType) => {
    if (onChartTypeChange) {
      onChartTypeChange(type);
    } else {
      setInternalChartType(type);
    }
  };

  const [hoverData, setHoverData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
  } | null>(null);

  // ChartCoach Brand Color Constants
  const BULLISH_COLOR = "#10B981"; // Emerald-500
  const BULLISH_AREA_TOP = "rgba(16, 185, 129, 0.24)";
  const BULLISH_AREA_BOTTOM = "rgba(16, 185, 129, 0.00)";

  const BEARISH_COLOR = "#F43F5E"; // Rose-500
  const BEARISH_AREA_TOP = "rgba(244, 63, 94, 0.24)";
  const BEARISH_AREA_BOTTOM = "rgba(244, 63, 94, 0.00)";

  const primaryColor = isPositive ? BULLISH_COLOR : BEARISH_COLOR;
  const areaTop = isPositive ? BULLISH_AREA_TOP : BEARISH_AREA_TOP;
  const areaBottom = isPositive ? BULLISH_AREA_BOTTOM : BEARISH_AREA_BOTTOM;

  // Memoize sanitized bars strictly so reference is stable across renders
  const cleanBars = useMemo(() => sanitizeBars(bars), [bars]);
  const latestBar = cleanBars.length > 0 ? cleanBars[cleanBars.length - 1] : null;

  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const lastDataSetKeyRef = useRef<string>("");

  // 1. Chart Initialization & Resize Observer (Lifecycle: Once per mount)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    // Clean up any stale chart instance
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn("Chart cleanup warning:", e);
      }
      chartRef.current = null;
      seriesRef.current = null;
      activeSeriesTypeRef.current = null;
      lastDataSetKeyRef.current = "";
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 190;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        attributionLogo: false, // NO TRADINGVIEW WATERMARK LOGO
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748B",
        fontSize: 10,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      grid: {
        vertLines: { color: "#F1F5F9", style: LineStyle.Dashed },
        horzLines: { color: "#F1F5F9", style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(148, 163, 184, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
      },
      timeScale: {
        borderColor: "#E2E8F0",
        timeVisible: timeframeRef.current === "1D",
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#E2E8F0",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    // Crosshair HUD listener with date/time parsing and state memoization
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
        setHoverData((prev) => (prev === null ? prev : null));
        return;
      }

      if (seriesRef.current) {
        const data = param.seriesData.get(seriesRef.current) as any;
        if (data) {
          const currentTf = timeframeRef.current;
          let formattedTime = "";
          if (typeof param.time === "number") {
            if (currentTf === "1D") {
              formattedTime = new Date(param.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            } else {
              formattedTime = new Date(param.time * 1000).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
            }
          } else if (typeof param.time === "string") {
            const parts = param.time.split("-");
            if (parts.length === 3) {
              const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              formattedTime = dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
            } else {
              formattedTime = param.time;
            }
          } else if (param.time && typeof param.time === "object") {
            const bd = param.time as any;
            const dt = new Date(bd.year, bd.month - 1, bd.day);
            formattedTime = dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
          }

          const closeVal = data.close ?? data.value;
          setHoverData((prev) => {
            if (
              prev &&
              prev.time === formattedTime &&
              prev.open === data.open &&
              prev.high === data.high &&
              prev.low === data.low &&
              prev.close === closeVal
            ) {
              return prev; // Same reference: abort re-render loop
            }
            return {
              time: formattedTime,
              open: data.open,
              high: data.high,
              low: data.low,
              close: closeVal,
            };
          });
        }
      }
    });

    // Throttled ResizeObserver to prevent layout thrashing
    let animationFrameId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!chartRef.current || !container) return;
        const { width: newWidth, height: newHeight } = entries[0].contentRect;
        if (newWidth > 0 && newHeight > 0) {
          chartRef.current.applyOptions({ width: newWidth, height: newHeight });
          chartRef.current.timeScale().fitContent();
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn("Chart unmount cleanup warning:", e);
        }
        chartRef.current = null;
        seriesRef.current = null;
        activeSeriesTypeRef.current = null;
        lastDataSetKeyRef.current = "";
      }
    };
  }, []); // Run ONCE on mount

  // 2. High-Performance Series & Data Updates (Re-uses chart instance, zero-flash)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Always keep timeScale accurately configured for timeframe
    chart.timeScale().applyOptions({
      timeVisible: timeframe === "1D",
      secondsVisible: false,
    });

    // If series type changed or not created yet, instantiate new series
    if (activeSeriesTypeRef.current !== chartType || !seriesRef.current) {
      if (seriesRef.current) {
        try {
          chart.removeSeries(seriesRef.current);
        } catch (e) {
          console.warn("Remove series warning:", e);
        }
        seriesRef.current = null;
      }

      if (chartType === "area") {
        const area = chart.addSeries(AreaSeries, {
          topColor: areaTop,
          bottomColor: areaBottom,
          lineColor: primaryColor,
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: "#FFFFFF",
          crosshairMarkerBackgroundColor: primaryColor,
        });
        seriesRef.current = area;
      } else {
        const candle = chart.addSeries(CandlestickSeries, {
          upColor: BULLISH_COLOR,
          downColor: BEARISH_COLOR,
          borderVisible: false,
          wickUpColor: BULLISH_COLOR,
          wickDownColor: BEARISH_COLOR,
          priceLineVisible: true,
          lastValueVisible: true,
        });
        seriesRef.current = candle;
      }
      activeSeriesTypeRef.current = chartType;
      lastDataSetKeyRef.current = ""; // Reset key so new series receives data
    } else {
      // Update color dynamic styling if trend changed
      if (chartType === "area" && seriesRef.current) {
        seriesRef.current.applyOptions({
          topColor: areaTop,
          bottomColor: areaBottom,
          lineColor: primaryColor,
          crosshairMarkerBackgroundColor: primaryColor,
        });
      }
    }

    // Push sanitized data into series ONLY if data actually changed
    const currentDataKey = `${symbol}_${timeframe}_${chartType}_${cleanBars.length}_${cleanBars[0]?.time}_${cleanBars[cleanBars.length - 1]?.time}_${cleanBars[cleanBars.length - 1]?.close}`;

    if (seriesRef.current && cleanBars.length > 0 && lastDataSetKeyRef.current !== currentDataKey) {
      try {
        if (chartType === "area") {
          const areaData = cleanBars.map((b) => ({
            time: b.time as any,
            value: b.close,
          }));
          seriesRef.current.setData(areaData);
        } else {
          const candleData = cleanBars.map((b) => ({
            time: b.time as any,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }));
          seriesRef.current.setData(candleData);
        }
        lastDataSetKeyRef.current = currentDataKey;
        chart.timeScale().fitContent();
      } catch (err) {
        console.warn("Failed to set chart series data:", err);
      }
    }
  }, [cleanBars, chartType, primaryColor, areaTop, areaBottom, timeframe, symbol]);

  // 3. Real-Time Live Tick Injection via series.update()
  useEffect(() => {
    if (!liveTick || !seriesRef.current || cleanBars.length === 0) return;
    if (liveTick.symbol !== symbol) return;

    try {
      const lastBar = cleanBars[cleanBars.length - 1];
      const livePrice = liveTick.price;

      if (chartType === "area") {
        seriesRef.current.update({
          time: lastBar.time as any,
          value: livePrice,
        });
      } else {
        seriesRef.current.update({
          time: lastBar.time as any,
          open: lastBar.open,
          high: Math.max(lastBar.high, livePrice),
          low: Math.min(lastBar.low, livePrice),
          close: livePrice,
        });
      }
    } catch (err) {
      console.warn("Live tick update notice:", err);
    }
  }, [liveTick, symbol, chartType, cleanBars]);

  return (
    <div className="relative w-full flex flex-col h-full">
      {/* ─── Dedicated Crosshair HUD Strip with Clean Spacing ─── */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50/80 rounded-xl border border-slate-100 text-[11px] font-mono mb-2">
        <div className="flex items-center gap-2.5 text-slate-600 truncate min-w-0">
          {hoverData ? (
            <>
              <span className="text-slate-700 font-bold bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200/60 text-[10px]">
                {hoverData.time}
              </span>
              {hoverData.open !== undefined && (
                <span>
                  O: <span className="font-bold text-slate-800">${hoverData.open.toFixed(2)}</span>
                </span>
              )}
              {hoverData.high !== undefined && (
                <span>
                  H: <span className="font-bold text-emerald-600">${hoverData.high.toFixed(2)}</span>
                </span>
              )}
              {hoverData.low !== undefined && (
                <span>
                  L: <span className="font-bold text-rose-600">${hoverData.low.toFixed(2)}</span>
                </span>
              )}
              <span>
                C: <span className="font-extrabold text-blue-600">${hoverData.close?.toFixed(2)}</span>
              </span>
            </>
          ) : latestBar ? (
            <>
              <span className="text-slate-400 font-medium">
                {timeframe === "1D"
                  ? "Today"
                  : timeframe === "1W"
                  ? "7D Range"
                  : timeframe === "1M"
                  ? "1M Range"
                  : timeframe === "1Y"
                  ? "52W Range"
                  : "All-Time"}
                :
              </span>
              <span>
                O: <span className="font-semibold text-slate-700">${latestBar.open.toFixed(2)}</span>
              </span>
              <span>
                H:{" "}
                <span className="font-semibold text-emerald-600">
                  ${Math.max(latestBar.high, liveTick && liveTick.symbol === symbol ? liveTick.high : latestBar.high).toFixed(2)}
                </span>
              </span>
              <span>
                L:{" "}
                <span className="font-semibold text-rose-600">
                  ${Math.min(latestBar.low, liveTick && liveTick.symbol === symbol ? liveTick.low : latestBar.low).toFixed(2)}
                </span>
              </span>
              <span className="flex items-center gap-1">
                Last:{" "}
                <span
                  className={`font-black px-1.5 py-0.5 rounded transition-colors duration-300 ${
                    liveTick && liveTick.symbol === symbol && liveTick.tick_direction === "up"
                      ? "text-emerald-700 bg-emerald-100"
                      : liveTick && liveTick.symbol === symbol && liveTick.tick_direction === "down"
                      ? "text-rose-700 bg-rose-100"
                      : "text-slate-900 bg-white shadow-2xs border border-slate-200/60"
                  }`}
                >
                  ${(liveTick && liveTick.symbol === symbol ? liveTick.price : latestBar.close).toFixed(2)}
                </span>
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-medium">ChartCoach Intelligence Engine · Ready</span>
          )}
        </div>

        {/* Chart View Toggle: Area vs Candlestick (only when not controlled from top header) */}
        {!hideViewToggle && (
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200/80 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTypeChange("area")}
              title="Area View"
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                chartType === "area"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("candle")}
              title="Candlestick View"
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                chartType === "candle"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Candle</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Chart Canvas Container ─── */}
      <div className="relative w-full h-[225px] sm:h-[245px] flex-1">
        {/* Subtle Hairline Loader (Zero Ugly Modals, Zero Vendor Mentions) */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden z-20 rounded-t-xl">
            <div className="w-full h-full bg-blue-600 animate-pulse" />
          </div>
        )}

        {/* ChartCoach Subtle Brand Watermark (Replaces TradingView Logo) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0">
          <div className="flex flex-col items-center opacity-[0.04] transform -rotate-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-sm">
                CC
              </div>
              <span className="text-3xl sm:text-4xl font-black tracking-widest text-slate-900 uppercase font-sans">
                CHARTCOACH
              </span>
            </div>
            <span className="text-[9px] font-bold tracking-[0.25em] text-slate-900 uppercase mt-1">
              PRO INTELLIGENCE TERMINAL
            </span>
          </div>
        </div>

        {/* ChartCoach Terminal Brand Stamp in Bottom-Left Corner (Replaces TradingView Logo) */}
        <div className="absolute bottom-2.5 left-3 pointer-events-none flex items-center gap-1.5 z-20 opacity-60 select-none bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200/50 shadow-3xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          <span className="text-[9.5px] font-extrabold tracking-wider text-slate-700 uppercase font-mono">
            ChartCoach Terminal
          </span>
        </div>

        <div
          ref={chartContainerRef}
          className="relative z-10 w-full h-full rounded-xl overflow-hidden"
        />
      </div>
    </div>
  );
}

// ─── Exported Default Wrapped with Failproof Error Boundary ──────────────────

export default function MarketOverviewChart(props: MarketOverviewChartProps) {
  return (
    <ChartErrorBoundary fallbackSymbol={props.symbol}>
      <MarketOverviewChartInner {...props} />
    </ChartErrorBoundary>
  );
}
